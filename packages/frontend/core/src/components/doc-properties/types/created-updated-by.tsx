import { Avatar, PropertyValue } from '@affine/component';
import { CloudDocMetaService } from '@affine/core/modules/cloud/services/cloud-doc-meta';
import { WorkspaceService } from '@affine/core/modules/workspace';
import { useI18n } from '@affine/i18n';
import { useLiveData, useService } from '@toeverything/infra';
import { useEffect, useMemo } from 'react';

import { userWrapper } from './created-updated-by.css';

const CloudUserAvatar = (props: { type: 'CreatedBy' | 'UpdatedBy' }) => {
  const cloudDocMetaService = useService(CloudDocMetaService);
  const cloudDocMeta = useLiveData(cloudDocMetaService.cloudDocMeta.meta$);
  const isRevalidating = useLiveData(
    cloudDocMetaService.cloudDocMeta.isRevalidating$
  );
  const error = useLiveData(cloudDocMetaService.cloudDocMeta.error$);

  useEffect(() => {
    cloudDocMetaService.cloudDocMeta.revalidate();
  }, [cloudDocMetaService]);

  const user = useMemo(() => {
    if (!cloudDocMeta) return null;
    if (props.type === 'CreatedBy' && cloudDocMeta.createdBy) {
      return {
        name: cloudDocMeta.createdBy.name,
        avatarUrl: cloudDocMeta.createdBy.avatarUrl,
      };
    } else if (props.type === 'UpdatedBy' && cloudDocMeta.updatedBy) {
      return {
        name: cloudDocMeta.updatedBy.name,
        avatarUrl: cloudDocMeta.updatedBy.avatarUrl,
      };
    }
    return null;
  }, [cloudDocMeta, props.type]);

  if (!cloudDocMeta) {
    if (isRevalidating) {
      // TODO: loading ui
      return null;
    }
    if (error) {
      // error ui
      return;
    }
    return null;
  }
  if (user) {
    return (
      <div className={userWrapper}>
        <Avatar url={user.avatarUrl || ''} name={user.name} size={22} />
        <span>{user.name}</span>
      </div>
    );
  }
  return <NoRecordValue />;
};

const NoRecordValue = () => {
  const t = useI18n();
  return (
    <span>
      {t['com.affine.page-properties.property-user-avatar-no-record']()}
    </span>
  );
};

const LocalUserValue = () => {
  const t = useI18n();
  return <span>{t['com.affine.page-properties.local-user']()}</span>;
};

export const CreatedByValue = () => {
  const workspaceService = useService(WorkspaceService);
  const isCloud = workspaceService.workspace.flavour !== 'local';

  if (!isCloud) {
    return (
      <PropertyValue readonly>
        <LocalUserValue />
      </PropertyValue>
    );
  }

  return (
    <PropertyValue readonly>
      <CloudUserAvatar type="CreatedBy" />
    </PropertyValue>
  );
};

export const UpdatedByValue = () => {
  const workspaceService = useService(WorkspaceService);
  const isCloud = workspaceService.workspace.flavour !== 'local';

  if (!isCloud) {
    return (
      <PropertyValue readonly>
        <LocalUserValue />
      </PropertyValue>
    );
  }

  return (
    <PropertyValue readonly>
      <CloudUserAvatar type="UpdatedBy" />
    </PropertyValue>
  );
};
