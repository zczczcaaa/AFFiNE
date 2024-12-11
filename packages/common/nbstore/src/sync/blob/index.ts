import { difference } from 'lodash-es';

import type { BlobStorage } from '../../storage';
import { MANUALLY_STOP, throwIfAborted } from '../../utils/throw-if-aborted';

export class BlobSyncEngine {
  private abort: AbortController | null = null;

  constructor(
    readonly local: BlobStorage,
    readonly remotes: BlobStorage[]
  ) {}

  private async sync(signal?: AbortSignal) {
    throwIfAborted(signal);

    for (const remote of this.remotes) {
      let localList: string[] = [];
      let remoteList: string[] = [];

      try {
        localList = (await this.local.list(signal)).map(b => b.key);
        throwIfAborted(signal);
        remoteList = (await remote.list(signal)).map(b => b.key);
        throwIfAborted(signal);
      } catch (err) {
        if (err === MANUALLY_STOP) {
          throw err;
        }
        console.error(`error when sync`, err);
        continue;
      }

      const needUpload = difference(localList, remoteList);
      for (const key of needUpload) {
        try {
          const data = await this.local.get(key, signal);
          throwIfAborted(signal);
          if (data) {
            await remote.set(data, signal);
            throwIfAborted(signal);
          }
        } catch (err) {
          if (err === MANUALLY_STOP) {
            throw err;
          }
          console.error(
            `error when sync ${key} from [${this.local.peer}] to [${remote.peer}]`,
            err
          );
        }
      }

      const needDownload = difference(remoteList, localList);

      for (const key of needDownload) {
        try {
          const data = await remote.get(key, signal);
          throwIfAborted(signal);
          if (data) {
            await this.local.set(data, signal);
            throwIfAborted(signal);
          }
        } catch (err) {
          if (err === MANUALLY_STOP) {
            throw err;
          }
          console.error(
            `error when sync ${key} from [${remote.peer}] to [${this.local.peer}]`,
            err
          );
        }
      }
    }
  }

  start() {
    if (this.abort) {
      this.abort.abort();
    }

    const abort = new AbortController();
    this.abort = abort;

    this.sync(abort.signal).catch(error => {
      if (error === MANUALLY_STOP) {
        return;
      }
      console.error('sync blob error', error);
    });
  }

  stop() {
    this.abort?.abort();
    this.abort = null;
  }
}
