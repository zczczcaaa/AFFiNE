import type { DocStorage } from '@toeverything/infra';

import {
  AFFiNE_WORKSPACE_DB_SCHEMA,
  AFFiNE_WORKSPACE_USERDATA_DB_SCHEMA,
} from './schema';

export async function transformWorkspaceDBLocalToCloud(
  localWorkspaceId: string,
  cloudWorkspaceId: string,
  localDocStorage: DocStorage,
  cloudDocStorage: DocStorage,
  accountId: string
) {
  for (const tableName of Object.keys(AFFiNE_WORKSPACE_DB_SCHEMA)) {
    const localDocName = `db$${localWorkspaceId}$${tableName}`;
    const localDoc = await localDocStorage.doc.get(localDocName);
    if (localDoc) {
      const cloudDocName = `db$${cloudWorkspaceId}$${tableName}`;
      await cloudDocStorage.doc.set(cloudDocName, localDoc);
    }
  }

  for (const tableName of Object.keys(AFFiNE_WORKSPACE_USERDATA_DB_SCHEMA)) {
    const localDocName = `userdata$__local__$${localWorkspaceId}$${tableName}`;
    const localDoc = await localDocStorage.doc.get(localDocName);
    if (localDoc) {
      const cloudDocName = `userdata$${accountId}$${cloudWorkspaceId}$${tableName}`;
      await cloudDocStorage.doc.set(cloudDocName, localDoc);
    }
  }
}
