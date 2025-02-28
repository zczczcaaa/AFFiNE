import { gqlFetcherFactory } from '@affine/graphql';

import { DummyConnection } from '../../connection';

export class HttpConnection extends DummyConnection {
  readonly fetch = async (input: string, init?: RequestInit) => {
    const externalSignal = init?.signal;
    if (externalSignal?.aborted) {
      throw externalSignal.reason;
    }
    const abortController = new AbortController();
    externalSignal?.addEventListener('abort', reason => {
      abortController.abort(reason);
    });

    const timeout = 15000;
    const timeoutId = setTimeout(() => {
      abortController.abort('timeout');
    }, timeout);

    const res = await globalThis
      .fetch(new URL(input, this.serverBaseUrl), {
        ...init,
        signal: abortController.signal,
        headers: {
          ...this.requestHeaders,
          ...init?.headers,
          'x-affine-version': BUILD_CONFIG.appVersion,
        },
      })
      .catch(err => {
        throw new Error('fetch error: ' + err);
      });
    clearTimeout(timeoutId);
    if (!res.ok && res.status !== 404) {
      let reason: string | any = '';
      if (res.headers.get('Content-Type')?.includes('application/json')) {
        try {
          reason = JSON.stringify(await res.json());
        } catch {
          // ignore
        }
      }
      throw new Error('fetch error status: ' + res.status + ' ' + reason);
    }
    return res;
  };

  readonly fetchArrayBuffer = async (input: string, init?: RequestInit) => {
    const res = await this.fetch(input, init);
    if (res.status === 404) {
      // 404
      return null;
    }
    try {
      return await res.arrayBuffer();
    } catch (err) {
      throw new Error('fetch download error: ' + err);
    }
  };

  readonly gql = gqlFetcherFactory(
    new URL('/graphql', this.serverBaseUrl).href,
    this.fetch
  );

  constructor(
    private readonly serverBaseUrl: string,
    private readonly requestHeaders?: Record<string, string>
  ) {
    super();
  }
}
