import { Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { DependencyUnavailableError, OutcomeUnknownError } from '../../common/errors/domain-errors';
import { type Chaos } from './chaos';
import { retry, type RetryOptions } from './retry';
import {
  isPreExecutionFailure,
  isReadOperation,
  isSafeToRetry,
  isTransient,
} from './transient-errors';

export interface ResilienceDeps {
  chaos: Pick<Chaos, 'beforeQuery'>;
  retry: Pick<RetryOptions, 'maxAttempts' | 'baseDelayMs' | 'random' | 'sleep'>;
  logger?: Pick<Logger, 'warn'>;
}

/**
 * Runs one database operation (chaos when enabled, then the query) in a retry loop governed by
 * `isSafeToRetry`. When retries run out, transient failures are translated:
 *  - a read, or a write that never reached the DB: DependencyUnavailableError (503 + Retry-After)
 *  - a write that died mid-flight: OutcomeUnknownError (503, no Retry-After). It may have
 *    committed, so telling the client to retry could create a duplicate.
 */
export async function runResilient<T>(
  { model, operation }: { model: string; operation: string },
  run: () => Promise<T>,
  { chaos, retry: retryOptions, logger = new Logger('Database') }: ResilienceDeps,
): Promise<T> {
  try {
    return await retry(
      async () => {
        await chaos.beforeQuery();
        return run();
      },
      (error) => isSafeToRetry(error, operation),
      {
        ...retryOptions,
        onRetry: ({ attempt, delayMs, error }) => {
          logger.warn(
            { model, operation, attempt, delayMs, err: error },
            `Transient database failure on ${model}.${operation}; retrying`,
          );
        },
      },
    );
  } catch (error) {
    if (!isTransient(error)) throw error;
    if (!isReadOperation(operation) && !isPreExecutionFailure(error)) {
      throw new OutcomeUnknownError({ cause: error });
    }
    throw new DependencyUnavailableError(1, { cause: error });
  }
}

/**
 * Applies `runResilient` to every model query, so repositories don't deal with retries.
 * Not for transactions (a retried statement would run outside it); see database.ts.
 */
export function resilienceExtension(deps: ResilienceDeps) {
  return Prisma.defineExtension({
    name: 'resilience',
    query: {
      $allModels: {
        $allOperations: ({ model, operation, args, query }) =>
          runResilient({ model, operation }, () => query(args), deps),
      },
    },
  });
}
