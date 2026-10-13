import { ErrorCode, type FieldError } from '@pm/contracts';

/**
 * Services throw domain errors, not HTTP exceptions. ProblemDetailsFilter maps them to status
 * codes, so services don't depend on the transport.
 */
export abstract class DomainError extends Error {
  abstract readonly code: ErrorCode;

  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class ValidationError extends DomainError {
  readonly code = ErrorCode.ValidationFailed;

  constructor(readonly errors: FieldError[]) {
    super('The request contains invalid fields.');
  }
}

export class UnauthenticatedError extends DomainError {
  constructor(
    readonly code:
      | typeof ErrorCode.Unauthenticated
      | typeof ErrorCode.TokenExpired
      | typeof ErrorCode.InvalidCredentials = ErrorCode.Unauthenticated,
    message = 'Authentication is required to access this resource.',
  ) {
    super(message);
  }
}

export class ForbiddenError extends DomainError {
  readonly code = ErrorCode.Forbidden;

  constructor(message = 'You do not have permission to perform this action.') {
    super(message);
  }
}

export class NotFoundError extends DomainError {
  readonly code = ErrorCode.NotFound;

  constructor(resource: string, id: string) {
    super(`${resource} "${id}" was not found.`);
  }
}

export class VersionConflictError extends DomainError {
  readonly code = ErrorCode.VersionConflict;

  constructor(resource: string, id: string) {
    super(
      `${resource} "${id}" was modified by someone else. Reload it and apply your changes again.`,
    );
  }
}

/** A dependency (the database) stayed unavailable after our retry budget was spent. */
export class DependencyUnavailableError extends DomainError {
  readonly code = ErrorCode.ServiceUnavailable;

  constructor(
    readonly retryAfterSeconds: number,
    options?: { cause?: unknown },
  ) {
    super('The service is temporarily unavailable. Please retry shortly.');
    if (options?.cause !== undefined) this.cause = options.cause;
  }
}

/**
 * A write lost its database connection mid-flight, so it may or may not have been applied.
 * Unlike DependencyUnavailableError there is no Retry-After: clients should re-read first.
 */
export class OutcomeUnknownError extends DomainError {
  readonly code = ErrorCode.OutcomeUnknown;

  constructor(options?: { cause?: unknown }) {
    super('The change may or may not have been saved. Refresh to check before trying again.');
    if (options?.cause !== undefined) this.cause = options.cause;
  }
}
