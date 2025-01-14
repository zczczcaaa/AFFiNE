import { Menu, MenuItem, type MenuProps, Scrollable } from '@affine/component';
import { useAsyncCallback } from '@affine/core/components/hooks/affine-async-hooks';
import { useLiveData, useService } from '@toeverything/infra';
import { useState } from 'react';

import { type DocRecord } from '../../doc';
import { DocDisplayMetaService } from '../../doc-display-meta';
import { TemplateDocService } from '../services/template-doc';
import * as styles from './styles.css';
interface CommonProps {
  onSelect?: (docId: string) => void;
}

interface DocItemProps extends CommonProps {
  doc: DocRecord;
}

const DocItem = ({ doc, onSelect }: DocItemProps) => {
  const docDisplayService = useService(DocDisplayMetaService);
  const Icon = useLiveData(docDisplayService.icon$(doc.id));
  const title = useLiveData(docDisplayService.title$(doc.id));

  const onClick = useAsyncCallback(async () => {
    onSelect?.(doc.id);
  }, [doc.id, onSelect]);

  return (
    <MenuItem prefixIcon={<Icon />} onClick={onClick}>
      {title}
    </MenuItem>
  );
};

interface TemplateListMenuContentProps extends CommonProps {
  prefixItems?: React.ReactNode;
  suffixItems?: React.ReactNode;
}
export const TemplateListMenuContent = ({
  prefixItems,
  suffixItems,
  ...props
}: TemplateListMenuContentProps) => {
  const templateDocService = useService(TemplateDocService);
  const [templateDocs] = useState(() =>
    templateDocService.list.getTemplateDocs()
  );

  return (
    <ul className={styles.list}>
      {prefixItems}
      {templateDocs.map(doc => (
        <DocItem key={doc.id} doc={doc} {...props} />
      ))}
      {suffixItems}
    </ul>
  );
};

export const TemplateListMenuContentScrollable = (
  props: TemplateListMenuContentProps
) => {
  return (
    <Scrollable.Root>
      <Scrollable.Scrollbar />
      <Scrollable.Viewport className={styles.scrollableViewport}>
        <TemplateListMenuContent {...props} />
      </Scrollable.Viewport>
    </Scrollable.Root>
  );
};

interface TemplateListMenuProps
  extends TemplateListMenuContentProps,
    Omit<MenuProps, 'items'> {}
export const TemplateListMenu = ({
  children,
  onSelect,
  prefixItems,
  suffixItems,
  contentOptions,
  ...otherProps
}: TemplateListMenuProps) => {
  return (
    <Menu
      items={
        <TemplateListMenuContentScrollable
          onSelect={onSelect}
          prefixItems={prefixItems}
          suffixItems={suffixItems}
        />
      }
      contentOptions={{
        ...contentOptions,
        className: styles.menuContent,
      }}
      {...otherProps}
    >
      {children}
    </Menu>
  );
};
