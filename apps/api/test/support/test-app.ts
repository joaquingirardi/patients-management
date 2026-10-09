import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';

import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/configure-app';
import { CHAOS } from '../../src/database/database';
import { SimulatedDependencyFailure } from '../../src/database/resilience/chaos';

export const TEST_JWT_SECRET = 'integration-test-secret-that-is-long-enough';

const TEST_ENV = {
  NODE_ENV: 'test',
  LOG_LEVEL: 'silent',
  JWT_SECRET: TEST_JWT_SECRET,
  BCRYPT_COST: '4',
  THROTTLE_LIMIT: '10000',
  THROTTLE_LOGIN_LIMIT: '10000',
  DB_RETRY_MAX_ATTEMPTS: '3',
  DB_RETRY_BASE_DELAY_MS: '1',
};

/** A controllable stand-in for the random chaos source: fail the next N queries, deterministically. */
export class ChaosController {
  private remainingFailures = 0;
  attempts = 0;

  failNext(count: number): void {
    this.remainingFailures = count;
    this.attempts = 0;
  }

  readonly enabled = true;

  beforeQuery(): Promise<void> {
    this.attempts++;
    if (this.remainingFailures > 0) {
      this.remainingFailures--;
      return Promise.reject(new SimulatedDependencyFailure());
    }
    return Promise.resolve();
  }
}

export interface TestApp {
  app: INestApplication;
  http: () => ReturnType<typeof request>;
  chaos: ChaosController;
  close: () => Promise<void>;
}

export async function createTestApp(env: Record<string, string> = {}): Promise<TestApp> {
  Object.assign(process.env, TEST_ENV, env);
  const chaos = new ChaosController();

  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(CHAOS)
    .useValue(chaos)
    .compile();

  const app = configureApp(
    moduleRef.createNestApplication({ bufferLogs: true, bodyParser: false }),
  );
  await app.init();

  return {
    app,
    chaos,
    http: () => request(app.getHttpServer()),
    close: () => app.close(),
  };
}

export function createPrisma(): PrismaClient {
  return new PrismaClient({ datasourceUrl: process.env['DATABASE_URL'] });
}
