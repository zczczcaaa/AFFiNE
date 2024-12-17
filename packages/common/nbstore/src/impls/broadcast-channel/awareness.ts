import { nanoid } from 'nanoid';

import {
  type AwarenessRecord,
  AwarenessStorage,
} from '../../storage/awareness';
import { BroadcastChannelConnection } from './channel';

type ChannelMessage =
  | {
      type: 'awareness-update';
      docId: string;
      bin: Uint8Array;
      origin?: string;
    }
  | {
      type: 'awareness-collect';
      docId: string;
      collectId: string;
    }
  | {
      type: 'awareness-collect-fallback';
      docId: string;
      bin: Uint8Array;
      collectId: string;
    };

export class BroadcastChannelAwarenessStorage extends AwarenessStorage {
  override readonly storageType = 'awareness';
  override readonly connection = new BroadcastChannelConnection(this.options);
  get channel() {
    return this.connection.inner;
  }

  private readonly subscriptions = new Map<
    string,
    Set<{
      onUpdate: (update: AwarenessRecord, origin?: string) => void;
      onCollect: () => AwarenessRecord;
    }>
  >();

  override update(record: AwarenessRecord, origin?: string): Promise<void> {
    const subscribers = this.subscriptions.get(record.docId);
    if (subscribers) {
      subscribers.forEach(subscriber => subscriber.onUpdate(record, origin));
    }
    this.channel.postMessage({
      type: 'awareness-update',
      docId: record.docId,
      bin: record.bin,
      origin,
    } satisfies ChannelMessage);
    return Promise.resolve();
  }

  override subscribeUpdate(
    id: string,
    onUpdate: (update: AwarenessRecord, origin?: string) => void,
    onCollect: () => AwarenessRecord
  ): () => void {
    const subscribers = this.subscriptions.get(id) ?? new Set();
    subscribers.forEach(subscriber => {
      const fallback = subscriber.onCollect();
      onUpdate(fallback);
    });

    const collectUniqueId = nanoid();

    const onChannelMessage = (message: MessageEvent<ChannelMessage>) => {
      if (
        message.data.type === 'awareness-update' &&
        message.data.docId === id
      ) {
        onUpdate(
          {
            docId: message.data.docId,
            bin: message.data.bin,
          },
          message.data.origin
        );
      }
      if (
        message.data.type === 'awareness-collect' &&
        message.data.docId === id
      ) {
        const fallback = onCollect();
        if (fallback) {
          this.channel.postMessage({
            type: 'awareness-collect-fallback',
            docId: message.data.docId,
            bin: fallback.bin,
            collectId: collectUniqueId,
          } satisfies ChannelMessage);
        }
      }
      if (
        message.data.type === 'awareness-collect-fallback' &&
        message.data.docId === id &&
        message.data.collectId === collectUniqueId
      ) {
        onUpdate({
          docId: message.data.docId,
          bin: message.data.bin,
        });
      }
    };

    this.channel.addEventListener('message', onChannelMessage);
    this.channel.postMessage({
      type: 'awareness-collect',
      docId: id,
      collectId: collectUniqueId,
    } satisfies ChannelMessage);

    const subscriber = {
      onUpdate,
      onCollect,
    };
    subscribers.add(subscriber);
    this.subscriptions.set(id, subscribers);

    return () => {
      subscribers.delete(subscriber);
      this.channel.removeEventListener('message', onChannelMessage);
    };
  }
}
