import { LiveData, ObjectPool, Service } from '@toeverything/infra';
import { finalize, of, switchMap } from 'rxjs';

import { Server } from '../entities/server';
import type { ServerListStore } from '../stores/server-list';
import type { ServerConfig, ServerMetadata } from '../types';

export class ServersService extends Service {
  constructor(private readonly serverListStore: ServerListStore) {
    super();
  }

  servers$ = LiveData.from<Server[]>(
    this.serverListStore.watchServerList().pipe(
      switchMap(metadatas => {
        const refs = metadatas.map(metadata => {
          const exists = this.serverPool.get(metadata.id);
          if (exists) {
            return exists;
          }
          const server = this.framework.createEntity(Server, {
            serverMetadata: metadata,
          });
          const ref = this.serverPool.put(metadata.id, server);
          return ref;
        });

        return of(refs.map(ref => ref.obj)).pipe(
          finalize(() => {
            refs.forEach(ref => {
              ref.release();
            });
          })
        );
      })
    ),
    [] as any
  );

  server$(id: string) {
    return this.servers$.map(servers =>
      servers.find(server => server.id === id)
    );
  }

  private readonly serverPool = new ObjectPool<string, Server>({
    onDelete(obj) {
      obj.dispose();
    },
  });

  addServer(metadata: ServerMetadata, config: ServerConfig) {
    this.serverListStore.addServer(metadata, config);
  }
}
