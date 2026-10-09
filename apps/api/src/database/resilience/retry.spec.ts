import { retry } from './retry';

const noSleep = () => Promise.resolve();

describe('retry', () => {
  it('returns the first successful result', async () => {
    const op = jest.fn().mockRejectedValueOnce(new Error('flaky')).mockResolvedValue('ok');
    await expect(
      retry(op, () => true, { maxAttempts: 3, baseDelayMs: 10, sleep: noSleep }),
    ).resolves.toBe('ok');
    expect(op).toHaveBeenCalledTimes(2);
  });

  it('gives up after maxAttempts and rethrows the last error', async () => {
    const op = jest.fn().mockRejectedValue(new Error('down'));
    await expect(
      retry(op, () => true, { maxAttempts: 3, baseDelayMs: 10, sleep: noSleep }),
    ).rejects.toThrow('down');
    expect(op).toHaveBeenCalledTimes(3);
  });

  it('never retries errors the policy rejects', async () => {
    const op = jest.fn().mockRejectedValue(new Error('permanent'));
    await expect(
      retry(op, () => false, { maxAttempts: 5, baseDelayMs: 10, sleep: noSleep }),
    ).rejects.toThrow();
    expect(op).toHaveBeenCalledTimes(1);
  });

  it('uses exponential backoff with full jitter, capped', async () => {
    const delays: number[] = [];
    const op = jest.fn().mockRejectedValue(new Error('down'));
    await retry(op, () => true, {
      maxAttempts: 5,
      baseDelayMs: 100,
      maxDelayMs: 300,
      random: () => 1, // upper bound of the jitter window
      sleep: noSleep,
      onRetry: ({ delayMs }) => delays.push(delayMs),
    }).catch(() => undefined);
    expect(delays).toEqual([100, 200, 300, 300]);
  });
});
