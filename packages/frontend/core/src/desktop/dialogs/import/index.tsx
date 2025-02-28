import { Button, IconButton, Modal } from '@affine/component';
import { useAsyncCallback } from '@affine/core/components/hooks/affine-async-hooks';
import type {
  DialogComponentProps,
  WORKSPACE_DIALOG_SCHEMA,
} from '@affine/core/modules/dialogs';
import { UrlService } from '@affine/core/modules/url';
import {
  getAFFiNEWorkspaceSchema,
  WorkspaceService,
} from '@affine/core/modules/workspace';
import { DebugLogger } from '@affine/debug';
import { useI18n } from '@affine/i18n';
import track from '@affine/track';
import {
  HtmlTransformer,
  MarkdownTransformer,
  NotionHtmlTransformer,
  openFileOrFiles,
  ZipTransformer,
} from '@blocksuite/affine/blocks';
import type { Workspace } from '@blocksuite/affine/store';
import {
  ExportToHtmlIcon,
  ExportToMarkdownIcon,
  HelpIcon,
  NotionIcon,
  PageIcon,
  ZipIcon,
} from '@blocksuite/icons/rc';
import { useService } from '@toeverything/infra';
import { cssVar } from '@toeverything/theme';
import { cssVarV2 } from '@toeverything/theme/v2';
import {
  type ReactElement,
  type SVGAttributes,
  useCallback,
  useState,
} from 'react';

import * as style from './styles.css';

const logger = new DebugLogger('import');

type ImportType = 'markdown' | 'markdownZip' | 'notion' | 'snapshot' | 'html';
type AcceptType = 'Markdown' | 'Zip' | 'Html';
type Status = 'idle' | 'importing' | 'success' | 'error';
type ImportResult = {
  docIds: string[];
  entryId?: string;
  isWorkspaceFile?: boolean;
};

type ImportConfig = {
  fileOptions: { acceptType: AcceptType; multiple: boolean };
  importFunction: (
    docCollection: Workspace,
    file: File | File[]
  ) => Promise<ImportResult>;
};

const DISCORD_URL = 'https://discord.gg/whd5mjYqVw';

const importOptions = [
  {
    key: 'markdown',
    label: 'com.affine.import.markdown-files',
    prefixIcon: (
      <ExportToMarkdownIcon
        color={cssVarV2('icon/primary')}
        width={20}
        height={20}
      />
    ),
    testId: 'editor-option-menu-import-markdown-files',
    type: 'markdown' as ImportType,
  },
  {
    key: 'markdownZip',
    label: 'com.affine.import.markdown-with-media-files',
    prefixIcon: (
      <ZipIcon color={cssVarV2('icon/primary')} width={20} height={20} />
    ),
    suffixIcon: (
      <HelpIcon color={cssVarV2('icon/primary')} width={20} height={20} />
    ),
    suffixTooltip: 'com.affine.import.markdown-with-media-files.tooltip',
    testId: 'editor-option-menu-import-markdown-with-media',
    type: 'markdownZip' as ImportType,
  },
  {
    key: 'html',
    label: 'com.affine.import.html-files',
    prefixIcon: (
      <ExportToHtmlIcon
        color={cssVarV2('icon/primary')}
        width={20}
        height={20}
      />
    ),
    suffixIcon: (
      <HelpIcon color={cssVarV2('icon/primary')} width={20} height={20} />
    ),
    suffixTooltip: 'com.affine.import.html-files.tooltip',
    testId: 'editor-option-menu-import-html',
    type: 'html' as ImportType,
  },
  {
    key: 'notion',
    label: 'com.affine.import.notion',
    prefixIcon: <NotionIcon color={cssVar('black')} width={20} height={20} />,
    suffixIcon: (
      <HelpIcon color={cssVarV2('icon/primary')} width={20} height={20} />
    ),
    suffixTooltip: 'com.affine.import.notion.tooltip',
    testId: 'editor-option-menu-import-notion',
    type: 'notion' as ImportType,
  },
  {
    key: 'snapshot',
    label: 'com.affine.import.snapshot',
    prefixIcon: (
      <PageIcon color={cssVarV2('icon/primary')} width={20} height={20} />
    ),
    suffixIcon: (
      <HelpIcon color={cssVarV2('icon/primary')} width={20} height={20} />
    ),
    suffixTooltip: 'com.affine.import.snapshot.tooltip',
    testId: 'editor-option-menu-import-snapshot',
    type: 'snapshot' as ImportType,
  },
];

