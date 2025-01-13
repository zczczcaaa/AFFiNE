import type { SpaceType } from '../../../utils/universal-id';

interface NativeDBV1Apis {
  getBlob: (
    spaceType: SpaceType,
    workspaceId: string,
    key: string
  ) => Promise<Buffer | null>;
  deleteBlob: (
    spaceType: SpaceType,
    workspaceId: string,
    key: string
  ) => Promise<void>;
  getBlobKeys: (spaceType: SpaceType, workspaceId: string) => Promise<string[]>;
  getDocAsUpdates: (
    spaceType: SpaceType,
    workspaceId: string,
    subdocId: string
  ) => Promise<Uint8Array>;
}

export let apis: NativeDBV1Apis | null = null;

export function bindNativeDBV1Apis(a: NativeDBV1Apis) {
  apis = a;
}
