import { BookmarkBlockHtmlAdapterExtension } from '@blocksuite/affine-block-bookmark';
import { CodeBlockHtmlAdapterExtension } from '@blocksuite/affine-block-code';
import { DividerBlockHtmlAdapterExtension } from '@blocksuite/affine-block-divider';
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

import { DatabaseBlockHtmlAdapterExtension } from '../../../database-block/adapters/html.js';
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
