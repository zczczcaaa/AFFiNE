import { Injectable } from '@nestjs/common';

import { OnEvent } from '../../base';
import { PermissionService } from '../../core/permission';
import { WorkspaceService } from '../../core/workspaces/resolvers';
import { Models } from '../../models';
import { SubscriptionPlan } from './types';

@Injectable()
export class QuotaOverride {
  constructor(
    private readonly permission: PermissionService,
    private readonly workspace: WorkspaceService,
    private readonly models: Models
  ) {}

  @OnEvent('workspace.subscription.activated')
  async onWorkspaceSubscriptionUpdated({
    workspaceId,
    plan,
    recurring,
    quantity,
  }: Events['workspace.subscription.activated']) {
    switch (plan) {
      case 'team': {
        const isTeam = await this.workspace.isTeamWorkspace(workspaceId);
        await this.models.workspaceFeature.add(
          workspaceId,
          'team_plan_v1',
          `${recurring} team subscription activated`,
          {
            memberLimit: quantity,
          }
        );
        await this.permission.refreshSeatStatus(workspaceId, quantity);
        if (!isTeam) {
          // this event will triggered when subscription is activated or changed
          // we only send emails when the team workspace is activated
          await this.workspace.sendTeamWorkspaceUpgradedEmail(workspaceId);
        }
        break;
      }
      default:
        break;
    }
  }

  @OnEvent('workspace.subscription.canceled')
  async onWorkspaceSubscriptionCanceled({
    workspaceId,
    plan,
  }: Events['workspace.subscription.canceled']) {
    switch (plan) {
      case SubscriptionPlan.Team:
        await this.models.workspaceFeature.remove(workspaceId, 'team_plan_v1');
        break;
      default:
        break;
    }
  }

  @OnEvent('user.subscription.activated')
  async onUserSubscriptionUpdated({
    userId,
    plan,
    recurring,
  }: Events['user.subscription.activated']) {
    switch (plan) {
      case SubscriptionPlan.AI:
        await this.models.userFeature.add(
          userId,
          'unlimited_copilot',
          'subscription activated'
        );
        break;
      case SubscriptionPlan.Pro:
        await this.models.userFeature.switchQuota(
          userId,
          recurring === 'lifetime' ? 'lifetime_pro_plan_v1' : 'pro_plan_v1',
          'subscription activated'
        );
        break;
      default:
        break;
    }
  }

  @OnEvent('user.subscription.canceled')
  async onUserSubscriptionCanceled({
    userId,
    plan,
  }: Events['user.subscription.canceled']) {
    switch (plan) {
      case SubscriptionPlan.AI:
        await this.models.userFeature.remove(userId, 'unlimited_copilot');
        break;
      case SubscriptionPlan.Pro: {
        // edge case: when user switch from recurring Pro plan to `Lifetime` plan,
        // a subscription canceled event will be triggered because `Lifetime` plan is not subscription based
        const isLifetimeUser = await this.models.userFeature.has(
          userId,
          'lifetime_pro_plan_v1'
        );

        if (!isLifetimeUser) {
          await this.models.userFeature.switchQuota(
            userId,
            'free_plan_v1',
            'subscription canceled'
          );
        }
        break;
      }
      default:
        break;
    }
  }
}
