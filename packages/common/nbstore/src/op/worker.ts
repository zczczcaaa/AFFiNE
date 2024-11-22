import { OpConsumer } from '@toeverything/infra/op';

import { SpaceStorageConsumer } from './consumer';
import type { SpaceStorageOps } from './ops';

const consumer = new SpaceStorageConsumer(
  // @ts-expect-error safe
  new OpConsumer<SpaceStorageOps>(self)
);

consumer.listen();
