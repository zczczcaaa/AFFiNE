import type { ReferenceInfo } from '@blocksuite/affine-model';
import type { EditorHost } from '@blocksuite/block-std';
import { createIdentifier } from '@blocksuite/global/di';
import type { ExtensionType } from '@blocksuite/store';

export interface EmbedLinkedDocBlockConfig {
  handleClick?: (
    e: MouseEvent,
    host: EditorHost,
    referenceInfo: ReferenceInfo
  ) => void;
  handleDoubleClick?: (
    e: MouseEvent,
    host: EditorHost,
    referenceInfo: ReferenceInfo
  ) => void;
}

export const EmbedLinkedDocBlockConfigIdentifier =
  createIdentifier<EmbedLinkedDocBlockConfig>('EmbedLinkedDocBlockConfig');

export function EmbedLinkedDocBlockConfigExtension(
  config: EmbedLinkedDocBlockConfig
): ExtensionType {
  return {
    setup: di => {
      di.addImpl(EmbedLinkedDocBlockConfigIdentifier, () => config);
    },
  };
}
