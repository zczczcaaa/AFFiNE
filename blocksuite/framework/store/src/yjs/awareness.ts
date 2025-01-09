import { Slot } from '@blocksuite/global/utils';
import type { Awareness } from 'y-protocols/awareness.js';

export interface UserInfo {
  name: string;
}

type UserSelection = Array<Record<string, unknown>>;

// Raw JSON state in awareness CRDT
export type RawAwarenessState = {
  user?: UserInfo;
  color?: string;
  // use v2 to avoid crush on old clients
  selectionV2: Record<string, UserSelection>;
};

export interface AwarenessEvent {
  id: number;
  type: 'add' | 'update' | 'remove';
  state?: RawAwarenessState;
}

export class AwarenessStore {
  private readonly _onAwarenessChange = (diff: {
    added: number[];
    removed: number[];
    updated: number[];
  }) => {
    const { added, removed, updated } = diff;

    const states = this.getStates();
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

  readonly awareness: Awareness;

  readonly slots = {
    update: new Slot<AwarenessEvent>(),
  };

  constructor(awareness: Awareness) {
    this.awareness = awareness;
    this.awareness.on('change', this._onAwarenessChange);
    this.awareness.setLocalStateField('selectionV2', {});
  }

  destroy() {
    this.awareness.off('change', this._onAwarenessChange);
    this.slots.update.dispose();
    this.awareness.destroy();
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
    return this.awareness.getStates() as Map<number, RawAwarenessState>;
  }

  getLocalState(): RawAwarenessState {
    return this.awareness.getLocalState() as RawAwarenessState;
  }

  setLocalState(state: RawAwarenessState): void {
    this.awareness.setLocalState(state);
  }

  setLocalStateField<Field extends keyof RawAwarenessState>(
    field: Field,
    value: RawAwarenessState[Field]
  ): void {
    this.awareness.setLocalStateField(field, value);
  }

  setLocalSelection(selectionManagerId: string, selection: UserSelection) {
    const oldSelection = this.awareness.getLocalState()?.selectionV2 ?? {};
    this.awareness.setLocalStateField('selectionV2', {
      ...oldSelection,
      [selectionManagerId]: selection,
    });
  }
}
