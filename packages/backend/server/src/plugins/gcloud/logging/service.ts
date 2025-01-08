import { LoggingWinston } from '@google-cloud/logging-winston';
import { LoggerService, Provider, Scope } from '@nestjs/common';
import { createLogger, transports } from 'winston';

import { AFFiNELogger as LoggerProvide } from '../../../base/logger';
import { AFFiNELogger } from './logger';

export const loggerProvider: Provider<LoggerService> = {
  provide: LoggerProvide,
  useFactory: () => {
    const loggingWinston = new LoggingWinston();
    // Create a Winston logger that streams to Cloud Logging
    const instance = createLogger({
      level: 'log',
      transports: [
        new transports.Console(),
        // Add Cloud Logging
        loggingWinston,
      ],
    });
    return new AFFiNELogger(instance);
  },
  // use transient to make sure the logger is created for each di context
  // to make the `setContext` method works as expected
  scope: Scope.TRANSIENT,
};
