import type { ReferenceInfo } from '@blocksuite/affine-model';
import type { OpenDocMode } from '@blocksuite/affine-shared/services';
import type { Slot } from '@blocksuite/global/utils';

export type DocLinkClickedEvent = ReferenceInfo & {
  // default is active view
  openMode?: OpenDocMode;
  event?: MouseEvent;
};

export type RefNodeSlots = {
  docLinkClicked: Slot<DocLinkClickedEvent>;
};
