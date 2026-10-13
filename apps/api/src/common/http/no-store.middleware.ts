import type { NextFunction, Request, Response } from 'express';

/** API responses carry patient data (PHI), so browsers and proxies must not cache them. */
export function noStore(_req: Request, res: Response, next: NextFunction): void {
  res.setHeader('Cache-Control', 'no-store');
  next();
}
