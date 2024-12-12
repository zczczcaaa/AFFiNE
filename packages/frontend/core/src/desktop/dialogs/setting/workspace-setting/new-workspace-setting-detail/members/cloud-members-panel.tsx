import { Button, Loading, notify } from '@affine/component';
import {
  InviteTeamMemberModal,
  type InviteTeamMemberModalProps,
  MemberLimitModal,
} from '@affine/component/member-components';
import { SettingRow } from '@affine/component/setting-components';
import { useAsyncCallback } from '@affine/core/components/hooks/affine-async-hooks';
import { Upload } from '@affine/core/components/pure/file-upload';
import { ServerService, SubscriptionService } from '@affine/core/modules/cloud';
import {
  WorkspaceMembersService,
  WorkspacePermissionService,
} from '@affine/core/modules/permissions';
import { WorkspaceQuotaService } from '@affine/core/modules/quota';
import { WorkspaceShareSettingService } from '@affine/core/modules/share-setting';
import { copyTextToClipboard } from '@affine/core/utils/clipboard';
import { emailRegex } from '@affine/core/utils/email-regex';
import type { WorkspaceInviteLinkExpireTime } from '@affine/graphql';
import { UserFriendlyError } from '@affine/graphql';
import { useI18n } from '@affine/i18n';
import { track } from '@affine/track';
import { ExportIcon } from '@blocksuite/icons/rc';
import { useLiveData, useService } from '@toeverything/infra';
import { useCallback, useEffect, useMemo, useState } from 'react';

import type { SettingState } from '../../../types';
import { MemberList } from './member-list';
import * as styles from './styles.css';

const parseCSV = async (blob: Blob): Promise<string[]> => {
  try {
    const textContent = await blob.text();
    const emails = textContent
      .split('\n')
      .map(email => email.trim())
      .filter(email => email.length > 0 && emailRegex.test(email));

    return emails;
  } catch (error) {
    console.error('Error parsing CSV:', error);
    throw new Error('Failed to parse CSV');
  }
};

