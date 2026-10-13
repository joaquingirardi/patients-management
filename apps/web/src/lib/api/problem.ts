import {
  ErrorCode,
  type FieldError,
  type ProblemDetails,
  ProblemDetailsSchema,
} from '@pm/contracts';

/** A failed request, carrying the server's Problem Details (stable `code`, field errors, `requestId`). */
export class ApiError extends Error {
  readonly status: number;
  readonly code: ErrorCode;
  readonly requestId: string | undefined;
  readonly fieldErrors: FieldError[];
  readonly retryAfterSeconds: number | undefined;

  constructor(problem: ProblemDetails, retryAfterSeconds?: number) {
    super(problem.detail ?? problem.title);
    this.name = 'ApiError';
    this.status = problem.status;
    this.code = problem.code;
    this.requestId = problem.requestId;
    this.fieldErrors = problem.errors ?? [];
    this.retryAfterSeconds = retryAfterSeconds;
  }

  /** The request never produced an HTTP response (network down, DNS, CORS, aborted proxy...). */
  static network(): ApiError {
    return new ApiError({
      type: 'about:blank',
      title: 'Network error',
      status: 0,
      code: ErrorCode.ServiceUnavailable,
      detail: 'We could not reach the server. Check your connection and try again.',
    });
  }

  /** Transient failures worth retrying automatically (idempotent requests only). */
  get isTransient(): boolean {
    return this.status === 0 || this.status === 502 || this.status === 503 || this.status === 504;
  }
}

export async function toApiError(response: Response): Promise<ApiError> {
  const retryAfter = Number(response.headers.get('Retry-After'));
  const retryAfterSeconds = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : undefined;
  try {
    const parsed = ProblemDetailsSchema.safeParse(await response.json());
    if (parsed.success) return new ApiError(parsed.data, retryAfterSeconds);
  } catch {
    // Non-JSON error body, e.g. an HTML 502 from a load balancer. Fall through.
  }
  return new ApiError(
    {
      type: 'about:blank',
      title: response.statusText || 'Request failed',
      status: response.status,
      code: response.status >= 500 ? ErrorCode.ServiceUnavailable : ErrorCode.BadRequest,
      detail: 'Something went wrong. Please try again.',
    },
    retryAfterSeconds,
  );
}

export function isApiError(error: unknown, code?: ErrorCode): error is ApiError {
  return error instanceof ApiError && (code === undefined || error.code === code);
}
