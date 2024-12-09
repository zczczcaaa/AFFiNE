import { Injectable, Logger } from '@nestjs/common';

import { MemberQuotaExceeded } from '../../fundamentals';
import { FeatureService, FeatureType } from '../features';
import { PermissionService } from '../permission';
import { WorkspaceBlobStorage } from '../storage';
import { OneGB } from './constant';
import { QuotaConfig } from './quota';
import { QuotaService } from './service';
import { formatSize, Quota, type QuotaBusinessType, QuotaType } from './types';

@Injectable()
export class QuotaManagementService {
  protected logger = new Logger(QuotaManagementService.name);

  constructor(
    private readonly feature: FeatureService,
    private readonly quota: QuotaService,
    private readonly permissions: PermissionService,
    private readonly storage: WorkspaceBlobStorage
  ) {}

  async getUserQuota(userId: string) {
    const quota = await this.quota.getUserQuota(userId);

    return {
      name: quota.feature.name,
      reason: quota.reason,
      createAt: quota.createdAt,
      expiredAt: quota.expiredAt,
      blobLimit: quota.feature.blobLimit,
      businessBlobLimit: quota.feature.businessBlobLimit,
      storageQuota: quota.feature.storageQuota,
      historyPeriod: quota.feature.historyPeriod,
      memberLimit: quota.feature.memberLimit,
      copilotActionLimit: quota.feature.copilotActionLimit,
    };
  }

  async getWorkspaceConfig<Q extends QuotaType>(
    workspaceId: string,
    quota: Q
  ): Promise<QuotaConfig | undefined> {
    return this.quota.getWorkspaceConfig(workspaceId, quota);
  }

  async updateWorkspaceConfig<Q extends QuotaType>(
    workspaceId: string,
    quota: Q,
    configs: Partial<Quota<Q>['configs']>
  ) {
    const orig = await this.getWorkspaceConfig(workspaceId, quota);
    return await this.quota.updateWorkspaceConfig(
      workspaceId,
      quota,
      Object.assign({}, orig?.override, configs)
    );
  }

  // ======== Team Workspace ========
  async addTeamWorkspace(workspaceId: string, reason: string) {
    return this.quota.switchWorkspaceQuota(
      workspaceId,
      QuotaType.TeamPlanV1,
      reason
    );
  }

  async removeTeamWorkspace(workspaceId: string) {
    return this.quota.deactivateWorkspaceQuota(
      workspaceId,
      QuotaType.TeamPlanV1
    );
  }

  async isTeamWorkspace(workspaceId: string) {
    return this.quota.hasWorkspaceQuota(workspaceId, QuotaType.TeamPlanV1);
  }

  async getUserUsage(userId: string) {
    const workspaces = await this.permissions.getOwnedWorkspaces(userId);

    const sizes = await Promise.allSettled(
      workspaces.map(workspace => this.storage.totalSize(workspace))
    );

    return sizes.reduce((total, size) => {
      if (size.status === 'fulfilled') {
        if (Number.isSafeInteger(size.value)) {
          return total + size.value;
        } else {
          this.logger.error(`Workspace size is invalid: ${size.value}`);
        }
      } else {
        this.logger.error(`Failed to get workspace size: ${size.reason}`);
      }
      return total;
    }, 0);
  }

  private generateQuotaCalculator(
    quota: number,
    blobLimit: number,
    usedSize: number,
    unlimited = false
  ) {
    const checkExceeded = (recvSize: number) => {
      const total = usedSize + recvSize;
      // only skip total storage check if workspace has unlimited feature
      if (total > quota && !unlimited) {
        this.logger.warn(`storage size limit exceeded: ${total} > ${quota}`);
        return true;
      } else if (recvSize > blobLimit) {
        this.logger.warn(
          `blob size limit exceeded: ${recvSize} > ${blobLimit}`
        );
        return true;
      } else {
        return false;
      }
    };
    return checkExceeded;
  }

  async getQuotaCalculator(userId: string) {
    const quota = await this.getUserQuota(userId);
    const { storageQuota, businessBlobLimit } = quota;
    const usedSize = await this.getUserUsage(userId);

    return this.generateQuotaCalculator(
      storageQuota,
      businessBlobLimit,
      usedSize
    );
  }

  async getQuotaCalculatorByWorkspace(workspaceId: string) {
    const { storageQuota, usedSize, businessBlobLimit, unlimited } =
      await this.getWorkspaceUsage(workspaceId);

    return this.generateQuotaCalculator(
      storageQuota,
      businessBlobLimit,
      usedSize,
      unlimited
    );
  }

  private async getWorkspaceQuota(userId: string, workspaceId: string) {
    const { feature: workspaceQuota } =
      (await this.quota.getWorkspaceQuota(workspaceId)) || {};
    const { feature: userQuota } = await this.quota.getUserQuota(userId);
    if (workspaceQuota) {
      return workspaceQuota.withOverride({
        // override user quota with workspace quota
        copilotActionLimit: userQuota.copilotActionLimit,
      });
    }
    return userQuota;
  }

  async checkWorkspaceSeat(workspaceId: string, excludeSelf = false) {
    const quota = await this.getWorkspaceUsage(workspaceId);
    if (quota.memberCount - (excludeSelf ? 1 : 0) >= quota.memberLimit) {
      throw new MemberQuotaExceeded();
    }
  }

  // get workspace's owner quota and total size of used
  // quota was apply to owner's account
  async getWorkspaceUsage(workspaceId: string): Promise<QuotaBusinessType> {
    const owner = await this.permissions.getWorkspaceOwner(workspaceId);
    const memberCount =
      await this.permissions.getWorkspaceMemberCount(workspaceId);
    const {
      name,
      blobLimit,
      businessBlobLimit,
      historyPeriod,
      memberLimit,
      storageQuota,
      copilotActionLimit,
      humanReadable,
    } = await this.getWorkspaceQuota(owner.id, workspaceId);
    // get all workspaces size of owner used
    const usedSize = await this.getUserUsage(owner.id);
    // relax restrictions if workspace has unlimited feature
    // todo(@darkskygit): need a mechanism to allow feature as a middleware to edit quota
    const unlimited = await this.feature.hasWorkspaceFeature(
      workspaceId,
      FeatureType.UnlimitedWorkspace
    );

    const quota = {
      name,
      blobLimit,
      businessBlobLimit,
      historyPeriod,
      memberLimit,
      storageQuota,
      copilotActionLimit,
      humanReadable,
      usedSize,
      unlimited,
      memberCount,
    };

    if (quota.unlimited) {
      return this.mergeUnlimitedQuota(quota);
    }

    return quota;
  }

  private mergeUnlimitedQuota(orig: QuotaBusinessType): QuotaBusinessType {
    return {
      ...orig,
      storageQuota: 1000 * OneGB,
      memberLimit: 1000,
      humanReadable: {
        ...orig.humanReadable,
        name: 'Unlimited',
        storageQuota: formatSize(1000 * OneGB),
        memberLimit: '1000',
      },
    };
  }

  async checkBlobQuota(workspaceId: string, size: number) {
    const { storageQuota, usedSize } =
      await this.getWorkspaceUsage(workspaceId);

    return storageQuota - (size + usedSize);
  }
}
