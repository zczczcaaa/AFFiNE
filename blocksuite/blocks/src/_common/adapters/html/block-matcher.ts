import { BookmarkBlockHtmlAdapterExtension } from '@blocksuite/affine-block-bookmark';
import {
  EmbedFigmaBlockHtmlAdapterExtension,
  EmbedGithubBlockHtmlAdapterExtension,
  EmbedLinkedDocHtmlAdapterExtension,
  EmbedLoomBlockHtmlAdapterExtension,
  EmbedSyncedDocBlockHtmlAdapterExtension,
  EmbedYoutubeBlockHtmlAdapterExtension,
} from '@blocksuite/affine-block-embed';
import { ImageBlockHtmlAdapterExtension } from '@blocksuite/affine-block-image';
import { ListBlockHtmlAdapterExtension } from '@blocksuite/affine-block-list';
import { ParagraphBlockHtmlAdapterExtension } from '@blocksuite/affine-block-paragraph';

import { CodeBlockHtmlAdapterExtension } from '../../../code-block/adapters/html.js';
import { DatabaseBlockHtmlAdapterExtension } from '../../../database-block/adapters/html.js';
import { DividerBlockHtmlAdapterExtension } from '../../../divider-block/adapters/html.js';
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
