import { Prisma } from '@prisma/client';

import { SimulatedDependencyFailure } from './chaos';
import { isSafeToRetry, isTransient } from './transient-errors';

const known = (code: string) =>
  new Prisma.PrismaClientKnownRequestError('boom', { code, clientVersion: 'test' });

describe('retry safety classification', () => {
  it('retries pre-execution failures for reads and writes alike', () => {
    const chaos = new SimulatedDependencyFailure();
    expect(isSafeToRetry(chaos, 'findMany')).toBe(true);
    expect(isSafeToRetry(chaos, 'create')).toBe(true);
    expect(isSafeToRetry(known('P2024'), 'update')).toBe(true);
  });

  it('retries in-flight connection drops only for reads', () => {
    expect(isSafeToRetry(known('P1017'), 'findFirst')).toBe(true);
    expect(isSafeToRetry(known('P1017'), 'create')).toBe(false);
  });

  it('never retries permanent errors', () => {
    expect(isTransient(known('P2002'))).toBe(false);
    expect(isSafeToRetry(known('P2025'), 'findFirst')).toBe(false);
    expect(isSafeToRetry(new Error('bug'), 'findMany')).toBe(false);
  });
});
