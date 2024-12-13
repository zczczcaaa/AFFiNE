import { RedisOptions } from 'ioredis';

import { defineStartupConfig, ModuleConfig } from '../../base/config';

declare module '../config' {
  interface PluginsConfig {
    redis: ModuleConfig<RedisOptions>;
  }
}

defineStartupConfig('plugins.redis', {});
