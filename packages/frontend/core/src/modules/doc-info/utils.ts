import { DebugLogger } from '@affine/debug';
import { BlockStdScope } from '@blocksuite/affine/block-std';
import { PageEditorBlockSpecs } from '@blocksuite/affine/blocks';
import { type Blocks, Store } from '@blocksuite/affine/store';
import { LiveData } from '@toeverything/infra';
import { useMemo } from 'react';
import { Observable } from 'rxjs';

const logger = new DebugLogger('doc-info');

interface ReadonlySignal<T> {
  subscribe: (fn: (value: T) => void) => () => void;
}

export function signalToObservable<T>(
  signal: ReadonlySignal<T>
): Observable<T> {
  return new Observable(subscriber => {
    const unsub = signal.subscribe(value => {
      subscriber.next(value);
    });
    return () => {
      unsub();
    };
  });
}

export function signalToLiveData<T>(
  signal: ReadonlySignal<T>,
  defaultValue: T
): LiveData<T>;

export function signalToLiveData<T>(
  signal: ReadonlySignal<T>
): LiveData<T | undefined>;

export function signalToLiveData<T>(
  signal: ReadonlySignal<T>,
  defaultValue?: T
) {
  return LiveData.from(signalToObservable(signal), defaultValue);
}

// todo(pengx17): use rc pool?
export function createBlockStdScope(doc: Blocks) {
  logger.debug('createBlockStdScope', doc.id);
  const std = new BlockStdScope({
    store: new Store({ blocks: doc }),
    extensions: PageEditorBlockSpecs,
  });
  return std;
}

export function useBlockStdScope(doc: Blocks) {
  return useMemo(() => createBlockStdScope(doc), [doc]);
}
