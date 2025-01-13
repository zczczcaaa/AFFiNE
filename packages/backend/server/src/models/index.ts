import { Global, Injectable, Module } from '@nestjs/common';

import { UserModel } from './user';

const models = [UserModel] as const;

@Injectable()
export class Models {
  constructor(public readonly user: UserModel) {}
}

@Global()
@Module({
  providers: [...models, Models],
  exports: [Models],
})
export class ModelModules {}
