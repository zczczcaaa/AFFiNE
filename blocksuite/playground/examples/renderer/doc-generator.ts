import { Text } from '@blocksuite/store';

import { doc } from './editor.js';

function addParagraph(noteId: string, content: string) {
  const props = { text: new Text(content) };
  doc.addBlock('affine:paragraph', props, noteId);
}

function addSampleNote(noteId: string, i: number) {
  addParagraph(noteId, `Note ${i + 1}`);
  addParagraph(noteId, 'Hello World!');
  addParagraph(
    noteId,
    'Hello World! Lorem ipsum dolor sit amet. Consectetur adipiscing elit. Sed do eiusmod tempor incididunt.'
  );
  addParagraph(
    noteId,
    '你好这是测试，这是一个为了换行而写的中文段落。这个段落会自动换行。'
  );
}

export function addSampleNotes(n: number) {
  const cols = Math.ceil(Math.sqrt(n));
  const NOTE_WIDTH = 500;
  const NOTE_HEIGHT = 250;
  const SPACING = 50;

  const rootId = doc.addBlock('affine:page', {});
  doc.addBlock('affine:surface', {}, rootId);

  for (let i = 0; i < n; i++) {
    const row = Math.floor(i / cols);
    const col = i % cols;
    const x = col * (NOTE_WIDTH + SPACING);
    const y = row * (NOTE_HEIGHT + SPACING);

    const xywh = `[${x},${y},${NOTE_WIDTH},${NOTE_HEIGHT}]`;
    const noteId = doc.addBlock('affine:note', { xywh }, rootId);
    addSampleNote(noteId, i);
  }
}
