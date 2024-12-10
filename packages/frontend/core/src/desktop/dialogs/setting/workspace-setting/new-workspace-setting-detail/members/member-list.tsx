import { Avatar, IconButton, Loading, Menu, notify } from '@affine/component';
import { Pagination } from '@affine/component/member-components';
import { type AuthAccountInfo, AuthService } from '@affine/core/modules/cloud';
import {
  type Member,
  WorkspaceMembersService,
  WorkspacePermissionService,
} from '@affine/core/modules/permissions';
import {
  Permission,
  UserFriendlyError,
  WorkspaceMemberStatus,
} from '@affine/graphql';
import { type I18nString, useI18n } from '@affine/i18n';
import { MoreVerticalIcon } from '@blocksuite/icons/rc';
import {
  useEnsureLiveData,
  useLiveData,
  useService,
  WorkspaceService,
} from '@toeverything/infra';
import clsx from 'clsx';
import { clamp } from 'lodash-es';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { ConfirmAssignModal } from './confirm-assign-modal';
import { MemberOptions } from './member-option';
import * as styles from './styles.css';

export const MemberList = ({
  isOwner,
  isAdmin,
}: {
  isOwner: boolean;
  isAdmin: boolean;
}) => {
  const membersService = useService(WorkspaceMembersService);
  const memberCount = useLiveData(membersService.members.memberCount$);
  const pageNum = useLiveData(membersService.members.pageNum$);
  const isLoading = useLiveData(membersService.members.isLoading$);
  const error = useLiveData(membersService.members.error$);
  const pageMembers = useLiveData(membersService.members.pageMembers$);

  useEffect(() => {
    membersService.members.revalidate();
  }, [membersService]);

  const session = useService(AuthService).session;
  const account = useEnsureLiveData(session.account$);

  const handlePageChange = useCallback(
    (_: number, pageNum: number) => {
      membersService.members.setPageNum(pageNum);
      membersService.members.revalidate();
    },
    [membersService]
  );

  return (
    <div>
      {pageMembers === undefined ? (
        isLoading ? (
          <MemberListFallback
            memberCount={
              memberCount
                ? clamp(
                    memberCount - pageNum * membersService.members.PAGE_SIZE,
                    1,
                    membersService.members.PAGE_SIZE
                  )
                : 1
            }
          />
        ) : (
          <span className={styles.errorStyle}>
            {error
              ? UserFriendlyError.fromAnyError(error).message
              : 'Failed to load members'}
          </span>
        )
      ) : (
        pageMembers?.map(member => (
          <MemberItem
            currentAccount={account}
            key={member.id}
            member={member}
            isOwner={isOwner}
            isAdmin={isAdmin}
          />
        ))
      )}
      {memberCount !== undefined &&
        memberCount > membersService.members.PAGE_SIZE && (
          <Pagination
            totalCount={memberCount}
            countPerPage={membersService.members.PAGE_SIZE}
            pageNum={pageNum}
            onPageChange={handlePageChange}
          />
        )}
    </div>
  );
};

const MemberItem = ({
  member,
  isOwner,
  isAdmin,
  currentAccount,
}: {
  member: Member;
  isAdmin: boolean;
  isOwner: boolean;
  currentAccount: AuthAccountInfo;
}) => {
  const t = useI18n();
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const workspace = useService(WorkspaceService).workspace;
  const workspaceName = useLiveData(workspace.name$);
  const permission = useService(WorkspacePermissionService).permission;
  const isEquals = workspaceName === inputValue;

  const show = isOwner && currentAccount.id !== member.id;

  const handleOpenAssignModal = useCallback(() => {
    setOpen(true);
  }, []);

  const confirmAssign = useCallback(() => {
    permission
      .adjustMemberPermission(member.id, Permission.Owner)
      .then(result => {
        if (result) {
          setOpen(false);
          notify.success({
            title: t['com.affine.payment.member.team.assign.notify.title'](),
            message: t['com.affine.payment.member.team.assign.notify.message']({
              name: member.name || member.email || member.id,
            }),
          });
        }
      })
      .catch(error => {
        notify.error({
          title: 'Operation failed',
          message: error.message,
        });
      });
  }, [permission, member, t]);

  const memberStatus = useMemo(() => getMemberStatus(member), [member]);

  return (
    <div
      key={member.id}
      className={styles.memberListItem}
      data-testid="member-item"
    >
      <Avatar
        size={36}
        url={member.avatarUrl}
        name={(member.name ? member.name : member.email) as string}
      />
      <div className={styles.memberContainer}>
        {member.name ? (
          <>
            <div className={styles.memberName}>{member.name}</div>
            <div className={styles.memberEmail}>{member.email}</div>
          </>
        ) : (
          <div className={styles.memberName}>{member.email}</div>
        )}
      </div>
      <div
        className={clsx(styles.roleOrStatus, {
          pending: !member.accepted,
        })}
      >
        {t.t(memberStatus)}
      </div>
      <Menu
        items={
          <MemberOptions
            member={member}
            openAssignModal={handleOpenAssignModal}
            isAdmin={isAdmin}
            isOwner={isOwner}
          />
        }
      >
        <IconButton
          disabled={!show}
          style={{
            visibility: show ? 'visible' : 'hidden',
            flexShrink: 0,
          }}
        >
          <MoreVerticalIcon />
        </IconButton>
      </Menu>
      <ConfirmAssignModal
        open={open}
        setOpen={setOpen}
        member={member}
        inputValue={inputValue}
        setInputValue={setInputValue}
        isEquals={isEquals}
        onConfirm={confirmAssign}
      />
    </div>
  );
};

const getMemberStatus = (member: Member): I18nString => {
  if (member.status === WorkspaceMemberStatus.Pending) {
    return 'Pending';
  } else if (member.status === WorkspaceMemberStatus.UnderReview) {
    return 'Under-Review';
  } else if (member.status === WorkspaceMemberStatus.Accepted) {
    switch (member.permission) {
      case Permission.Owner:
        return 'Workspace Owner';
      case Permission.Admin:
        return 'Admin';
      case Permission.Write:
        return 'Collaborator';
      default:
        return 'Member';
    }
  } else {
    return 'Need-More-Seats';
  }
};

export const MemberListFallback = ({
  memberCount,
}: {
  memberCount?: number;
}) => {
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
