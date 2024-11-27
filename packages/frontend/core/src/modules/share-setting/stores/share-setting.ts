import type { WorkspaceServerService } from '@affine/core/modules/cloud';
import {
  getEnableUrlPreviewQuery,
  setEnableUrlPreviewMutation,
} from '@affine/graphql';
import { Store } from '@toeverything/infra';

export class WorkspaceShareSettingStore extends Store {
  constructor(private readonly workspaceServerService: WorkspaceServerService) {
    super();
  }

  async fetchWorkspaceEnableUrlPreview(
    workspaceId: string,
    signal?: AbortSignal
  ) {
    if (!this.workspaceServerService.server) {
      throw new Error('No Server');
    }
    const data = await this.workspaceServerService.server.gql({
      query: getEnableUrlPreviewQuery,
      variables: {
        id: workspaceId,
      },
      context: {
        signal,
      },
    });
    return data.workspace.enableUrlPreview;
  }

  async updateWorkspaceEnableUrlPreview(
    workspaceId: string,
    enableUrlPreview: boolean,
    signal?: AbortSignal
  ) {
    if (!this.workspaceServerService.server) {
      throw new Error('No Server');
    }
    await this.workspaceServerService.server.gql({
      query: setEnableUrlPreviewMutation,
      variables: {
        id: workspaceId,
        enableUrlPreview,
      },
      context: {
        signal,
      },
    });
  }
}
