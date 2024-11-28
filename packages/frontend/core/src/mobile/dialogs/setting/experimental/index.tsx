import { Modal, Scrollable, Switch } from '@affine/component';
import { PageHeader } from '@affine/core/mobile/components';
import { useI18n } from '@affine/i18n';
import { ArrowRightSmallIcon } from '@blocksuite/icons/rc';
import {
  AFFINE_FLAGS,
  FeatureFlagService,
  type Flag,
  useLiveData,
  useService,
} from '@toeverything/infra';
import { useCallback, useState } from 'react';

import { SettingGroup } from '../group';
import { RowLayout } from '../row.layout';
import * as styles from './styles.css';

export const ExperimentalFeatureSetting = () => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <SettingGroup title="Experimental">
        <RowLayout
          label={'Experimental Features'}
          onClick={() => setOpen(true)}
        >
          <ArrowRightSmallIcon fontSize={22} />
        </RowLayout>
      </SettingGroup>
      <Modal
        animation="slideRight"
        open={open}
        onOpenChange={setOpen}
        fullScreen
        contentOptions={{ className: styles.dialog }}
        withoutCloseButton
      >
        <ExperimentalFeatureList onBack={() => setOpen(false)} />
      </Modal>
    </>
  );
};

const ExperimentalFeatureList = ({ onBack }: { onBack: () => void }) => {
  const featureFlagService = useService(FeatureFlagService);

  return (
    <div className={styles.root}>
      <PageHeader back={!!onBack} backAction={onBack} className={styles.header}>
        <span className={styles.dialogTitle}>Experimental Features</span>
      </PageHeader>
      <Scrollable.Root className={styles.scrollArea}>
        <Scrollable.Viewport>
          <ul className={styles.content}>
            {Object.keys(AFFINE_FLAGS).map(key => (
              <ExperimentalFeaturesItem
                key={key}
                flag={featureFlagService.flags[key as keyof AFFINE_FLAGS]}
              />
            ))}
          </ul>
        </Scrollable.Viewport>
        <Scrollable.Scrollbar orientation="vertical" />
      </Scrollable.Root>
    </div>
  );
};

const ExperimentalFeaturesItem = ({ flag }: { flag: Flag }) => {
  const t = useI18n();
  const value = useLiveData(flag.$);

  const onChange = useCallback(
    (checked: boolean) => {
      flag.set(checked);
    },
    [flag]
  );

  if (flag.configurable === false || flag.hide) {
    return null;
  }

  return (
    <li>
      <div className={styles.itemBlock}>
        {t[flag.displayName]()}
        <Switch checked={value} onChange={onChange} />
      </div>
      {flag.description ? (
        <div className={styles.itemDescription}>{t[flag.description]()}</div>
      ) : null}
    </li>
  );
};
