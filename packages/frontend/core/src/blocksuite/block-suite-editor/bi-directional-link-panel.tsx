import { Button, Divider, useLitPortalFactory } from '@affine/component';
import { useEnableAI } from '@affine/core/components/hooks/affine/use-enable-ai';
import { DocService } from '@affine/core/modules/doc';
import {
  type Backlink,
  DocLinksService,
  type Link,
} from '@affine/core/modules/doc-link';
import { toURLSearchParams } from '@affine/core/modules/navigation';
import { GlobalSessionStateService } from '@affine/core/modules/storage';
import { WorkbenchLink } from '@affine/core/modules/workbench';
import {
  getAFFiNEWorkspaceSchema,
  WorkspaceService,
} from '@affine/core/modules/workspace';
import { useI18n } from '@affine/i18n';
import track from '@affine/track';
import type { TransformerMiddleware } from '@blocksuite/affine/store';
import { ToggleDownIcon } from '@blocksuite/icons/rc';
import * as Collapsible from '@radix-ui/react-collapsible';
import {
  LiveData,
  useFramework,
  useLiveData,
  useServices,
} from '@toeverything/infra';
import {
  Fragment,
  type ReactNode,
  useCallback,
  useMemo,
  useState,
} from 'react';

import {
  AffinePageReference,
  AffineSharedPageReference,
} from '../../components/affine/reference-link';
import { LitTextRenderer } from '../ai/components/text-renderer';
import { enableEditorExtension } from '../extensions/entry/enable-editor';
import {
  patchReferenceRenderer,
  type ReferenceReactRenderer,
} from '../extensions/reference-renderer';
import * as styles from './bi-directional-link-panel.css';

const PREFIX = 'bi-directional-link-panel-collapse:';

const useBiDirectionalLinkPanelCollapseState = (
  docId: string,
  linkDocId?: string
) => {
  const { globalSessionStateService } = useServices({
    GlobalSessionStateService,
  });

  const path = linkDocId ? docId + ':' + linkDocId : docId;

  const [open, setOpen] = useState(
    globalSessionStateService.globalSessionState.get(PREFIX + path) ?? false
  );

  const wrappedSetOpen = useCallback(
    (open: boolean) => {
      setOpen(open);
      globalSessionStateService.globalSessionState.set(PREFIX + path, open);
    },
    [path, globalSessionStateService]
  );

  return [open, wrappedSetOpen] as const;
};

const CollapsibleSection = ({
  title,
  children,
  length,
  docId,
  linkDocId,
}: {
  title: ReactNode;
  children: ReactNode;
  length?: number;
  docId: string;
  linkDocId?: string;
}) => {
  const [open, setOpen] = useBiDirectionalLinkPanelCollapseState(
    docId,
    linkDocId
  );

  const handleToggle = useCallback(() => {
    setOpen(!open);
    track.doc.biDirectionalLinksPanel.$.toggle({
      type: open ? 'collapse' : 'expand',
    });
  }, [open, setOpen]);

  return (
    <Collapsible.Root open={open} onOpenChange={handleToggle}>
      <Collapsible.Trigger className={styles.link}>
        {title}
        {length ? (
          <ToggleDownIcon
            className={styles.collapsedIcon}
            data-collapsed={!open}
          />
        ) : null}
      </Collapsible.Trigger>
      <Collapsible.Content>{children}</Collapsible.Content>
    </Collapsible.Root>
  );
};

const usePreviewExtensions = () => {
  const [reactToLit, portals] = useLitPortalFactory();
  const framework = useFramework();

  const { workspaceService } = useServices({
    WorkspaceService,
  });

  const referenceRenderer: ReferenceReactRenderer = useMemo(() => {
    return function customReference(reference) {
      const data = reference.delta.attributes?.reference;
      if (!data) return <span />;

      const pageId = data.pageId;
      if (!pageId) return <span />;

      const params = toURLSearchParams(data.params);

      if (workspaceService.workspace.openOptions.isSharedMode) {
        return (
          <AffineSharedPageReference
            docCollection={workspaceService.workspace.docCollection}
            pageId={pageId}
            params={params}
          />
        );
      }

      return <AffinePageReference pageId={pageId} params={params} />;
    };
  }, [workspaceService]);

  const enableAI = useEnableAI();

  const extensions = useMemo(() => {
    const specs = enableEditorExtension(framework, 'page', enableAI);
    specs.extend([patchReferenceRenderer(reactToLit, referenceRenderer)]);
    return specs.value;
  }, [reactToLit, referenceRenderer, framework, enableAI]);

  return [extensions, portals] as const;
};

const useBacklinkGroups = () => {
  const { docLinksService } = useServices({
    DocLinksService,
  });

  const backlinkGroups = useLiveData(
    LiveData.computed(get => {
      const links = get(docLinksService.backlinks.backlinks$);

      // group by docId
      const groupedLinks = links.reduce(
        (acc, link) => {
          acc[link.docId] = [...(acc[link.docId] || []), link];
          return acc;
        },
        {} as Record<string, Backlink[]>
      );

      return Object.entries(groupedLinks).map(([docId, links]) => ({
        docId,
        title: links[0].title, // title should be the same for all blocks
        links,
      }));
    })
  );

  return backlinkGroups;
};

