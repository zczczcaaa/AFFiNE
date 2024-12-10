import { MenuItem, notify } from '@affine/component';
import {
  type Member,
  WorkspacePermissionService,
} from '@affine/core/modules/permissions';
import { Permission, WorkspaceMemberStatus } from '@affine/graphql';
import { useI18n } from '@affine/i18n';
import { useService } from '@toeverything/infra';
import { useCallback, useMemo } from 'react';

export const MemberOptions = ({
  member,
  isOwner,
  isAdmin,
  openAssignModal,
}: {
  member: Member;
  isOwner: boolean;
  isAdmin: boolean;
  openAssignModal: () => void;
}) => {
  const t = useI18n();
  const permission = useService(WorkspacePermissionService).permission;

  const handleAssignOwner = useCallback(() => {
    openAssignModal();
  }, [openAssignModal]);

  const handleRevoke = useCallback(() => {
    permission
      .revokeMember(member.id)
      .then(result => {
        if (result) {
          notify.success({
            title: t['com.affine.payment.member.team.revoke.notify.title'](),
            message: t['com.affine.payment.member.team.revoke.notify.message']({
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
  const handleApprove = useCallback(() => {
    permission
      .approveMember(member.id)
      .then(result => {
        if (result) {
          notify.success({
            title: t['com.affine.payment.member.team.approve.notify.title'](),
            message: t['com.affine.payment.member.team.approve.notify.message'](
              {
                name: member.name || member.email || member.id,
              }
            ),
          });
        }
      })
      .catch(error => {
        notify.error({
          title: 'Operation failed',
          message: error.message,
        });
      });
  }, [member, permission, t]);

  const handleDecline = useCallback(() => {
    permission
      .revokeMember(member.id)
      .then(result => {
        if (result) {
          notify.success({
            title: t['com.affine.payment.member.team.decline.notify.title'](),
            message: t['com.affine.payment.member.team.decline.notify.message'](
              {
                name: member.name || member.email || member.id,
              }
            ),
          });
        }
      })
      .catch(error => {
        notify.error({
          title: 'Operation failed',
          message: error.message,
        });
      });
  }, [member, permission, t]);

  const handleRemove = useCallback(() => {
    permission
      .revokeMember(member.id)
      .then(result => {
        if (result) {
          notify.success({
            title: t['com.affine.payment.member.team.remove.notify.title'](),
            message: t['com.affine.payment.member.team.remove.notify.message']({
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
  }, [member, permission, t]);

  const handleChangeToAdmin = useCallback(() => {
    permission
      .adjustMemberPermission(member.id, Permission.Admin)
      .then(result => {
        if (result) {
          notify.success({
            title: t['com.affine.payment.member.team.change.notify.title'](),
            message: t[
              'com.affine.payment.member.team.change.admin.notify.message'
            ]({
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
  }, [member, permission, t]);
  const handleChangeToCollaborator = useCallback(() => {
    permission
      .adjustMemberPermission(member.id, Permission.Write)
      .then(result => {
        if (result) {
          notify.success({
            title: t['com.affine.payment.member.team.change.notify.title'](),
            message: t[
              'com.affine.payment.member.team.change.collaborator.notify.message'
            ]({
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
  }, [member, permission, t]);

  const operationButtonInfo = useMemo(() => {
    return [
      {
        label: t['com.affine.payment.member.team.approve'](),
        onClick: handleApprove,
        show: member.status === WorkspaceMemberStatus.UnderReview,
      },
      {
        label: t['com.affine.payment.member.team.decline'](),
        onClick: handleDecline,
        show:
          (isAdmin || isOwner) &&
          member.status === WorkspaceMemberStatus.UnderReview,
      },
      {
        label: t['com.affine.payment.member.team.revoke'](),
        onClick: handleRevoke,
        show:
          (isAdmin || isOwner) &&
          member.status === WorkspaceMemberStatus.Pending,
      },
      {
        label: t['com.affine.payment.member.team.remove'](),
        onClick: handleRemove,
        show:
          (isAdmin || isOwner) &&
          member.status === WorkspaceMemberStatus.Accepted,
      },
      {
        label: t['com.affine.payment.member.team.change.collaborator'](),
        onClick: handleChangeToCollaborator,
        show:
          (isAdmin || isOwner) &&
          member.status === WorkspaceMemberStatus.Accepted &&
          member.permission === Permission.Admin,
      },
      {
        label: t['com.affine.payment.member.team.change.admin'](),
        onClick: handleChangeToAdmin,
        show:
          isOwner &&
          member.permission === Permission.Write &&
          member.status === WorkspaceMemberStatus.Accepted,
      },
      {
        label: t['com.affine.payment.member.team.assign'](),
        onClick: handleAssignOwner,
        show: isOwner && member.status === WorkspaceMemberStatus.Accepted,
      },
    ];
  }, [
    handleApprove,
    handleAssignOwner,
    handleChangeToAdmin,
    handleChangeToCollaborator,
    handleDecline,
    handleRemove,
    handleRevoke,
    isAdmin,
    isOwner,
    member,
    t,
  ]);

  return (
    <>
      {operationButtonInfo.map(item =>
        item.show ? (
          <MenuItem key={item.label} onSelect={item.onClick}>
            {item.label}
          </MenuItem>
        ) : null
      )}
    </>
  );
};
