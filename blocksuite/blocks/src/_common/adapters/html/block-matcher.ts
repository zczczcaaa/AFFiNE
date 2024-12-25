import {
  EmbedFigmaBlockHtmlAdapterExtension,
  EmbedGithubBlockHtmlAdapterExtension,
  EmbedLinkedDocHtmlAdapterExtension,
  EmbedLoomBlockHtmlAdapterExtension,
  EmbedSyncedDocBlockHtmlAdapterExtension,
  EmbedYoutubeBlockHtmlAdapterExtension,
} from '@blocksuite/affine-block-embed';
import { ListBlockHtmlAdapterExtension } from '@blocksuite/affine-block-list';
import { ParagraphBlockHtmlAdapterExtension } from '@blocksuite/affine-block-paragraph';

import { BookmarkBlockHtmlAdapterExtension } from '../../../bookmark-block/adapters/html.js';
import { CodeBlockHtmlAdapterExtension } from '../../../code-block/adapters/html.js';
import { DatabaseBlockHtmlAdapterExtension } from '../../../database-block/adapters/html.js';
import { DividerBlockHtmlAdapterExtension } from '../../../divider-block/adapters/html.js';
import { ImageBlockHtmlAdapterExtension } from '../../../image-block/adapters/html.js';
import { RootBlockHtmlAdapterExtension } from '../../../root-block/adapters/html.js';

export const defaultBlockHtmlAdapterMatchers = [
  ListBlockHtmlAdapterExtension,
  ParagraphBlockHtmlAdapterExtension,
  CodeBlockHtmlAdapterExtension,
  DividerBlockHtmlAdapterExtension,
  ImageBlockHtmlAdapterExtension,
  RootBlockHtmlAdapterExtension,
  EmbedYoutubeBlockHtmlAdapterExtension,
  EmbedFigmaBlockHtmlAdapterExtension,
  EmbedLoomBlockHtmlAdapterExtension,
  EmbedGithubBlockHtmlAdapterExtension,
  BookmarkBlockHtmlAdapterExtension,
  DatabaseBlockHtmlAdapterExtension,
  EmbedLinkedDocHtmlAdapterExtension,
  EmbedSyncedDocBlockHtmlAdapterExtension,
];
