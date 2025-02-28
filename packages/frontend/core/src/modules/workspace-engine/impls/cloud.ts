import { DebugLogger } from '@affine/debug';
import {
  createWorkspaceMutation,
  deleteWorkspaceMutation,
  getWorkspaceInfoQuery,
  getWorkspacesQuery,
} from '@affine/graphql';
import type {
  BlobStorage,
  DocStorage,
  ListedBlobRecord,
} from '@affine/nbstore';
import { CloudBlobStorage, StaticCloudDocStorage } from '@affine/nbstore/cloud';
import {
  IndexedDBBlobStorage,
  IndexedDBDocStorage,
  IndexedDBSyncStorage,
} from '@affine/nbstore/idb';
import {
  IndexedDBV1BlobStorage,
  IndexedDBV1DocStorage,
} from '@affine/nbstore/idb/v1';
import {
  SqliteBlobStorage,
  SqliteDocStorage,
  SqliteSyncStorage,
} from '@affine/nbstore/sqlite';
import {
  SqliteV1BlobStorage,
  SqliteV1DocStorage,
} from '@affine/nbstore/sqlite/v1';
import type { WorkerInitOptions } from '@affine/nbstore/worker/client';
import {
  catchErrorInto,
  effect,
  exhaustMapSwitchUntilChanged,
  fromPromise,
  LiveData,
  ObjectPool,
  onComplete,
  onStart,
  Service,
} from '@toeverything/infra';
import { isEqual } from 'lodash-es';
import { EMPTY, map, mergeMap, Observable, switchMap } from 'rxjs';
import { type Doc as YDoc, encodeStateAsUpdate } from 'yjs';

import type { Server, ServersService } from '../../cloud';
import {
  AccountChanged,
  AuthService,
  GraphQLService,
  WorkspaceServerService,
} from '../../cloud';
import type { GlobalState } from '../../storage';
import type {
  Workspace,
  WorkspaceFlavourProvider,
  WorkspaceFlavoursProvider,
  WorkspaceMetadata,
  WorkspaceProfileInfo,
} from '../../workspace';
import { WorkspaceImpl } from '../../workspace/impls/workspace';
import { getWorkspaceProfileWorker } from './out-worker';

const getCloudWorkspaceCacheKey = (serverId: string) => {
  if (serverId === 'affine-cloud') {
    return 'cloud-workspace:'; // FOR BACKWARD COMPATIBILITY
  }
  return `selfhosted-workspace-${serverId}:`;
};

const logger = new DebugLogger('affine:cloud-workspace-flavour-provider');

class CloudWorkspaceFlavourProvider implements WorkspaceFlavourProvider {
  private readonly authService: AuthService;
  private readonly graphqlService: GraphQLService;
  private readonly unsubscribeAccountChanged: () => void;

  constructor(
    private readonly globalState: GlobalState,
    private readonly server: Server
  ) {
    this.authService = server.scope.get(AuthService);
    this.graphqlService = server.scope.get(GraphQLService);
    this.unsubscribeAccountChanged = this.server.scope.eventBus.on(
      AccountChanged,
      () => {
        this.revalidate();
      }
    );
  }

  readonly flavour = this.server.id;

  DocStorageType =
    BUILD_CONFIG.isElectron || BUILD_CONFIG.isIOS
      ? SqliteDocStorage
      : IndexedDBDocStorage;
  DocStorageV1Type = BUILD_CONFIG.isElectron
    ? SqliteV1DocStorage
    : BUILD_CONFIG.isWeb || BUILD_CONFIG.isMobileWeb
      ? IndexedDBV1DocStorage
      : undefined;
  BlobStorageType =
    BUILD_CONFIG.isElectron || BUILD_CONFIG.isIOS
      ? SqliteBlobStorage
      : IndexedDBBlobStorage;
  BlobStorageV1Type = BUILD_CONFIG.isElectron
    ? SqliteV1BlobStorage
    : BUILD_CONFIG.isWeb || BUILD_CONFIG.isMobileWeb
      ? IndexedDBV1BlobStorage
      : undefined;
  SyncStorageType =
    BUILD_CONFIG.isElectron || BUILD_CONFIG.isIOS
      ? SqliteSyncStorage
      : IndexedDBSyncStorage;

  async deleteWorkspace(id: string): Promise<void> {
    await this.graphqlService.gql({
      query: deleteWorkspaceMutation,
      variables: {
        id: id,
      },
    });
    // TODO(@forehalo): when deleting cloud workspace, should we delete the workspace folder in local?
    this.revalidate();
    await this.waitForLoaded();
  }

