import {
  backoffRetry,
  effect,
  exhaustMapWithTrailing,
  fromPromise,
  LiveData,
  Service,
} from '@toeverything/infra';
import {
  combineLatest,
  EMPTY,
  exhaustMap,
  groupBy,
  map,
  mergeMap,
  Observable,
} from 'rxjs';

import type { WorkspaceService } from '../../workspace';
import type {
  DocPermissionActions,
  GuardStore,
  WorkspacePermissionActions,
} from '../stores/guard';
import type { WorkspacePermissionService } from './permission';

export class GuardService extends Service {
  constructor(
    private readonly guardStore: GuardStore,
    private readonly workspaceService: WorkspaceService,
    private readonly workspacePermissionService: WorkspacePermissionService
  ) {
    super();
  }

  private readonly workspacePermissions$ = new LiveData<
    Partial<Record<WorkspacePermissionActions, boolean>>
  >({});

  private readonly docPermissions$ = new LiveData<
    Record<string, Partial<Record<DocPermissionActions, boolean>>>
  >({});

  private readonly isAdmin$ = LiveData.computed(get => {
    const isOwner = get(this.workspacePermissionService.permission.isOwner$);
    const isAdmin = get(this.workspacePermissionService.permission.isAdmin$);
    if (isOwner === null && isAdmin === null) {
      return null;
    }
    return isOwner || isAdmin;
  });

  /**
   * @example
   * ```ts
   * guardService.can$('Workspace_Properties_Update');
   * guardService.can$('Doc_Update', docId);
   * ```
   */
  can$<T extends WorkspacePermissionActions | DocPermissionActions>(
    action: T,
    ...args: T extends DocPermissionActions ? [string] : []
  ): LiveData<boolean> {
    const docId = args[0];
    return LiveData.from(
      new Observable(subscriber => {
        // revalidate permission
        if (docId) {
          this.revalidateDocPermission(docId);
        } else {
          this.revalidateWorkspacePermission();
        }
        // revalidate workspace permission if it's not initialized
        if (this.isAdmin$.value === null) {
          this.workspacePermissionService.permission.revalidate();
        }

        let prev = false;

        const subscription = combineLatest([
          (docId
            ? this.docPermissions$.pipe(
                map(permissions => permissions[docId] ?? false)
              )
            : this.workspacePermissions$) as Observable<
            Record<string, boolean>
          >,
          this.isAdmin$,
        ]).subscribe(([permissions, isAdmin]) => {
          if (isAdmin) {
            return subscriber.next(true);
          }
          const current = permissions[action] ?? false;
          if (current !== prev) {
            prev = current;
            subscriber.next(current);
          }
        });

        return () => {
          subscription.unsubscribe();
        };
      }),
      false
    );
  }

  async can<T extends WorkspacePermissionActions | DocPermissionActions>(
    action: T,
    ...args: T extends DocPermissionActions ? [string] : []
  ): Promise<boolean> {
    const docId = args[0];

    if (this.isAdmin$.value === null) {
      await this.workspacePermissionService.permission.waitForRevalidation();
    }

    if (this.isAdmin$.value === true) {
      return true;
    }

    const permissions = await (docId
      ? this.loadDocPermission(docId)
      : this.loadWorkspacePermission());

    return permissions[action as keyof typeof permissions] ?? false;
  }

  private readonly revalidateWorkspacePermission = effect(
    exhaustMapWithTrailing(() =>
      fromPromise(() => this.guardStore.getWorkspacePermissions()).pipe(
        backoffRetry({
          count: Infinity,
        }),
        mergeMap(() => EMPTY)
      )
    )
  );

  private readonly revalidateDocPermission = effect(
    groupBy((docId: string) => docId),
    mergeMap(doc$ =>
      doc$.pipe(
        exhaustMap((docId: string) =>
          fromPromise(() => this.loadDocPermission(docId)).pipe(
            backoffRetry({
              count: Infinity,
            }),
            mergeMap(() => EMPTY)
          )
        )
      )
    )
  );

  private readonly loadWorkspacePermission = async () => {
    if (this.workspaceService.workspace.flavour === 'local') {
      return {} as Record<WorkspacePermissionActions, boolean>;
    }
    const permissions = await this.guardStore.getWorkspacePermissions();
    this.workspacePermissions$.next(permissions);
    return permissions;
  };

  private readonly loadDocPermission = async (docId: string) => {
    if (this.workspaceService.workspace.flavour === 'local') {
      return {} as Record<DocPermissionActions, boolean>;
    }
    const permissions = await this.guardStore.getDocPermissions(docId);
    this.docPermissions$.next({
      ...this.docPermissions$.value,
      [docId]: permissions,
    });
    return permissions;
  };

  override dispose() {
    this.revalidateWorkspacePermission.unsubscribe();
    this.revalidateDocPermission.unsubscribe();
  }
}
