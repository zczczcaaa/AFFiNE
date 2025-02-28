import {
  Input,
  MenuItem,
  MenuSeparator,
  useConfirmModal,
} from '@affine/component';
import type { DocCustomPropertyInfo } from '@affine/core/modules/db';
import { DocsService } from '@affine/core/modules/doc';
import { Trans, useI18n } from '@affine/i18n';
import { DeleteIcon, InvisibleIcon, ViewIcon } from '@blocksuite/icons/rc';
import { useLiveData, useService } from '@toeverything/infra';
import {
  type KeyboardEventHandler,
  type MouseEvent,
  useCallback,
  useEffect,
  useState,
} from 'react';

import { DocPropertyIcon } from '../icons/doc-property-icon';
import { DocPropertyIconSelector } from '../icons/icons-selector';
import {
  DocPropertyTypes,
  isSupportedDocPropertyType,
} from '../types/constant';
import * as styles from './edit-doc-property.css';

export const EditDocPropertyMenuItems = ({
  propertyId,
  onPropertyInfoChange,
  readonly,
}: {
  propertyId: string;
  readonly?: boolean;
  onPropertyInfoChange?: (
    field: keyof DocCustomPropertyInfo,
    value: string
  ) => void;
}) => {
  const t = useI18n();
  const docsService = useService(DocsService);
  const propertyInfo = useLiveData(
    docsService.propertyList.propertyInfo$(propertyId)
  );
  const propertyType = propertyInfo?.type;
  const typeInfo =
    propertyType && isSupportedDocPropertyType(propertyType)
      ? DocPropertyTypes[propertyType]
      : undefined;
  const propertyName =
    propertyInfo?.name ||
    (typeInfo?.name ? t.t(typeInfo.name) : t['unnamed']());
  const [name, setName] = useState(propertyName);
  const confirmModal = useConfirmModal();

  useEffect(() => {
    setName(propertyName);
  }, [propertyName]);

  const onKeyDown: KeyboardEventHandler<HTMLInputElement> = useCallback(
    e => {
      if (e.key !== 'Escape') {
        e.stopPropagation();
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        docsService.propertyList.updatePropertyInfo(propertyId, {
          name: e.currentTarget.value,
        });
      }
    },
    [docsService.propertyList, propertyId]
  );
  const handleBlur = useCallback(
    (e: FocusEvent & { currentTarget: HTMLInputElement }) => {
      docsService.propertyList.updatePropertyInfo(propertyId, {
        name: e.currentTarget.value,
      });
      onPropertyInfoChange?.('name', e.currentTarget.value);
    },
    [docsService.propertyList, propertyId, onPropertyInfoChange]
  );

  const handleIconChange = useCallback(
    (iconName: string) => {
      docsService.propertyList.updatePropertyInfo(propertyId, {
        icon: iconName,
      });
      onPropertyInfoChange?.('icon', iconName);
    },
    [docsService.propertyList, propertyId, onPropertyInfoChange]
  );

  const handleNameChange = useCallback((e: string) => {
    setName(e);
  }, []);

  const handleClickAlwaysShow = useCallback(
    (e: MouseEvent) => {
      e.preventDefault(); // avoid radix-ui close the menu
      docsService.propertyList.updatePropertyInfo(propertyId, {
        show: 'always-show',
      });
      onPropertyInfoChange?.('show', 'always-show');
    },
    [docsService.propertyList, propertyId, onPropertyInfoChange]
  );

  const handleClickHideWhenEmpty = useCallback(
    (e: MouseEvent) => {
      e.preventDefault(); // avoid radix-ui close the menu
      docsService.propertyList.updatePropertyInfo(propertyId, {
        show: 'hide-when-empty',
      });
      onPropertyInfoChange?.('show', 'hide-when-empty');
    },
    [docsService.propertyList, propertyId, onPropertyInfoChange]
  );

  const handleClickAlwaysHide = useCallback(
    (e: MouseEvent) => {
      e.preventDefault(); // avoid radix-ui close the menu
      docsService.propertyList.updatePropertyInfo(propertyId, {
        show: 'always-hide',
      });
      onPropertyInfoChange?.('show', 'always-hide');
    },
    [docsService.propertyList, propertyId, onPropertyInfoChange]
  );

  if (!propertyInfo || !isSupportedDocPropertyType(propertyType)) {
    return null;
  }

  return (
    <>
      <div
        className={
          BUILD_CONFIG.isMobileEdition
            ? styles.mobilePropertyRowNamePopupRow
            : styles.propertyRowNamePopupRow
        }
        data-testid="edit-property-menu-item"
      >
        <DocPropertyIconSelector
          propertyInfo={propertyInfo}
          readonly={readonly}
          onSelectedChange={handleIconChange}
        />
        {typeInfo?.renameable === false || readonly ? (
          <span className={styles.propertyName}>{name}</span>
        ) : (
          <Input
            value={name}
            onBlur={handleBlur}
            onChange={handleNameChange}
            placeholder={t['unnamed']()}
            onKeyDown={onKeyDown}
            size="large"
            style={{ borderRadius: 4 }}
          />
        )}
      </div>
      <div
        className={
          BUILD_CONFIG.isMobileEdition
            ? styles.mobilePropertyRowTypeItem
            : styles.propertyRowTypeItem
        }
      >
        {t['com.affine.page-properties.create-property.menu.header']()}
        <div className={styles.propertyTypeName}>
          <DocPropertyIcon propertyInfo={propertyInfo} />
          {t[`com.affine.page-properties.property.${propertyType}`]()}
        </div>
      </div>
      <MenuSeparator />
      <MenuItem
        prefixIcon={<ViewIcon />}
        onClick={handleClickAlwaysShow}
        selected={
          propertyInfo.show !== 'hide-when-empty' &&
          propertyInfo.show !== 'always-hide'
        }
        data-property-visibility="always-show"
        disabled={readonly}
      >
        {t['com.affine.page-properties.property.always-show']()}
      </MenuItem>
      <MenuItem
        prefixIcon={<InvisibleIcon />}
        onClick={handleClickHideWhenEmpty}
        selected={propertyInfo.show === 'hide-when-empty'}
        data-property-visibility="hide-when-empty"
        disabled={readonly}
      >
        {t['com.affine.page-properties.property.hide-when-empty']()}
      </MenuItem>
      <MenuItem
        prefixIcon={<InvisibleIcon />}
        onClick={handleClickAlwaysHide}
        selected={propertyInfo.show === 'always-hide'}
        data-property-visibility="always-hide"
        disabled={readonly}
      >
        {t['com.affine.page-properties.property.always-hide']()}
      </MenuItem>
      <MenuSeparator />
      <MenuItem
        prefixIcon={<DeleteIcon />}
        type="danger"
        disabled={readonly}
        onClick={() => {
          confirmModal.openConfirmModal({
            title:
              t['com.affine.settings.workspace.properties.delete-property'](),
            description: (
              <Trans
                values={{
                  name: name,
                }}
                i18nKey="com.affine.settings.workspace.properties.delete-property-desc"
              >
                The <strong>{{ name: name } as any}</strong> property will be
                removed from count doc(s). This action cannot be undone.
              </Trans>
            ),
            confirmText: t['Confirm'](),
            onConfirm: () => {
              docsService.propertyList.removeProperty(propertyId);
            },
            confirmButtonOptions: {
              variant: 'error',
            },
          });
        }}
      >
        {t['com.affine.settings.workspace.properties.delete-property']()}
      </MenuItem>
    </>
  );
};
