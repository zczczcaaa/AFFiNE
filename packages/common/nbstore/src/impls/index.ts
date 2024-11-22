import type { Storage } from '../storage';

type StorageConstructor = new (...args: any[]) => Storage;

export const storages: StorageConstructor[] = [];

// in next pr
// eslint-disable-next-line sonarjs/no-empty-collection
const AvailableStorageImplementations = storages.reduce(
  (acc, curr) => {
    acc[curr.name] = curr;
    return acc;
  },
  {} as Record<string, StorageConstructor>
);

export const getAvailableStorageImplementations = (name: string) => {
  return AvailableStorageImplementations[name];
};
