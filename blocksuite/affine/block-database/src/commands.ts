import type { BlockCommands, Command } from '@blocksuite/block-std';

export const insertDatabaseBlockCommand: Command<
  'selectedModels',
  'insertedDatabaseBlockId',
  {
    viewType: string;
    place?: 'after' | 'before';
    removeEmptyLine?: boolean;
  }
> = (ctx, next) => {
  const { selectedModels, viewType, place, removeEmptyLine, std } = ctx;
  if (!selectedModels?.length) return;

  const targetModel =
    place === 'before'
      ? selectedModels[0]
      : selectedModels[selectedModels.length - 1];

  const service = std.getService('affine:database');
  if (!service || !targetModel) return;

  const result = std.store.addSiblingBlocks(
    targetModel,
    [{ flavour: 'affine:database' }],
    place
  );
  const string = result[0];

  if (string == null) return;

  service.initDatabaseBlock(std.store, targetModel, string, viewType, false);

  if (removeEmptyLine && targetModel.text?.length === 0) {
    std.store.deleteBlock(targetModel);
  }

  next({ insertedDatabaseBlockId: string });
};

export const commands: BlockCommands = {
  insertDatabaseBlock: insertDatabaseBlockCommand,
};
