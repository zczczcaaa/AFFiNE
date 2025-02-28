import { randomUUID } from 'node:crypto';
import { mock } from 'node:test';

import { User, Workspace } from '@prisma/client';
import ava, { TestFn } from 'ava';
import { applyUpdate, Doc as YDoc } from 'yjs';

import { createTestingApp, type TestingApp } from '../../../__tests__/utils';
import { AppModule } from '../../../app.module';
import { Config, UserFriendlyError } from '../../../base';
import { ConfigModule } from '../../../base/config';
import { Models } from '../../../models';
import { DatabaseDocReader, DocReader, PgWorkspaceDocStorageAdapter } from '..';
import { RpcDocReader } from '../reader';

const test = ava as TestFn<{
  models: Models;
  app: TestingApp;
  docReader: DocReader;
  databaseDocReader: DatabaseDocReader;
  adapter: PgWorkspaceDocStorageAdapter;
  config: Config;
}>;

test.before(async t => {
  const app = await createTestingApp({
    imports: [
      ConfigModule.forRoot({
        flavor: {
          doc: false,
        },
        docService: {
          endpoint: '',
        },
      }),
      AppModule,
    ],
  });

  t.context.models = app.get(Models);
  t.context.docReader = app.get(DocReader);
  t.context.databaseDocReader = app.get(DatabaseDocReader);
  t.context.adapter = app.get(PgWorkspaceDocStorageAdapter);
  t.context.config = app.get(Config);
  t.context.app = app;
});

let user: User;
let workspace: Workspace;

test.beforeEach(async t => {
  t.context.config.docService.endpoint = t.context.app.url();
  await t.context.app.initTestingDB();
  user = await t.context.models.user.create({
    email: 'test@affine.pro',
  });
  workspace = await t.context.models.workspace.create(user.id);
});

test.afterEach.always(() => {
  mock.reset();
});

test.after.always(async t => {
  await t.context.app.close();
});

test('should return null when doc not found', async t => {
  const { docReader } = t.context;
  const docId = randomUUID();
  const doc = await docReader.getDoc(workspace.id, docId);
  t.is(doc, null);
});

test('should throw error when doc service internal error', async t => {
  const { docReader, adapter } = t.context;
  const docId = randomUUID();
  mock.method(adapter, 'getDoc', async () => {
    throw new Error('mock doc service internal error');
  });
  let err = await t.throwsAsync(docReader.getDoc(workspace.id, docId), {
    instanceOf: UserFriendlyError,
    message: 'An internal error occurred.',
    name: 'internal_server_error',
  });
  t.is(err.type, 'internal_server_error');
  t.is(err.status, 500);

  err = await t.throwsAsync(docReader.getDocDiff(workspace.id, docId), {
    instanceOf: UserFriendlyError,
    message: 'An internal error occurred.',
    name: 'internal_server_error',
  });
  t.is(err.type, 'internal_server_error');
  t.is(err.status, 500);

  err = await t.throwsAsync(docReader.getDocContent(workspace.id, docId), {
    instanceOf: UserFriendlyError,
    message: 'An internal error occurred.',
    name: 'internal_server_error',
  });
  t.is(err.type, 'internal_server_error');
  t.is(err.status, 500);

  err = await t.throwsAsync(docReader.getWorkspaceContent(workspace.id), {
    instanceOf: UserFriendlyError,
    message: 'An internal error occurred.',
    name: 'internal_server_error',
  });
  t.is(err.type, 'internal_server_error');
  t.is(err.status, 500);
});

test('should fallback to database doc reader when endpoint network error', async t => {
  const { docReader } = t.context;
  t.context.config.docService.endpoint = 'http://localhost:13010';
  const docId = randomUUID();
  const timestamp = Date.now();
  await t.context.models.doc.createUpdates([
    {
      spaceId: workspace.id,
      docId,
      blob: Buffer.from('blob1 data'),
      timestamp,
      editorId: user.id,
    },
  ]);

  const doc = await docReader.getDoc(workspace.id, docId);
  t.truthy(doc);
  t.is(doc!.bin.toString(), 'blob1 data');
  t.is(doc!.timestamp, timestamp);
  t.is(doc!.editor, user.id);
});

test('should return doc when found', async t => {
  const { docReader } = t.context;
  t.true(docReader instanceof RpcDocReader);

  const docId = randomUUID();
  const timestamp = Date.now();
  await t.context.models.doc.createUpdates([
    {
      spaceId: workspace.id,
      docId,
      blob: Buffer.from('blob1 data'),
      timestamp,
      editorId: user.id,
    },
  ]);

  const doc = await docReader.getDoc(workspace.id, docId);
  t.truthy(doc);
  t.is(doc!.bin.toString(), 'blob1 data');
  t.is(doc!.timestamp, timestamp);
  t.is(doc!.editor, user.id);
});

