export interface RetryOptions {
  /** Total attempts, including the first one. `1` disables retries. */
  maxAttempts: number;
  /** Base for exponential backoff: attempt n waits up to `baseDelayMs * 2^(n-1)`. */
  baseDelayMs: number;
  maxDelayMs?: number;
  random?: () => number;
  sleep?: (ms: number) => Promise<void>;
  onRetry?: (info: { attempt: number; delayMs: number; error: unknown }) => void;
}

export const sleep = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

/**
 * Retries `operation` while `shouldRetry` approves, with exponential backoff and full jitter
 * (delay = random(0, cap)) so concurrent requests don't retry in lockstep.
 */
export async function retry<T>(
  operation: (attempt: number) => Promise<T>,
  shouldRetry: (error: unknown) => boolean,
  options: RetryOptions,
): Promise<T> {
  const { maxAttempts, baseDelayMs, maxDelayMs = 2_000 } = options;
  const random = options.random ?? Math.random;
  const wait = options.sleep ?? sleep;

  for (let attempt = 1; ; attempt++) {
    try {
      return await operation(attempt);
    } catch (error) {
      if (attempt >= maxAttempts || !shouldRetry(error)) throw error;
      const cap = Math.min(maxDelayMs, baseDelayMs * 2 ** (attempt - 1));
      const delayMs = Math.round(random() * cap);
      options.onRetry?.({ attempt, delayMs, error });
      await wait(delayMs);
    }
  }
}
