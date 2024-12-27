import { AttachmentBlockSpec } from '@blocksuite/affine-block-attachment';
import { BookmarkBlockSpec } from '@blocksuite/affine-block-bookmark';
import { DividerBlockSpec } from '@blocksuite/affine-block-divider';
import { EmbedExtensions } from '@blocksuite/affine-block-embed';
import { ImageBlockSpec } from '@blocksuite/affine-block-image';
import { ListBlockSpec } from '@blocksuite/affine-block-list';
import {
  EdgelessNoteBlockSpec,
  NoteBlockSpec,
} from '@blocksuite/affine-block-note';
import { ParagraphBlockSpec } from '@blocksuite/affine-block-paragraph';
import { RichTextExtensions } from '@blocksuite/affine-components/rich-text';
import { EditPropsStore } from '@blocksuite/affine-shared/services';
import type { ExtensionType } from '@blocksuite/block-std';

import { AdapterFactoryExtensions } from '../_common/adapters/extension.js';
import { CodeBlockSpec } from '../code-block/code-block-spec.js';
import { DataViewBlockSpec } from '../data-view-block/data-view-spec.js';
import { DatabaseBlockSpec } from '../database-block/database-spec.js';

export const CommonFirstPartyBlockSpecs: ExtensionType[] = [
  RichTextExtensions,
  EditPropsStore,
  ListBlockSpec,
  NoteBlockSpec,
  DatabaseBlockSpec,
  DataViewBlockSpec,
  DividerBlockSpec,
  CodeBlockSpec,
  ImageBlockSpec,
  ParagraphBlockSpec,
  BookmarkBlockSpec,
  AttachmentBlockSpec,
  EmbedExtensions,
  AdapterFactoryExtensions,
].flat();

export const EdgelessFirstPartyBlockSpecs: ExtensionType[] = [
  RichTextExtensions,
  EditPropsStore,
  ListBlockSpec,
  EdgelessNoteBlockSpec,
  DatabaseBlockSpec,
  DataViewBlockSpec,
  DividerBlockSpec,
  CodeBlockSpec,
  ImageBlockSpec,
  ParagraphBlockSpec,
  BookmarkBlockSpec,
  AttachmentBlockSpec,
  EmbedExtensions,
  AdapterFactoryExtensions,
].flat();
