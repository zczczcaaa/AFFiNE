import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleInit,
} from '@nestjs/common';
import { DiscoveryService, MetadataScanner } from '@nestjs/core';
import {
  OnGatewayConnection,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import EventEmitter2, { type OnOptions } from 'eventemitter2';
import { CLS_ID, ClsService, ClsServiceManager } from 'nestjs-cls';
import type { Server, Socket } from 'socket.io';

import { wrapCallMetric } from '../metrics';
import { PushMetadata, sliceMetadata } from '../nestjs';
import { genRequestId } from '../utils';
import type { EventName } from './def';

const EVENT_LISTENER_METADATA = Symbol('event_listener');
interface EventHandlerMetadata {
  namespace: string;
  event: EventName;
  opts?: OnOptions;
}

interface EventOptions extends OnOptions {
  prepend?: boolean;
  name?: string;
  suppressError?: boolean;
}

export const OnEvent = (event: EventName, opts?: EventOptions) => {
  const namespace = event.split('.')[0];
  return PushMetadata<EventHandlerMetadata>(EVENT_LISTENER_METADATA, {
    namespace,
    event,
    opts,
  });
};

/**
 * We use socket.io system to auto pub/sub on server to server broadcast events
 */
@WebSocketGateway({
  namespace: 's2s',
})
@Injectable()
export class EventBus
  implements OnGatewayConnection, OnApplicationBootstrap, OnModuleInit
{
  private readonly logger = new Logger(EventBus.name);

  @WebSocketServer()
  private readonly server?: Server;

  constructor(
    private readonly emitter: EventEmitter2,
    private readonly cls: ClsService,
    private readonly discovery: DiscoveryService,
    private readonly scanner: MetadataScanner
  ) {}

  handleConnection(client: Socket) {
    // for internal usage only, disallow any connection from client
    this.logger.warn(
      `EventBus get suspicious connection from client ${client.id}, disconnecting...`
    );
    client.disconnect();
  }

  async onModuleInit() {
    this.bindEventHandlers();
  }

  async onApplicationBootstrap() {
    // Proxy all events received from server(trigger by `server.serverSideEmit`)
    // to internal event system
    this.server?.on('broadcast', (event, payload, requestId?: string) => {
      this.cls.run(() => {
        requestId = requestId ?? genRequestId('event');
        this.cls.set(CLS_ID, requestId);
        this.logger.log(`Server Event: ${event} (Received)`);
        this.emit(event, payload);
      });
    });
  }

  /**
   * Emit event to trigger all listeners on current instance
   */
  async emitAsync<T extends EventName>(event: T, payload: Events[T]) {
    this.logger.log(`Dispatch event: ${event} (async)`);
    return await this.emitter.emitAsync(event, payload);
  }

  /**
   * Emit event to trigger all listeners on current instance
   */
  emit<T extends EventName>(event: T, payload: Events[T]) {
    this.logger.log(`Dispatch event: ${event}`);
    return this.emitter.emit(event, payload);
  }

  /**
   * Broadcast event to trigger all listeners on all instance in cluster
   */
  broadcast<T extends EventName>(event: T, payload: Events[T]) {
    this.logger.log(`Server Event: ${event} (Send)`);
    this.server?.serverSideEmit('broadcast', event, payload, this.cls.getId());
  }

  on<T extends EventName>(
    event: T,
    listener: (payload: Events[T]) => void | Promise<any>,
    opts: EventOptions = {}
  ) {
    const namespace = event.split('.')[0];
    const { name, prepend, suppressError } = opts;
    let signature = name ?? listener.name ?? 'anonymous fn';

    const add = prepend ? this.emitter.prependListener : this.emitter.on;

    const handler = wrapCallMetric(
      async (payload: any) => {
        this.logger.verbose(`Handle event [${event}] (${signature})`);

        const cls = ClsServiceManager.getClsService();
        return await cls.run({ ifNested: 'reuse' }, async () => {
          const requestId = cls.getId();
          if (!requestId) {
            cls.set(CLS_ID, genRequestId('event'));
          }
          try {
            return await listener(payload);
          } catch (e) {
            if (suppressError) {
              this.logger.error(
                `Error happened when handling event [${event}] (${signature})`,
                e
              );
            } else {
              throw e;
            }
          }
        });
      },
      'event',
      'event_handler',
      {
        event,
        namespace,
        handler: signature,
      }
    );

    add.call(this.emitter, event, handler as any, opts);

    this.logger.verbose(
      `Event handler for [${event}] registered ${name ? `in [${name}]` : ''}`
    );

    return () => {
      this.emitter.off(event, handler as any);
    };
  }

  waitFor<T extends EventName>(name: T, timeout?: number) {
    return this.emitter.waitFor(name, timeout);
  }

  private bindEventHandlers() {
    // make sure all our job handlers defined in [Providers] to make the code organization clean.
    // const providers = [...this.discovery.getProviders(), this.discovery.getControllers()]
    const providers = this.discovery.getProviders();

    providers.forEach(wrapper => {
      const { instance, name } = wrapper;
      if (!instance || wrapper.isAlias) {
        return;
      }

      const proto = Object.getPrototypeOf(instance);
      const methods = this.scanner.getAllMethodNames(proto);

      methods.forEach(method => {
        const fn = instance[method];

        let defs = sliceMetadata<EventHandlerMetadata>(
          EVENT_LISTENER_METADATA,
          fn
        );

        if (defs.length === 0) {
          return;
        }

        const signature = `${name}.${method}`;

        if (typeof fn !== 'function') {
          throw new Error(`Event handler [${signature}] is not a function.`);
        }

        if (!wrapper.isDependencyTreeStatic()) {
          throw new Error(
            `Provider [${name}] could not be RequestScoped or TransientScoped injectable if it contains event handlers.`
          );
        }

        defs.forEach(({ event, opts }) => {
          this.on(
            event,
            (payload: any) => {
              // NOTE(@forehalo):
              //   we might create spies on the event handlers when testing,
              //   avoid reusing `fn` variable to fail the spies or stubs
              return instance[method](payload);
            },
            {
              ...opts,
              name: signature,
            }
          );
        });
      });
    });
  }
}
