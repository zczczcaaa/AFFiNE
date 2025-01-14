import { Global, Injectable, Module } from '@nestjs/common';

import { SessionModel } from './session';
import { UserModel } from './user';

const models = [UserModel, SessionModel] as const;

@Injectable()
export class Models {
  constructor(
    public readonly user: UserModel,
    public readonly session: SessionModel
  ) {}
}

@Global()
@Module({
  providers: [...models, Models],
  exports: [Models],
})
export class ModelModules {}
