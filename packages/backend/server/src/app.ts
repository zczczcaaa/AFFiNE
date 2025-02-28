import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import graphqlUploadExpress from 'graphql-upload/graphqlUploadExpress.mjs';

import {
  AFFiNELogger,
  CacheInterceptor,
  CloudThrottlerGuard,
  GlobalExceptionFilter,
} from './base';
import { SocketIoAdapter } from './base/websocket';
import { AuthGuard } from './core/auth';
import { ENABLED_FEATURES } from './core/config/server-feature';
import { serverTimingAndCache } from './middleware/timing';

const OneMB = 1024 * 1024;

export async function createApp() {
  const { AppModule } = await import('./app.module');

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    cors: true,
    rawBody: true,
    bodyParser: true,
    bufferLogs: true,
  });

  app.useBodyParser('raw', { limit: 100 * OneMB });

  app.useLogger(app.get(AFFiNELogger));

  if (AFFiNE.server.path) {
    app.setGlobalPrefix(AFFiNE.server.path);
  }

  app.use(serverTimingAndCache);

  app.use(
    graphqlUploadExpress({
      maxFileSize: 100 * OneMB,
      maxFiles: 32,
    })
  );

  app.useGlobalGuards(app.get(AuthGuard), app.get(CloudThrottlerGuard));
  app.useGlobalInterceptors(app.get(CacheInterceptor));
  app.useGlobalFilters(new GlobalExceptionFilter(app.getHttpAdapter()));
  app.use(cookieParser());
  // only enable shutdown hooks in production
  // https://docs.nestjs.com/fundamentals/lifecycle-events#application-shutdown
  if (AFFiNE.NODE_ENV === 'production') {
    app.enableShutdownHooks();
  }

  const adapter = new SocketIoAdapter(app);
  app.useWebSocketAdapter(adapter);

  if (AFFiNE.isSelfhosted && AFFiNE.metrics.telemetry.enabled) {
    const mixpanel = await import('mixpanel');
    mixpanel
      .init(AFFiNE.metrics.telemetry.token)
      .track('selfhost-server-started', {
        version: AFFiNE.version,
        features: Array.from(ENABLED_FEATURES),
      });
  }

  return app;
}
