import { Modal } from '@affine/component';
import { SignInPanel } from '@affine/core/components/sign-in';
import type {
  DialogComponentProps,
  GLOBAL_DIALOG_SCHEMA,
} from '@affine/core/modules/dialogs';
export const SignInDialog = ({
  close,
  server: initialServerBaseUrl,
}: DialogComponentProps<GLOBAL_DIALOG_SCHEMA['sign-in']>) => {
  return (
    <Modal
      open
      onOpenChange={() => close()}
      width={400}
      minHeight={500}
      contentOptions={{
        ['data-testid' as string]: 'auth-modal',
        style: { padding: '44px 40px 20px' },
      }}
    >
      <SignInPanel onClose={close} server={initialServerBaseUrl} />
    </Modal>
  );
};
