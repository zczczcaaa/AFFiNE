import assert from 'node:assert';

export enum PublicPageMode {
  Page,
  Edgeless,
}

export enum DocRole {
  External = 0,
  Reader = 10,
  Editor = 20,
  Manager = 30,
  Owner = 99,
}

export enum WorkspaceRole {
  External = -99,
  Collaborator = 1,
  Admin = 10,
  Owner = 99,
}

export const Actions = {
  Workspace: {
    Sync: 1,
    CreateDoc: 2,
    Delete: 11,
    TransferOwner: 12,
    Organize: {
      Read: 0,
    },
    Users: {
      Read: 3,
      Manage: 6,
    },
    Properties: {
      Read: 4,
      Create: 8,
      Update: 9,
      Delete: 10,
    },
    Settings: {
      Read: 5,
      Update: 7,
    },
  },
  Doc: {
    Read: 13,
    Copy: 14,
    Duplicate: 17,
    Trash: 18,
    Restore: 19,
    Delete: 20,
    Update: 22,
    Publish: 23,
    TransferOwner: 25,
    Properties: {
      Read: 15,
      Update: 21,
    },
    Users: {
      Read: 16,
      Manage: 24,
    },
  },
} as const;

type ActionsKeysUnion = typeof Actions extends {
  [k in infer _K extends string]: infer _V;
}
  ? _V extends {
      [k1 in infer _K1 extends string]: infer _V1;
    }
    ? _V1 extends {
        [k2 in infer _K2 extends string]: number;
      }
      ? _K1 extends keyof (typeof Actions)[_K]
        ? _K2 extends keyof (typeof Actions)[_K][_K1]
          ? `${_K}.${_K1}.${_K2}`
          : never
        : never
      : _V1 extends number
        ? `${_K}.${_K1}`
        : never
    : never
  : never;

type ExcludeObjectKeys<
  T,
  Key extends keyof typeof Actions,
  Split extends string,
> = T extends `${infer _K extends Key}.${infer _K1}.${infer _K2}`
  ? _K1 extends keyof (typeof Actions)[_K]
    ? _K2 extends keyof (typeof Actions)[_K][_K1]
      ? `${_K}${Split}${_K1}${Split}${_K2}`
      : never
    : never
  : T extends `${infer _K extends Key}.${infer _K1}`
    ? _K1 extends keyof (typeof Actions)[_K]
      ? (typeof Actions)[_K][_K1] extends number
        ? `${_K}${Split}${_K1}`
        : never
      : never
    : never;

export type AllPossibleActionsKeys = ExcludeObjectKeys<
  ActionsKeysUnion,
  keyof typeof Actions,
  '.'
>;

export type AllPossibleGraphQLWorkspaceActionsKeys = ExcludeObjectKeys<
  ActionsKeysUnion,
  'Workspace',
  '_'
>;
export type AllPossibleGraphQLDocActionsKeys = ExcludeObjectKeys<
  ActionsKeysUnion,
  'Doc',
  '_'
>;

type AllPossibleGraphQLActionsKeys =
  | AllPossibleGraphQLWorkspaceActionsKeys
  | AllPossibleGraphQLDocActionsKeys;

export const ActionsKeys: AllPossibleActionsKeys[] = [
  'Workspace.Organize.Read',
  'Workspace.Sync',
  'Workspace.CreateDoc',
  'Workspace.Users.Read',
  'Workspace.Properties.Read',
  'Workspace.Settings.Read',
  'Workspace.Users.Manage',
  'Workspace.Settings.Update',
  'Workspace.Properties.Create',
  'Workspace.Properties.Update',
  'Workspace.Properties.Delete',
  'Workspace.Delete',
  'Workspace.TransferOwner',
  'Doc.Read',
  'Doc.Copy',
  'Doc.Properties.Read',
  'Doc.Users.Read',
  'Doc.Duplicate',
  'Doc.Trash',
  'Doc.Restore',
  'Doc.Delete',
  'Doc.Properties.Update',
  'Doc.Update',
  'Doc.Publish',
  'Doc.Users.Manage',
  'Doc.TransferOwner',
] as const;

assert(
  ActionsKeys.length === Actions.Doc.TransferOwner + 1,
  'ActionsKeys length is not correct'
);

function permissionKeyToGraphQLKey(key: string) {
  const k = key.split('.');
  return k.join('_') as keyof PermissionsList;
}

const DefaultActionsMap = Object.fromEntries(
  ActionsKeys.map(key => [permissionKeyToGraphQLKey(key), false])
) as PermissionsList;

export type WorkspacePermissionsList = {
  [k in AllPossibleGraphQLWorkspaceActionsKeys]: boolean;
};

export type PermissionsList = {
  [key in AllPossibleGraphQLActionsKeys]: boolean;
};

