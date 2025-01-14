import {
  MenuItem,
  MenuSeparator,
  MenuTrigger,
  Switch,
} from '@affine/component';
import {
  SettingRow,
  SettingWrapper,
} from '@affine/component/setting-components';
import { DocsService } from '@affine/core/modules/doc';
import { DocDisplayMetaService } from '@affine/core/modules/doc-display-meta';
import { FeatureFlagService } from '@affine/core/modules/feature-flag';
import {
  TemplateDocService,
  TemplateListMenu,
} from '@affine/core/modules/template-doc';
import { useI18n } from '@affine/i18n';
import { DeleteIcon } from '@blocksuite/icons/rc';
import { useLiveData, useService, useServices } from '@toeverything/infra';
import { useCallback } from 'react';

import * as styles from './template.css';

export const TemplateDocSetting = () => {
  const t = useI18n();
  const { featureFlagService, templateDocService } = useServices({
    FeatureFlagService,
    TemplateDocService,
  });
  const setting = templateDocService.setting;

  const enabled = useLiveData(featureFlagService.flags.enable_template_doc.$);

  const enablePageTemplate = useLiveData(setting.enablePageTemplate$);
  const pageTemplateDocId = useLiveData(setting.pageTemplateDocId$);
  const journalTemplateDocId = useLiveData(setting.journalTemplateDocId$);

  const togglePageTemplate = useCallback(
    (enable: boolean) => {
      setting.togglePageTemplate(enable);
    },
    [setting]
  );

  const updatePageTemplate = useCallback(
    (id?: string) => {
      setting.updatePageTemplateDocId(id);
    },
    [setting]
  );

  const updateJournalTemplate = useCallback(
    (id?: string) => {
      setting.updateJournalTemplateDocId(id);
    },
    [setting]
  );

  if (!enabled) return null;

  return (
    <SettingWrapper title={t['com.affine.settings.workspace.template.title']()}>
      <SettingRow
        name={t['com.affine.settings.workspace.template.journal']()}
        desc={t['com.affine.settings.workspace.template.journal-desc']()}
      >
        <TemplateSelector
          current={journalTemplateDocId}
          onChange={updateJournalTemplate}
        />
      </SettingRow>
      <SettingRow
        name={t['com.affine.settings.workspace.template.page']()}
        desc={t['com.affine.settings.workspace.template.page-desc']()}
      >
        <Switch checked={enablePageTemplate} onChange={togglePageTemplate} />
      </SettingRow>
      {enablePageTemplate ? (
        <SettingRow
          name={t['com.affine.settings.workspace.template.journal']()}
          desc={t['com.affine.settings.workspace.template.journal-desc']()}
        >
          <TemplateSelector
            current={pageTemplateDocId}
            onChange={updatePageTemplate}
          />
        </SettingRow>
      ) : null}
    </SettingWrapper>
  );
};

interface TemplateSelectorProps {
  current?: string;
  onChange?: (id?: string) => void;
}
const TemplateSelector = ({ current, onChange }: TemplateSelectorProps) => {
  const t = useI18n();
  const docsService = useService(DocsService);
  const docDisplayService = useService(DocDisplayMetaService);
  const doc = useLiveData(current ? docsService.list.doc$(current) : null);
  const title = useLiveData(doc ? docDisplayService.title$(doc.id) : null);
  // const isInTrash = useLiveData(doc?.trash$);

  return (
    <TemplateListMenu
      onSelect={onChange}
      contentOptions={{ align: 'end' }}
      suffixItems={
        <>
          <MenuSeparator />
          <MenuItem
            prefixIcon={<DeleteIcon className={styles.menuItemIcon} />}
            onClick={() => onChange?.()}
            type="danger"
          >
            {t['com.affine.settings.workspace.template.remove']()}
          </MenuItem>
        </>
      }
    >
      <MenuTrigger className={styles.menuTrigger}>
        {/* TODO: in trash design */}
        {title ?? t['com.affine.settings.workspace.template.keep-empty']()}
      </MenuTrigger>
    </TemplateListMenu>
  );
};
