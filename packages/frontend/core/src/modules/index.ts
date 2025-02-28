import { configureQuotaModule } from '@affine/core/modules/quota';
import { type Framework } from '@toeverything/infra';

import {
  configureAIButtonModule,
  configureAINetworkSearchModule,
} from './ai-button';
import { configureAppSidebarModule } from './app-sidebar';
import { configAtMenuConfigModule } from './at-menu-config';
import { configureBlobManagementModule } from './blob-management';
import { configureCloudModule } from './cloud';
import { configureCollectionModule } from './collection';
import { configureWorkspaceDBModule } from './db';
import { configureDialogModule } from './dialogs';
import { configureDndModule } from './dnd';
import { configureDocModule } from './doc';
import { configureDocDisplayMetaModule } from './doc-display-meta';
import { configureDocInfoModule } from './doc-info';
import { configureDocLinksModule } from './doc-link';
import { configDocSearchMenuModule } from './doc-search-menu';
import { configureDocsSearchModule } from './docs-search';
import { configureEditorModule } from './editor';
import { configureEditorSettingModule } from './editor-setting';
import { configureExplorerModule } from './explorer';
import { configureFavoriteModule } from './favorite';
import { configureFeatureFlagModule } from './feature-flag';
import { configureGlobalContextModule } from './global-context';
import { configureI18nModule } from './i18n';
import { configureImportTemplateModule } from './import-template';
import { configureJournalModule } from './journal';
import { configureLifecycleModule } from './lifecycle';
import { configureNavigationModule } from './navigation';
import { configureOpenInApp } from './open-in-app';
import { configureOrganizeModule } from './organize';
import { configurePDFModule } from './pdf';
import { configurePeekViewModule } from './peek-view';
import { configurePermissionsModule } from './permissions';
import { configureQuickSearchModule } from './quicksearch';
import { configureShareDocsModule } from './share-doc';
import { configureShareSettingModule } from './share-setting';
import {
  configureCommonGlobalStorageImpls,
  configureStorageModule,
} from './storage';
import { configureSystemFontFamilyModule } from './system-font-family';
import { configureTagModule } from './tag';
import { configureTelemetryModule } from './telemetry';
import { configureTemplateDocModule } from './template-doc';
import { configureAppThemeModule } from './theme';
import { configureThemeEditorModule } from './theme-editor';
import { configureUrlModule } from './url';
import { configureUserspaceModule } from './userspace';
import { configureWorkspaceModule } from './workspace';

export function configureCommonModules(framework: Framework) {
  configureI18nModule(framework);
  configureWorkspaceModule(framework);
  configureDocModule(framework);
  configureWorkspaceDBModule(framework);
  configureStorageModule(framework);
  configureGlobalContextModule(framework);
  configureLifecycleModule(framework);
  configureFeatureFlagModule(framework);
  configureCollectionModule(framework);
  configureNavigationModule(framework);
  configureTagModule(framework);
  configureCloudModule(framework);
  configureQuotaModule(framework);
  configurePermissionsModule(framework);
  configureShareDocsModule(framework);
  configureShareSettingModule(framework);
  configureTelemetryModule(framework);
  configurePDFModule(framework);
  configurePeekViewModule(framework);
  configureDocDisplayMetaModule(framework);
  configureQuickSearchModule(framework);
  configureDocsSearchModule(framework);
  configureDocLinksModule(framework);
  configureOrganizeModule(framework);
  configureFavoriteModule(framework);
  configureExplorerModule(framework);
  configureThemeEditorModule(framework);
  configureEditorModule(framework);
  configureSystemFontFamilyModule(framework);
  configureEditorSettingModule(framework);
  configureImportTemplateModule(framework);
  configureUserspaceModule(framework);
  configureAppSidebarModule(framework);
  configureJournalModule(framework);
  configureUrlModule(framework);
  configureAppThemeModule(framework);
  configureDialogModule(framework);
  configureDocInfoModule(framework);
  configureOpenInApp(framework);
  configAtMenuConfigModule(framework);
  configDocSearchMenuModule(framework);
  configureDndModule(framework);
  configureCommonGlobalStorageImpls(framework);
  configureAINetworkSearchModule(framework);
  configureAIButtonModule(framework);
  configureTemplateDocModule(framework);
  configureBlobManagementModule(framework);
}
