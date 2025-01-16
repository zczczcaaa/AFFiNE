import { Global, Injectable, Module } from '@nestjs/common';

import { FeatureModel } from './feature';
import { SessionModel } from './session';
import { UserModel } from './user';
import { VerificationTokenModel } from './verification-token';

const models = [
  UserModel,
  SessionModel,
  VerificationTokenModel,
  FeatureModel,
] as const;

@Injectable()
export class Models {
  constructor(
    public readonly user: UserModel,
    public readonly session: SessionModel,
    public readonly verificationToken: VerificationTokenModel,
    public readonly feature: FeatureModel
  ) {}
}

@Global()
@Module({
  providers: [...models, Models],
  exports: [Models],
})
export class ModelModules {}

export * from './feature';
export * from './session';
export * from './user';
export * from './verification-token';
