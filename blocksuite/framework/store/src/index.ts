// oxlint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="../shim.d.ts" />

export * from './adapter';
export * from './extension';
export * from './model';
export * from './reactive';
export * from './schema';
export * from './transformer';
export { type IdGenerator, nanoid, uuidv4 } from './utils/id-generator';
export * from './yjs';

const env =
  typeof globalThis !== 'undefined'
    ? globalThis
    : typeof window !== 'undefined'
      ? window
      : // oxlint-disable-next-line
        // @ts-ignore FIXME: typecheck error
        typeof global !== 'undefined'
        ? // oxlint-disable-next-line
          // @ts-ignore FIXME: typecheck error
          global
        : {};
const importIdentifier = '__ $BLOCKSUITE_STORE$ __';

// oxlint-disable-next-line
// @ts-ignore FIXME: typecheck error
if (env[importIdentifier] === true) {
  // https://github.com/yjs/yjs/issues/438
  console.error(
    '@blocksuite/store was already imported. This breaks constructor checks and will lead to issues!'
  );
}
// oxlint-disable-next-line
// @ts-ignore FIXME: typecheck error
env[importIdentifier] = true;
