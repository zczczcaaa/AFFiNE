import { LiveData, Service } from '@toeverything/infra';
import { nanoid } from 'nanoid';

import type { GLOBAL_DIALOG_SCHEMA } from '../constant';
import type { DialogProps, DialogResult, OpenedDialog } from '../types';

export class GlobalDialogService extends Service {
  readonly dialogs$ = new LiveData<OpenedDialog<GLOBAL_DIALOG_SCHEMA>[]>([]);

  open<T extends keyof GLOBAL_DIALOG_SCHEMA>(
    type: T,
    props: DialogProps<GLOBAL_DIALOG_SCHEMA[T]>,
    callback?: (result?: DialogResult<GLOBAL_DIALOG_SCHEMA[T]>) => void
  ): string {
    const id = nanoid();
    this.dialogs$.next([
      ...this.dialogs$.value,
      {
        type,
        props,
        callback,
        id,
      } as OpenedDialog<GLOBAL_DIALOG_SCHEMA>,
    ]);
    return id;
  }

  close(id: string, result?: unknown) {
    this.dialogs$.next(
      this.dialogs$.value.filter(dialog => {
        if (dialog.id === id) {
          if (dialog.callback) {
            dialog.callback(result as any);
          }
          return false;
        }
        return true;
      })
    );
  }
}
