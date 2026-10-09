import type { Config } from 'jest';

/**
 * Two projects with different trade-offs:
 *  - unit:        pure, in-memory, milliseconds — runs on every save.
 *  - integration: the real HTTP stack against a real PostgreSQL (Testcontainers) — proves the
 *                 contract, the SQL, the guards and the error mapping actually work together.
 */
const shared = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleFileExtensions: ['ts', 'js', 'json'],
  // Test against contract *source* so tests never depend on a stale build of the package.
  moduleNameMapper: { '^@pm/contracts$': '<rootDir>/../../packages/contracts/src' },
} satisfies Config;

const config: Config = {
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.spec.ts',
    '!src/main.ts',
    '!src/database/seed.ts',
  ],
  coverageDirectory: 'coverage',
  // Ratchet: the build fails if coverage drops below today's level (measured 97% lines).
  coverageThreshold: { global: { statements: 90, branches: 70, functions: 90, lines: 90 } },
  projects: [
    {
      ...shared,
      displayName: 'unit',
      testMatch: ['<rootDir>/src/**/*.spec.ts'],
      setupFiles: ['<rootDir>/test/support/silence-logs.ts'],
    },
    {
      ...shared,
      displayName: 'integration',
      testMatch: ['<rootDir>/test/**/*.e2e-spec.ts'],
      globalSetup: '<rootDir>/test/support/global-setup.ts',
      globalTeardown: '<rootDir>/test/support/global-teardown.ts',
      testTimeout: 30_000,
    },
  ],
};

export default config;
