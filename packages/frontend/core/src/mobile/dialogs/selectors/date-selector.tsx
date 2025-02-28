import { DatePicker, Menu } from '@affine/component';
import type { DialogComponentProps } from '@affine/core/modules/dialogs';
import type { WORKSPACE_DIALOG_SCHEMA } from '@affine/core/modules/dialogs/constant';
import { useI18n } from '@affine/i18n';
import { useCallback, useState } from 'react';

/**
 * A global date selector popover for mobile, mainly used in blocksuite editor
 */
export const DateSelectorDialog = ({
  close,
  onSelect,
}: DialogComponentProps<WORKSPACE_DIALOG_SCHEMA['date-selector']>) => {
  const [selectedDate, setSelectedDate] = useState<string>();

  const t = useI18n();

  const onClose = useCallback(
    (open: boolean) => {
      if (!open) {
        close();
      }
    },
    [close]
  );

  const handleSelect = useCallback(
    (date?: string) => {
      setSelectedDate(date);
      onSelect?.(date);
    },
    [onSelect]
  );

  return (
    <Menu
      rootOptions={{
        modal: true,
        open: true,
        onOpenChange: onClose,
      }}
      contentOptions={{
        style: {
          padding: '15px 20px',
        },
      }}
      items={
        <DatePicker
          weekDays={t['com.affine.calendar-date-picker.week-days']()}
          monthNames={t['com.affine.calendar-date-picker.month-names']()}
          todayLabel={t['com.affine.calendar-date-picker.today']()}
          value={selectedDate}
          onChange={handleSelect}
        />
      }
    >
      <div />
    </Menu>
  );
};