const importConfigs: Record<ImportType, ImportConfig> = {
  markdown: {
    fileOptions: { acceptType: 'Markdown', multiple: true },
    importFunction: async (docCollection, files) => {
      if (!Array.isArray(files)) {
        throw new Error('Expected an array of files for markdown files import');
      }
      const docIds: string[] = [];
      for (const file of files) {
        const text = await file.text();
        const fileName = file.name.split('.').slice(0, -1).join('.');
        const docId = await MarkdownTransformer.importMarkdownToDoc({
          collection: docCollection,
          schema: getAFFiNEWorkspaceSchema(),
          markdown: text,
          fileName,
        });
        if (docId) docIds.push(docId);
      }
      return {
        docIds,
      };
    },
  },
  markdownZip: {
    fileOptions: { acceptType: 'Zip', multiple: false },
    importFunction: async (docCollection, file) => {
      if (Array.isArray(file)) {
        throw new Error('Expected a single zip file for markdownZip import');
      }
      const docIds = await MarkdownTransformer.importMarkdownZip({
        collection: docCollection,
        schema: getAFFiNEWorkspaceSchema(),
        imported: file,
      });
      return {
        docIds,
      };
    },
  },
  html: {
    fileOptions: { acceptType: 'Html', multiple: true },
    importFunction: async (docCollection, files) => {
      if (!Array.isArray(files)) {
        throw new Error('Expected an array of files for html files import');
      }
      const docIds: string[] = [];
      for (const file of files) {
        const text = await file.text();
        const fileName = file.name.split('.').slice(0, -1).join('.');
        const docId = await HtmlTransformer.importHTMLToDoc({
          collection: docCollection,
          schema: getAFFiNEWorkspaceSchema(),
          html: text,
          fileName,
        });
        if (docId) docIds.push(docId);
      }
      return {
        docIds,
      };
    },
  },
  notion: {
    fileOptions: { acceptType: 'Zip', multiple: false },
    importFunction: async (docCollection, file) => {
      if (Array.isArray(file)) {
        throw new Error('Expected a single zip file for notion import');
      }
      const { entryId, pageIds, isWorkspaceFile } =
        await NotionHtmlTransformer.importNotionZip({
          collection: docCollection,
          schema: getAFFiNEWorkspaceSchema(),
          imported: file,
        });
      return {
        docIds: pageIds,
        entryId,
        isWorkspaceFile,
      };
    },
  },
  snapshot: {
    fileOptions: { acceptType: 'Zip', multiple: false },
    importFunction: async (docCollection, file) => {
      if (Array.isArray(file)) {
        throw new Error('Expected a single zip file for snapshot import');
      }
      const docIds = (
        await ZipTransformer.importDocs(
          docCollection,
          getAFFiNEWorkspaceSchema(),
          file
        )
      )
        .filter(doc => doc !== undefined)
        .map(doc => doc.id);

      return {
        docIds,
      };
    },
  },
};

const ImportOptionItem = ({
  label,
  prefixIcon,
  suffixIcon,
  suffixTooltip,
  type,
  onImport,
}: {
  label: string;
  prefixIcon: ReactElement<SVGAttributes<SVGElement>>;
  suffixIcon?: ReactElement<SVGAttributes<SVGElement>>;
  suffixTooltip?: string;
  type: ImportType;
  onImport: (type: ImportType) => void;
}) => {
  const t = useI18n();
  return (
    <div className={style.importItem} onClick={() => onImport(type)}>
      {prefixIcon}
      <div className={style.importItemLabel}>{t[label]()}</div>
      {suffixIcon && (
        <IconButton
          className={style.importItemSuffix}
          icon={suffixIcon}
          tooltip={suffixTooltip ? t[suffixTooltip]() : undefined}
        />
      )}
    </div>
  );
};

const ImportOptions = ({
  onImport,
}: {
  onImport: (type: ImportType) => void;
}) => {
  const t = useI18n();

  return (
    <>
      <div className={style.importModalTitle}>{t['Import']()}</div>
      <div className={style.importModalContent}>
        {importOptions.map(
          ({
            key,
            label,
            prefixIcon,
            suffixIcon,
            suffixTooltip,
            testId,
            type,
          }) => (
            <ImportOptionItem
              key={key}
              prefixIcon={prefixIcon}
              suffixIcon={suffixIcon}
              suffixTooltip={suffixTooltip}
              label={label}
              data-testid={testId}
              type={type}
              onImport={onImport}
            />
          )
        )}
      </div>
      <div className={style.importModalTip}>
        {t['com.affine.import.modal.tip']()}{' '}
        <a
          className={style.link}
          href="https://discord.gg/whd5mjYqVw"
          target="_blank"
          rel="noreferrer"
        >
          Discord
        </a>
        .
      </div>
    </>
  );
};