export function mapWorkspaceRoleToWorkspaceActions(
  workspaceRole: WorkspaceRole
) {
  const permissionList = { ...DefaultActionsMap };
  (RoleActionsMap.WorkspaceRole[workspaceRole] ?? []).forEach(action => {
    permissionList[permissionKeyToGraphQLKey(ActionsKeys[action])] = true;
  });
  return Object.fromEntries(
    Object.entries(permissionList).filter(([k, _]) =>
      k.startsWith('Workspace_')
    )
  );
}

export function mapRoleToActions(
  workspaceRole?: WorkspaceRole,
  docRole?: DocRole
) {
  const workspaceActions = workspaceRole
    ? (RoleActionsMap.WorkspaceRole[workspaceRole] ?? [])
    : [];
  const docActions = (function () {
    // Doc owner/manager permission can not be overridden by workspace role
    if (docRole !== undefined && docRole >= DocRole.Manager) {
      return RoleActionsMap.DocRole[docRole];
    }
    switch (workspaceRole) {
      case WorkspaceRole.Admin:
      case WorkspaceRole.Owner:
        return RoleActionsMap.DocRole[DocRole.Manager];
      case WorkspaceRole.Collaborator:
        return RoleActionsMap.DocRole[DocRole.Editor];
      default:
        return docRole !== undefined
          ? (RoleActionsMap.DocRole[docRole] ?? [])
          : [];
    }
  })();
  const permissionList = { ...DefaultActionsMap };
  [...workspaceActions, ...docActions].forEach(action => {
    permissionList[permissionKeyToGraphQLKey(ActionsKeys[action])] = true;
  });
  return permissionList;
}

export function findMinimalDocRole(
  action: AllPossibleGraphQLDocActionsKeys
): DocRole {
  const [_, actionKey, actionKey2] = action.split('_');

  const actionValue: number = actionKey2
    ? // @ts-expect-error Actions[actionKey] exists
      Actions.Doc[actionKey][actionKey2]
    : // @ts-expect-error Actions[actionKey] exists
      Actions.Doc[actionKey];
  if (actionValue <= Actions.Doc.Properties.Read) {
    return DocRole.External;
  }
  if (actionValue <= Actions.Doc.Duplicate) {
    return DocRole.Reader;
  }
  if (actionValue <= Actions.Doc.Update) {
    return DocRole.Editor;
  }
  if (actionValue <= Actions.Doc.Users.Manage) {
    return DocRole.Manager;
  }
  return DocRole.Owner;
}

export function requiredWorkspaceRoleByDocRole(
  docRole: DocRole
): WorkspaceRole {
  switch (docRole) {
    case DocRole.Owner:
      return WorkspaceRole.Owner;
    case DocRole.Manager:
      return WorkspaceRole.Admin;
    case DocRole.Editor:
    case DocRole.Reader:
    case DocRole.External:
      return WorkspaceRole.Collaborator;
  }
}

export const RoleActionsMap = {
  WorkspaceRole: {
    get [WorkspaceRole.External]() {
      return [Actions.Workspace.Organize.Read];
    },
    get [WorkspaceRole.Collaborator]() {
      return [
        ...this[WorkspaceRole.External],
        Actions.Workspace.Sync,
        Actions.Workspace.CreateDoc,
        Actions.Workspace.Users.Read,
        Actions.Workspace.Properties.Read,
        Actions.Workspace.Settings.Read,
      ];
    },
    get [WorkspaceRole.Admin]() {
      return [
        ...this[WorkspaceRole.Collaborator],
        Actions.Workspace.Users.Manage,
        Actions.Workspace.Settings.Update,
        Actions.Workspace.Properties.Create,
        Actions.Workspace.Properties.Update,
        Actions.Workspace.Properties.Delete,
      ];
    },
    get [WorkspaceRole.Owner]() {
      return [
        ...this[WorkspaceRole.Admin],
        Actions.Workspace.Delete,
        Actions.Workspace.TransferOwner,
      ];
    },
  },
  DocRole: {
    get [DocRole.External]() {
      return [Actions.Doc.Read, Actions.Doc.Copy, Actions.Doc.Properties.Read];
    },
    get [DocRole.Reader]() {
      return [
        ...this[DocRole.External],
        Actions.Doc.Users.Read,
        Actions.Doc.Duplicate,
      ];
    },
    get [DocRole.Editor]() {
      return [
        ...this[DocRole.Reader],
        Actions.Doc.Trash,
        Actions.Doc.Restore,
        Actions.Doc.Delete,
        Actions.Doc.Properties.Update,
        Actions.Doc.Update,
      ];
    },
    get [DocRole.Manager]() {
      return [
        ...this[DocRole.Editor],
        Actions.Doc.Publish,
        Actions.Doc.Users.Manage,
      ];
    },
    get [DocRole.Owner]() {
      return [...this[DocRole.Manager], Actions.Doc.TransferOwner];
    },
  },
} as const;
