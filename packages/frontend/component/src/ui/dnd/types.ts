import type { dropTargetForExternal } from '@atlaskit/pragmatic-drag-and-drop/external/adapter';

export interface DNDData<
  Draggable extends Record<string, unknown> = Record<string, unknown>,
  DropTarget extends Record<string, unknown> = Record<string, unknown>,
> {
  draggable: Draggable;
  dropTarget: DropTarget;
}

export type ExternalGetDataFeedbackArgs = Parameters<
  NonNullable<Parameters<typeof dropTargetForExternal>[0]['getData']>
>[0];

export type ExternalDataAdapter<D extends DNDData> = (
  args: ExternalGetDataFeedbackArgs,
  isDropEvent?: boolean
) => D['draggable'];
