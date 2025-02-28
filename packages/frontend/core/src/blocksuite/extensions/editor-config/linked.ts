import { AtMenuConfigService } from '@affine/core/modules/at-menu-config/services';
import type { LinkedWidgetConfig } from '@blocksuite/affine/blocks';
import { type FrameworkProvider } from '@toeverything/infra';

export function createLinkedWidgetConfig(
  framework: FrameworkProvider
): Partial<LinkedWidgetConfig> {
  return framework.get(AtMenuConfigService).getConfig();
}
