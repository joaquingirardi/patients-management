import { Prisma } from '@prisma/client';

import { SimulatedDependencyFailure } from './chaos';

/**
 * Prisma error codes that mean "the query never reached the database":
 *   P1001 can't reach server · P1002 server timed out · P2024 connection-pool timeout.
 * Retrying these can never apply a write twice.
 */
const PRE_EXECUTION_CODES = new Set(['P1001', 'P1002', 'P2024']);

/**
 * Codes where the connection dropped *while* the query may have been executing
 * (P1017 server closed the connection). Only safe to retry for reads.
 */
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
 * The retry policy in one sentence: reads are retried on any transient failure; writes only
 * when we *know* they never executed. A blind write retry could double-insert a patient, or
 * turn a successful update into a spurious version conflict.
 */
export function isSafeToRetry(error: unknown, operation: string): boolean {
  if (isPreExecutionFailure(error)) return true;
  return READ_OPERATIONS.has(operation) && isTransient(error);
}
