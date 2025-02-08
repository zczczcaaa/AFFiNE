import { Module } from '@nestjs/common';

import { DocStorageModule } from '../doc';
import { DocRpcController } from './controller';

@Module({
  imports: [DocStorageModule],
  controllers: [DocRpcController],
})
export class DocServiceModule {}
