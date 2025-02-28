import assert from 'node:assert';
import { randomUUID } from 'node:crypto';

import { Injectable, Logger } from '@nestjs/common';
import type { Request } from 'express';
import { nanoid } from 'nanoid';
import { z } from 'zod';

import {
  CaptchaVerificationFailed,
  Config,
  verifyChallengeResponse,
} from '../../base';
import { Models, TokenType } from '../../models';
import { CaptchaConfig } from './types';

const validator = z
  .object({ token: z.string(), challenge: z.string().optional() })
  .strict();
type Credential = z.infer<typeof validator>;

@Injectable()
export class CaptchaService {
  private readonly logger = new Logger(CaptchaService.name);
  private readonly captcha: CaptchaConfig;

  constructor(
    private readonly config: Config,
    private readonly models: Models
  ) {
    assert(config.plugins.captcha);
    this.captcha = config.plugins.captcha;
  }

  private async verifyCaptchaToken(token: any, ip: string) {
    if (typeof token !== 'string' || !token) return false;

    const formData = new FormData();
    formData.append('secret', this.captcha.turnstile.secret);
    formData.append('response', token);
    formData.append('remoteip', ip);
    // prevent replay attack
    formData.append('idempotency_key', nanoid());

    const url = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
    const result = await fetch(url, {
      body: formData,
      method: 'POST',
    });
    const outcome: any = await result.json();

    return (
      !!outcome.success &&
      // skip hostname check in dev mode
      (this.config.node.dev || outcome.hostname === this.config.server.host)
    );
  }

  private async verifyChallengeResponse(response: any, resource: string) {
    return verifyChallengeResponse(
      response,
      this.captcha.challenge.bits,
      resource
    );
  }

  async getChallengeToken() {
    const resource = randomUUID();
    const challenge = await this.models.verificationToken.create(
      TokenType.Challenge,
      resource,
      5 * 60
    );

    return {
      challenge,
      resource,
    };
  }

  assertValidCredential(credential: any): Credential {
    try {
      return validator.parse(credential);
    } catch {
      throw new CaptchaVerificationFailed('Invalid Credential');
    }
  }

  async verifyRequest(credential: Credential, req: Request) {
    const challenge = credential.challenge;
    let resource: string | null = null;
    if (typeof challenge === 'string' && challenge) {
      resource = await this.models.verificationToken
        .get(TokenType.Challenge, challenge)
        .then(token => token?.credential || null);
    }

    if (resource) {
      const isChallengeVerified = await this.verifyChallengeResponse(
        credential.token,
        resource
      );

      this.logger.debug(
        `Challenge: ${challenge}, Resource: ${resource}, Response: ${credential.token}, isChallengeVerified: ${isChallengeVerified}`
      );

      if (!isChallengeVerified) {
        throw new CaptchaVerificationFailed('Invalid Challenge Response');
      }
    } else {
      const isTokenVerified = await this.verifyCaptchaToken(
        credential.token,
        req.headers['CF-Connecting-IP'] as string
      );

      if (!isTokenVerified) {
        throw new CaptchaVerificationFailed('Invalid Captcha Response');
      }
    }
  }
}
