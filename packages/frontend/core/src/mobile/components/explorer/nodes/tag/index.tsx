import type { NodeOperation } from '@affine/core/modules/explorer';
import { GlobalContextService } from '@affine/core/modules/global-context';
import type { Tag } from '@affine/core/modules/tag';
import { TagService } from '@affine/core/modules/tag';
import { useI18n } from '@affine/i18n';
import { useLiveData, useServices } from '@toeverything/infra';
import clsx from 'clsx';
import { useCallback, useMemo, useState } from 'react';

import { AddItemPlaceholder } from '../../layouts/add-item-placeholder';
import { ExplorerTreeNode } from '../../tree/node';
import { ExplorerDocNode } from '../doc';
import {
  useExplorerTagNodeOperations,
  useExplorerTagNodeOperationsMenu,
} from './operations';
import * as styles from './styles.css';

export const ExplorerTagNode = ({
  tagId,
  operations: additionalOperations,
}: {
  tagId: string;
  operations?: NodeOperation[];
}) => {
  const t = useI18n();
  const { tagService, globalContextService } = useServices({
    TagService,
    GlobalContextService,
  });
  const active =
    useLiveData(globalContextService.globalContext.tagId.$) === tagId;
  const [collapsed, setCollapsed] = useState(true);

  const tagRecord = useLiveData(tagService.tagList.tagByTagId$(tagId));
  const tagColor = useLiveData(tagRecord?.color$);
  const tagName = useLiveData(tagRecord?.value$);

  const Icon = useCallback(
    ({ className }: { className?: string }) => {
      return (
        <div className={clsx(styles.tagIconContainer, className)}>
          <div
            data-testid="explorer-tag-icon-dot"
            className={styles.tagIcon}
            style={{
              backgroundColor: tagColor,
            }}
          ></div>
        </div>
      );
    },
    [tagColor]
  );

  const option = useMemo(
    () => ({
      openNodeCollapsed: () => setCollapsed(false),
    }),
    []
  );
  const operations = useExplorerTagNodeOperationsMenu(tagId, option);
  const { handleNewDoc } = useExplorerTagNodeOperations(tagId, option);

  const finalOperations = useMemo(() => {
    if (additionalOperations) {
      return [...operations, ...additionalOperations];
    }
    return operations;
  }, [additionalOperations, operations]);

  if (!tagRecord) {
    return null;
  }

  return (
    <ExplorerTreeNode
      icon={Icon}
      name={tagName || t['Untitled']()}
      collapsed={collapsed}
      setCollapsed={setCollapsed}
      to={`/tag/${tagId}`}
      active={active}
      operations={finalOperations}
      data-testid={`explorer-tag-${tagId}`}
      aria-label={tagName}
      data-role="explorer-tag"
    >
      <ExplorerTagNodeDocs tag={tagRecord} onNewDoc={handleNewDoc} />
    </ExplorerTreeNode>
  );
};

/**
 * the `tag.pageIds$` has a performance issue,
 * so we split the tag node children into a separate component,
 * so it won't be rendered when the tag node is collapsed.
 */
export const ExplorerTagNodeDocs = ({
  tag,
  onNewDoc,
}: {
  tag: Tag;
  onNewDoc?: () => void;
}) => {
  const t = useI18n();
  const tagDocIds = useLiveData(tag.pageIds$);

  return (
    <>
      {tagDocIds.map(docId => (
        <ExplorerDocNode key={docId} docId={docId} />
      ))}
      <AddItemPlaceholder label={t['New Page']()} onClick={onNewDoc} />
    </>
  );
};
