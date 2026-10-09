import { Prisma } from '@prisma/client';

import { DependencyUnavailableError, OutcomeUnknownError } from '../../common/errors/domain-errors';
import { SimulatedDependencyFailure } from './chaos';
import { runResilient } from './resilience.extension';

const connectionDropped = () =>
  new Prisma.PrismaClientKnownRequestError('Server closed the connection', {
    code: 'P1017',
    clientVersion: 'test',
  });

const deps = {
  chaos: { beforeQuery: () => Promise.resolve() },
  retry: { maxAttempts: 3, baseDelayMs: 0, sleep: () => Promise.resolve() },
  logger: { warn: jest.fn() },
};

describe('runResilient', () => {
  it('retries a read whose connection dropped mid-flight, and succeeds', async () => {
    const run = jest.fn().mockRejectedValueOnce(connectionDropped()).mockResolvedValue(['row']);
    await expect(
      runResilient({ model: 'Patient', operation: 'findMany' }, run, deps),
    ).resolves.toEqual(['row']);
    expect(run).toHaveBeenCalledTimes(2);
  });

  it('never retries a write that may have executed, and reports OUTCOME_UNKNOWN (not "retry later")', async () => {
    const run = jest.fn().mockRejectedValue(connectionDropped());
    await expect(
      runResilient({ model: 'Patient', operation: 'create' }, run, deps),
    ).rejects.toBeInstanceOf(OutcomeUnknownError);
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('retries a write that provably never reached the database', async () => {
    const chaos = {
      beforeQuery: jest
        .fn()
        .mockRejectedValueOnce(new SimulatedDependencyFailure())
        .mockResolvedValue(undefined),
    };
    const run = jest.fn().mockResolvedValue({ id: 'p1' });
    await expect(
      runResilient({ model: 'Patient', operation: 'update' }, run, { ...deps, chaos }),
    ).resolves.toEqual({
      id: 'p1',
    });
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('degrades to DependencyUnavailableError once the read budget is exhausted', async () => {
    const run = jest.fn().mockRejectedValue(connectionDropped());
    await expect(
      runResilient({ model: 'Patient', operation: 'count' }, run, deps),
    ).rejects.toBeInstanceOf(DependencyUnavailableError);
    expect(run).toHaveBeenCalledTimes(3);
  });

  it('passes permanent errors through untouched', async () => {
    const bug = new Error('bug');
    await expect(
      runResilient(
        { model: 'Patient', operation: 'findMany' },
        jest.fn().mockRejectedValue(bug),
        deps,
      ),
    ).rejects.toBe(bug);
  });
});
