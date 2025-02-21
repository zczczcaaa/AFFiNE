import {
  HtmlInlineToDeltaAdapterExtensions,
  InlineDeltaToHtmlAdapterExtensions,
  InlineDeltaToMarkdownAdapterExtensions,
  MarkdownInlineToDeltaAdapterExtensions,
  NotionHtmlInlineToDeltaAdapterExtensions,
} from '@blocksuite/affine-components/rich-text';
import type { ExtensionType } from '@blocksuite/store';

import {
  defaultBlockHtmlAdapterMatchers,
  defaultBlockMarkdownAdapterMatchers,
  defaultBlockNotionHtmlAdapterMatchers,
} from '../../_common/adapters';

export const HtmlAdapterExtension: ExtensionType[] = [
  ...HtmlInlineToDeltaAdapterExtensions,
  ...defaultBlockHtmlAdapterMatchers,
  ...InlineDeltaToHtmlAdapterExtensions,
];

export const MarkdownAdapterExtension: ExtensionType[] = [
  ...MarkdownInlineToDeltaAdapterExtensions,
  ...defaultBlockMarkdownAdapterMatchers,
  ...InlineDeltaToMarkdownAdapterExtensions,
];

export const NotionHtmlAdapterExtension: ExtensionType[] = [
  ...NotionHtmlInlineToDeltaAdapterExtensions,
  ...defaultBlockNotionHtmlAdapterMatchers,
];
