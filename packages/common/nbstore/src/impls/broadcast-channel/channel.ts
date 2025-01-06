import { AutoReconnectConnection } from '../../connection';

export interface BroadcastChannelConnectionOptions {
  id: string;
}

export class BroadcastChannelConnection extends AutoReconnectConnection<BroadcastChannel> {
  readonly channelName = `channel:${this.opts.id}`;

  constructor(private readonly opts: BroadcastChannelConnectionOptions) {
    super();
  }

  override async doConnect() {
    return new BroadcastChannel(this.channelName);
  }

  override doDisconnect() {
    this.close();
  }

  private close(error?: Error) {
    this.maybeConnection?.close();
    this.setStatus('closed', error);
  }
}
