import { Menu, MenuItem, MenuSeparator } from '@affine/component';
import { MenuItem as SidebarMenuItem } from '@affine/core/modules/app-sidebar/views';
import { DocsService } from '@affine/core/modules/doc';
import { FeatureFlagService } from '@affine/core/modules/feature-flag';
import { TemplateListMenuContentScrollable } from '@affine/core/modules/template-doc';
import { WorkbenchService } from '@affine/core/modules/workbench';
import { inferOpenMode } from '@affine/core/utils';
import { useI18n } from '@affine/i18n';
import { TemplateIcon, TemplateOutlineIcon } from '@blocksuite/icons/rc';
import { useLiveData, useService } from '@toeverything/infra';
import { useCallback, useState } from 'react';

import { useAsyncCallback } from '../hooks/affine-async-hooks';

export const TemplateDocEntrance = () => {
  const t = useI18n();
  const [menuOpen, setMenuOpen] = useState(false);
  const docsService = useService(DocsService);
  const featureFlagService = useService(FeatureFlagService);
  const workbench = useService(WorkbenchService).workbench;
  const enabled = useLiveData(featureFlagService.flags.enable_template_doc.$);

  const toggleMenu = useCallback(() => {
    setMenuOpen(prev => !prev);
  }, []);

  const createDocFromTemplate = useAsyncCallback(
    async (templateId: string) => {
      const docId = await docsService.duplicateFromTemplate(templateId);
      workbench.openDoc(docId);
    },
    [docsService, workbench]
  );

  if (!enabled) {
    return null;
  }

  return (
    <SidebarMenuItem icon={<TemplateOutlineIcon />} onClick={toggleMenu}>
      <Menu
        rootOptions={{ open: menuOpen, onOpenChange: setMenuOpen }}
        contentOptions={{
          side: 'right',
          align: 'end',
          alignOffset: -4,
          sideOffset: 16,
        }}
        items={
          <TemplateListMenuContentScrollable
            onSelect={createDocFromTemplate}
            suffixItems={
              <>
                <MenuSeparator />
                <CreateNewTemplateMenuItem />
              </>
            }
          />
        }
      >
        <span>{t['Template']()}</span>
      </Menu>
    </SidebarMenuItem>
  );
};

const CreateNewTemplateMenuItem = () => {
  const t = useI18n();
  const docsService = useService(DocsService);
  const workbench = useService(WorkbenchService).workbench;

  const createNewTemplate = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const record = docsService.createDoc({ isTemplate: true });
      workbench.openDoc(record.id, { at: inferOpenMode(e) });
    },
    [docsService, workbench]
  );

  return (
    <MenuItem
      prefixIcon={<TemplateIcon />}
      onClick={createNewTemplate}
      onAuxClick={createNewTemplate}
    >
      {t['com.affine.template-list.create-new']()}
    </MenuItem>
  );
};
