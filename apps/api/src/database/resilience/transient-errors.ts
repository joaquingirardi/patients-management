import { Prisma } from '@prisma/client';

import { SimulatedDependencyFailure } from './chaos';

// The query never reached the database, so retrying can't apply a write twice:
// P1001 can't reach server, P1002 server timed out, P2024 connection-pool timeout.
const PRE_EXECUTION_CODES = new Set(['P1001', 'P1002', 'P2024']);

// The connection dropped while the query may have been running (P1017 server closed the
// connection). Only safe to retry for reads.
const IN_FLIGHT_CODES = new Set(['P1017']);

const READ_OPERATIONS = new Set([
  'findUnique',
  'findUniqueOrThrow',
  'findFirst',
  'findFirstOrThrow',
  'findMany',
  'count',
  'aggregate',
  'groupBy',
]);

function prismaCode(error: unknown): string | undefined {
  if (error instanceof Prisma.PrismaClientKnownRequestError) return error.code;
  if (error instanceof Prisma.PrismaClientInitializationError) return error.errorCode;
  return undefined;
}

export function isPreExecutionFailure(error: unknown): boolean {
  if (error instanceof SimulatedDependencyFailure) return true;
  const code = prismaCode(error);
  return code !== undefined && PRE_EXECUTION_CODES.has(code);
}

export function isReadOperation(operation: string): boolean {
  return READ_OPERATIONS.has(operation);
}

export function isTransient(error: unknown): boolean {
  if (isPreExecutionFailure(error)) return true;
  const code = prismaCode(error);
  return code !== undefined && IN_FLIGHT_CODES.has(code);
}

/**
 * Reads are retried on any transient failure, writes only when they never reached the database.
 * Retrying a write blindly could insert a patient twice or turn a successful update into a
 * false version conflict.
 */
export function isSafeToRetry(error: unknown, operation: string): boolean {
  if (isPreExecutionFailure(error)) return true;
  return READ_OPERATIONS.has(operation) && isTransient(error);
}
