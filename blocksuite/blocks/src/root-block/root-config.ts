import type { ToolbarMoreMenuConfig } from '@blocksuite/affine-components/toolbar';

import type { DatabaseOptionsConfig } from '../database-block/config.js';
import type { DocRemoteSelectionConfig } from './widgets/doc-remote-selection/config.js';
import type { KeyboardToolbarConfig } from './widgets/keyboard-toolbar/config.js';
import type { LinkedWidgetConfig } from './widgets/linked-doc/index.js';

export interface RootBlockConfig {
  linkedWidget?: Partial<LinkedWidgetConfig>;
  docRemoteSelectionWidget?: Partial<DocRemoteSelectionConfig>;
  toolbarMoreMenu?: Partial<ToolbarMoreMenuConfig>;
  databaseOptions?: Partial<DatabaseOptionsConfig>;
  keyboardToolbar?: Partial<KeyboardToolbarConfig>;
}
