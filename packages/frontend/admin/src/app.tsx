import { Toaster } from '@affine/admin/components/ui/sonner';
import {
  configureCloudModule,
  DefaultServerService,
} from '@affine/core/modules/cloud';
import { configureLocalStorageStateStorageImpls } from '@affine/core/modules/storage';
import { configureUrlModule } from '@affine/core/modules/url';
import { wrapCreateBrowserRouter } from '@sentry/react';
import {
  configureGlobalContextModule,
  configureGlobalStorageModule,
  configureLifecycleModule,
  Framework,
  FrameworkRoot,
  FrameworkScope,
  LifecycleService,
} from '@toeverything/infra';
import { useEffect } from 'react';
import {
  createBrowserRouter as reactRouterCreateBrowserRouter,
  Navigate,
  Outlet,
  RouterProvider,
  useLocation,
} from 'react-router-dom';
import { toast } from 'sonner';
import { SWRConfig } from 'swr';

import { TooltipProvider } from './components/ui/tooltip';
import { isAdmin, useCurrentUser, useServerConfig } from './modules/common';
import { Layout } from './modules/layout';

const createBrowserRouter = wrapCreateBrowserRouter(
  reactRouterCreateBrowserRouter
);

const _createBrowserRouter = window.SENTRY_RELEASE
  ? createBrowserRouter
  : reactRouterCreateBrowserRouter;

function AuthenticatedRoutes() {
  const user = useCurrentUser();

  useEffect(() => {
    if (user && !isAdmin(user)) {
      toast.error('You are not an admin, please login the admin account.');
    }
  }, [user]);

  if (!user || !isAdmin(user)) {
    return <Navigate to="/admin/auth" />;
  }

  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}

function RootRoutes() {
  const config = useServerConfig();
  const location = useLocation();

  if (!config.initialized && location.pathname !== '/admin/setup') {
    return <Navigate to="/admin/setup" />;
  }

  if (/^\/admin\/?$/.test(location.pathname)) {
    return <Navigate to="/admin/accounts" />;
  }

  return <Outlet />;
}

export const router = _createBrowserRouter(
  [
    {
      path: '/admin',
      element: <RootRoutes />,
      children: [
        {
          path: '/admin/auth',
          lazy: () => import('./modules/auth'),
        },
        {
          path: '/admin/setup',
          lazy: () => import('./modules/setup'),
        },
        {
          path: '/admin/*',
          element: <AuthenticatedRoutes />,
          children: [
            {
              path: 'accounts',
              lazy: () => import('./modules/accounts'),
            },
            // {
            //   path: 'ai',
            //   lazy: () => import('./modules/ai'),
            // },
            {
              path: 'config',
              lazy: () => import('./modules/config'),
            },
            {
              path: 'settings',
              children: [
                {
                  path: '*',
                  lazy: () => import('./modules/settings'),
                },
              ],
            },
          ],
        },
      ],
    },
  ],
  {
    future: {
      v7_normalizeFormMethod: true,
    },
  }
);

const framework = new Framework();
configureLifecycleModule(framework);
configureLocalStorageStateStorageImpls(framework);
configureGlobalStorageModule(framework);
configureGlobalContextModule(framework);
configureUrlModule(framework);
configureCloudModule(framework);
const frameworkProvider = framework.provider();

// setup application lifecycle events, and emit application start event
window.addEventListener('focus', () => {
  frameworkProvider.get(LifecycleService).applicationFocus();
});
frameworkProvider.get(LifecycleService).applicationStart();
const serverService = frameworkProvider.get(DefaultServerService);

export const App = () => {
  return (
    <FrameworkRoot framework={frameworkProvider}>
      <FrameworkScope scope={serverService.server.scope}>
        <TooltipProvider>
          <SWRConfig
            value={{
              revalidateOnFocus: false,
              revalidateOnMount: false,
            }}
          >
            <RouterProvider router={router} />
          </SWRConfig>
          <Toaster />
        </TooltipProvider>
      </FrameworkScope>
    </FrameworkRoot>
  );
};
