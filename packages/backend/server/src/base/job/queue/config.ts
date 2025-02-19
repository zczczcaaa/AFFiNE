import { QueueOptions, WorkerOptions } from 'bullmq';

import {
  defineRuntimeConfig,
  defineStartupConfig,
  ModuleConfig,
} from '../../config';
import { Queue } from './def';

declare module '../../config' {
  interface AppConfig {
    job: ModuleConfig<
      {
        queue: Omit<QueueOptions, 'connection'>;
        worker: Omit<WorkerOptions, 'connection'>;
      },
      {
        queues: {
          [key in Queue]: {
            concurrency: number;
          };
        };
      }
    >;
  }
}

defineStartupConfig('job', {
  queue: {
    prefix: 'affine_job',
    defaultJobOptions: {
      attempts: 5,
      removeOnComplete: {
        age: 3600 /* 1h */,
        count: 100,
      },
      removeOnFail: {
        age: 24 * 3600 /* 1 day */,
        count: 500,
      },
    },
  },
  worker: {},
});

defineRuntimeConfig('job', {
  'queues.nightly.concurrency': {
    default: 1,
    desc: 'Concurrency of worker consuming of nightly checking job queue',
  },
  'queues.notification.concurrency': {
    default: 10,
    desc: 'Concurrency of worker consuming of notification job queue',
  },
  'queues.doc.concurrency': {
    default: 1,
    desc: 'Concurrency of worker consuming of doc job queue',
  },
});
