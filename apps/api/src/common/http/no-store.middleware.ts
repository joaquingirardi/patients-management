import type { NextFunction, Request, Response } from 'express';

/** API responses carry patient data (PHI): browsers and intermediaries must never cache them. */
export function noStore(_req: Request, res: Response, next: NextFunction): void {
  res.setHeader('Cache-Control', 'no-store');
  next();
}
