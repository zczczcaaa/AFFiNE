import { Tooltip } from '@affine/component/ui/tooltip';
import { SubscriptionPlan } from '@affine/graphql';
import { useI18n } from '@affine/i18n';
import { useLiveData, useServices } from '@toeverything/infra';
import { type SyntheticEvent, useEffect } from 'react';

import {
  ServerConfigService,
  SubscriptionService,
} from '../../../modules/cloud';
import * as styles from './style.css';

export const UserPlanButton = ({
  onClick,
}: {
  onClick: (e: SyntheticEvent<Element, Event>) => void;
}) => {
  const { serverConfigService, subscriptionService } = useServices({
    ServerConfigService,
    SubscriptionService,
  });

  const hasPayment = useLiveData(
    serverConfigService.serverConfig.features$.map(r => r?.payment)
  );
  const plan = useLiveData(
    subscriptionService.subscription.pro$.map(subscription =>
      subscription !== null ? subscription?.plan : null
    )
  );
  const isBeliever = useLiveData(subscriptionService.subscription.isBeliever$);
  const isLoading = plan === null;

  useEffect(() => {
    // revalidate subscription to get the latest status
    subscriptionService.subscription.revalidate();
  }, [subscriptionService]);

  const t = useI18n();

  if (!hasPayment) {
    // no payment feature
    return;
  }

  if (isLoading) {
    // loading, do nothing
    return;
  }

  const planLabel = isBeliever ? 'Believer' : (plan ?? SubscriptionPlan.Free);

  return (
    <Tooltip content={t['com.affine.payment.tag-tooltips']()} side="top">
      <div
        data-is-believer={isBeliever ? 'true' : undefined}
        className={styles.userPlanButton}
        onClick={onClick}
        data-event-props="$.settingsPanel.profileAndBadge.viewPlans"
      >
        {planLabel}
      </div>
    </Tooltip>
  );
};
