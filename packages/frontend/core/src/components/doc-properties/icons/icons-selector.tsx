import { Menu, Scrollable } from '@affine/component';
import type { DocCustomPropertyInfo } from '@affine/core/modules/db';
import { useI18n } from '@affine/i18n';
import { chunk } from 'lodash-es';

import { type DocPropertyIconName, DocPropertyIconNames } from './constant';
import { DocPropertyIcon, iconNameToComponent } from './doc-property-icon';
import * as styles from './icons-selector.css';

const iconsPerRow = 6;

const iconRows = chunk(DocPropertyIconNames, iconsPerRow);

const IconsSelectorPanel = ({
  selectedIcon,
  onSelectedChange,
}: {
  selectedIcon?: string | null;
  onSelectedChange: (icon: DocPropertyIconName) => void;
}) => {
  const t = useI18n();
  return (
    <Scrollable.Root>
      <div role="heading" className={styles.menuHeader}>
        {t['com.affine.page-properties.icons']()}
      </div>
      <Scrollable.Viewport className={styles.iconsContainerScrollable}>
        <div className={styles.iconsContainer}>
          {iconRows.map(iconRow => {
            return (
              <div key={iconRow.join('-')} className={styles.iconsRow}>
                {iconRow.map(iconName => {
                  const Icon = iconNameToComponent(iconName);
                  return (
                    <div
                      onClick={() => onSelectedChange(iconName)}
                      key={iconName}
                      className={styles.iconButton}
                      data-name={iconName}
                      data-active={iconName === selectedIcon}
                    >
                      <Icon key={iconName} />
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
        <Scrollable.Scrollbar className={styles.iconsContainerScroller} />
      </Scrollable.Viewport>
    </Scrollable.Root>
  );
};

export const DocPropertyIconSelector = ({
  propertyInfo,
  readonly,
  onSelectedChange,
}: {
  propertyInfo: DocCustomPropertyInfo;
  readonly?: boolean;
  onSelectedChange: (icon: DocPropertyIconName) => void;
}) => {
  if (readonly) {
    return (
      <div className={styles.iconSelectorButton} data-readonly={readonly}>
        <DocPropertyIcon propertyInfo={propertyInfo} />
      </div>
    );
  }
  return (
    <Menu
      items={
        <div
          style={{
            padding: BUILD_CONFIG.isMobileEdition ? '0 20px' : undefined,
          }}
        >
          <IconsSelectorPanel
            selectedIcon={propertyInfo.icon}
            onSelectedChange={onSelectedChange}
          />
        </div>
      }
    >
      <div className={styles.iconSelectorButton}>
        <DocPropertyIcon propertyInfo={propertyInfo} />
      </div>
    </Menu>
  );
};