  async createWorkspace(
    initial: (
      docCollection: WorkspaceImpl,
      blobStorage: BlobStorage,
      docStorage: DocStorage
    ) => Promise<void>
  ): Promise<WorkspaceMetadata> {
    // create workspace on cloud, get workspace id
    const {
      createWorkspace: { id: workspaceId },
    } = await this.graphqlService.gql({
      query: createWorkspaceMutation,
    });

    // save the initial state to local storage, then sync to cloud
    const blobStorage = new this.BlobStorageType({
      id: workspaceId,
      flavour: this.flavour,
      type: 'workspace',
    });
    blobStorage.connection.connect();
    await blobStorage.connection.waitForConnected();
    const docStorage = new this.DocStorageType({
      id: workspaceId,
      flavour: this.flavour,
      type: 'workspace',
    });
    docStorage.connection.connect();
    await docStorage.connection.waitForConnected();

    const docList = new Set<YDoc>();

    const docCollection = new WorkspaceImpl({
      id: workspaceId,
      blobSource: {
        get: async key => {
          const record = await blobStorage.get(key);
          return record ? new Blob([record.data], { type: record.mime }) : null;
        },
        delete: async () => {
          return;
        },
        list: async () => {
          return [];
        },
        set: async (id, blob) => {
          await blobStorage.set({
            key: id,
            data: new Uint8Array(await blob.arrayBuffer()),
            mime: blob.type,
          });
          return id;
        },
        name: 'blob',
        readonly: false,
      },
      onLoadDoc: doc => {
        docList.add(doc);
      },
    });

    try {
      // apply initial state
      await initial(docCollection, blobStorage, docStorage);

      // save workspace to local storage, should be vary fast
      for (const subdocs of docList) {
        await docStorage.pushDocUpdate({
          docId: subdocs.guid,
          bin: encodeStateAsUpdate(subdocs),
        });
      }

      docStorage.connection.disconnect();
      blobStorage.connection.disconnect();

      this.revalidate();
      await this.waitForLoaded();
    } finally {
      docCollection.dispose();
    }

    return {
      id: workspaceId,
      flavour: this.server.id,
    };
  }
  revalidate = effect(
    map(() => {
      return { accountId: this.authService.session.account$.value?.id };
    }),
    exhaustMapSwitchUntilChanged(
      (a, b) => a.accountId === b.accountId,
      ({ accountId }) => {
        return fromPromise(async signal => {
          if (!accountId) {
            return null; // no cloud workspace if no account
          }

          const { workspaces } = await this.graphqlService.gql({
            query: getWorkspacesQuery,
            context: {
              signal,
            },
          });

          const ids = workspaces.map(({ id, initialized }) => ({
            id,
            initialized,
          }));
          return {
            accountId,
            workspaces: ids.map(({ id, initialized }) => ({
              id,
              flavour: this.server.id,
              initialized,
            })),
          };
        }).pipe(
          mergeMap(data => {
            if (data) {
              const { accountId, workspaces } = data;
              const sorted = workspaces.sort((a, b) => {
                return a.id.localeCompare(b.id);
              });
              this.globalState.set(
                getCloudWorkspaceCacheKey(this.server.id) + accountId,
                sorted
              );
              if (!isEqual(this.workspaces$.value, sorted)) {
                this.workspaces$.next(sorted);
              }
            } else {
              this.workspaces$.next([]);
            }
            return EMPTY;
          }),
          catchErrorInto(this.error$, err => {
            logger.error('error to revalidate cloud workspaces', err);
          }),
          onStart(() => this.isRevalidating$.next(true)),
          onComplete(() => this.isRevalidating$.next(false))
        );
      },
      ({ accountId }) => {
        if (accountId) {
          this.workspaces$.next(
            this.globalState.get(
              getCloudWorkspaceCacheKey(this.server.id) + accountId
            ) ?? []
          );
        } else {
          this.workspaces$.next([]);
        }
      }
    )
  );

  error$ = new LiveData<any>(null);
  isRevalidating$ = new LiveData(false);
  workspaces$ = new LiveData<WorkspaceMetadata[]>([]);

  async getWorkspaceProfile(
    id: string,
    signal?: AbortSignal
  ): Promise<WorkspaceProfileInfo | undefined> {
    // get information from both cloud and local storage

    // we use affine 'static' storage here, which use http protocol, no need to websocket.
    const cloudStorage = new StaticCloudDocStorage({
      id: id,
      serverBaseUrl: this.server.serverMetadata.baseUrl,
    });
    const docStorage = new this.DocStorageType({
      id: id,
      flavour: this.flavour,
      type: 'workspace',
      readonlyMode: true,
    });
    docStorage.connection.connect();
    await docStorage.connection.waitForConnected();
    // download root doc
    const localData = (await docStorage.getDoc(id))?.bin;
    const cloudData = (await cloudStorage.getDoc(id))?.bin;

    docStorage.connection.disconnect();

    const info = await this.getWorkspaceInfo(id, signal);

    if (!cloudData && !localData) {
      return {
        isOwner: info.isOwner,
        isAdmin: info.isAdmin,
        isTeam: info.workspace.team,
      };
    }

    const client = getWorkspaceProfileWorker();

    const result = await client.call(
      'renderWorkspaceProfile',
      [localData, cloudData].filter(Boolean) as Uint8Array[]
    );

    return {
      name: result.name,
      avatar: result.avatar,
      isOwner: info.isOwner,
      isAdmin: info.isAdmin,
      isTeam: info.workspace.team,
    };
  }
  async getWorkspaceBlob(id: string, blob: string): Promise<Blob | null> {
    const storage = new this.BlobStorageType({
      id: id,
      flavour: this.flavour,
      type: 'workspace',
    });
    storage.connection.connect();
    await storage.connection.waitForConnected();
    const localBlob = await storage.get(blob);

    storage.connection.disconnect();

    if (localBlob) {
      return new Blob([localBlob.data], { type: localBlob.mime });
    }

    const cloudBlob = await new CloudBlobStorage({
      id,
      serverBaseUrl: this.server.serverMetadata.baseUrl,
    }).get(blob);
    if (!cloudBlob) {
      return null;
    }
    return new Blob([cloudBlob.data], { type: cloudBlob.mime });
  }

