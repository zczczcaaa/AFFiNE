import { DefaultServerService, type Server } from '@affine/core/modules/cloud';
import { FrameworkScope, useService } from '@toeverything/infra';
import { useState } from 'react';

import { AddSelfhostedStep } from './add-selfhosted';
import { SignInStep } from './sign-in';
import { SignInWithEmailStep } from './sign-in-with-email';
import { SignInWithPasswordStep } from './sign-in-with-password';

export type SignInStep =
  | 'signIn'
  | 'signInWithPassword'
  | 'signInWithEmail'
  | 'addSelfhosted';

export interface SignInState {
  step: SignInStep;
  server?: Server;
  initialServerBaseUrl?: string;
  email?: string;
  redirectUrl?: string;
}

export const SignInPanel = ({
  onClose,
  server: initialServerBaseUrl,
}: {
  onClose: () => void;
  server?: string;
}) => {
  const [state, setState] = useState<SignInState>({
    step: initialServerBaseUrl ? 'addSelfhosted' : 'signIn',
    initialServerBaseUrl: initialServerBaseUrl,
  });

  const defaultServerService = useService(DefaultServerService);

  const step = state.step;
  const server = state.server ?? defaultServerService.server;

  return (
    <FrameworkScope scope={server.scope}>
      {step === 'signIn' ? (
        <SignInStep state={state} changeState={setState} close={onClose} />
      ) : step === 'signInWithEmail' ? (
        <SignInWithEmailStep
          state={state}
          changeState={setState}
          close={onClose}
        />
      ) : step === 'signInWithPassword' ? (
        <SignInWithPasswordStep
          state={state}
          changeState={setState}
          close={onClose}
        />
      ) : step === 'addSelfhosted' ? (
        <AddSelfhostedStep state={state} changeState={setState} />
      ) : null}
    </FrameworkScope>
  );
};
