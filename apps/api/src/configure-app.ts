import { type INestApplication } from '@nestjs/common';
import { type NestExpressApplication } from '@nestjs/platform-express';
import { type OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';

import { noStore } from './common/http/no-store.middleware';
import { requestId } from './common/logging/request-id.middleware';
import { APP_CONFIG, type AppConfig } from './config/app-config';
import { buildOpenApiDocument } from './openapi/openapi.document';

/**
 * HTTP setup shared by `main.ts` and the integration tests, so tests run the same middleware
 * stack as production. Create the app with `bodyParser: false`: parsing is registered here,
 * after the request id is assigned.
 */
export function configureApp(app: INestApplication): INestApplication {
  const config = app.get<AppConfig>(APP_CONFIG);
  const express = app as NestExpressApplication;

  express.use(requestId);
  // Responses carry patient data, so browsers and intermediaries must never cache them.
  express.use(noStore);
  express.useLogger(app.get(Logger));
  // Trust exactly the configured number of proxy hops (the web BFF by default), never "any
  // private address": otherwise a client-supplied X-Forwarded-For could pick its own rate-limit
  // bucket. The BFF only forwards an address it was itself told by a trusted proxy.
  express.set('trust proxy', config.trustProxyHops > 0 ? config.trustProxyHops : false);
  express.use(helmet());
  express.enableCors({
    origin: config.corsOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Authorization', 'Content-Type', 'X-Request-Id'],
    exposedHeaders: ['X-Request-Id', 'Retry-After', 'Location'],
    maxAge: 600,
  });
  express.useBodyParser('json', { limit: '32kb' });
  express.enableShutdownHooks();

  if (config.apiDocsEnabled) {
    SwaggerModule.setup('docs', app, buildOpenApiDocument() as unknown as OpenAPIObject, {
      jsonDocumentUrl: 'docs/openapi.json',
      customSiteTitle: 'Patients Management API',
    });
  }
  return app;
}
