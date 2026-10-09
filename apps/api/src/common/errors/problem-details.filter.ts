import { STATUS_CODES } from 'node:http';

import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import { ErrorCode, type ProblemDetails } from '@pm/contracts';
import { Prisma } from '@prisma/client';
import type { Request, Response } from 'express';

import { DependencyUnavailableError, DomainError, ValidationError } from './domain-errors';

const PROBLEM_JSON = 'application/problem+json';

/** Exhaustive by construction: adding an ErrorCode without a mapping fails the build. */
const PROBLEM_BY_CODE: Record<ErrorCode, { status: HttpStatus; title: string }> = {
  [ErrorCode.BadRequest]: { status: HttpStatus.BAD_REQUEST, title: 'Bad request' },
  [ErrorCode.ValidationFailed]: { status: HttpStatus.BAD_REQUEST, title: 'Validation failed' },
  [ErrorCode.Unauthenticated]: { status: HttpStatus.UNAUTHORIZED, title: 'Unauthenticated' },
  [ErrorCode.InvalidCredentials]: { status: HttpStatus.UNAUTHORIZED, title: 'Invalid credentials' },
  [ErrorCode.TokenExpired]: { status: HttpStatus.UNAUTHORIZED, title: 'Token expired' },
  [ErrorCode.Forbidden]: { status: HttpStatus.FORBIDDEN, title: 'Forbidden' },
  [ErrorCode.NotFound]: { status: HttpStatus.NOT_FOUND, title: 'Not found' },
  [ErrorCode.VersionConflict]: { status: HttpStatus.CONFLICT, title: 'Version conflict' },
  [ErrorCode.RateLimited]: { status: HttpStatus.TOO_MANY_REQUESTS, title: 'Too many requests' },
  [ErrorCode.ServiceUnavailable]: {
    status: HttpStatus.SERVICE_UNAVAILABLE,
    title: 'Service unavailable',
  },
  [ErrorCode.OutcomeUnknown]: { status: HttpStatus.SERVICE_UNAVAILABLE, title: 'Outcome unknown' },
  [ErrorCode.Internal]: { status: HttpStatus.INTERNAL_SERVER_ERROR, title: 'Internal error' },
};

const CODE_BY_HTTP_STATUS: Partial<Record<number, ErrorCode>> = {
  [HttpStatus.UNAUTHORIZED]: ErrorCode.Unauthenticated,
  [HttpStatus.FORBIDDEN]: ErrorCode.Forbidden,
  [HttpStatus.NOT_FOUND]: ErrorCode.NotFound,
  [HttpStatus.TOO_MANY_REQUESTS]: ErrorCode.RateLimited,
  [HttpStatus.SERVICE_UNAVAILABLE]: ErrorCode.ServiceUnavailable,
};

/**
 * Prisma error messages can embed query arguments (patient names, emails, DOBs). Log their
 * class and code only; other errors keep their stack.
 */
function safeForLogs(error: unknown): unknown {
  const cause = error instanceof Error && error.cause !== undefined ? error.cause : error;
  if (
    cause instanceof Prisma.PrismaClientKnownRequestError ||
    cause instanceof Prisma.PrismaClientValidationError ||
    cause instanceof Prisma.PrismaClientUnknownRequestError ||
    cause instanceof Prisma.PrismaClientRustPanicError ||
    cause instanceof Prisma.PrismaClientInitializationError
  ) {
    return {
      type: cause.name,
      code: 'code' in cause ? cause.code : undefined,
      wrappedBy: error === cause ? undefined : (error as Error).name,
    };
  }
  return error;
}

const problemType = (code: ErrorCode) => `urn:pm:problem:${code.toLowerCase().replace(/_/g, '-')}`;

/**
 * Turns *every* error into an RFC 9457 Problem Details response with a stable `code` and the
 * request id. Unknown errors are logged with their stack and returned as an opaque 500 —
 * internals never leak to clients.
 */
@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  private readonly logger = new Logger(ProblemDetailsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<Request & { id?: string }>();
    const response = http.getResponse<Response>();

    const problem = this.toProblem(exception);
    problem.instance = request.originalUrl.split('?')[0];
    if (request.id) problem.requestId = request.id;

    if (problem.code === ErrorCode.Internal) {
      this.logger.error(
        { err: safeForLogs(exception), requestId: problem.requestId },
        'Unhandled exception',
      );
    } else if (problem.status === 503) {
      this.logger.warn(
        { err: safeForLogs(exception), requestId: problem.requestId },
        problem.detail,
      );
    }

    // RFC 6750 §3: tell Bearer clients *why* their token was rejected.
    if (problem.code === ErrorCode.TokenExpired) {
      response.setHeader(
        'WWW-Authenticate',
        'Bearer error="invalid_token", error_description="expired"',
      );
    } else if (problem.code === ErrorCode.Unauthenticated) {
      response.setHeader('WWW-Authenticate', 'Bearer');
    }
    if (exception instanceof ThrottlerException) {
      // The throttler emits per-throttler headers (`Retry-After-login`); expose the standard one.
      const header = response.getHeaderNames().find((name) => name.startsWith('retry-after'));
      if (header) response.setHeader('Retry-After', String(response.getHeader(header)));
    }
    if (exception instanceof DependencyUnavailableError) {
      response.setHeader('Retry-After', String(exception.retryAfterSeconds));
    }
    response.status(problem.status).type(PROBLEM_JSON).json(problem);
  }

  private toProblem(exception: unknown): ProblemDetails {
    if (exception instanceof DomainError) {
      return {
        ...this.base(exception.code),
        detail: exception.message,
        ...(exception instanceof ValidationError ? { errors: exception.errors } : {}),
      };
    }

    if (exception instanceof ThrottlerException) {
      return { ...this.base(ErrorCode.RateLimited), detail: 'Too many requests. Slow down.' };
    }

    if (exception instanceof HttpException) {
      // Framework-level errors: unknown routes, malformed JSON bodies, oversized payloads…
      const status = exception.getStatus();
      const code =
        CODE_BY_HTTP_STATUS[status] ?? (status >= 500 ? ErrorCode.Internal : ErrorCode.BadRequest);
      return {
        ...this.base(code),
        status,
        // e.g. 413 "Payload Too Large", not a generic "Bad request" next to a 413 status.
        ...(code === ErrorCode.BadRequest ? { title: STATUS_CODES[status] ?? 'Bad request' } : {}),
        ...(status < 500 ? { detail: exception.message } : {}),
      };
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError && exception.code === 'P2025') {
      return { ...this.base(ErrorCode.NotFound), detail: 'The requested record was not found.' };
    }

    return {
      ...this.base(ErrorCode.Internal),
      detail: 'An unexpected error occurred. It has been logged.',
    };
  }

  private base(code: ErrorCode): ProblemDetails {
    const { status, title } = PROBLEM_BY_CODE[code];
    return { type: problemType(code), title, status, code };
  }
}
