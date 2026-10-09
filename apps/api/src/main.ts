import 'reflect-metadata';

import { existsSync } from 'node:fs';

import { NestFactory } from '@nestjs/core';
import { type NestExpressApplication } from '@nestjs/platform-express';

import { AppModule } from './app.module';
import { APP_CONFIG, type AppConfig } from './config/app-config';
import { configureApp } from './configure-app';

async function bootstrap(): Promise<void> {
  // Local development: read apps/api/.env when present. Variables already set in the environment
  // win, and containers never ship a .env file (see .dockerignore) — they inject env directly.
  if (existsSync('.env')) process.loadEnvFile('.env');

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
    bodyParser: false,
  });
  configureApp(app);
  const { port } = app.get<AppConfig>(APP_CONFIG);
  await app.listen(port, '0.0.0.0');
}

void bootstrap();
