import { execSync } from 'node:child_process';
import { resolve } from 'node:path';

import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';

declare global {
  var __PG_CONTAINER__: StartedPostgreSqlContainer | undefined;
}

/**
 * Starts a throwaway PostgreSQL 17 (same major as production) and applies the real migrations.
 * Set TEST_DATABASE_URL to reuse an existing database instead (e.g. a CI service container).
 */
export default async function globalSetup(): Promise<void> {
  let url = process.env['TEST_DATABASE_URL'];
  if (!url) {
    const container = await new PostgreSqlContainer('postgres:17-alpine').start();
    globalThis.__PG_CONTAINER__ = container;
    url = container.getConnectionUri();
  }
  process.env['DATABASE_URL'] = url;
  // `deploy` only applies pending migrations and never drops data, so it is safe even when
  // TEST_DATABASE_URL points at a shared database. Each suite truncates what it needs.
  execSync('pnpm prisma migrate deploy', {
    cwd: resolve(__dirname, '../..'),
    env: { ...process.env, DATABASE_URL: url },
    stdio: 'pipe',
  });
}
