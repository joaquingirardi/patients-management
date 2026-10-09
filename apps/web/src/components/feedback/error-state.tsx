'use client';

import { RefreshCw, ServerCrash } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { isApiError } from '@/lib/api/problem';

/** Full-surface error with a retry, plus the request id so support can find the exact log line. */
export function ErrorState({
  error,
  onRetry,
  retrying = false,
  title = 'Something went wrong',
}: {
  error: unknown;
  onRetry?: () => void;
  retrying?: boolean;
  title?: string;
}) {
  // Only server-authored Problem Details are shown verbatim; anything else (e.g. a contract
  // validation error) could be technical noise, so users get a plain sentence instead.
  const message = isApiError(error)
    ? error.message
    : 'An unexpected error occurred. Please try again.';
  const requestId = isApiError(error) ? error.requestId : undefined;

  return (
    <div role="alert" className="flex flex-col items-center px-6 py-16 text-center">
      <div className="bg-destructive-subtle text-destructive ring-destructive/5 mb-4 flex size-12 items-center justify-center rounded-full ring-8">
        <ServerCrash className="size-5" aria-hidden />
      </div>
      <h2 className="text-base">{title}</h2>
      <p className="text-muted-foreground mt-1 max-w-sm text-sm">{message}</p>
      {onRetry && (
        <Button variant="outline" className="mt-5" onClick={onRetry} loading={retrying}>
          <RefreshCw aria-hidden />
          Try again
        </Button>
      )}
      {requestId && (
        <p className="text-muted-foreground mt-4 text-xs">
          Reference: <code className="font-mono">{requestId}</code>
        </p>
      )}
    </div>
  );
}
