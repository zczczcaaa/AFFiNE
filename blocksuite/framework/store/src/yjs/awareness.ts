import type { BlockSuiteFlags } from '@blocksuite/global/types';
import { Slot } from '@blocksuite/global/utils';
import { type Signal, signal } from '@preact/signals-core';
import clonedeep from 'lodash.clonedeep';
import merge from 'lodash.merge';
import type { Awareness as YAwareness } from 'y-protocols/awareness.js';

import type { Doc } from '../model/doc.js';

export interface UserInfo {
  name: string;
}

type UserSelection = Array<Record<string, unknown>>;

// Raw JSON state in awareness CRDT
export type RawAwarenessState = {
  user?: UserInfo;
  color?: string;
  flags: BlockSuiteFlags;
  // use v2 to avoid crush on old clients
  selectionV2: Record<string, UserSelection>;
};

export interface AwarenessEvent {
  id: number;
  type: 'add' | 'update' | 'remove';
  state?: RawAwarenessState;
}

export class AwarenessStore {
  private readonly _flags: Signal<BlockSuiteFlags>;

  private readonly _onAwarenessChange = (diff: {
    added: number[];
    removed: number[];
    updated: number[];
  }) => {
    this._flags.value = this.awareness.getLocalState()?.flags ?? {};

    const { added, removed, updated } = diff;

    const states = this.awareness.getStates();
    added.forEach(id => {
      this.slots.update.emit({
        id,
        type: 'add',
        state: states.get(id),
      });
    });
    updated.forEach(id => {
      this.slots.update.emit({
        id,
        type: 'update',
        state: states.get(id),
      });
    });
    removed.forEach(id => {
      this.slots.update.emit({
        id,
        type: 'remove',
      });
    });
  };

  readonly awareness: YAwareness<RawAwarenessState>;

  readonly slots = {
    update: new Slot<AwarenessEvent>(),
  };

  constructor(
    awareness: YAwareness<RawAwarenessState>,
    defaultFlags: BlockSuiteFlags
  ) {
    this._flags = signal(defaultFlags);
    this.awareness = awareness;
    this.awareness.on('change', this._onAwarenessChange);
    this.awareness.setLocalStateField('selectionV2', {});
    this._initFlags(defaultFlags);
  }

  private _initFlags(defaultFlags: BlockSuiteFlags) {
    const upstreamFlags = this.awareness.getLocalState()?.flags;
    const flags = clonedeep(defaultFlags);
    if (upstreamFlags) {
      merge(flags, upstreamFlags);
    }
    this.awareness.setLocalStateField('flags', flags);
  }

  destroy() {
    this.awareness.off('change', this._onAwarenessChange);
    this.slots.update.dispose();
    this.awareness.destroy();
  }

  getFlag<Key extends keyof BlockSuiteFlags>(field: Key) {
    return this._flags.value[field];
  }

  getLocalSelection(
    selectionManagerId: string
  ): ReadonlyArray<Record<string, unknown>> {
    return (
      (this.awareness.getLocalState()?.selectionV2 ?? {})[selectionManagerId] ??
      []
    );
  }

  getStates(): Map<number, RawAwarenessState> {
    return this.awareness.getStates();
  }

  isReadonly(blockCollection: Doc): boolean {
    const rd = this.getFlag('readonly');
    if (rd && typeof rd === 'object') {
      return Boolean((rd as Record<string, boolean>)[blockCollection.id]);
    } else {
      return false;
    }
  }

  setFlag<Key extends keyof BlockSuiteFlags>(
    field: Key,
    value: BlockSuiteFlags[Key]
  ) {
    const oldFlags = this.awareness.getLocalState()?.flags ?? {};
    this.awareness.setLocalStateField('flags', { ...oldFlags, [field]: value });
  }

  setLocalSelection(selectionManagerId: string, selection: UserSelection) {
    const oldSelection = this.awareness.getLocalState()?.selectionV2 ?? {};
    this.awareness.setLocalStateField('selectionV2', {
      ...oldSelection,
      [selectionManagerId]: selection,
    });
  }

  setReadonly(blockCollection: Doc, value: boolean): void {
    const flags = this.getFlag('readonly') ?? {};
    this.setFlag('readonly', {
      ...flags,
      [blockCollection.id]: value,
    } as BlockSuiteFlags['readonly']);
  }
}
