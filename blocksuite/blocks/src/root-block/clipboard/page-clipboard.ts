import { deleteTextCommand } from '@blocksuite/affine-components/rich-text';
import {
  clearAndSelectFirstModelCommand,
  deleteSelectedModelsCommand,
  getBlockIndexCommand,
  getBlockSelectionsCommand,
  getImageSelectionsCommand,
  getSelectedModelsCommand,
  getTextSelectionCommand,
  retainFirstModelCommand,
} from '@blocksuite/affine-shared/commands';
import type { UIEventHandler } from '@blocksuite/block-std';
import { DisposableGroup } from '@blocksuite/global/utils';
import type { BlockSnapshot, Store } from '@blocksuite/store';

import { ReadOnlyClipboard } from './readonly-clipboard';

/**
 * PageClipboard is a class that provides a clipboard for the page root block.
 * It is supported to copy and paste models in the page root block.
 */
export class PageClipboard extends ReadOnlyClipboard {
  protected _init = () => {
    this._initAdapters();
  };

  onBlockSnapshotPaste = async (
    snapshot: BlockSnapshot,
    doc: Store,
    parent?: string,
    index?: number
  ) => {
    const block = await this._std.clipboard.pasteBlockSnapshot(
      snapshot,
      doc,
      parent,
      index
    );
    return block?.id ?? null;
  };

  onPageCut: UIEventHandler = ctx => {
    const e = ctx.get('clipboardState').raw;
    e.preventDefault();

    this._copySelected(() => {
      this._std.command
        .chain()
        .try<{}>(cmd => [
          cmd.pipe(getTextSelectionCommand).pipe(deleteTextCommand),
          cmd.pipe(getSelectedModelsCommand).pipe(deleteSelectedModelsCommand),
        ])
        .run();
    }).run();
  };

  onPagePaste: UIEventHandler = ctx => {
    const e = ctx.get('clipboardState').raw;
    e.preventDefault();

    this._std.store.captureSync();
    this._std.command
      .chain()
      .try<{}>(cmd => [
        cmd.pipe(getTextSelectionCommand).pipe((ctx, next) => {
          const { currentTextSelection } = ctx;
          if (!currentTextSelection) {
            return;
          }
          const { from, to } = currentTextSelection;
          if (to && from.blockId !== to.blockId) {
            this._std.command.exec(deleteTextCommand, {
              currentTextSelection,
            });
          }
          return next();
        }),
        cmd
          .pipe(getSelectedModelsCommand)
          .pipe(clearAndSelectFirstModelCommand)
          .pipe(retainFirstModelCommand)
          .pipe(deleteSelectedModelsCommand),
      ])
      .try<{ currentSelectionPath: string }>(cmd => [
        cmd.pipe(getTextSelectionCommand).pipe((ctx, next) => {
          const textSelection = ctx.currentTextSelection;
          if (!textSelection) {
            return;
          }
          next({ currentSelectionPath: textSelection.from.blockId });
        }),
        cmd.pipe(getBlockSelectionsCommand).pipe((ctx, next) => {
          const currentBlockSelections = ctx.currentBlockSelections;
          if (!currentBlockSelections) {
            return;
          }
          const blockSelection = currentBlockSelections.at(-1);
          if (!blockSelection) {
            return;
          }
          next({ currentSelectionPath: blockSelection.blockId });
        }),
        cmd.pipe(getImageSelectionsCommand).pipe((ctx, next) => {
          const currentImageSelections = ctx.currentImageSelections;
          if (!currentImageSelections) {
            return;
          }
          const imageSelection = currentImageSelections.at(-1);
          if (!imageSelection) {
            return;
          }
          next({ currentSelectionPath: imageSelection.blockId });
        }),
      ])
      .pipe(getBlockIndexCommand)
      .pipe((ctx, next) => {
        if (!ctx.parentBlock) {
          return;
        }
        this._std.clipboard
          .paste(
            e,
            this._std.store,
            ctx.parentBlock.model.id,
            ctx.blockIndex ? ctx.blockIndex + 1 : 1
          )
          .catch(console.error);

        return next();
      })
      .run();
  };

  override hostConnected() {
    if (this._disposables.disposed) {
      this._disposables = new DisposableGroup();
    }
    if (navigator.clipboard) {
      this.host.handleEvent('copy', this.onPageCopy);
      this.host.handleEvent('paste', this.onPagePaste);
      this.host.handleEvent('cut', this.onPageCut);
      this._init();
    }
  }
}
