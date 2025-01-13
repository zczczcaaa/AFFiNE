import { FactoryProvider } from '@nestjs/common';
import { createTransport, Transporter } from 'nodemailer';
import SMTPTransport from 'nodemailer/lib/smtp-transport';

import { Config } from '../config';
import { AFFiNELogger } from '../logger';

export const MAILER_SERVICE = Symbol('MAILER_SERVICE');

export type MailerService = Transporter<SMTPTransport.SentMessageInfo>;
export type Response = SMTPTransport.SentMessageInfo;
export type Options = SMTPTransport.Options;

export const MAILER: FactoryProvider<
  Transporter<SMTPTransport.SentMessageInfo> | undefined
> = {
  provide: MAILER_SERVICE,
  useFactory: (config: Config, logger: AFFiNELogger) => {
    if (config.mailer) {
      logger.setContext('Mailer');
      const auth = config.mailer.auth;
      if (auth && auth.user && !('pass' in auth)) {
        logger.warn(
          'Mailer service has not configured password, please make sure your mailer service allow empty password.'
        );
      }

      return createTransport(config.mailer);
    } else {
      return undefined;
    }
  },
  inject: [Config, AFFiNELogger],
};
