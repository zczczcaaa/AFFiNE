import type { EditorHost } from '@blocksuite/affine/block-std';
import {
  DocModeProvider,
  type ImageBlockModel,
  isInsideEdgelessEditor,
  type NoteBlockModel,
  NoteDisplayMode,
} from '@blocksuite/affine/blocks';
import type { BlockModel } from '@blocksuite/affine/store';

import type { ChatContextValue } from '../chat-panel/chat-context';
import {
  allToCanvas,
  getSelectedImagesAsBlobs,
  getSelectedTextContent,
  getTextContentFromBlockModels,
  selectedToCanvas,
} from './selection-utils';

export async function extractSelectedContent(
  host: EditorHost
): Promise<Partial<ChatContextValue> | null> {
  const docModeService = host.std.get(DocModeProvider);
  const mode = docModeService.getEditorMode() || 'page';
  if (mode === 'edgeless') {
    return await extractEdgelessSelected(host);
  } else {
    return await extractPageSelected(host);
  }
}

async function extractEdgelessSelected(
  host: EditorHost
): Promise<Partial<ChatContextValue> | null> {
  if (!isInsideEdgelessEditor(host)) return null;

  const canvas = await selectedToCanvas(host);
  if (!canvas) return null;

  const blob: Blob | null = await new Promise(resolve =>
    canvas.toBlob(resolve)
  );
  if (!blob) return null;

  return {
    images: [new File([blob], 'selected.png')],
  };
}

async function extractPageSelected(
  host: EditorHost
): Promise<Partial<ChatContextValue> | null> {
  const text = await getSelectedTextContent(host, 'plain-text');
  const images = await getSelectedImagesAsBlobs(host);
  const hasText = text.length > 0;
  const hasImages = images.length > 0;

  if (hasText && !hasImages) {
    const markdown = await getSelectedTextContent(host, 'markdown');
    return {
      quote: text,
      markdown: markdown,
    };
  } else if (!hasText && hasImages && images.length === 1) {
    host.command
      .chain()
      .tryAll(chain => [chain.getImageSelections()])
      .getSelectedBlocks({
        types: ['image'],
      })
      .run();
    return {
      images,
    };
  } else {
    const markdown =
      (await getSelectedTextContent(host, 'markdown')).trim() || '';
    return {
      quote: text,
      markdown,
      images,
    };
  }
}

export async function extractAllContent(
  host: EditorHost
): Promise<Partial<ChatContextValue> | null> {
  const docModeService = host.std.get(DocModeProvider);
  const mode = docModeService.getEditorMode() || 'page';
  if (mode === 'edgeless') {
    return await extractEdgelessAll(host);
  } else {
    return await extractPageAll(host);
  }
}

async function extractEdgelessAll(
  host: EditorHost
): Promise<Partial<ChatContextValue> | null> {
  if (!isInsideEdgelessEditor(host)) return null;

  const canvas = await allToCanvas(host);
  if (!canvas) return null;

  const blob: Blob | null = await new Promise(resolve =>
    canvas.toBlob(resolve)
  );
  if (!blob) return null;

  return {
    images: [new File([blob], `${host.doc.id}.png`)],
  };
}

async function extractPageAll(
  host: EditorHost
): Promise<Partial<ChatContextValue> | null> {
  const notes = host.doc
    .getBlocksByFlavour('affine:note')
    .filter(
      note =>
        (note.model as NoteBlockModel).displayMode !==
        NoteDisplayMode.EdgelessOnly
    )
    .map(note => note.model as NoteBlockModel);
  const blockModels = notes.reduce((acc, note) => {
    acc.push(...note.children);
    return acc;
  }, [] as BlockModel[]);
  const text = await getTextContentFromBlockModels(
    host,
    blockModels,
    'plain-text'
  );
  const markdown = await getTextContentFromBlockModels(
    host,
    blockModels,
    'markdown'
  );
  const blobs = await Promise.all(
    blockModels.map(async s => {
      if (s.flavour !== 'affine:image') return null;
      const sourceId = (s as ImageBlockModel)?.sourceId;
      if (!sourceId) return null;
      const blob = await (sourceId ? host.doc.blobSync.get(sourceId) : null);
      if (!blob) return null;
      return new File([blob], sourceId);
    }) ?? []
  );
  const images = blobs.filter((blob): blob is File => !!blob);

  return {
    quote: text,
    markdown,
    images,
  };
}
