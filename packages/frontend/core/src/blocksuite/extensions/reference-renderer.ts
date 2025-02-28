import type { ElementOrFactory } from '@affine/component';
import type { AffineReference } from '@blocksuite/affine/blocks';
import { ReferenceNodeConfigExtension } from '@blocksuite/affine/blocks';
import { type ExtensionType } from '@blocksuite/affine/store';
import type { TemplateResult } from 'lit';

export type ReferenceReactRenderer = (
  reference: AffineReference
) => React.ReactElement;

export function patchReferenceRenderer(
  reactToLit: (element: ElementOrFactory) => TemplateResult,
  reactRenderer: ReferenceReactRenderer
): ExtensionType {
  const customContent = (reference: AffineReference) => {
    const node = reactRenderer(reference);
    return reactToLit(node);
  };

  return ReferenceNodeConfigExtension({
    customContent,
  });
}
