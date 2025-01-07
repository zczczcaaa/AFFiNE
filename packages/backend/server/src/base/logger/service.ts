import { LoggingWinston } from '@google-cloud/logging-winston';
import { ConsoleLogger, LoggerService, Provider, Scope } from '@nestjs/common';
import { createLogger, transports } from 'winston';

import { Config } from '../config';
import { AFFiNELogger } from './logger';

export const loggerProvider: Provider<LoggerService> = {
  provide: AFFiNELogger,
  useFactory: (config: Config) => {
    if (config.NODE_ENV !== 'production') {
      return new ConsoleLogger();
    }
    const loggingWinston = new LoggingWinston();
    // Create a Winston logger that streams to Cloud Logging
    const instance = createLogger({
      level: config.affine.stable ? 'log' : 'verbose',
      transports: [
        new transports.Console(),
        // Add Cloud Logging
        loggingWinston,
      ],
    });
    return new AFFiNELogger(instance);
  },
  inject: [Config],
  // use transient to make sure the logger is created for each di context
  // to make the `setContext` method works as expected
  scope: Scope.TRANSIENT,
};
