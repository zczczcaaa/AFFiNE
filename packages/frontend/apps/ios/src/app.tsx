import { AffineContext } from '@affine/core/components/context';
import { AppFallback } from '@affine/core/mobile/components/app-fallback';
import { configureMobileModules } from '@affine/core/mobile/modules';
import { HapticProvider } from '@affine/core/mobile/modules/haptics';
import { NavigationGestureProvider } from '@affine/core/mobile/modules/navigation-gesture';
import { VirtualKeyboardProvider } from '@affine/core/mobile/modules/virtual-keyboard';
import { router } from '@affine/core/mobile/router';
import { configureCommonModules } from '@affine/core/modules';
import { AIButtonProvider } from '@affine/core/modules/ai-button';
import {
  AuthProvider,
  AuthService,
  DefaultServerService,
  ServerScope,
  ServerService,
  ServersService,
  ValidatorProvider,
} from '@affine/core/modules/cloud';
import { DocsService } from '@affine/core/modules/doc';
import { GlobalContextService } from '@affine/core/modules/global-context';
import { I18nProvider } from '@affine/core/modules/i18n';
import { LifecycleService } from '@affine/core/modules/lifecycle';
import {
  configureLocalStorageStateStorageImpls,
  NbstoreProvider,
} from '@affine/core/modules/storage';
import { PopupWindowProvider } from '@affine/core/modules/url';
import { ClientSchemeProvider } from '@affine/core/modules/url/providers/client-schema';
import { configureBrowserWorkbenchModule } from '@affine/core/modules/workbench';
import { WorkspacesService } from '@affine/core/modules/workspace';
import { configureBrowserWorkspaceFlavours } from '@affine/core/modules/workspace-engine';
import { I18n } from '@affine/i18n';
import { StoreManagerClient } from '@affine/nbstore/worker/client';
import {
  defaultBlockMarkdownAdapterMatchers,
  docLinkBaseURLMiddleware,
  InlineDeltaToMarkdownAdapterExtensions,
  MarkdownAdapter,
  MarkdownInlineToDeltaAdapterExtensions,
  titleMiddleware,
} from '@blocksuite/affine/blocks';
import { Container } from '@blocksuite/affine/global/di';
import { App as CapacitorApp } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { Haptics } from '@capacitor/haptics';
import { Keyboard, KeyboardStyle } from '@capacitor/keyboard';
import { Framework, FrameworkRoot, getCurrentStore } from '@toeverything/infra';
import { OpClient } from '@toeverything/infra/op';
import { AsyncCall } from 'async-call-rpc';
import { useTheme } from 'next-themes';
import { Suspense, useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';

import { BlocksuiteMenuConfigProvider } from './bs-menu-config';
import { ModalConfigProvider } from './modal-config';
import { Auth } from './plugins/auth';
import { Hashcash } from './plugins/hashcash';
import { Intelligents } from './plugins/intelligents';
import { NbStoreNativeDBApis } from './plugins/nbstore';
import { writeEndpointToken } from './proxy';
import { enableNavigationGesture$ } from './web-navigation-control';

const storeManagerClient = createStoreManagerClient();
window.addEventListener('beforeunload', () => {
  storeManagerClient.dispose();
});

const future = {
  v7_startTransition: true,
} as const;

const framework = new Framework();
configureCommonModules(framework);
configureBrowserWorkbenchModule(framework);
configureLocalStorageStateStorageImpls(framework);
configureBrowserWorkspaceFlavours(framework);
configureMobileModules(framework);
framework.impl(NbstoreProvider, {
  openStore(key, options) {
    const { store, dispose } = storeManagerClient.open(key, options);
    return {
      store,
      dispose: () => {
        dispose();
      },
    };
  },
});
framework.impl(PopupWindowProvider, {
  open: (url: string) => {
    Browser.open({
      url,
      presentationStyle: 'popover',
    }).catch(console.error);
  },
});
framework.impl(ClientSchemeProvider, {
  getClientScheme() {
    return 'affine';
  },
});
framework.impl(ValidatorProvider, {
  async validate(_challenge, resource) {
    const res = await Hashcash.hash({ challenge: resource });
    return res.value;
  },
});
framework.impl(VirtualKeyboardProvider, {
  // We dose not provide show and hide because:
  // - Keyboard.show() is not implemented
  // - Keyboard.hide() will blur the current editor
  onChange: callback => {
    let disposeRef = {
      dispose: () => {},
    };

    Promise.all([
      Keyboard.addListener('keyboardDidShow', info => {
        callback({
          visible: true,
          height: info.keyboardHeight,
        });
      }),
      Keyboard.addListener('keyboardWillHide', () => {
        callback({
          visible: false,
          height: 0,
        });
      }),
    ])
      .then(handlers => {
        disposeRef.dispose = () => {
          Promise.all(handlers.map(handler => handler.remove())).catch(
            console.error
          );
        };
      })
      .catch(console.error);

    return () => {
      disposeRef.dispose();
    };
  },
});
framework.impl(NavigationGestureProvider, {
  isEnabled: () => enableNavigationGesture$.value,
  enable: () => enableNavigationGesture$.next(true),
  disable: () => enableNavigationGesture$.next(false),
});
framework.impl(HapticProvider, {
  impact: options => Haptics.impact(options as any),
  vibrate: options => Haptics.vibrate(options as any),
  notification: options => Haptics.notification(options as any),
  selectionStart: () => Haptics.selectionStart(),
  selectionChanged: () => Haptics.selectionChanged(),
  selectionEnd: () => Haptics.selectionEnd(),
});
framework.impl(AIButtonProvider, {
  presentAIButton: () => {
    return Intelligents.presentIntelligentsButton();
  },
  dismissAIButton: () => {
    return Intelligents.dismissIntelligentsButton();
  },
});
framework.scope(ServerScope).override(AuthProvider, resolver => {
  const serverService = resolver.get(ServerService);
  const endpoint = serverService.server.baseUrl;
  return {
    async signInMagicLink(email, linkToken) {
      const { token } = await Auth.signInMagicLink({
        endpoint,
        email,
        token: linkToken,
      });
      await writeEndpointToken(endpoint, token);
    },
    async signInOauth(code, state, _provider) {
      const { token } = await Auth.signInOauth({
        endpoint,
        code,
        state,
      });
      await writeEndpointToken(endpoint, token);
      return {};
    },
    async signInPassword(credential) {
      const { token } = await Auth.signInPassword({
        endpoint,
        ...credential,
      });
      await writeEndpointToken(endpoint, token);
    },
    async signOut() {
      await Auth.signOut({
        endpoint,
      });
    },
  };
});

const frameworkProvider = framework.provider();

// ------ some apis for native ------
(window as any).getCurrentServerBaseUrl = () => {
  const globalContextService = frameworkProvider.get(GlobalContextService);
  const currentServerId = globalContextService.globalContext.serverId.get();
  const serversService = frameworkProvider.get(ServersService);
  const defaultServerService = frameworkProvider.get(DefaultServerService);
  const currentServer =
    (currentServerId ? serversService.server$(currentServerId).value : null) ??
    defaultServerService.server;
  return currentServer.baseUrl;
};
(window as any).getCurrentI18nLocale = () => {
  return I18n.language;
};
(window as any).getCurrentWorkspaceId = () => {
  const globalContextService = frameworkProvider.get(GlobalContextService);
  return globalContextService.globalContext.workspaceId.get();
};
(window as any).getCurrentDocId = () => {
  const globalContextService = frameworkProvider.get(GlobalContextService);
  return globalContextService.globalContext.docId.get();
};
(window as any).getCurrentDocContentInMarkdown = async () => {
  const globalContextService = frameworkProvider.get(GlobalContextService);
  const currentWorkspaceId =
    globalContextService.globalContext.workspaceId.get();
  const currentDocId = globalContextService.globalContext.docId.get();
  const workspacesService = frameworkProvider.get(WorkspacesService);
  const workspaceRef = currentWorkspaceId
    ? workspacesService.openByWorkspaceId(currentWorkspaceId)
    : null;
  if (!workspaceRef) {
    return;
  }
  const { workspace, dispose: disposeWorkspace } = workspaceRef;

  const docsService = workspace.scope.get(DocsService);
  const docRef = currentDocId ? docsService.open(currentDocId) : null;
  if (!docRef) {
    return;
  }
  const { doc, release: disposeDoc } = docRef;

  try {
    const blockSuiteDoc = doc.blockSuiteDoc;

    const transformer = blockSuiteDoc.getTransformer([
      docLinkBaseURLMiddleware(blockSuiteDoc.workspace.id),
      titleMiddleware(blockSuiteDoc.workspace.meta.docMetas),
    ]);
    const snapshot = transformer.docToSnapshot(blockSuiteDoc);

    const container = new Container();
    [
      ...MarkdownInlineToDeltaAdapterExtensions,
      ...defaultBlockMarkdownAdapterMatchers,
      ...InlineDeltaToMarkdownAdapterExtensions,
    ].forEach(ext => {
      ext.setup(container);
    });
    const provider = container.provider();

    const adapter = new MarkdownAdapter(transformer, provider);
    if (!snapshot) {
      return;
    }

    const markdownResult = await adapter.fromDocSnapshot({
      snapshot,
      assets: transformer.assetsManager,
    });
    return markdownResult.file;
  } finally {
    disposeDoc();
    disposeWorkspace();
  }
};

// setup application lifecycle events, and emit application start event
window.addEventListener('focus', () => {
  frameworkProvider.get(LifecycleService).applicationFocus();
});
frameworkProvider.get(LifecycleService).applicationStart();

CapacitorApp.addListener('appUrlOpen', ({ url }) => {
  // try to close browser if it's open
  Browser.close().catch(e => console.error('Failed to close browser', e));

  const urlObj = new URL(url);

  if (urlObj.hostname === 'authentication') {
    const method = urlObj.searchParams.get('method');
    const payload = JSON.parse(urlObj.searchParams.get('payload') ?? 'false');

    if (
      !method ||
      (method !== 'magic-link' && method !== 'oauth') ||
      !payload
    ) {
      console.error('Invalid authentication url', url);
      return;
    }

    const authService = frameworkProvider
      .get(DefaultServerService)
      .server.scope.get(AuthService);
    if (method === 'oauth') {
      authService
        .signInOauth(payload.code, payload.state, payload.provider)
        .catch(console.error);
    } else if (method === 'magic-link') {
      authService
        .signInMagicLink(payload.email, payload.token)
        .catch(console.error);
    }
  }
}).catch(e => {
  console.error(e);
});

const KeyboardThemeProvider = () => {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    Keyboard.setStyle({
      style:
        resolvedTheme === 'dark'
          ? KeyboardStyle.Dark
          : resolvedTheme === 'light'
            ? KeyboardStyle.Light
            : KeyboardStyle.Default,
    }).catch(e => {
      console.error(`Failed to set keyboard style: ${e}`);
    });
  }, [resolvedTheme]);

  return null;
};

