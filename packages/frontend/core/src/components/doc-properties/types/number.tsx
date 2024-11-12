import { PropertyValue } from '@affine/component';
import { useI18n } from '@affine/i18n';
import { NumberIcon } from '@blocksuite/icons/rc';
import {
  type ChangeEventHandler,
  useCallback,
  useEffect,
  useState,
} from 'react';

import { ConfigModal } from '../../mobile';
import * as styles from './number.css';
import type { PropertyValueProps } from './types';

const DesktopNumberValue = ({ value, onChange }: PropertyValueProps) => {
  const parsedValue = isNaN(Number(value)) ? null : value;
  const [tempValue, setTempValue] = useState(parsedValue);
  const handleBlur = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(e.target.value.trim());
    },
    [onChange]
  );
  const handleOnChange: ChangeEventHandler<HTMLInputElement> = useCallback(
    e => {
      setTempValue(e.target.value.trim());
    },
    []
  );
  const t = useI18n();
  useEffect(() => {
    setTempValue(parsedValue);
  }, [parsedValue]);
  return (
    <PropertyValue
      className={styles.numberPropertyValueContainer}
      isEmpty={!parsedValue}
    >
      <input
        className={styles.numberPropertyValueInput}
        type={'number'}
        value={tempValue || ''}
        onChange={handleOnChange}
        onBlur={handleBlur}
        data-empty={!tempValue}
        placeholder={t[
          'com.affine.page-properties.property-value-placeholder'
        ]()}
      />
    </PropertyValue>
  );
};

const MobileNumberValue = ({
  value,
  onChange,
  propertyInfo,
}: PropertyValueProps) => {
  const parsedValue = isNaN(Number(value)) ? null : value;
  const [tempValue, setTempValue] = useState(parsedValue);
  const handleBlur = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(e.target.value.trim());
    },
    [onChange]
  );
  const handleOnChange: ChangeEventHandler<HTMLInputElement> = useCallback(
    e => {
      setTempValue(e.target.value.trim());
    },
    []
  );
  const t = useI18n();
  useEffect(() => {
    setTempValue(parsedValue);
  }, [parsedValue]);

  const [open, setOpen] = useState(false);
  const onClose = useCallback(() => {
    setOpen(false);
    onChange(tempValue);
  }, [onChange, tempValue]);

  return (
    <>
      <PropertyValue
        className={styles.numberPropertyValueContainer}
        isEmpty={!parsedValue}
        onClick={() => {
          setOpen(true);
        }}
      >
        <div className={styles.mobileNumberPropertyValueInput}>
          {value ||
            t['com.affine.page-properties.property-value-placeholder']()}
        </div>
      </PropertyValue>
      <ConfigModal
        open={open}
        variant="popup"
        onDone={onClose}
        onOpenChange={setOpen}
        title={
          <>
            <NumberIcon className={styles.numberIcon} />
            {propertyInfo?.name}
          </>
        }
      >
        <input
          className={styles.mobileNumberPropertyValueInput}
          type={'number'}
          value={tempValue || ''}
          onChange={handleOnChange}
          onBlur={handleBlur}
          data-empty={!tempValue}
          placeholder={t[
            'com.affine.page-properties.property-value-placeholder'
          ]()}
        />
      </ConfigModal>
    </>
  );
};

export const NumberValue = BUILD_CONFIG.isMobileEdition
  ? MobileNumberValue
  : DesktopNumberValue;