  async listBlobs(id: string): Promise<ListedBlobRecord[]> {
    const cloudStorage = new CloudBlobStorage({
      id,
      serverBaseUrl: this.server.serverMetadata.baseUrl,
    });
    return cloudStorage.list();
  }

  async deleteBlob(
    id: string,
    blob: string,
    permanent: boolean
  ): Promise<void> {
    const cloudStorage = new CloudBlobStorage({
      id,
      serverBaseUrl: this.server.serverMetadata.baseUrl,
    });
    await cloudStorage.delete(blob, permanent);

    // should also delete from local storage
    const storage = new this.BlobStorageType({
      id: id,
      flavour: this.flavour,
      type: 'workspace',
    });
    storage.connection.connect();
    await storage.connection.waitForConnected();
    await storage.delete(blob, permanent);
    storage.connection.disconnect();
  }

  onWorkspaceInitialized(workspace: Workspace): void {
    // bind the workspace to the affine cloud server
    workspace.scope.get(WorkspaceServerService).bindServer(this.server);
  }

  private async getWorkspaceInfo(workspaceId: string, signal?: AbortSignal) {
    return await this.graphqlService.gql({
      query: getWorkspaceInfoQuery,
      variables: {
        workspaceId,
      },
      context: { signal },
    });
  }

  getEngineWorkerInitOptions(workspaceId: string): WorkerInitOptions {
    return {
      local: {
        doc: {
          name: this.DocStorageType.identifier,
          opts: {
            flavour: this.flavour,
            type: 'workspace',
            id: workspaceId,
          },
        },
        blob: {
          name: this.BlobStorageType.identifier,
          opts: {
            flavour: this.flavour,
            type: 'workspace',
            id: workspaceId,
          },
        },
        sync: {
          name: this.SyncStorageType.identifier,
          opts: {
            flavour: this.flavour,
            type: 'workspace',
            id: workspaceId,
          },
        },
        awareness: {
          name: 'BroadcastChannelAwarenessStorage',
          opts: {
            id: `${this.flavour}:${workspaceId}`,
          },
        },
      },
      remotes: {
        [`cloud:${this.flavour}`]: {
          doc: {
            name: 'CloudDocStorage',
            opts: {
              type: 'workspace',
              id: workspaceId,
              serverBaseUrl: this.server.serverMetadata.baseUrl,
            },
          },
          blob: {
            name: 'CloudBlobStorage',
            opts: {
              id: workspaceId,
              serverBaseUrl: this.server.serverMetadata.baseUrl,
            },
          },
          awareness: {
            name: 'CloudAwarenessStorage',
            opts: {
              type: 'workspace',
              id: workspaceId,
              serverBaseUrl: this.server.serverMetadata.baseUrl,
            },
          },
        },
        v1: {
          doc: this.DocStorageV1Type
            ? {
                name: this.DocStorageV1Type.identifier,
                opts: {
                  id: workspaceId,
                  type: 'workspace',
                },
              }
            : undefined,
          blob: this.BlobStorageV1Type
            ? {
                name: this.BlobStorageV1Type.identifier,
                opts: {
                  id: workspaceId,
                  type: 'workspace',
                },
              }
            : undefined,
        },
      },
    };
  }

  private waitForLoaded() {
    return this.isRevalidating$.waitFor(loading => !loading);
  }

  dispose() {
    this.revalidate.unsubscribe();
    this.unsubscribeAccountChanged();
  }
}

export class CloudWorkspaceFlavoursProvider
  extends Service
  implements WorkspaceFlavoursProvider
{
  constructor(
    private readonly globalState: GlobalState,
    private readonly serversService: ServersService
  ) {
    super();
  }

  workspaceFlavours$ = LiveData.from<WorkspaceFlavourProvider[]>(
    this.serversService.servers$.pipe(
      switchMap(servers => {
        const refs = servers.map(server => {
          const exists = this.pool.get(server.id);
          if (exists) {
            return exists;
          }
          const provider = new CloudWorkspaceFlavourProvider(
            this.globalState,
            server
          );
          provider.revalidate();
          const ref = this.pool.put(server.id, provider);
          return ref;
        });

        return new Observable<WorkspaceFlavourProvider[]>(subscribe => {
          subscribe.next(refs.map(ref => ref.obj));
          return () => {
            refs.forEach(ref => {
              ref.release();
            });
          };
        });
      })
    ),
    [] as any
  );

  private readonly pool = new ObjectPool<string, CloudWorkspaceFlavourProvider>(
    {
      onDelete(obj) {
        obj.dispose();
      },
    }
  );
}
