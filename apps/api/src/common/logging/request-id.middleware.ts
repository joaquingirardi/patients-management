import { randomUUID } from 'node:crypto';

import type { NextFunction, Request, Response } from 'express';

const REQUEST_ID = /^[\w-]{8,64}$/;

/**
 * Assigns the request id before anything else runs (including body parsing), so even a
 * malformed-JSON 400 carries an id that matches the log line. A well-formed incoming
 * `x-request-id` (e.g. from the web BFF) is kept; anything else is replaced.
 */
export function requestId(req: Request & { id?: string }, res: Response, next: NextFunction): void {
  const incoming = req.headers['x-request-id'];
  req.id = typeof incoming === 'string' && REQUEST_ID.test(incoming) ? incoming : randomUUID();
  res.setHeader('x-request-id', req.id);
  next();
}
