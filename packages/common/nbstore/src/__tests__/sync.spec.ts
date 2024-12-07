import 'fake-indexeddb/auto';

import { expect, test } from 'vitest';
import { Doc as YDoc, encodeStateAsUpdate } from 'yjs';

import {
  IndexedDBBlobStorage,
  IndexedDBDocStorage,
  IndexedDBSyncStorage,
} from '../impls/idb';
import { SpaceStorage } from '../storage';
import { SyncEngine } from '../sync';

test('doc', async () => {
  const doc = new YDoc();
  doc.getMap('test').set('hello', 'world');
  const update = encodeStateAsUpdate(doc);

  const peerADoc = new IndexedDBDocStorage({
    id: 'ws1',
    peer: 'a',
    type: 'workspace',
  });

  const peerASync = new IndexedDBSyncStorage({
    id: 'ws1',
    peer: 'a',
    type: 'workspace',
  });

  const peerBDoc = new IndexedDBDocStorage({
    id: 'ws1',
    peer: 'b',
    type: 'workspace',
  });
  const peerCDoc = new IndexedDBDocStorage({
    id: 'ws1',
    peer: 'c',
    type: 'workspace',
  });

  const peerA = new SpaceStorage([peerADoc, peerASync]);
  const peerB = new SpaceStorage([peerBDoc]);
  const peerC = new SpaceStorage([peerCDoc]);

  await peerA.connect();
  await peerB.connect();
  await peerC.connect();

  await peerA.get('doc').pushDocUpdate({
    docId: 'doc1',
    bin: update,
  });

  const sync = new SyncEngine(peerA, [peerB, peerC]);
  const abort = new AbortController();
  sync.run(abort.signal);

  await new Promise(resolve => setTimeout(resolve, 1000));

  {
    const b = await peerB.get('doc').getDoc('doc1');
    expect(b).not.toBeNull();
    expect(b?.bin).toEqual(update);

    const c = await peerC.get('doc').getDoc('doc1');
    expect(c).not.toBeNull();
    expect(c?.bin).toEqual(update);
  }

  doc.getMap('test').set('foo', 'bar');
  const update2 = encodeStateAsUpdate(doc);
  await peerC.get('doc').pushDocUpdate({
    docId: 'doc1',
    bin: update2,
  });

  await new Promise(resolve => setTimeout(resolve, 1000));

  {
    const a = await peerA.get('doc').getDoc('doc1');
    expect(a).not.toBeNull();
    expect(a?.bin).toEqual(update2);

    const c = await peerC.get('doc').getDoc('doc1');
    expect(c).not.toBeNull();
    expect(c?.bin).toEqual(update2);
  }
});

test('blob', async () => {
  const a = new IndexedDBBlobStorage({
    id: 'ws1',
    peer: 'a',
    type: 'workspace',
  });

  const b = new IndexedDBBlobStorage({
    id: 'ws1',
    peer: 'b',
    type: 'workspace',
  });

  const c = new IndexedDBBlobStorage({
    id: 'ws1',
    peer: 'c',
    type: 'workspace',
  });

  await a.set({
    key: 'test',
    data: new Uint8Array([1, 2, 3, 4]),
    mime: 'text/plain',
    createdAt: new Date(100),
  });

  await c.set({
    key: 'test2',
    data: new Uint8Array([4, 3, 2, 1]),
    mime: 'text/plain',
    createdAt: new Date(100),
  });

  const peerA = new SpaceStorage([a]);
  const peerB = new SpaceStorage([b]);
  const peerC = new SpaceStorage([c]);

  await peerA.connect();
  await peerB.connect();
  await peerC.connect();

  const sync = new SyncEngine(peerA, [peerB, peerC]);
  const abort = new AbortController();
  sync.run(abort.signal);

  await new Promise(resolve => setTimeout(resolve, 1000));

  {
    const a = await peerA.get('blob').get('test');
    expect(a).not.toBeNull();
    expect(a?.data).toEqual(new Uint8Array([1, 2, 3, 4]));
  }

  {
    const b = await peerB.get('blob').get('test');
    expect(b).not.toBeNull();
    expect(b?.data).toEqual(new Uint8Array([1, 2, 3, 4]));
  }

  {
    const c = await peerC.get('blob').get('test2');
    expect(c).not.toBeNull();
    expect(c?.data).toEqual(new Uint8Array([4, 3, 2, 1]));
  }
});
