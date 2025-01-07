import { Global, Module } from '@nestjs/common';

import { ConfigModule } from '../config';
import { loggerProvider } from './service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [loggerProvider],
  exports: [loggerProvider],
})
export class LoggerModule {}

export { AFFiNELogger } from './logger';
