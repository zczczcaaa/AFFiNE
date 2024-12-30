import { AttachmentBlockSpec } from '@blocksuite/affine-block-attachment';
import { BookmarkBlockSpec } from '@blocksuite/affine-block-bookmark';
import { CodeBlockSpec } from '@blocksuite/affine-block-code';
import { DividerBlockSpec } from '@blocksuite/affine-block-divider';
import { EdgelessTextBlockSpec } from '@blocksuite/affine-block-edgeless-text';
import { EmbedExtensions } from '@blocksuite/affine-block-embed';
import { FrameBlockSpec } from '@blocksuite/affine-block-frame';
import { ImageBlockSpec } from '@blocksuite/affine-block-image';
import { LatexBlockSpec } from '@blocksuite/affine-block-latex';
import { ListBlockSpec } from '@blocksuite/affine-block-list';
import {
  EdgelessNoteBlockSpec,
  NoteBlockSpec,
} from '@blocksuite/affine-block-note';
import { ParagraphBlockSpec } from '@blocksuite/affine-block-paragraph';
import {
  EdgelessSurfaceBlockSpec,
  PageSurfaceBlockSpec,
} from '@blocksuite/affine-block-surface';
import {
  RefNodeSlotsExtension,
  RichTextExtensions,
} from '@blocksuite/affine-components/rich-text';
import {
  EditPropsStore,
  FontLoaderService,
} from '@blocksuite/affine-shared/services';
import type { ExtensionType } from '@blocksuite/block-std';

import { AdapterFactoryExtensions } from '../_common/adapters/extension.js';
import { DataViewBlockSpec } from '../data-view-block/data-view-spec.js';
import { DatabaseBlockSpec } from '../database-block/database-spec.js';
import {
  EdgelessSurfaceRefBlockSpec,
  PageSurfaceRefBlockSpec,
} from '../surface-ref-block/surface-ref-spec.js';

export const CommonBlockSpecs: ExtensionType[] = [
  RefNodeSlotsExtension,
  EditPropsStore,
  RichTextExtensions,
  LatexBlockSpec,
  ListBlockSpec,
  DatabaseBlockSpec,
  DataViewBlockSpec,
  DividerBlockSpec,
  BookmarkBlockSpec,
  EmbedExtensions,
  AttachmentBlockSpec,
  AdapterFactoryExtensions,
  CodeBlockSpec,
  ImageBlockSpec,
  ParagraphBlockSpec,
].flat();

export const PageFirstPartyBlockSpecs: ExtensionType[] = [
  ...CommonBlockSpecs,
  NoteBlockSpec,
  PageSurfaceBlockSpec,
  PageSurfaceRefBlockSpec,
  FontLoaderService,
].flat();

export const EdgelessFirstPartyBlockSpecs: ExtensionType[] = [
  ...CommonBlockSpecs,

  EdgelessNoteBlockSpec,
  EdgelessSurfaceBlockSpec,
  EdgelessSurfaceRefBlockSpec,
  FrameBlockSpec,
  EdgelessTextBlockSpec,
  FontLoaderService,
].flat();
