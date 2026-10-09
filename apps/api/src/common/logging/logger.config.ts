import type { IncomingMessage } from 'node:http';

import type { Params } from 'nestjs-pino';

import { type AppConfig } from '../../config/app-config';

/**
 * Structured JSON logs with a request id on every line (assigned by the requestId middleware).
 *
 * PHI stays out of logs: query strings (which carry patient search terms) are dropped,
 * credentials are redacted, and bodies are never logged.
 */
export function loggerConfig(config: AppConfig): Params {
  return {
    pinoHttp: {
      level: config.log.level,
      // Reuse the id assigned by the requestId middleware (it runs first).
      genReqId: (req: IncomingMessage) => req.id,
      redact: {
        paths: ['req.headers.authorization', 'req.headers.cookie', 'res.headers["set-cookie"]'],
        censor: '[redacted]',
      },
      serializers: {
        req: (req: { id: string; method: string; url: string }) => ({
          id: req.id,
          method: req.method,
          path: req.url.split('?')[0],
        }),
        res: (res: { statusCode: number }) => ({ statusCode: res.statusCode }),
      },
      customLogLevel: (_req, res, err) => {
        if (err || res.statusCode >= 500) return 'error';
        if (res.statusCode >= 400) return 'warn';
        return 'info';
      },
      autoLogging: { ignore: (req) => req.url?.startsWith('/health') ?? false },
      ...(config.log.pretty
        ? {
            transport: {
              target: 'pino-pretty',
              options: { singleLine: true, translateTime: 'HH:MM:ss.l' },
            },
          }
        : {}),
    },
  };
}
