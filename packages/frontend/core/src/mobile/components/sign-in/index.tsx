import { SignInPanel } from '@affine/core/components/sign-in';

import { MobileSignInLayout } from './layout';

export const MobileSignInPanel = ({
  onClose,
  server,
}: {
  onClose: () => void;
  server?: string;
}) => {
  return (
    <MobileSignInLayout>
      <SignInPanel onClose={onClose} server={server} />
    </MobileSignInLayout>
  );
};
