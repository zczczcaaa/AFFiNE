import type { MainEventRegister } from '../type';
import { deleteWorkspace, trashWorkspace } from './handlers';

export * from './handlers';
export * from './subjects';

export const workspaceEvents = {} as Record<string, MainEventRegister>;

export const workspaceHandlers = {
  delete: deleteWorkspace,
  moveToTrash: trashWorkspace,
};