const ImportingStatus = () => {
  const t = useI18n();
  return (
    <>
      <div className={style.importModalTitle}>
        {t['com.affine.import.status.importing.title']()}
      </div>
      <p className={style.importStatusContent}>
        {t['com.affine.import.status.importing.message']()}
      </p>
    </>
  );
};

const SuccessStatus = ({ onComplete }: { onComplete: () => void }) => {
  const t = useI18n();
  return (
    <>
      <div className={style.importModalTitle}>
        {t['com.affine.import.status.success.title']()}
      </div>
      <p className={style.importStatusContent}>
        {t['com.affine.import.status.success.message']()}{' '}
        <a
          className={style.link}
          href={DISCORD_URL}
          target="_blank"
          rel="noreferrer"
        >
          Discord
        </a>
        .
      </p>
      <div className={style.importModalButtonContainer}>
        <Button onClick={onComplete} variant="primary">
          {t['Complete']()}
        </Button>
      </div>
    </>
  );
};

const ErrorStatus = ({
  error,
  onRetry,
}: {
  error: string | null;
  onRetry: () => void;
}) => {
  const t = useI18n();
  const urlService = useService(UrlService);
  return (
    <>
      <div className={style.importModalTitle}>
        {t['com.affine.import.status.failed.title']()}
      </div>
      <p className={style.importStatusContent}>
        {error || 'Unknown error occurred'}
      </p>
      <div className={style.importModalButtonContainer}>
        <Button
          onClick={() => {
            urlService.openPopupWindow(DISCORD_URL);
          }}
          variant="secondary"
        >
          {t['Feedback']()}
        </Button>
        <Button onClick={onRetry} variant="primary">
          {t['Retry']()}
        </Button>
      </div>
    </>
  );
};

export const ImportDialog = ({
  close,
}: DialogComponentProps<WORKSPACE_DIALOG_SCHEMA['import']>) => {
  const t = useI18n();
  const [status, setStatus] = useState<Status>('idle');
  const [importError, setImportError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const workspace = useService(WorkspaceService).workspace;
  const docCollection = workspace.docCollection;

  const handleImport = useAsyncCallback(
    async (type: ImportType) => {
      setImportError(null);
      try {
        const importConfig = importConfigs[type];
        const file = await openFileOrFiles(importConfig.fileOptions);

        if (!file || (Array.isArray(file) && file.length === 0)) {
          throw new Error(
            t['com.affine.import.status.failed.message.no-file-selected']()
          );
        }

        setStatus('importing');
        track.$.importModal.$.import({
          type,
          status: 'importing',
        });

        const { docIds, entryId, isWorkspaceFile } =
          await importConfig.importFunction(docCollection, file);

        setImportResult({ docIds, entryId, isWorkspaceFile });
        setStatus('success');
        track.$.importModal.$.import({
          type,
          status: 'success',
          result: {
            docCount: docIds.length,
          },
        });
        track.$.importModal.$.createDoc({
          control: 'import',
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error occurred';
        setImportError(errorMessage);
        setStatus('error');
        track.$.importModal.$.import({
          type,
          status: 'failed',
          error: errorMessage || undefined,
        });
        logger.error('Failed to import', error);
      }
    },
    [docCollection, t]
  );

  const handleComplete = useCallback(() => {
    close(importResult || undefined);
  }, [importResult, close]);

  const handleRetry = () => {
    setStatus('idle');
  };

  const statusComponents = {
    idle: <ImportOptions onImport={handleImport} />,
    importing: <ImportingStatus />,
    success: <SuccessStatus onComplete={handleComplete} />,
    error: <ErrorStatus error={importError} onRetry={handleRetry} />,
  };

  return (
    <Modal
      open
      onOpenChange={(open: boolean) => {
        if (!open) {
          close(importResult || undefined);
        }
      }}
      width={480}
      contentOptions={{
        ['data-testid' as string]: 'import-modal',
        style: {
          maxHeight: '85vh',
          maxWidth: '70vw',
          minHeight: '126px',
          padding: 0,
          overflow: 'hidden',
          display: 'flex',
          background: cssVarV2('layer/background/primary'),
        },
      }}
      closeButtonOptions={{
        className: style.closeButton,
      }}
      withoutCloseButton={status === 'importing'}
      persistent={status === 'importing'}
    >
      <div className={style.importModalContainer} data-testid="import-dialog">
        {statusComponents[status]}
      </div>
    </Modal>
  );
};
