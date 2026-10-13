import 'reflect-metadata';

import { type IncomingMessage, type ServerResponse } from 'node:http';

import { NestFactory } from '@nestjs/core';
import { type NestExpressApplication } from '@nestjs/platform-express';

import { AppModule } from './app.module';
import { configureApp } from './configure-app';

type RequestListener = (req: IncomingMessage, res: ServerResponse) => void;

// Serverless entry point (Vercel). The Nest app is created once per function instance and
// reused across invocations; `main.ts` remains the entry point for containers and local dev.
let listener: Promise<RequestListener> | undefined;

async function createListener(): Promise<RequestListener> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
    bodyParser: false,
  });
  configureApp(app);
  await app.init();
  return app.getHttpAdapter().getInstance();
}

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  listener ??= createListener().catch((error: unknown) => {
    listener = undefined;
    throw error;
  });
  (await listener)(req, res);
}
