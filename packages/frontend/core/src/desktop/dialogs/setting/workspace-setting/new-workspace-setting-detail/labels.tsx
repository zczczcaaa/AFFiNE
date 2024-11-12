import { WorkspacePermissionService } from '@affine/core/modules/permissions';
import { useI18n } from '@affine/i18n';
import type { Workspace } from '@toeverything/infra';
import { useLiveData, useService, WorkspaceService } from '@toeverything/infra';
import { useEffect, useMemo } from 'react';

import * as style from './style.css';

type WorkspaceStatus =
  | 'local'
  | 'syncCloud'
  | 'syncDocker'
  | 'selfHosted'
  | 'joinedWorkspace'
  | 'availableOffline'
  | 'publishedToWeb';

type LabelProps = {
  value: string;
  background: string;
};

type LabelMap = {
  [key in WorkspaceStatus]: LabelProps;
};
type labelConditionsProps = {
  condition: boolean;
  label: WorkspaceStatus;
};
const Label = ({ value, background }: LabelProps) => {
  return (
    <div>
      <div className={style.workspaceLabel} style={{ background: background }}>
        {value}
      </div>
    </div>
  );
};

const getConditions = (
  isOwner: boolean | null,
  workspace: Workspace
): labelConditionsProps[] => {
  return [
    { condition: !isOwner, label: 'joinedWorkspace' },
    { condition: workspace.flavour === 'local', label: 'local' },
    {
      condition: workspace.flavour === 'affine-cloud',
      label: 'syncCloud',
    },
  ];
};

const getLabelMap = (t: ReturnType<typeof useI18n>): LabelMap => ({
  local: {
    value: t['com.affine.settings.workspace.state.local'](),
    background: 'var(--affine-tag-orange)',
  },
  syncCloud: {
    value: t['com.affine.settings.workspace.state.sync-affine-cloud'](),
    background: 'var(--affine-tag-blue)',
  },
  syncDocker: {
    value: t['com.affine.settings.workspace.state.sync-affine-docker'](),
    background: 'var(--affine-tag-green)',
  },
  selfHosted: {
    value: t['com.affine.settings.workspace.state.self-hosted'](),
    background: 'var(--affine-tag-purple)',
  },
  joinedWorkspace: {
    value: t['com.affine.settings.workspace.state.joined'](),
    background: 'var(--affine-tag-yellow)',
  },
  availableOffline: {
    value: t['com.affine.settings.workspace.state.available-offline'](),
    background: 'var(--affine-tag-green)',
  },
  publishedToWeb: {
    value: t['com.affine.settings.workspace.state.published'](),
    background: 'var(--affine-tag-blue)',
  },
});

export const LabelsPanel = () => {
  const workspace = useService(WorkspaceService).workspace;
  const permissionService = useService(WorkspacePermissionService);
  const isOwner = useLiveData(permissionService.permission.isOwner$);
  const t = useI18n();

  useEffect(() => {
    permissionService.permission.revalidate();
  }, [permissionService]);

  const labelMap = useMemo(() => getLabelMap(t), [t]);

  const labelConditions = useMemo(
    () => getConditions(isOwner, workspace),
    [isOwner, workspace]
  );

  return (
    <div className={style.labelWrapper}>
      {labelConditions.map(
        ({ condition, label }) =>
          condition && (
            <Label
              key={label}
              value={labelMap[label].value}
              background={labelMap[label].background}
            />
          )
      )}
    </div>
  );
};
