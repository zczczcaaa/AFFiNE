import { Injectable } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import type { Update } from '@prisma/client';

import { BaseModel } from './base';
import type { Doc, DocEditor } from './common';

export interface DocRecord extends Doc {}

export interface DocHistorySimple {
  timestamp: number;
  editor: DocEditor | null;
}

export interface DocHistory {
  blob: Buffer;
  timestamp: number;
  editor: DocEditor | null;
}

export interface DocHistoryFilter {
  /**
   * timestamp to filter histories before.
   */
  before?: number;
  /**
   * limit the number of histories to return.
   *
   * Default to `100`.
   */
  take?: number;
}

/**
 * Workspace Doc Model
 *
 * This model is responsible for managing the workspace docs, including:
 *  - Updates: the changes made to the doc.
 *  - History: the doc history of the doc.
 *  - Doc: the doc itself.
 */
@Injectable()
export class DocModel extends BaseModel {
  // #region Update

  private updateToDocRecord(row: Update): DocRecord {
    return {
      spaceId: row.workspaceId,
      docId: row.id,
      blob: row.blob,
      timestamp: row.createdAt.getTime(),
      editorId: row.createdBy || undefined,
    };
  }

  private docRecordToUpdate(record: DocRecord): Update {
    return {
      workspaceId: record.spaceId,
      id: record.docId,
      blob: record.blob,
      createdAt: new Date(record.timestamp),
      createdBy: record.editorId || null,
      seq: null,
    };
  }

  private get userSelectFields() {
    return {
      select: {
        id: true,
        name: true,
        avatarUrl: true,
      },
    };
  }

  async createUpdates(updates: DocRecord[]) {
    return await this.db.update.createMany({
      data: updates.map(r => this.docRecordToUpdate(r)),
    });
  }

