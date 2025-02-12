import { addSampleNotes } from './doc-generator.js';
import { doc, editor } from './editor.js';

function main() {
  doc.load();
  addSampleNotes(6);
}

main();
document.querySelector('#container')?.append(editor);
