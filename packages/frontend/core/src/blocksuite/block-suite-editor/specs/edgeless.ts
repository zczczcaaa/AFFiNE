import { enableAIExtension } from '@affine/core/blocksuite/ai';
import { enableAffineExtension } from '@affine/core/blocksuite/extensions';
import { builtInTemplates as builtInEdgelessTemplates } from '@affine/templates/edgeless';
import { builtInTemplates as builtInStickersTemplates } from '@affine/templates/stickers';
import type { SpecBuilder, TemplateManager } from '@blocksuite/affine/blocks';
import { EdgelessTemplatePanel, SpecProvider } from '@blocksuite/affine/blocks';
import { type FrameworkProvider } from '@toeverything/infra';

export function createEdgelessModeSpecs(
  framework: FrameworkProvider
): SpecBuilder {
  const edgelessSpec = SpecProvider._.getSpec('edgeless');
  enableAffineExtension(edgelessSpec, framework);
  enableAIExtension(edgelessSpec, framework);

  return edgelessSpec;
}

export function effects() {
  EdgelessTemplatePanel.templates.extend(
    builtInStickersTemplates as TemplateManager
  );
  EdgelessTemplatePanel.templates.extend(
    builtInEdgelessTemplates as TemplateManager
  );
}
