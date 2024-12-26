import { BookmarkBlockPlainTextAdapterExtension } from '@blocksuite/affine-block-bookmark';
import {
  EmbedFigmaBlockPlainTextAdapterExtension,
  EmbedGithubBlockPlainTextAdapterExtension,
  EmbedLinkedDocBlockPlainTextAdapterExtension,
  EmbedLoomBlockPlainTextAdapterExtension,
  EmbedSyncedDocBlockPlainTextAdapterExtension,
  EmbedYoutubeBlockPlainTextAdapterExtension,
} from '@blocksuite/affine-block-embed';
import { LatexBlockPlainTextAdapterExtension } from '@blocksuite/affine-block-latex';
import { ListBlockPlainTextAdapterExtension } from '@blocksuite/affine-block-list';
import { ParagraphBlockPlainTextAdapterExtension } from '@blocksuite/affine-block-paragraph';
import type { ExtensionType } from '@blocksuite/block-std';

import { CodeBlockPlainTextAdapterExtension } from '../../../code-block/adapters/plain-text.js';
import { DatabaseBlockPlainTextAdapterExtension } from '../../../database-block/adapters/plain-text.js';
import { DividerBlockPlainTextAdapterExtension } from '../../../divider-block/adapters/plain-text.js';

export const defaultBlockPlainTextAdapterMatchers: ExtensionType[] = [
  ParagraphBlockPlainTextAdapterExtension,
  ListBlockPlainTextAdapterExtension,
  DividerBlockPlainTextAdapterExtension,
  CodeBlockPlainTextAdapterExtension,
  BookmarkBlockPlainTextAdapterExtension,
  EmbedFigmaBlockPlainTextAdapterExtension,
  EmbedGithubBlockPlainTextAdapterExtension,
  EmbedLoomBlockPlainTextAdapterExtension,
  EmbedYoutubeBlockPlainTextAdapterExtension,
  EmbedLinkedDocBlockPlainTextAdapterExtension,
  EmbedSyncedDocBlockPlainTextAdapterExtension,
  LatexBlockPlainTextAdapterExtension,
  DatabaseBlockPlainTextAdapterExtension,
];