test('should return doc diff', async t => {
  const { docReader } = t.context;
  const docId = randomUUID();
  const timestamp = Date.now();
  let updates: Buffer[] = [];
  const doc1 = new YDoc();
  doc1.on('update', data => {
    updates.push(Buffer.from(data));
  });

  const text = doc1.getText('content');
  text.insert(0, 'hello');
  text.insert(5, 'world');
  text.insert(5, ' ');
  text.insert(11, '!');

  await t.context.models.doc.createUpdates(
    updates.map((update, index) => ({
      spaceId: workspace.id,
      docId,
      blob: update,
      timestamp: timestamp + index,
      editorId: user.id,
    }))
  );
  // clear updates
  updates.splice(0, updates.length);

  const doc2 = new YDoc();
  const diff = await docReader.getDocDiff(workspace.id, docId);
  t.truthy(diff);
  t.truthy(diff!.missing);
  t.truthy(diff!.state);
  applyUpdate(doc2, diff!.missing);
  t.is(doc2.getText('content').toString(), 'hello world!');

  // nothing changed
  const diff2 = await docReader.getDocDiff(workspace.id, docId, diff!.state);
  t.truthy(diff2);
  t.truthy(diff2!.missing);
  t.deepEqual(diff2!.missing, new Uint8Array([0, 0]));
  t.truthy(diff2!.state);
  applyUpdate(doc2, diff2!.missing);
  t.is(doc2.getText('content').toString(), 'hello world!');

  // add new content on doc1
  text.insert(12, '@');
  await t.context.models.doc.createUpdates(
    updates.map((update, index) => ({
      spaceId: workspace.id,
      docId,
      blob: update,
      timestamp: Date.now() + index + 1000,
      editorId: user.id,
    }))
  );

  const diff3 = await docReader.getDocDiff(workspace.id, docId, diff2!.state);
  t.truthy(diff3);
  t.truthy(diff3!.missing);
  t.truthy(diff3!.state);
  applyUpdate(doc2, diff3!.missing);
  t.is(doc2.getText('content').toString(), 'hello world!@');
});

test('should get doc diff fallback to database doc reader when endpoint network error', async t => {
  const { docReader } = t.context;
  t.context.config.docService.endpoint = 'http://localhost:13010';
  const docId = randomUUID();
  const timestamp = Date.now();
  let updates: Buffer[] = [];
  const doc1 = new YDoc();
  doc1.on('update', data => {
    updates.push(Buffer.from(data));
  });

  const text = doc1.getText('content');
  text.insert(0, 'hello');
  text.insert(5, 'world');
  text.insert(5, ' ');
  text.insert(11, '!');

  await t.context.models.doc.createUpdates(
    updates.map((update, index) => ({
      spaceId: workspace.id,
      docId,
      blob: update,
      timestamp: timestamp + index,
      editorId: user.id,
    }))
  );
  // clear updates
  updates.splice(0, updates.length);

  const doc2 = new YDoc();
  const diff = await docReader.getDocDiff(workspace.id, docId);
  t.truthy(diff);
  t.truthy(diff!.missing);
  t.truthy(diff!.state);
  applyUpdate(doc2, diff!.missing);
  t.is(doc2.getText('content').toString(), 'hello world!');
});

test('should get doc content', async t => {
  const docId = randomUUID();
  const { docReader, databaseDocReader } = t.context;
  mock.method(databaseDocReader, 'getDocContent', async () => {
    return {
      title: 'test title',
      summary: 'test summary',
    };
  });
  const docContent = await docReader.getDocContent(workspace.id, docId);
  t.deepEqual(docContent, {
    title: 'test title',
    summary: 'test summary',
  });
});

test('should return null when doc content not exists', async t => {
  const docId = randomUUID();
  const { docReader, adapter } = t.context;

  const doc = new YDoc();
  const text = doc.getText('content');
  const updates: Buffer[] = [];

  doc.on('update', update => {
    updates.push(Buffer.from(update));
  });

  text.insert(0, 'hello');
  text.insert(5, 'world');
  text.insert(5, ' ');

  await adapter.pushDocUpdates(workspace.id, docId, updates, user.id);

  const docContent = await docReader.getDocContent(workspace.id, docId);
  t.is(docContent, null);

  const notExists = await docReader.getDocContent(workspace.id, randomUUID());
  t.is(notExists, null);
});

test('should get workspace content from doc service rpc', async t => {
  const { docReader, databaseDocReader } = t.context;
  const track = mock.method(
    databaseDocReader,
    'getWorkspaceContent',
    async () => {
      return {
        id: workspace.id,
        name: 'test name',
        avatarKey: '',
      };
    }
  );

  const workspaceContent = await docReader.getWorkspaceContent(workspace.id);
  t.is(track.mock.callCount(), 1);
  t.deepEqual(workspaceContent, {
    id: workspace.id,
    name: 'test name',
    avatarKey: '',
  });
});

test('should return null when workspace bin meta not exists', async t => {
  const { docReader, adapter } = t.context;
  const doc = new YDoc();
  const text = doc.getText('content');
  const updates: Buffer[] = [];

  doc.on('update', update => {
    updates.push(Buffer.from(update));
  });

  text.insert(0, 'hello');
  text.insert(5, 'world');
  text.insert(5, ' ');

  await adapter.pushDocUpdates(workspace.id, workspace.id, updates, user.id);

  const workspaceContent = await docReader.getWorkspaceContent(workspace.id);
  t.is(workspaceContent, null);

  // workspace not exists
  const notExists = await docReader.getWorkspaceContent(randomUUID());
  t.is(notExists, null);
});
