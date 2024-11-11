import { useJournalRouteHelper } from '@affine/core/components/hooks/use-journal';
import { DocDisplayMetaService } from '@affine/core/modules/doc-display-meta';
import { JournalService } from '@affine/core/modules/journal';
import { WorkbenchService } from '@affine/core/modules/workbench';
import { TodayIcon } from '@blocksuite/icons/rc';
import { useLiveData, useService } from '@toeverything/infra';
import { useCallback } from 'react';

import { tabItem } from './styles.css';

export const AppTabJournal = () => {
  const workbench = useService(WorkbenchService).workbench;
  const location = useLiveData(workbench.location$);
  const journalService = useService(JournalService);
  const docDisplayMetaService = useService(DocDisplayMetaService);

  const maybeDocId = location.pathname.split('/')[1];
  const journalDate = useLiveData(journalService.journalDate$(maybeDocId));
  const JournalIcon = useLiveData(
    docDisplayMetaService.icon$(maybeDocId, { compareDate: new Date() })
  );

  const { openToday } = useJournalRouteHelper();
  const handleOpenToday = useCallback(() => openToday(false), [openToday]);

  const Icon = journalDate ? JournalIcon : TodayIcon;

  return (
    <div
      className={tabItem}
      onClick={handleOpenToday}
      data-active={!!journalDate}
      role="tab"
      aria-label="Journal"
    >
      <Icon />
    </div>
  );
};
