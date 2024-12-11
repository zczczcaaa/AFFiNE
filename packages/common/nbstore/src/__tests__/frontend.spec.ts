import 'fake-indexeddb/auto';

import { test, vitest } from 'vitest';
import { Doc as YDoc } from 'yjs';

import { DocFrontend } from '../frontend/doc';
import { IndexedDBDocStorage } from '../impls/idb';
import { expectYjsEqual } from './utils';

test('doc', async () => {
  const doc1 = new YDoc({
    guid: 'test-doc',
  });
  doc1.getMap('test').set('hello', 'world');

  const docStorage = new IndexedDBDocStorage({
    id: 'ws1',
    peer: 'a',
    type: 'workspace',
  });

  await docStorage.connect();

  const frontend1 = new DocFrontend(docStorage, null);
  frontend1.start();
  frontend1.addDoc(doc1);
  await vitest.waitFor(async () => {
    const doc = await docStorage.getDoc('test-doc');
    expectYjsEqual(doc!.bin, {
      test: {
        hello: 'world',
      },
    });
  });

  const doc2 = new YDoc({
    guid: 'test-doc',
  });
  const frontend2 = new DocFrontend(docStorage, null);
  frontend2.start();
  frontend2.addDoc(doc2);

  await vitest.waitFor(async () => {
    expectYjsEqual(doc2, {
      test: {
        hello: 'world',
      },
    });
  });
});