export const CloudWorkspaceMembersPanel = ({
  onChangeSettingState,
  isTeam,
}: {
  onChangeSettingState: (settingState: SettingState) => void;
  isTeam?: boolean;
}) => {
  const workspaceShareSettingService = useService(WorkspaceShareSettingService);
  const inviteLink = useLiveData(
    workspaceShareSettingService.sharePreview.inviteLink$
  );
  const serverService = useService(ServerService);
  const hasPaymentFeature = useLiveData(
    serverService.server.features$.map(f => f?.payment)
  );
  const membersService = useService(WorkspaceMembersService);
  const permissionService = useService(WorkspacePermissionService);
  const isOwner = useLiveData(permissionService.permission.isOwner$);
  const isAdmin = useLiveData(permissionService.permission.isAdmin$);
  useEffect(() => {
    permissionService.permission.revalidate();
  }, [permissionService]);

  const workspaceQuotaService = useService(WorkspaceQuotaService);
  useEffect(() => {
    workspaceQuotaService.quota.revalidate();
  }, [workspaceQuotaService]);
  const isLoading = useLiveData(workspaceQuotaService.quota.isLoading$);
  const error = useLiveData(workspaceQuotaService.quota.error$);
  const workspaceQuota = useLiveData(workspaceQuotaService.quota.quota$);
  const subscriptionService = useService(SubscriptionService);
  const plan = useLiveData(
    subscriptionService.subscription.pro$.map(s => s?.plan)
  );
  const isLimited =
    workspaceQuota && workspaceQuota.memberLimit
      ? workspaceQuota.memberCount >= workspaceQuota.memberLimit
      : null;

  const t = useI18n();

  const [open, setOpen] = useState(false);
  const [isMutating, setIsMutating] = useState(false);

  const openModal = useCallback(() => {
    setOpen(true);
  }, []);

  const onGenerateInviteLink = useCallback(
    async (expireTime: WorkspaceInviteLinkExpireTime) => {
      const { link } =
        await permissionService.permission.generateInviteLink(expireTime);
      workspaceShareSettingService.sharePreview.revalidate();
      return link;
    },
    [permissionService.permission, workspaceShareSettingService.sharePreview]
  );

  const onRevokeInviteLink = useCallback(async () => {
    const success = await permissionService.permission.revokeInviteLink();
    workspaceShareSettingService.sharePreview.revalidate();
    return success;
  }, [permissionService.permission, workspaceShareSettingService.sharePreview]);

  const onInviteBatchConfirm = useCallback<
    InviteTeamMemberModalProps['onConfirm']
  >(
    async ({ emails }) => {
      setIsMutating(true);
      const success = await permissionService.permission.inviteMembers(
        emails,
        true
      );
      if (success) {
        notify.success({
          title: t['Invitation sent'](),
          message: t['Invitation sent hint'](),
        });
        setOpen(false);
        membersService.members.revalidate();
      }
      setIsMutating(false);
    },
    [membersService.members, permissionService.permission, t]
  );

  const onImportCSV = useAsyncCallback(
    async (file: File) => {
      setIsMutating(true);
      const emails = await parseCSV(file);
      onInviteBatchConfirm({ emails });
      setIsMutating(false);
    },
    [onInviteBatchConfirm]
  );

  const handleUpgradeConfirm = useCallback(() => {
    onChangeSettingState({
      activeTab: 'plans',
      scrollAnchor: 'cloudPricingPlan',
    });
    track.$.settingsPanel.workspace.viewPlans({
      control: 'inviteMember',
    });
  }, [onChangeSettingState]);

  const desc = useMemo(() => {
    if (!workspaceQuota) return null;

    if (isTeam) {
      return <span>{t['com.affine.payment.member.team.description']()}</span>;
    }
    return (
      <span>
        {t['com.affine.payment.member.description2']()}
        {hasPaymentFeature && isOwner ? (
          <div
            className={styles.goUpgradeWrapper}
            onClick={handleUpgradeConfirm}
          >
            <span className={styles.goUpgrade}>
              {t['com.affine.payment.member.description.choose-plan']()}
            </span>
          </div>
        ) : null}
      </span>
    );
  }, [
    handleUpgradeConfirm,
    hasPaymentFeature,
    isOwner,
    isTeam,
    t,
    workspaceQuota,
  ]);

  const title = useMemo(() => {
    if (isTeam) {
      return `${t['Members']()} (${workspaceQuota?.memberCount})`;
    }
    return `${t['Members']()} (${workspaceQuota?.memberCount}/${workspaceQuota?.memberLimit})`;
  }, [isTeam, t, workspaceQuota?.memberCount, workspaceQuota?.memberLimit]);

  if (workspaceQuota === null) {
    if (isLoading) {
      return <MembersPanelFallback />;
    } else {
      return (
        <span className={styles.errorStyle}>
          {error
            ? UserFriendlyError.fromAnyError(error).message
            : 'Failed to load members'}
        </span>
      );
    }
  }

  return (
    <>
      <SettingRow name={title} desc={desc} spreadCol={!!isOwner}>
        {isOwner ? (
          <>
            <Button onClick={openModal}>{t['Invite Members']()}</Button>
            {isLimited && !isTeam ? (
              <MemberLimitModal
                isFreePlan={!plan}
                open={open}
                plan={workspaceQuota.humanReadable.name ?? ''}
                quota={workspaceQuota.humanReadable.memberLimit ?? ''}
                setOpen={setOpen}
                onConfirm={handleUpgradeConfirm}
              />
            ) : (
              <InviteTeamMemberModal
                open={open}
                setOpen={setOpen}
                onConfirm={onInviteBatchConfirm}
                isMutating={isMutating}
                copyTextToClipboard={copyTextToClipboard}
                onGenerateInviteLink={onGenerateInviteLink}
                onRevokeInviteLink={onRevokeInviteLink}
                importCSV={<ImportCSV onImport={onImportCSV} />}
                invitationLink={inviteLink}
              />
            )}
          </>
        ) : null}
      </SettingRow>

      <div className={styles.membersPanel}>
        <MemberList isOwner={!!isOwner} isAdmin={!!isAdmin} />
      </div>
    </>
  );
};

export const MembersPanelFallback = () => {
  const t = useI18n();

  return (
    <>
      <SettingRow
        name={t['Members']()}
        desc={t['com.affine.payment.member.description2']()}
      />
      <div className={styles.membersPanel}>
        <MemberListFallback memberCount={1} />
      </div>
    </>
  );
};

const MemberListFallback = ({ memberCount }: { memberCount?: number }) => {
  // prevent page jitter
  const height = useMemo(() => {
    if (memberCount) {
      // height and margin-bottom
      return memberCount * 58 + (memberCount - 1) * 6;
    }
    return 'auto';
  }, [memberCount]);
  const t = useI18n();

  return (
    <div
      style={{
        height,
      }}
      className={styles.membersFallback}
    >
      <Loading size={20} />
      <span>{t['com.affine.settings.member.loading']()}</span>
    </div>
  );
};

const ImportCSV = ({ onImport }: { onImport: (file: File) => void }) => {
  const t = useI18n();

  return (
    <Upload accept="text/csv" fileChange={onImport}>
      <Button className={styles.importButton} prefix={<ExportIcon />}>
        {t['com.affine.payment.member.team.invite.import-csv']()}
      </Button>
    </Upload>
  );
};
