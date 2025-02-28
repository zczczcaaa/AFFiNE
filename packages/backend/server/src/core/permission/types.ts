import { LeafPaths, LeafVisitor } from '../../base';

export enum PublicDocMode {
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

/**
 * Definitions of all possible actions
 *
 * NOTE(@forehalo): if you add any new actions, please don't forget to add the corresponding role in [RoleActionsMap]
 */
export const Actions = {
  // Workspace Actions
  Workspace: {
    Sync: '',
    CreateDoc: '',
    Delete: '',
    TransferOwner: '',
    Organize: {
      Read: '',
    },
    Users: {
      Read: '',
      Manage: '',
    },
    Properties: {
      Read: '',
      Create: '',
      Update: '',
      Delete: '',
    },
    Settings: {
      Read: '',
      Update: '',
    },
  },

  // Doc Actions
  Doc: {
    Read: '',
    Copy: '',
    Duplicate: '',
    Trash: '',
    Restore: '',
    Delete: '',
    Update: '',
    Publish: '',
    TransferOwner: '',
    Properties: {
      Read: '',
      Update: '',
    },
    Users: {
      Read: '',
      Manage: '',
    },
  },
} as const;

export const RoleActionsMap = {
  WorkspaceRole: {
    get [WorkspaceRole.External]() {
      return [Action.Workspace.Organize.Read];
    },
    get [WorkspaceRole.Collaborator]() {
      return [
        ...this[WorkspaceRole.External],
        Action.Workspace.Sync,
        Action.Workspace.CreateDoc,
        Action.Workspace.Users.Read,
        Action.Workspace.Properties.Read,
        Action.Workspace.Settings.Read,
      ];
    },
    get [WorkspaceRole.Admin]() {
      return [
        ...this[WorkspaceRole.Collaborator],
        Action.Workspace.Users.Manage,
        Action.Workspace.Settings.Update,
        Action.Workspace.Properties.Create,
        Action.Workspace.Properties.Update,
        Action.Workspace.Properties.Delete,
      ];
    },
    get [WorkspaceRole.Owner]() {
      return [
        ...this[WorkspaceRole.Admin],
        Action.Workspace.Delete,
        Action.Workspace.TransferOwner,
      ];
    },
  },
  DocRole: {
    get [DocRole.External]() {
      return [Action.Doc.Read, Action.Doc.Copy, Action.Doc.Properties.Read];
    },
    get [DocRole.Reader]() {
      return [
        ...this[DocRole.External],
        Action.Doc.Users.Read,
        Action.Doc.Duplicate,
      ];
    },
    get [DocRole.Editor]() {
      return [
        ...this[DocRole.Reader],
        Action.Doc.Trash,
        Action.Doc.Restore,
        Action.Doc.Delete,
        Action.Doc.Properties.Update,
        Action.Doc.Update,
      ];
    },
    get [DocRole.Manager]() {
      return [
        ...this[DocRole.Editor],
        Action.Doc.Publish,
        Action.Doc.Users.Manage,
      ];
    },
    get [DocRole.Owner]() {
      return [...this[DocRole.Manager], Action.Doc.TransferOwner];
    },
  },
} as const;

type ResourceActionName<T extends keyof typeof Actions> =
  `${T}.${LeafPaths<(typeof Actions)[T]>}`;

export type WorkspaceAction = ResourceActionName<'Workspace'>;
export type DocAction = ResourceActionName<'Doc'>;
export type Action = WorkspaceAction | DocAction;

const cache = new WeakMap<object, any>();
const buildPathReader = (
  obj: any,
  isLeaf: (val: any) => boolean,
  prefix?: string
): any => {
  if (cache.has(obj)) {
    return cache.get(obj);
  }

  const reader = new Proxy(obj, {
    get(target, prop) {
      if (typeof prop === 'symbol') {
        return undefined;
      }

      const newPath = prefix ? `${prefix}.${prop}` : prop;

      if (isLeaf(target[prop])) {
        return newPath;
      }

      return buildPathReader(target[prop], isLeaf, newPath);
    },
  });

  cache.set(obj, reader);
  return reader;
};

// Create the proxy that returns the path string
export const Action: LeafVisitor<typeof Actions> = buildPathReader(
  Actions,
  val => typeof val === 'string'
);

export const WORKSPACE_ACTIONS =
  RoleActionsMap.WorkspaceRole[WorkspaceRole.Owner];
export const DOC_ACTIONS = RoleActionsMap.DocRole[DocRole.Owner];

export function mapWorkspaceRoleToPermissions(workspaceRole: WorkspaceRole) {
  const permissions = WORKSPACE_ACTIONS.reduce(
    (map, action) => {
      map[action] = false;
      return map;
    },
    {} as Record<WorkspaceAction, boolean>
  );

  RoleActionsMap.WorkspaceRole[workspaceRole].forEach(action => {
    permissions[action] = true;
  });

  return permissions;
}

export function mapDocRoleToPermissions(docRole: DocRole) {
  const permissions = DOC_ACTIONS.reduce(
    (map, action) => {
      map[action] = false;
      return map;
    },
    {} as Record<DocAction, boolean>
  );

  RoleActionsMap.DocRole[docRole].forEach(action => {
    permissions[action] = true;
  });

  return permissions;
}

/**
 * Exchange the real operatable [DocRole] with [WorkspaceRole].
 *
 * Some [WorkspaceRole] has higher permission than the specified [DocRole].
 * for example the owner of the workspace can edit all the docs by default,
 * So [WorkspaceRole.Owner] will fixup [Doc.External] to [Doc.Manager]
 *
 * @example
 *
 * // Owner of the workspace but not specified a role in the doc
 * fixupDocRole(WorkspaceRole.Owner, DocRole.External) // returns DocRole.Manager
 */
export function fixupDocRole(
  workspaceRole: WorkspaceRole = WorkspaceRole.External,
  docRole: DocRole = DocRole.External
): DocRole {
  switch (workspaceRole) {
    case WorkspaceRole.External:
      // Workspace External user won't be able to have any high permission doc role
      // set the maximum to Editor in case we have [Can Edit with share link] feature
      return Math.min(DocRole.Editor, docRole);
    // Workspace Owner will always fallback to Doc Owner
    case WorkspaceRole.Owner:
      return DocRole.Owner;
    // Workspace Admin will always fallback to Doc Manager
    case WorkspaceRole.Admin:
      return Math.max(DocRole.Manager, docRole);
    default:
      return docRole;
  }
}

/**
 * a map from [WorkspaceRole] to { [WorkspaceActionName]: boolean }
 */
const WorkspaceRolePermissionsMap = new Map(
  Object.values(WorkspaceRole)
    .filter(r => typeof r === 'number')
    .map(
      role =>
        [role, mapWorkspaceRoleToPermissions(role as WorkspaceRole)] as [
          WorkspaceRole,
          Record<WorkspaceAction, boolean>,
        ]
    )
);

/**
 * a map from [WorkspaceActionName] to required [WorkspaceRole]
 *
 * @testonly use [workspaceActionRequiredRole] instead
 */
export const WORKSPACE_ACTION_TO_MINIMAL_ROLE_MAP = new Map(
  RoleActionsMap.WorkspaceRole[WorkspaceRole.Owner].map(
    action =>
      [
        action,
        Math.min(
          ...[...WorkspaceRolePermissionsMap.entries()]
            .filter(([_, permissions]) => permissions[action])
            .map(([role, _]) => role)
        ),
      ] as [WorkspaceAction, WorkspaceRole]
  )
);

/**
 * a map from [DocRole] to { [DocActionName]: boolean }
 */
const DocRolePermissionsMap = new Map(
  Object.values(DocRole)
    .filter(r => typeof r === 'number')
    .map(docRole => {
      const permissions = mapDocRoleToPermissions(docRole as DocRole);
      return [docRole, permissions] as [DocRole, Record<DocAction, boolean>];
    })
);

/**
 * a map from [DocActionName] to required [DocRole]
 * @testonly use [docActionRequiredRole] instead
 */
export const DOC_ACTION_TO_MINIMAL_ROLE_MAP = new Map(
  RoleActionsMap.DocRole[DocRole.Owner].map(
    action =>
      [
        action,
        Math.min(
          ...[...DocRolePermissionsMap.entries()]
            .filter(([_, permissions]) => permissions[action])
            .map(([role, _]) => role)
        ),
      ] as [DocAction, DocRole]
  )
);

export function docActionRequiredRole(action: DocAction): DocRole {
  return (
    DOC_ACTION_TO_MINIMAL_ROLE_MAP.get(action) ??
    /* if we forget to put new action to [RoleActionsMap.DocRole] */ DocRole.Owner
  );
}

/**
 * Useful when a workspace member doesn't have a specified role in the doc, but want to check the permission of the action
 */
export function docActionRequiredWorkspaceRole(
  action: DocAction
): WorkspaceRole {
  const docRole = docActionRequiredRole(action);

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

export function workspaceActionRequiredRole(
  action: WorkspaceAction
): WorkspaceRole {
  return (
    WORKSPACE_ACTION_TO_MINIMAL_ROLE_MAP.get(action) ??
    /* if we forget to put new action to [RoleActionsMap.WorkspaceRole] */ WorkspaceRole.Owner
  );
}
