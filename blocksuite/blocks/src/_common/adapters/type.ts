import { createIdentifier } from '@blocksuite/global/di';
import type { BaseAdapter, Job } from '@blocksuite/store';

export type AdapterFactory = {
  // TODO(@chen): Make it return the specific adapter type
  get: (job: Job) => BaseAdapter;
};

export const AdapterFactoryIdentifier =
  createIdentifier<AdapterFactory>('AdapterFactory');
