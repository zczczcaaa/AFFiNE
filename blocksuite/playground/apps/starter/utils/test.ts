import {
  type BlockSuiteFlags,
  CommunityCanvasTextFonts,
  DocModeProvider,
  EditorSettingExtension,
  FeatureFlagService,
  FontConfigExtension,
  ParseDocUrlProvider,
  RefNodeSlotsProvider,
} from '@blocksuite/blocks';
import type { Container } from '@blocksuite/global/di';
import type { ExtensionType, Store, Workspace } from '@blocksuite/store';

import {
  mockDocModeService,
  mockEditorSetting,
} from '../../_common/mock-services';

export async function prepareTestApp(collection: Workspace) {
  const params = new URLSearchParams(location.search);
  const allFlags = params.getAll('flag');
  const flags = allFlags.reduce(
    (acc, flag) => {
      acc[flag] = true;
      return acc;
    },
    {} as Record<string, boolean>
  );
  const noInit = params.get('noInit') === 'true';
  const store = await getStore(collection, noInit);
  await createTestApp(store, collection, flags);
}

async function getStore(
  collection: Workspace,
  noInit: boolean
): Promise<Store> {
  if (!noInit) {
    collection.meta.initialize();
    const doc = collection.createDoc({ id: 'doc:home' });
    window.doc = doc;
    return doc;
  }

  const doc = collection.docs.values().next().value;
  const firstDoc = doc?.getStore();
  if (firstDoc) {
    window.doc = firstDoc;
    return firstDoc;
  }

  const { resolve, reject, promise } = Promise.withResolvers<Store>();
  collection.slots.docListUpdated.on(() => {
    const doc = collection.docs.values().next().value;
    const firstDoc = doc?.getStore();
    if (!firstDoc) {
      reject(new Error(`Failed to get doc`));
      return;
    }
    window.doc = firstDoc;
    resolve(firstDoc);
  });

  return promise;
}

async function createTestApp(
  doc: Store,
  collection: Workspace,
  flags: Partial<BlockSuiteFlags> = {}
) {
  doc.load();

  if (!doc.root) {
    await new Promise(resolve => doc.slots.rootAdded.once(resolve));
  }

  // add app root from https://github.com/toeverything/blocksuite/commit/947201981daa64c5ceeca5fd549460c34e2dabfa
  const appRoot = document.querySelector('#app');
  if (!appRoot) {
    throw new Error('Cannot find app root element(#app).');
  }

  const editor = createEditor(doc, collection, appRoot, flags);
  await editor.updateComplete;

  const debugMenu = document.createElement('starter-debug-menu');
  const docsPanel = document.createElement('docs-panel');
  const framePanel = document.createElement('custom-frame-panel');
  const outlinePanel = document.createElement('custom-outline-panel');
  const outlineViewer = document.createElement('custom-outline-viewer');
  const leftSidePanel = document.createElement('left-side-panel');
  docsPanel.editor = editor;
  framePanel.editor = editor;
  outlinePanel.editor = editor;
  outlineViewer.editor = editor;
  debugMenu.collection = collection;
  debugMenu.editor = editor;
  debugMenu.docsPanel = docsPanel;
  debugMenu.framePanel = framePanel;
  debugMenu.outlineViewer = outlineViewer;
  debugMenu.outlinePanel = outlinePanel;
  debugMenu.leftSidePanel = leftSidePanel;
  document.body.append(debugMenu);
  document.body.append(leftSidePanel);
  document.body.append(framePanel);
  document.body.append(outlinePanel);
  document.body.append(outlineViewer);

  window.editor = editor;
  window.doc = doc;
  Object.defineProperty(globalThis, 'host', {
    get() {
      return document.querySelector('editor-host');
    },
  });
  Object.defineProperty(globalThis, 'std', {
    get() {
      return document.querySelector('editor-host')?.std;
    },
  });
}

function createEditor(
  doc: Store,
  collection: Workspace,
  appRoot: Element,
  flags: Partial<BlockSuiteFlags> = {}
) {
  const editor = document.createElement('affine-editor-container');
  for (const [key, value] of Object.entries(flags)) {
    doc.get(FeatureFlagService).setFlag(key as keyof BlockSuiteFlags, value);
  }
  doc.get(FeatureFlagService).setFlag('enable_advanced_block_visibility', true);

  editor.doc = doc;
  editor.autofocus = true;
  const defaultExtensions: ExtensionType[] = [
    FontConfigExtension(CommunityCanvasTextFonts),
    EditorSettingExtension(mockEditorSetting()),
    {
      setup: (di: Container) => {
        di.addImpl(ParseDocUrlProvider, {
          parseDocUrl() {
            return undefined;
          },
        });
      },
    },
    {
      setup: (di: Container) => {
        di.override(
          DocModeProvider,
          mockDocModeService(
            () => editor.mode,
            (mode: 'page' | 'edgeless') => editor.switchEditor(mode)
          )
        );
      },
    },
  ];
  editor.pageSpecs = [...editor.pageSpecs, ...defaultExtensions];
  editor.edgelessSpecs = [...editor.edgelessSpecs, ...defaultExtensions];

  editor.std
    .get(RefNodeSlotsProvider)
    .docLinkClicked.on(({ pageId: docId }) => {
      const newDoc = collection.getDoc(docId);
      if (!newDoc) {
        throw new Error(`Failed to jump to page ${docId}`);
      }
      editor.doc = newDoc;
    });
  appRoot.append(editor);
  return editor;
}
