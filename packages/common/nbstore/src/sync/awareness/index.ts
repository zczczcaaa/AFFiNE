import type {
  AwarenessRecord,
  AwarenessStorage,
} from '../../storage/awareness';

export class AwarenessSync {
  constructor(
    readonly local: AwarenessStorage,
    readonly remotes: AwarenessStorage[]
  ) {}

  async update(record: AwarenessRecord, origin?: string) {
    await Promise.all(
      [this.local, ...this.remotes].map(peer => peer.update(record, origin))
    );
  }

  subscribeUpdate(
    id: string,
    onUpdate: (update: AwarenessRecord, origin?: string) => void,
    onCollect: () => AwarenessRecord
  ): () => void {
    const unsubscribes = [this.local, ...this.remotes].map(peer =>
      peer.subscribeUpdate(id, onUpdate, onCollect)
    );
    return () => {
      unsubscribes.forEach(unsubscribe => unsubscribe());
    };
  }
}
