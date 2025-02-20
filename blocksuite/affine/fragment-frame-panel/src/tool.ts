import type { NavigatorMode } from '@blocksuite/affine-block-frame';
import { BaseTool } from '@blocksuite/block-std/gfx';

type PresentToolOption = {
  mode?: NavigatorMode;
};

export class PresentTool extends BaseTool<PresentToolOption> {
  static override toolName: string = 'frameNavigator';
}

declare module '@blocksuite/block-std/gfx' {
  interface GfxToolsMap {
    frameNavigator: PresentTool;
  }

  interface GfxToolsOption {
    frameNavigator: PresentToolOption;
  }
}
