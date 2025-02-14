import { Global, Module } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import EventEmitter2 from 'eventemitter2';

import { EventBus, OnEvent } from './eventbus';

const EmitProvider = {
  provide: EventEmitter2,
  useValue: new EventEmitter2(),
};

@Global()
@Module({
  imports: [DiscoveryModule],
  providers: [EventBus, EmitProvider],
  exports: [EventBus],
})
export class EventModule {}

export { EventBus, OnEvent };
