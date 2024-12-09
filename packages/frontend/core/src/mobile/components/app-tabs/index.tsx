import { SafeArea } from '@affine/component';
import { WorkbenchLink } from '@affine/core/modules/workbench';
import { useLiveData, useService } from '@toeverything/infra';
import { assignInlineVars } from '@vanilla-extract/dynamic';
import React from 'react';
import { createPortal } from 'react-dom';

import { VirtualKeyboardService } from '../../modules/virtual-keyboard/services/virtual-keyboard';
import { type AppTabLink, tabs } from './data';
import * as styles from './styles.css';
import { TabItem } from './tab-item';

export const AppTabs = ({ background }: { background?: string }) => {
  const virtualKeyboardService = useService(VirtualKeyboardService);
  const virtualKeyboardVisible = useLiveData(virtualKeyboardService.show$);

  return createPortal(
    <SafeArea
      bottom
      className={styles.appTabs}
      bottomOffset={2}
      style={{
        ...assignInlineVars({
          [styles.appTabsBackground]: background,
        }),
        visibility: virtualKeyboardVisible ? 'hidden' : 'visible',
      }}
    >
      <ul className={styles.appTabsInner} id="app-tabs" role="tablist">
        {tabs.map(tab => {
          if ('to' in tab) {
            return <AppTabLink route={tab} key={tab.key} />;
          } else {
            return (
              <React.Fragment key={tab.key}>
                {<tab.custom tab={tab} />}
              </React.Fragment>
            );
          }
        })}
      </ul>
    </SafeArea>,
    document.body
  );
};

const AppTabLink = ({ route }: { route: AppTabLink }) => {
  const Link = route.LinkComponent || WorkbenchLink;

  return (
    <Link
      className={styles.tabItem}
      to={route.to}
      key={route.to}
      replaceHistory
    >
      <TabItem id={route.key} label={route.to.slice(1)}>
        <route.Icon />
      </TabItem>
    </Link>
  );
};
