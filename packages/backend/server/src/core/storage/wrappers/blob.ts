import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

import {
  autoMetadata,
  Config,
  EventEmitter,
  type EventPayload,
  type GetObjectMetadata,
  ListObjectsMetadata,
  OnEvent,
  PutObjectMetadata,
  type StorageProvider,
  StorageProviderFactory,
} from '../../../fundamentals';

@Injectable()
export class WorkspaceBlobStorage {
  private readonly logger = new Logger(WorkspaceBlobStorage.name);
  public readonly provider: StorageProvider;

  constructor(
    private readonly config: Config,
    private readonly event: EventEmitter,
    private readonly storageFactory: StorageProviderFactory,
    private readonly db: PrismaClient
  ) {
    this.provider = this.storageFactory.create(this.config.storages.blob);
  }

  async put(workspaceId: string, key: string, blob: Buffer) {
    const meta: PutObjectMetadata = autoMetadata(blob);

    await this.provider.put(`${workspaceId}/${key}`, blob, meta);
    this.trySyncBlobMeta(workspaceId, key, {
      contentType: meta.contentType ?? 'application/octet-stream',
      contentLength: blob.length,
      lastModified: new Date(),
    });
  }

  async get(workspaceId: string, key: string) {
    return this.provider.get(`${workspaceId}/${key}`);
  }

  async list(workspaceId: string) {
    const blobsInDb = await this.db.blob.findMany({
      where: {
        workspaceId,
        deletedAt: null,
      },
    });

    if (blobsInDb.length > 0) {
      return blobsInDb;
    }

    const blobs = await this.provider.list(workspaceId + '/');
    blobs.forEach(blob => {
      blob.key = blob.key.slice(workspaceId.length + 1);
    });

    this.trySyncBlobsMeta(workspaceId, blobs);

    return blobs.map(blob => ({
      key: blob.key,
      size: blob.contentLength,
      createdAt: blob.lastModified,
      mime: 'application/octet-stream',
    }));
  }

  async delete(workspaceId: string, key: string, permanently = false) {
    if (permanently) {
      await this.provider.delete(`${workspaceId}/${key}`);
      await this.db.blob.deleteMany({
        where: {
          workspaceId,
          key,
        },
      });
    } else {
      await this.db.blob.update({
        where: {
          workspaceId_key: {
            workspaceId,
            key,
          },
        },
        data: {
          deletedAt: new Date(),
        },
      });
    }
  }

  async release(workspaceId: string) {
    const deletedBlobs = await this.db.blob.findMany({
      where: {
        workspaceId,
        deletedAt: {
          not: null,
        },
      },
    });

    deletedBlobs.forEach(blob => {
      this.event.emit('workspace.blob.deleted', {
        workspaceId: workspaceId,
        key: blob.key,
      });
    });
  }

  async totalSize(workspaceId: string) {
    const blobs = await this.list(workspaceId);
    return blobs.reduce((acc, item) => acc + item.size, 0);
  }

  private trySyncBlobsMeta(workspaceId: string, blobs: ListObjectsMetadata[]) {
    for (const blob of blobs) {
      this.trySyncBlobMeta(workspaceId, blob.key);
    }
  }

  private trySyncBlobMeta(
    workspaceId: string,
    key: string,
    meta?: GetObjectMetadata
  ) {
    setImmediate(() => {
      this.syncBlobMeta(workspaceId, key, meta).catch(() => {
        /* never throw */
      });
    });
  }

  private async syncBlobMeta(
    workspaceId: string,
    key: string,
    meta?: GetObjectMetadata
  ) {
    try {
      if (!meta) {
        const blob = await this.get(workspaceId, key);
        meta = blob.metadata;
        blob.body?.destroy();
      }

      if (meta) {
        await this.db.blob.upsert({
          where: {
            workspaceId_key: {
              workspaceId,
              key,
            },
          },
          update: {
            mime: meta.contentType,
            size: meta.contentLength,
          },
          create: {
            workspaceId,
            key,
            mime: meta.contentType,
            size: meta.contentLength,
          },
        });
      } else {
        await this.db.blob.deleteMany({
          where: {
            workspaceId,
            key,
          },
        });
      }
    } catch (e) {
      // never throw
      this.logger.error('failed to sync blob meta to DB', e);
    }
  }

  @OnEvent('workspace.deleted')
  async onWorkspaceDeleted(workspaceId: EventPayload<'workspace.deleted'>) {
    const blobs = await this.list(workspaceId);

    // to reduce cpu time holding
    blobs.forEach(blob => {
      this.event.emit('workspace.blob.deleted', {
        workspaceId: workspaceId,
        key: blob.key,
      });
    });
  }

  @OnEvent('workspace.blob.deleted')
  async onDeleteWorkspaceBlob({
    workspaceId,
    key,
  }: EventPayload<'workspace.blob.deleted'>) {
    await this.delete(workspaceId, key, true);
  }
}