export const BacklinkGroups = () => {
  const [extensions, portals] = usePreviewExtensions();
  const { workspaceService, docService } = useServices({
    WorkspaceService,
    DocService,
  });

  const backlinkGroups = useBacklinkGroups();
  const textRendererOptions = useMemo(() => {
    const docLinkBaseURLMiddleware: TransformerMiddleware = ({
      adapterConfigs,
    }) => {
      adapterConfigs.set(
        'docLinkBaseUrl',
        `/workspace/${workspaceService.workspace.id}`
      );
    };

    return {
      customHeading: true,
      extensions,
      additionalMiddlewares: [docLinkBaseURLMiddleware],
    };
  }, [extensions, workspaceService.workspace.id]);

  return (
    <>
      {backlinkGroups.map(linkGroup => (
        <CollapsibleSection
          key={linkGroup.docId}
          title={
            <AffinePageReference
              pageId={linkGroup.docId}
              onClick={() => {
                track.doc.biDirectionalLinksPanel.backlinkTitle.navigate();
              }}
            />
          }
          length={linkGroup.links.length}
          docId={docService.doc.id}
          linkDocId={linkGroup.docId}
        >
          <div className={styles.linkPreviewContainer}>
            {linkGroup.links.map(link => {
              if (!link.markdownPreview) {
                return null;
              }
              const searchParams = new URLSearchParams();
              const displayMode = link.displayMode || 'page';
              searchParams.set('mode', displayMode);

              let blockId = link.blockId;
              if (
                link.parentFlavour === 'affine:database' &&
                link.parentBlockId
              ) {
                // if parentBlockFlavour is 'affine:database',
                // we will fallback to the database block instead
                blockId = link.parentBlockId;
              } else if (displayMode === 'edgeless' && link.noteBlockId) {
                // if note has displayMode === 'edgeless' && has noteBlockId,
                // set noteBlockId as blockId
                blockId = link.noteBlockId;
              }

              searchParams.set('blockIds', blockId);

              const to = {
                pathname: '/' + linkGroup.docId,
                search: '?' + searchParams.toString(),
                hash: '',
              };

              // if this backlink has no noteBlock && displayMode is edgeless, we will render
              // the link as a page link
              const edgelessLink =
                displayMode === 'edgeless' && !link.noteBlockId;

              return (
                <WorkbenchLink
                  to={to}
                  key={link.blockId}
                  className={styles.linkPreview}
                  onClick={() => {
                    track.doc.biDirectionalLinksPanel.backlinkPreview.navigate();
                  }}
                >
                  {edgelessLink ? (
                    <>
                      [Edgeless]
                      <AffinePageReference
                        key={link.blockId}
                        pageId={linkGroup.docId}
                        params={searchParams}
                      />
                    </>
                  ) : (
                    <LitTextRenderer
                      className={styles.linkPreviewRenderer}
                      answer={link.markdownPreview}
                      schema={getAFFiNEWorkspaceSchema()}
                      options={textRendererOptions}
                    />
                  )}
                </WorkbenchLink>
              );
            })}
          </div>
        </CollapsibleSection>
      ))}
      <>
        {portals.map(p => (
          <Fragment key={p.id}>{p.portal}</Fragment>
        ))}
      </>
    </>
  );
};

export const BiDirectionalLinkPanel = () => {
  const { docLinksService, docService } = useServices({
    DocLinksService,
    DocService,
  });

  const t = useI18n();

  const [show, setShow] = useBiDirectionalLinkPanelCollapseState(
    docService.doc.id
  );

  const links = useLiveData(
    show ? docLinksService.links.links$ : new LiveData([] as Link[])
  );

  const backlinkGroups = useBacklinkGroups();

  const backlinkCount = useMemo(() => {
    return backlinkGroups.reduce((acc, link) => acc + link.links.length, 0);
  }, [backlinkGroups]);

  const handleClickShow = useCallback(() => {
    setShow(!show);
    track.doc.biDirectionalLinksPanel.$.toggle({
      type: show ? 'collapse' : 'expand',
    });
  }, [show, setShow]);
  return (
    <div className={styles.container}>
      {!show && <Divider size="thinner" />}

      <div className={styles.titleLine}>
        <div className={styles.title}>Bi-Directional Links</div>
        <Button className={styles.showButton} onClick={handleClickShow}>
          {show
            ? t['com.affine.editor.bi-directional-link-panel.hide']()
            : t['com.affine.editor.bi-directional-link-panel.show']()}
        </Button>
      </div>

      {show && (
        <>
          <Divider size="thinner" />

          <div className={styles.linksContainer}>
            <div className={styles.linksTitles}>
              {t['com.affine.page-properties.backlinks']()} · {backlinkCount}
            </div>
            <BacklinkGroups />
          </div>
          <div className={styles.linksContainer}>
            <div className={styles.linksTitles}>
              {t['com.affine.page-properties.outgoing-links']()} ·{' '}
              {links.length}
            </div>
            {links.map((link, i) => (
              <div
                key={`${link.docId}-${link.params?.toString()}-${i}`}
                className={styles.link}
              >
                <AffinePageReference pageId={link.docId} params={link.params} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
