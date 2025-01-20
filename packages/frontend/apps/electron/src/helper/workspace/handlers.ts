import path from 'node:path';

import { parseUniversalId } from '@affine/nbstore';
import fs from 'fs-extra';

import { logger } from '../logger';
import { getDocStoragePool } from '../nbstore';
import { ensureSQLiteDisconnected } from '../nbstore/v1/ensure-db';
import type { WorkspaceMeta } from '../type';
import {
  getDeletedWorkspacesBasePath,
  getSpaceDBPath,
  getWorkspaceBasePathV1,
  getWorkspaceMeta,
} from './meta';

async function deleteWorkspaceV1(workspaceId: string) {
  try {
    await ensureSQLiteDisconnected('workspace', workspaceId);
    const basePath = await getWorkspaceBasePathV1('workspace', workspaceId);
    await fs.rmdir(basePath, { recursive: true });
  } catch (error) {
    logger.error('deleteWorkspaceV1', error);
  }
}

/**
 * Permanently delete the workspace data
 */
export async function deleteWorkspace(universalId: string) {
  const { peer, type, id } = parseUniversalId(universalId);
  await deleteWorkspaceV1(id);

  const dbPath = await getSpaceDBPath(peer, type, id);
  try {
    await getDocStoragePool().disconnect(universalId);
    await fs.rmdir(path.dirname(dbPath), { recursive: true });
  } catch (e) {
    logger.error('deleteWorkspace', e);
  }
}

/**
 * Move the workspace folder to `deleted-workspaces`
 * At the same time, permanently delete the v1 workspace folder if it's id exists in nbstore,
 * because trashing always happens after full sync from v1 to nbstore.
 */
export async function trashWorkspace(universalId: string) {
  const { peer, type, id } = parseUniversalId(universalId);
  await deleteWorkspaceV1(id);

  const dbPath = await getSpaceDBPath(peer, type, id);
  const movedPath = path.join(await getDeletedWorkspacesBasePath(), `${id}`);
  try {
    await getDocStoragePool().disconnect(universalId);
    return await fs.move(path.dirname(dbPath), movedPath, {
      overwrite: true,
    });
  } catch (error) {
    logger.error('trashWorkspace', error);
  }
}

export async function storeWorkspaceMeta(
  workspaceId: string,
  meta: Partial<WorkspaceMeta>
) {
  try {
    const basePath = await getWorkspaceBasePathV1('workspace', workspaceId);
    await fs.ensureDir(basePath);
    const metaPath = path.join(basePath, 'meta.json');
    const currentMeta = await getWorkspaceMeta('workspace', workspaceId);
    const newMeta = {
      ...currentMeta,
      ...meta,
    };
    await fs.writeJSON(metaPath, newMeta);
  } catch (err) {
    logger.error('storeWorkspaceMeta failed', err);
  }
}
