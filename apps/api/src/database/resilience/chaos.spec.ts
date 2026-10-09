import { Chaos, SimulatedDependencyFailure } from './chaos';

const options = { enabled: true, failureRate: 0.5, minLatencyMs: 100, maxLatencyMs: 300 };

describe('Chaos', () => {
  it('is a no-op when disabled', async () => {
    const wait = jest.fn();
    await new Chaos({ ...options, enabled: false }, () => 0, wait).beforeQuery();
    expect(wait).not.toHaveBeenCalled();
  });

  it('injects latency within bounds', async () => {
    const wait = jest.fn().mockResolvedValue(undefined);
    await new Chaos(options, () => 0.5, wait).beforeQuery().catch(() => undefined);
    expect(wait).toHaveBeenCalledWith(200);
  });

  it('fails when the dice roll under the failure rate', async () => {
    const rolls = [0, 0.49];
    const chaos = new Chaos(
      options,
      () => rolls.shift() ?? 1,
      () => Promise.resolve(),
    );
    await expect(chaos.beforeQuery()).rejects.toBeInstanceOf(SimulatedDependencyFailure);
  });

  it('succeeds when the dice roll over the failure rate', async () => {
    const rolls = [0, 0.51];
    const chaos = new Chaos(
      options,
      () => rolls.shift() ?? 1,
      () => Promise.resolve(),
    );
    await expect(chaos.beforeQuery()).resolves.toBeUndefined();
  });
});
