import type {
  Cell,
  Column,
  ColumnUpdater,
  DatabaseBlockModel,
  ViewBasicDataType,
} from '@blocksuite/affine-model';
import {
  arrayMove,
  insertPositionToIndex,
  type InsertToPosition,
} from '@blocksuite/affine-shared/utils';
import type { BlockModel } from '@blocksuite/store';

export function addProperty(
  model: DatabaseBlockModel,
  position: InsertToPosition,
  column: Omit<Column, 'id'> & {
    id?: string;
  }
): string {
  const id = column.id ?? model.doc.workspace.idGenerator();
  if (model.columns.some(v => v.id === id)) {
    return id;
  }
  model.doc.transact(() => {
    const col: Column = {
      ...column,
      id,
    };
    model.columns.splice(
      insertPositionToIndex(position, model.columns),
      0,
      col
    );
  });
  return id;
}

export function copyCellsByProperty(
  model: DatabaseBlockModel,
  fromId: Column['id'],
  toId: Column['id']
) {
  model.doc.transact(() => {
    Object.keys(model.cells).forEach(rowId => {
      const cell = model.cells[rowId]?.[fromId];
      if (cell && model.cells[rowId]) {
        model.cells[rowId][toId] = {
          ...cell,
          columnId: toId,
        };
      }
    });
  });
}

export function deleteColumn(
  model: DatabaseBlockModel,
  columnId: Column['id']
) {
  const index = model.columns.findIndex(v => v.id === columnId);
  if (index < 0) return;

  model.doc.transact(() => {
    model.columns.splice(index, 1);
  });
}

export function deleteRows(model: DatabaseBlockModel, rowIds: string[]) {
  model.doc.transact(() => {
    for (const rowId of rowIds) {
      delete model.cells[rowId];
    }
  });
}

export function deleteView(model: DatabaseBlockModel, id: string) {
  model.doc.captureSync();
  model.doc.transact(() => {
    model.views = model.views.filter(v => v.id !== id);
  });
}

export function duplicateView(model: DatabaseBlockModel, id: string): string {
  const newId = model.doc.workspace.idGenerator();
  model.doc.transact(() => {
    const index = model.views.findIndex(v => v.id === id);
    const view = model.views[index];
    if (view) {
      model.views.splice(
        index + 1,
        0,
        JSON.parse(JSON.stringify({ ...view, id: newId }))
      );
    }
  });
  return newId;
}

export function getCell(
  model: DatabaseBlockModel,
  rowId: BlockModel['id'],
  columnId: Column['id']
): Cell | null {
  if (columnId === 'title') {
    return {
      columnId: 'title',
      value: rowId,
    };
  }
  const yRow = model.cells$.value[rowId];
  const yCell = yRow?.[columnId] ?? null;
  if (!yCell) return null;

  return {
    columnId: yCell.columnId,
    value: yCell.value,
  };
}

export function getProperty(
  model: DatabaseBlockModel,
  id: Column['id']
): Column | undefined {
  return model.columns.find(v => v.id === id);
}

export function moveViewTo(
  model: DatabaseBlockModel,
  id: string,
  position: InsertToPosition
) {
  model.doc.transact(() => {
    model.views = arrayMove(
      model.views,
      v => v.id === id,
      arr => insertPositionToIndex(position, arr)
    );
  });
}

export function updateCell(
  model: DatabaseBlockModel,
  rowId: string,
  cell: Cell
) {
  model.doc.transact(() => {
    const columnId = cell.columnId;
    if (
      rowId === '__proto__' ||
      rowId === 'constructor' ||
      rowId === 'prototype'
    ) {
      console.error('Invalid rowId');
      return;
    }
    if (
      columnId === '__proto__' ||
      columnId === 'constructor' ||
      columnId === 'prototype'
    ) {
      console.error('Invalid columnId');
      return;
    }
    if (!model.cells[rowId]) {
      model.cells[rowId] = Object.create(null);
    }
    if (model.cells[rowId]) {
      model.cells[rowId][columnId] = {
        columnId: columnId,
        value: cell.value,
      };
    }
  });
}

export function updateCells(
  model: DatabaseBlockModel,
  columnId: string,
  cells: Record<string, unknown>
) {
  model.doc.transact(() => {
    Object.entries(cells).forEach(([rowId, value]) => {
      if (
        rowId === '__proto__' ||
        rowId === 'constructor' ||
        rowId === 'prototype'
      ) {
        throw new Error('Invalid rowId');
      }
      if (!model.cells[rowId]) {
        model.cells[rowId] = Object.create(null);
      }
      if (model.cells[rowId]) {
        model.cells[rowId][columnId] = {
          columnId,
          value,
        };
      }
    });
  });
}

export function updateProperty(
  model: DatabaseBlockModel,
  id: string,
  updater: ColumnUpdater,
  defaultValue?: Record<string, unknown>
) {
  const index = model.columns.findIndex(v => v.id === id);
  if (index == null) {
    return;
  }
  model.doc.transact(() => {
    const column = model.columns[index];
    if (!column) {
      return;
    }
    const result = updater(column);
    model.columns[index] = { ...defaultValue, ...column, ...result };
  });
  return id;
}

export const updateView = <ViewData extends ViewBasicDataType>(
  model: DatabaseBlockModel,
  id: string,
  update: (data: ViewData) => Partial<ViewData>
) => {
  model.doc.transact(() => {
    model.views = model.views.map(v => {
      if (v.id !== id) {
        return v;
      }
      return { ...v, ...update(v as ViewData) };
    });
  });
};
export const DATABASE_CONVERT_WHITE_LIST = ['affine:list', 'affine:paragraph'];
