import { DebugLogger } from '@affine/debug';
import { UserFriendlyError } from '@affine/graphql';
import { fromPromise, Service } from '@toeverything/infra';

import { BackendError, NetworkError } from '../error';
import type { ServerService } from './server';

const logger = new DebugLogger('affine:fetch');

export type FetchInit = RequestInit & { timeout?: number };

export class FetchService extends Service {
  constructor(private readonly serverService: ServerService) {
    super();
  }
  rxFetch = (
    input: string,
    init?: RequestInit & {
      // https://github.com/microsoft/TypeScript/issues/54472
      priority?: 'auto' | 'low' | 'high';
    } & {
      traceEvent?: string;
    }
  ) => {
    return fromPromise(signal => {
      return this.fetch(input, { signal, ...init });
    });
  };

  /**
   * fetch with custom custom timeout and error handling.
   */
  fetch = async (input: string, init?: FetchInit): Promise<Response> => {
    logger.debug('fetch', input);
    const externalSignal = init?.signal;
    if (externalSignal?.aborted) {
      throw externalSignal.reason;
    }
    const abortController = new AbortController();
    externalSignal?.addEventListener('abort', reason => {
      abortController.abort(reason);
    });

    const timeout = init?.timeout ?? 15000;
    const timeoutId = setTimeout(() => {
      abortController.abort('timeout');
    }, timeout);

    const res = await globalThis
      .fetch(new URL(input, this.serverService.server.serverMetadata.baseUrl), {
        ...init,
        signal: abortController.signal,
        headers: {
          ...init?.headers,
          'x-affine-version': BUILD_CONFIG.appVersion,
        },
      })
      .catch(err => {
        logger.debug('network error', err);
        throw new NetworkError(err);
      });
    clearTimeout(timeoutId);
    if (res.status === 504) {
      const error = new Error('Gateway Timeout');
      logger.debug('network error', error);
      throw new NetworkError(error, res.status);
    }
    if (!res.ok) {
      logger.warn(
        'backend error',
        new Error(`${res.status} ${res.statusText}`)
      );
      let reason: string | any = '';
      if (res.headers.get('Content-Type')?.includes('application/json')) {
        try {
          reason = await res.json();
        } catch {
          // ignore
        }
      }
      throw new BackendError(UserFriendlyError.fromAnyError(reason));
    }
    return res;
  };
}
