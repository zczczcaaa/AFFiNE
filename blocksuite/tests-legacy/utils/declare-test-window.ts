import type {
  DocModeProvider,
  DocModeService,
  ParseDocUrlProvider,
  QuickSearchProvider,
  ThemeProvider,
} from '@blocksuite/affine-shared/services';
import type { EditorHost } from '@blocksuite/block-std';
import type { RefNodeSlotsProvider } from '@blocksuite/blocks';
import type { AffineEditorContainer } from '@blocksuite/presets';
import type {
  BlockModel,
  ExtensionType,
  Store,
  Transformer,
  Workspace,
} from '@blocksuite/store';

declare global {
  interface Window {
    /** Available on playground window
     * the following instance are initialized in `packages/playground/apps/starter/main.ts`
     */
    $blocksuite: {
      store: typeof import('@blocksuite/store');
      blocks: typeof import('@blocksuite/blocks');
      global: {
        utils: typeof import('@blocksuite/global/utils');
      };
      editor: typeof import('@blocksuite/presets');
      blockStd: typeof import('@blocksuite/block-std');
      identifiers: {
        QuickSearchProvider: typeof QuickSearchProvider;
        DocModeProvider: typeof DocModeProvider;
        ThemeProvider: typeof ThemeProvider;
        RefNodeSlotsProvider: typeof RefNodeSlotsProvider;
        ParseDocUrlService: typeof ParseDocUrlProvider;
      };
      defaultExtensions: () => ExtensionType[];
      mockServices: {
        mockDocModeService: typeof DocModeService;
      };
    };
    collection: Workspace;
    blockSchema: Record<string, typeof BlockModel>;
    doc: Store;
    debugMenu: HTMLElement;
    editor: AffineEditorContainer;
    host: EditorHost;
    job: Transformer;
  }
}
