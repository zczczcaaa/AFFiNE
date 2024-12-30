import { bookmarkBlockMarkdownAdapterMatcher } from '@blocksuite/affine-block-bookmark';
import { codeBlockMarkdownAdapterMatcher } from '@blocksuite/affine-block-code';
import { databaseBlockMarkdownAdapterMatcher } from '@blocksuite/affine-block-database';
import { dividerBlockMarkdownAdapterMatcher } from '@blocksuite/affine-block-divider';
import {
  embedFigmaBlockMarkdownAdapterMatcher,
  embedGithubBlockMarkdownAdapterMatcher,
  embedLinkedDocBlockMarkdownAdapterMatcher,
  embedLoomBlockMarkdownAdapterMatcher,
  embedSyncedDocBlockMarkdownAdapterMatcher,
  embedYoutubeBlockMarkdownAdapterMatcher,
} from '@blocksuite/affine-block-embed';
import { imageBlockMarkdownAdapterMatcher } from '@blocksuite/affine-block-image';
import { latexBlockMarkdownAdapterMatcher } from '@blocksuite/affine-block-latex';
import { listBlockMarkdownAdapterMatcher } from '@blocksuite/affine-block-list';
import { paragraphBlockMarkdownAdapterMatcher } from '@blocksuite/affine-block-paragraph';

import { rootBlockMarkdownAdapterMatcher } from '../../../root-block/adapters/markdown.js';

export const defaultBlockMarkdownAdapterMatchers = [
  embedFigmaBlockMarkdownAdapterMatcher,
  embedGithubBlockMarkdownAdapterMatcher,
  embedLinkedDocBlockMarkdownAdapterMatcher,
  embedLoomBlockMarkdownAdapterMatcher,
  embedSyncedDocBlockMarkdownAdapterMatcher,
  embedYoutubeBlockMarkdownAdapterMatcher,
  listBlockMarkdownAdapterMatcher,
  paragraphBlockMarkdownAdapterMatcher,
  bookmarkBlockMarkdownAdapterMatcher,
  codeBlockMarkdownAdapterMatcher,
  databaseBlockMarkdownAdapterMatcher,
  dividerBlockMarkdownAdapterMatcher,
  imageBlockMarkdownAdapterMatcher,
  latexBlockMarkdownAdapterMatcher,
  rootBlockMarkdownAdapterMatcher,
];