export function App() {
  return (
    <Suspense>
      <FrameworkRoot framework={frameworkProvider}>
        <I18nProvider>
          <AffineContext store={getCurrentStore()}>
            <KeyboardThemeProvider />
            <ModalConfigProvider>
              <BlocksuiteMenuConfigProvider>
                <RouterProvider
                  fallbackElement={<AppFallback />}
                  router={router}
                  future={future}
                />
              </BlocksuiteMenuConfigProvider>
            </ModalConfigProvider>
          </AffineContext>
        </I18nProvider>
      </FrameworkRoot>
    </Suspense>
  );
}

function createStoreManagerClient() {
  const worker = new Worker(
    new URL(
      /* webpackChunkName: "nbstore-worker" */ './worker.ts',
      import.meta.url
    )
  );
  const { port1: nativeDBApiChannelServer, port2: nativeDBApiChannelClient } =
    new MessageChannel();
  AsyncCall<typeof NbStoreNativeDBApis>(NbStoreNativeDBApis, {
    channel: {
      on(listener) {
        const f = (e: MessageEvent<any>) => {
          listener(e.data);
        };
        nativeDBApiChannelServer.addEventListener('message', f);
        return () => {
          nativeDBApiChannelServer.removeEventListener('message', f);
        };
      },
      send(data) {
        nativeDBApiChannelServer.postMessage(data);
      },
    },
    log: false,
  });
  nativeDBApiChannelServer.start();
  worker.postMessage(
    {
      type: 'native-db-api-channel',
      port: nativeDBApiChannelClient,
    },
    [nativeDBApiChannelClient]
  );
  return new StoreManagerClient(new OpClient(worker));
}
