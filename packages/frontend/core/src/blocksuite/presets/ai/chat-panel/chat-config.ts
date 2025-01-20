import type { Store } from '@blocksuite/affine/store';
import type { Signal } from '@preact/signals-core';

export interface AINetworkSearchConfig {
  visible: Signal<boolean | undefined>;
  enabled: Signal<boolean | undefined>;
  setEnabled: (state: boolean) => void;
}

export interface DocDisplayConfig {
  getIcon: (docId: string) => any;
  getTitle: (docId: string) => {
    signal: Signal<string>;
    cleanup: () => void;
  };
  getDoc: (docId: string) => Store | null;
}
