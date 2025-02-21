import { SpecProvider } from '@blocksuite/affine-shared/utils';

import { StoreExtensions } from './common.js';
import { EdgelessEditorBlockSpecs } from './preset/edgeless-specs.js';
import { PageEditorBlockSpecs } from './preset/page-specs.js';
import {
  PreviewEdgelessEditorBlockSpecs,
  PreviewPageEditorBlockSpecs,
} from './preset/preview-specs.js';

export function registerSpecs() {
  SpecProvider.getInstance().addSpec('store', StoreExtensions);
  SpecProvider.getInstance().addSpec('page', PageEditorBlockSpecs);
  SpecProvider.getInstance().addSpec('edgeless', EdgelessEditorBlockSpecs);
  SpecProvider.getInstance().addSpec(
    'preview:page',
    PreviewPageEditorBlockSpecs
  );
  SpecProvider.getInstance().addSpec(
    'preview:edgeless',
    PreviewEdgelessEditorBlockSpecs
  );
}
