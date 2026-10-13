import { z } from 'zod';

/** Machine-readable error codes. Clients branch on `code`, not on the message text. */
export const ErrorCode = {
  BadRequest: 'BAD_REQUEST',
  ValidationFailed: 'VALIDATION_FAILED',
  Unauthenticated: 'UNAUTHENTICATED',
  InvalidCredentials: 'INVALID_CREDENTIALS',
  TokenExpired: 'TOKEN_EXPIRED',
  Forbidden: 'FORBIDDEN',
  NotFound: 'NOT_FOUND',
  VersionConflict: 'VERSION_CONFLICT',
  RateLimited: 'RATE_LIMITED',
  ServiceUnavailable: 'SERVICE_UNAVAILABLE',
  /** A write lost its connection mid-flight and may or may not have been applied. */
  OutcomeUnknown: 'OUTCOME_UNKNOWN',
  Internal: 'INTERNAL',
} as const;

export const ErrorCodeSchema = z.enum([
  ErrorCode.BadRequest,
  ErrorCode.ValidationFailed,
  ErrorCode.Unauthenticated,
  ErrorCode.InvalidCredentials,
  ErrorCode.TokenExpired,
  ErrorCode.Forbidden,
  ErrorCode.NotFound,
  ErrorCode.VersionConflict,
  ErrorCode.RateLimited,
  ErrorCode.ServiceUnavailable,
  ErrorCode.OutcomeUnknown,
  ErrorCode.Internal,
]);
export type ErrorCode = z.infer<typeof ErrorCodeSchema>;

export const FieldErrorSchema = z.object({
  /** Dot-separated path to the offending field, e.g. `email` or `address.zip`. */
  path: z.string(),
  message: z.string(),
});
export type FieldError = z.infer<typeof FieldErrorSchema>;

/**
 * Body of every non-2xx response: RFC 9457 Problem Details (`application/problem+json`) plus a
 * stable `code`, the `requestId` for log correlation and optional per-field `errors`.
 */
export const ProblemDetailsSchema = z.object({
  type: z.string(),
  title: z.string(),
  status: z.int(),
  code: ErrorCodeSchema,
  detail: z.string().optional(),
  instance: z.string().optional(),
  requestId: z.string().optional(),
  errors: z.array(FieldErrorSchema).optional(),
});
export type ProblemDetails = z.infer<typeof ProblemDetailsSchema>;
