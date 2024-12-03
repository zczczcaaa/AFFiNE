import { NotificationCenter } from '@affine/component';
import { DefaultServerService } from '@affine/core/modules/cloud';
import {
  FrameworkScope,
  GlobalContextService,
  useService,
} from '@toeverything/infra';
import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';

import { GlobalDialogs } from '../../dialogs';
import { CustomThemeModifier } from './custom-theme';
import { FindInPageModal } from './find-in-page/find-in-page-modal';

export const RootWrapper = () => {
  const defaultServerService = useService(DefaultServerService);
  const globalContextService = useService(GlobalContextService);
  const [isServerReady, setIsServerReady] = useState(false);

  useEffect(() => {
    if (isServerReady) {
      return;
    }
    const abortController = new AbortController();
    defaultServerService.server
      .waitForConfigRevalidation(abortController.signal)
      .then(() => {
        setIsServerReady(true);
      })
      .catch(error => {
        console.error(error);
      });
    return () => {
      abortController.abort();
    };
  }, [defaultServerService, isServerReady]);

  useEffect(() => {
    globalContextService.globalContext.serverId.set(
      defaultServerService.server.id
    );
    return () => {
      globalContextService.globalContext.serverId.set(null);
    };
  }, [defaultServerService, globalContextService]);

  return (
    <FrameworkScope scope={defaultServerService.server.scope}>
      <GlobalDialogs />
      <NotificationCenter />
      <Outlet />
      <CustomThemeModifier />
      {BUILD_CONFIG.isElectron && <FindInPageModal />}
    </FrameworkScope>
  );
};
