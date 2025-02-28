import { mixpanel } from '@affine/track';
import { LiveData, OnEvent, Service } from '@toeverything/infra';

import type { AuthAccountInfo, Server, ServersService } from '../../cloud';
import type { GlobalContextService } from '../../global-context';
import { ApplicationStarted } from '../../lifecycle';

@OnEvent(ApplicationStarted, e => e.onApplicationStart)
export class TelemetryService extends Service {
  private readonly disposableFns: (() => void)[] = [];

  private readonly currentAccount$ =
    this.globalContextService.globalContext.serverId.$.selector(id =>
      id
        ? this.serversService.server$(id)
        : new LiveData<Server | undefined>(undefined)
    )
      .flat()
      .selector(server => server?.account$)
      .flat();

  constructor(
    private readonly globalContextService: GlobalContextService,
    private readonly serversService: ServersService
  ) {
    super();

    // TODO: support multiple servers

    let prevAccount: AuthAccountInfo | null = null;
    const unsubscribe = this.currentAccount$.subscribe(account => {
      if (prevAccount) {
        mixpanel.reset();
      }
      prevAccount = account ?? null;
      if (account) {
        mixpanel.identify(account.id);
        mixpanel.people.set({
          $email: account.email,
          $name: account.label,
          $avatar: account.avatar,
        });
      }
    });
    this.disposableFns.push(() => {
      unsubscribe.unsubscribe();
    });
  }

  onApplicationStart() {
    this.registerMiddlewares();
  }

  registerMiddlewares() {
    this.disposables.push(
      mixpanel.middleware((_event, parameters) => {
        const extraContext = this.extractGlobalContext();
        return {
          ...extraContext,
          ...parameters,
        };
      })
    );
  }

  extractGlobalContext(): { page?: string; serverId?: string } {
    const globalContext = this.globalContextService.globalContext;
    const page = globalContext.isDoc.get()
      ? globalContext.isTrashDoc.get()
        ? 'trash'
        : globalContext.docMode.get() === 'page'
          ? 'doc'
          : 'edgeless'
      : globalContext.isAllDocs.get()
        ? 'allDocs'
        : globalContext.isTrash.get()
          ? 'trash'
          : globalContext.isCollection.get()
            ? 'collection'
            : globalContext.isTag.get()
              ? 'tag'
              : undefined;
    const serverId = globalContext.serverId.get() ?? undefined;
    return { page, serverId };
  }

  override dispose(): void {
    this.disposableFns.forEach(dispose => dispose());
    super.dispose();
  }
}
