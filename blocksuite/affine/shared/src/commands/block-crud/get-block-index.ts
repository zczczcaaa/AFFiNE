import type { BlockComponent, Command } from '@blocksuite/block-std';

export const getBlockIndexCommand: Command<
  {
    currentSelectionPath?: string;
    path?: string;
  },
  {
    blockIndex?: number;
    parentBlock?: BlockComponent;
  }
> = (ctx, next) => {
  const path = ctx.path ?? ctx.currentSelectionPath;
  if (!path) {
    console.error(
      '`path` is required, you need to pass it in args or ctx before adding this command to the pipeline.'
    );
    return;
  }

  const parentModel = ctx.std.store.getParent(path);
  if (!parentModel) return;

  const parent = ctx.std.view.getBlock(parentModel.id);
  if (!parent) return;

  const index = parent.childBlocks.findIndex(x => {
    return x.blockId === path;
  });

  next({
    blockIndex: index,
    parentBlock: parent as BlockComponent,
  });
};
