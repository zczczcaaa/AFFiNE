import type { ExtensionType } from '@blocksuite/affine/block-std';
import {
  NoteBlockSpec,
  PageSurfaceBlockSpec,
  PageSurfaceRefBlockSpec,
} from '@blocksuite/affine/blocks';
import {
  FeatureFlagService,
  type FrameworkProvider,
} from '@toeverything/infra';

import { AIBlockSpecs, DefaultBlockSpecs } from './common';
import { createPageRootBlockSpec } from './custom/root-block';

export function createPageModeSpecs(
  framework: FrameworkProvider
): ExtensionType[] {
  const featureFlagService = framework.get(FeatureFlagService);
  const enableAI = featureFlagService.flags.enable_ai.value;
  return [
    ...(enableAI ? AIBlockSpecs : DefaultBlockSpecs),
    PageSurfaceBlockSpec,
    PageSurfaceRefBlockSpec,
    NoteBlockSpec,
    // special
    createPageRootBlockSpec(framework),
  ].flat();
}
