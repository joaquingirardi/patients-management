import { QueryClient } from '@tanstack/react-query';

import { ApiError } from './problem';

const MAX_RETRIES = 3;

/**
 * Retry policy:
 *  - queries (idempotent GETs) retry transient failures with jittered exponential backoff,
 *    honouring `Retry-After` when the server sends one;
 *  - 4xx errors are never retried;
 *  - mutations are never retried automatically; the toast offers a "Retry" action instead.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        retry: (failureCount, error) =>
          error instanceof ApiError && error.isTransient && failureCount < MAX_RETRIES,
        retryDelay: (attempt, error) => {
          if (error instanceof ApiError && error.retryAfterSeconds) {
            return error.retryAfterSeconds * 1000;
          }
          return Math.random() * Math.min(8_000, 500 * 2 ** attempt);
        },
      },
      mutations: { retry: false },
    },
  });
}
