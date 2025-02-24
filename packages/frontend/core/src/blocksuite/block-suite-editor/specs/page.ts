import { enableAIExtension } from '@affine/core/blocksuite/ai';
import { enableAffineExtension } from '@affine/core/blocksuite/extensions';
import { type SpecBuilder, SpecProvider } from '@blocksuite/affine/blocks';
import { type FrameworkProvider } from '@toeverything/infra';

export function createPageModeSpecs(framework: FrameworkProvider): SpecBuilder {
  const pageSpec = SpecProvider._.getSpec('page');
  enableAffineExtension(pageSpec, framework);
  enableAIExtension(pageSpec, framework);
  return pageSpec;
}
