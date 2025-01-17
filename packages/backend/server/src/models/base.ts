import { Inject, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

import { Config } from '../base';
import type { Models } from '.';
import { MODELS_SYMBOL } from './provider';

export class BaseModel {
  protected readonly logger = new Logger(this.constructor.name);

  @Inject(MODELS_SYMBOL)
  protected readonly models!: Models;

  @Inject(Config)
  protected readonly config!: Config;

  @Inject(PrismaClient)
  protected readonly db!: PrismaClient;
}
