import type { ExtensionType } from '@blocksuite/store';

import { SelectionIdentifier } from '../identifier.js';
import type { SelectionConstructor } from '../selection/index.js';

export function SelectionExtension(
  selectionCtor: SelectionConstructor
): ExtensionType {
  return {
    setup: di => {
      di.addImpl(SelectionIdentifier(selectionCtor.type), () => selectionCtor);
    },
  };
}
