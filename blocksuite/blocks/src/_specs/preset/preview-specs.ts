import { EdgelessTextBlockSpec } from '@blocksuite/affine-block-edgeless-text';
import { FrameBlockSpec } from '@blocksuite/affine-block-frame';
import { LatexBlockSpec } from '@blocksuite/affine-block-latex';
import {
  EdgelessSurfaceBlockSpec,
  PageSurfaceBlockSpec,
} from '@blocksuite/affine-block-surface';
import { RefNodeSlotsExtension } from '@blocksuite/affine-components/rich-text';
import {
  DocDisplayMetaService,
  DocModeService,
  EmbedOptionService,
  FontLoaderService,
  ThemeService,
} from '@blocksuite/affine-shared/services';
import {
  BlockViewExtension,
  type ExtensionType,
  FlavourExtension,
} from '@blocksuite/block-std';
import { literal } from 'lit/static-html.js';

import { PreviewEdgelessRootBlockSpec } from '../../root-block/edgeless/edgeless-root-spec.js';
import { PageRootService } from '../../root-block/page/page-root-service.js';
import {
  EdgelessSurfaceRefBlockSpec,
  PageSurfaceRefBlockSpec,
} from '../../surface-ref-block/surface-ref-spec.js';
import {
  CommonFirstPartyBlockSpecs,
  EdgelessFirstPartyBlockSpecs,
} from '../common.js';

const PreviewPageSpec: ExtensionType[] = [
  FlavourExtension('affine:page'),
  PageRootService,
  DocModeService,
  ThemeService,
  EmbedOptionService,
  BlockViewExtension('affine:page', literal`affine-preview-root`),
  DocDisplayMetaService,
];

export const PreviewEdgelessEditorBlockSpecs: ExtensionType[] = [
  PreviewEdgelessRootBlockSpec,
  ...EdgelessFirstPartyBlockSpecs,
  EdgelessSurfaceBlockSpec,
  EdgelessSurfaceRefBlockSpec,
  FrameBlockSpec,
  EdgelessTextBlockSpec,
  LatexBlockSpec,
  FontLoaderService,
  RefNodeSlotsExtension(),
].flat();

export const PreviewEditorBlockSpecs: ExtensionType[] = [
  PreviewPageSpec,
  ...CommonFirstPartyBlockSpecs,
  PageSurfaceBlockSpec,
  PageSurfaceRefBlockSpec,
  LatexBlockSpec,
  FontLoaderService,
  RefNodeSlotsExtension(),
].flat();
