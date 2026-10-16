import { Request, Response, NextFunction } from 'express';

export function requestId(req: Request, res: Response, next: NextFunction) {
  const id = req.headers['x-request-id']?.toString() || `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  (req as any).requestId = id;
  res.set('X-Request-Id', id);
  next();
}