  /**
   * Find updates by workspaceId and docId.
   */
  async findUpdates(workspaceId: string, docId: string): Promise<DocRecord[]> {
    const rows = await this.db.update.findMany({
      where: {
        workspaceId,
        id: docId,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
    return rows.map(r => this.updateToDocRecord(r));
  }

  /**
   * Get the pending updates count by workspaceId and docId.
   */
  async getUpdateCount(workspaceId: string, docId: string) {
    return await this.db.update.count({
      where: {
        workspaceId,
        id: docId,
      },
    });
  }

  /**
   * Get the global pending updates count.
   */
  async getGlobalUpdateCount() {
    return await this.db.update.count();
  }

  /**
   * Delete updates by workspaceId, docId, and createdAts.
   */
  async deleteUpdates(
    workspaceId: string,
    docId: string,
    timestamps: number[]
  ) {
    const { count } = await this.db.update.deleteMany({
      where: {
        workspaceId,
        id: docId,
        createdAt: {
          in: timestamps.map(t => new Date(t)),
        },
      },
    });
    this.logger.log(
      `Deleted ${count} updates for workspace ${workspaceId} doc ${docId}`
    );
    return count;
  }

  // #endregion

  // #region History

  /**
   * Create a doc history with a max age.
   */
  async createHistory(
    snapshot: Doc,
    maxAge: number
  ): Promise<DocHistorySimple> {
    const row = await this.db.snapshotHistory.create({
      select: {
        timestamp: true,
        createdByUser: this.userSelectFields,
      },
      data: {
        workspaceId: snapshot.spaceId,
        id: snapshot.docId,
        timestamp: new Date(snapshot.timestamp),
        blob: snapshot.blob,
        createdBy: snapshot.editorId,
        expiredAt: new Date(Date.now() + maxAge),
      },
    });
    return {
      timestamp: row.timestamp.getTime(),
      editor: row.createdByUser,
    };
  }

  /**
   * Find doc history by workspaceId and docId.
   *
   * Only including timestamp, createdByUser
   */
  async findHistories(
    workspaceId: string,
    docId: string,
    filter?: DocHistoryFilter
  ): Promise<DocHistorySimple[]> {
    const rows = await this.db.snapshotHistory.findMany({
      select: {
        timestamp: true,
        createdByUser: this.userSelectFields,
      },
      where: {
        workspaceId,
        id: docId,
        timestamp: {
          lt: filter?.before ? new Date(filter.before) : new Date(),
        },
      },
      orderBy: {
        timestamp: 'desc',
      },
      take: filter?.take ?? 100,
    });
    return rows.map(r => ({
      timestamp: r.timestamp.getTime(),
      editor: r.createdByUser,
    }));
  }

  /**
   * Get the history of a doc at a specific timestamp.
   *
   * Including blob and createdByUser
   */
  async getHistory(
    workspaceId: string,
    docId: string,
    timestamp: number
  ): Promise<DocHistory | null> {
    const row = await this.db.snapshotHistory.findUnique({
      where: {
        workspaceId_id_timestamp: {
          workspaceId,
          id: docId,
          timestamp: new Date(timestamp),
        },
      },
      include: {
        createdByUser: this.userSelectFields,
      },
    });
    if (!row) {
      return null;
    }
    return {
      blob: row.blob,
      timestamp: row.timestamp.getTime(),
      editor: row.createdByUser,
    };
  }

  /**
   * Get the latest history of a doc.
   *
   * Only including timestamp, createdByUser
   */
  async getLatestHistory(
    workspaceId: string,
    docId: string
  ): Promise<DocHistorySimple | null> {
    const row = await this.db.snapshotHistory.findFirst({
      where: {
        workspaceId,
        id: docId,
      },
      select: {
        timestamp: true,
        createdByUser: this.userSelectFields,
      },
      orderBy: {
        timestamp: 'desc',
      },
    });
    if (!row) {
      return null;
    }
    return {
      timestamp: row.timestamp.getTime(),
      editor: row.createdByUser,
    };
  }

  /**
   * Delete expired histories.
   */
  async deleteExpiredHistories() {
    const { count } = await this.db.snapshotHistory.deleteMany({
      where: {
        expiredAt: {
          lte: new Date(),
        },
      },
    });
    this.logger.log(`Deleted ${count} expired histories`);
    return count;
  }

  // #endregion

  // #region Doc

  /**
   * insert or update a doc.
   */
  async upsert(doc: Doc) {
    const { spaceId, docId, blob, timestamp, editorId } = doc;
    const updatedAt = new Date(timestamp);
    // CONCERNS:
    //   i. Because we save the real user's last seen action time as `updatedAt`,
    //      it's possible to simply compare the `updatedAt` to determine if the snapshot is older than the one we are going to save.
    //
    //  ii. Prisma doesn't support `upsert` with additional `where` condition along side unique constraint.
    //      In our case, we need to manually check the `updatedAt` to avoid overriding the newer snapshot.
    //      where: { workspaceId_id: {}, updatedAt: { lt: updatedAt } }
    //                                   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    const result: { updatedAt: Date }[] = await this.db.$queryRaw`
      INSERT INTO "snapshots" ("workspace_id", "guid", "blob", "created_at", "updated_at", "created_by", "updated_by")
      VALUES (${spaceId}, ${docId}, ${blob}, DEFAULT, ${updatedAt}, ${editorId}, ${editorId})
      ON CONFLICT ("workspace_id", "guid")
      DO UPDATE SET "blob" = ${blob}, "updated_at" = ${updatedAt}, "updated_by" = ${editorId}
      WHERE "snapshots"."workspace_id" = ${spaceId} AND "snapshots"."guid" = ${docId} AND "snapshots"."updated_at" <= ${updatedAt}
      RETURNING "snapshots"."workspace_id" as "workspaceId", "snapshots"."guid" as "id", "snapshots"."updated_at" as "updatedAt"
    `;

    // if the condition `snapshot.updatedAt > updatedAt` is true, by which means the snapshot has already been updated by other process,
    // the updates has been applied to current `doc` must have been seen by the other process as well.
    // The `updatedSnapshot` will be `undefined` in this case.
    return result.at(0);
  }

  /**
   * Get a doc by workspaceId and docId.
   */
  async get(workspaceId: string, docId: string): Promise<Doc | null> {
    const row = await this.db.snapshot.findUnique({
      where: {
        workspaceId_id: {
          workspaceId,
          id: docId,
        },
      },
    });
    if (!row) {
      return null;
    }
    return {
      spaceId: row.workspaceId,
      docId: row.id,
      blob: row.blob,
      timestamp: row.updatedAt.getTime(),
      editorId: row.updatedBy || undefined,
    };
  }

  async getMeta(workspaceId: string, docId: string) {
    return await this.db.snapshot.findUnique({
      where: {
        workspaceId_id: {
          workspaceId,
          id: docId,
        },
      },
      select: {
        createdAt: true,
        updatedAt: true,
        createdByUser: this.userSelectFields,
        updatedByUser: this.userSelectFields,
      },
    });
  }

  /**
   * Detect a doc exists or not, including updates
   */
  async exists(workspaceId: string, docId: string) {
    const count = await this.db.snapshot.count({
      where: {
        workspaceId,
        id: docId,
      },
    });
    if (count > 0) {
      return true;
    }

    const updateCount = await this.getUpdateCount(workspaceId, docId);
    return updateCount > 0;
  }

  /**
   * Delete a doc and it's updates and snapshots.
   */
  @Transactional()
  async delete(workspaceId: string, docId: string) {
    const ident = { where: { workspaceId, id: docId } };
    const { count: snapshots } = await this.db.snapshot.deleteMany(ident);
    const { count: updates } = await this.db.update.deleteMany(ident);
    const { count: histories } =
      await this.db.snapshotHistory.deleteMany(ident);
    this.logger.log(
      `Deleted workspace ${workspaceId} doc ${docId}, including ${snapshots} snapshots, ${updates} updates, and ${histories} histories`
    );
  }

  /**
   * Delete the whole workspace's docs and their updates and snapshots.
   */
  @Transactional()
  async deleteAllByWorkspaceId(workspaceId: string) {
    const ident = { where: { workspaceId } };
    const { count: snapshots } = await this.db.snapshot.deleteMany(ident);
    const { count: updates } = await this.db.update.deleteMany(ident);
    const { count: histories } =
      await this.db.snapshotHistory.deleteMany(ident);
    this.logger.log(
      `Deleted workspace ${workspaceId} all docs, including ${snapshots} snapshots, ${updates} updates, and ${histories} histories`
    );
    return snapshots;
  }

  /**
   * Find the timestamps of docs by workspaceId.
   *
   * @param after Only return timestamps after this timestamp.
   */
  async findTimestampsByWorkspaceId(workspaceId: string, after?: number) {
    const snapshots = await this.db.snapshot.findMany({
      select: {
        id: true,
        updatedAt: true,
      },
      where: {
        workspaceId,
        ...(after
          ? {
              updatedAt: {
                gt: new Date(after),
              },
            }
          : {}),
      },
    });

    const updates = await this.db.update.groupBy({
      where: {
        workspaceId,
        ...(after
          ? {
              // [createdAt] in updates table is indexed, so it's fast
              createdAt: {
                gt: new Date(after),
              },
            }
          : {}),
      },
      by: ['id'],
      _max: {
        createdAt: true,
      },
    });

    const result: Record<string, number> = {};

    snapshots.forEach(s => {
      result[s.id] = s.updatedAt.getTime();
    });

    updates.forEach(u => {
      if (u._max.createdAt) {
        result[u.id] = u._max.createdAt.getTime();
      }
    });

    return result;
  }

  // #endregion
}
