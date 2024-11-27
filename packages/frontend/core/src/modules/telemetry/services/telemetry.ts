import { mixpanel } from '@affine/track';
import type { GlobalContextService } from '@toeverything/infra';
import { ApplicationStarted, OnEvent, Service } from '@toeverything/infra';

import { AccountChanged, type AuthAccountInfo, AuthService } from '../../cloud';
import { AccountLoggedOut } from '../../cloud/services/auth';
import type { ServersService } from '../../cloud/services/servers';

@OnEvent(ApplicationStarted, e => e.onApplicationStart)
@OnEvent(AccountChanged, e => e.updateIdentity)
@OnEvent(AccountLoggedOut, e => e.onAccountLoggedOut)
export class TelemetryService extends Service {
  private readonly authService;
  constructor(
    serversService: ServersService,
    private readonly globalContextService: GlobalContextService
  ) {
    super();

    // TODO: support multiple servers
    const affineCloudServer = serversService.server$('affine-cloud').value;
    if (!affineCloudServer) {
      throw new Error('affine-cloud server not found');
    }
    this.authService = affineCloudServer.scope.get(AuthService);
  }

  onApplicationStart() {
    const account = this.authService.session.account$.value;
    this.updateIdentity(account);
    this.registerMiddlewares();
  }

  updateIdentity(account: AuthAccountInfo | null) {
    if (!account) {
      return;
    }
    mixpanel.identify(account.id);
    mixpanel.people.set({
      $email: account.email,
      $name: account.label,
      $avatar: account.avatar,
    });
  }

  onAccountLoggedOut() {
    mixpanel.reset();
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

  extractGlobalContext(): { page?: string } {
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
    return { page };
  }

  override dispose(): void {
    this.disposables.forEach(dispose => dispose());
    super.dispose();
  }
}
