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
      attempts: 3,
      removeOnComplete: true,
      removeOnFail: false,
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
