import { type PrismaClient } from '@prisma/client';

import { type Chaos } from './resilience/chaos';
import { resilienceExtension } from './resilience/resilience.extension';
import { type RetryOptions } from './resilience/retry';

/** Injection token for the resilient client that repositories depend on. */
export const DATABASE = Symbol('DATABASE');
export const CHAOS = Symbol('CHAOS');

function extend(
  client: PrismaClient,
  deps: { chaos: Chaos; retry: Pick<RetryOptions, 'maxAttempts' | 'baseDelayMs'> },
) {
  return client.$extends(resilienceExtension(deps));
}

/**
 * The client repositories get: every model with retries, but no `$transaction`. A retried
 * statement would run outside the transaction, so transactional work has to use a client
 * without the extension.
 */
export type Database = Omit<ReturnType<typeof extend>, '$transaction'>;

export function createDatabase(...args: Parameters<typeof extend>): Database {
  return extend(...args);
}
