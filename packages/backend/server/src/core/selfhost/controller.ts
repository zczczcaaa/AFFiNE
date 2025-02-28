import { Body, Controller, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';

import {
  ActionForbidden,
  InternalServerError,
  Mutex,
  PasswordRequired,
  Runtime,
} from '../../base';
import { Models } from '../../models';
import { AuthService, Public } from '../auth';
import { ServerService } from '../config';
import { validators } from '../utils/validators';

interface CreateUserInput {
  email: string;
  password: string;
}

@Controller('/api/setup')
export class CustomSetupController {
  constructor(
    private readonly models: Models,
    private readonly auth: AuthService,
    private readonly mutex: Mutex,
    private readonly server: ServerService,
    private readonly runtime: Runtime
  ) {}

  @Public()
  @Post('/create-admin-user')
  async createAdmin(
    @Req() req: Request,
    @Res() res: Response,
    @Body() input: CreateUserInput
  ) {
    if (await this.server.initialized()) {
      throw new ActionForbidden('First user already created');
    }

    validators.assertValidEmail(input.email);

    if (!input.password) {
      throw new PasswordRequired();
    }

    const config = await this.runtime.fetchAll({
      'auth/password.max': true,
      'auth/password.min': true,
    });

    validators.assertValidPassword(input.password, {
      max: config['auth/password.max'],
      min: config['auth/password.min'],
    });

    await using lock = await this.mutex.acquire('createFirstAdmin');

    if (!lock) {
      throw new InternalServerError();
    }
    const user = await this.models.user.create({
      email: input.email,
      password: input.password,
      registered: true,
    });

    try {
      await this.models.userFeature.add(
        user.id,
        'administrator',
        'selfhost setup'
      );

      await this.auth.setCookies(req, res, user.id);
      res.send({ id: user.id, email: user.email, name: user.name });
    } catch (e) {
      await this.models.user.delete(user.id);
      throw e;
    }
  }
}
