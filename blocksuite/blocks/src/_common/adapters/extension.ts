import {
  HtmlAdapterFactoryExtension,
  PlainTextAdapterFactoryExtension,
} from '@blocksuite/affine-shared/adapters';
import type { ExtensionType } from '@blocksuite/block-std';

import { AttachmentAdapterFactoryExtension } from './attachment.js';
import { htmlInlineToDeltaMatchers } from './html/delta-converter/html-inline.js';
import { inlineDeltaToHtmlAdapterMatchers } from './html/delta-converter/inline-delta.js';
import { ImageAdapterFactoryExtension } from './image.js';
import { MarkdownAdapterFactoryExtension } from './markdown/markdown.js';
import { MixTextAdapterFactoryExtension } from './mix-text.js';
import { notionHtmlInlineToDeltaMatchers } from './notion-html/delta-converter/html-inline.js';
import { NotionHtmlAdapterFactoryExtension } from './notion-html/notion-html.js';
import { NotionTextAdapterFactoryExtension } from './notion-text.js';
import { inlineDeltaToPlainTextAdapterMatchers } from './plain-text/delta-converter/inline-delta.js';

export const AdapterFactoryExtensions: ExtensionType[] = [
  ...htmlInlineToDeltaMatchers,
  ...inlineDeltaToHtmlAdapterMatchers,
  ...notionHtmlInlineToDeltaMatchers,
  ...inlineDeltaToPlainTextAdapterMatchers,
  AttachmentAdapterFactoryExtension,
  ImageAdapterFactoryExtension,
  MarkdownAdapterFactoryExtension,
  PlainTextAdapterFactoryExtension,
  HtmlAdapterFactoryExtension,
  NotionTextAdapterFactoryExtension,
  NotionHtmlAdapterFactoryExtension,
  MixTextAdapterFactoryExtension,
];
