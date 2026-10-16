import { Request, Response, NextFunction } from 'express';

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  const requestId = (req as any).requestId || 'unknown';
  console.error(`[${requestId}] Error:`, err);
  
  const statusCode = err.statusCode || err.status || 500;
  
  let message = 'Internal server error';
  if (statusCode === 400) message = 'Bad request';
  else if (statusCode === 401) message = 'Unauthorized';
  else if (statusCode === 403) message = 'Forbidden';
  else if (statusCode === 404) message = 'Not found';
  else if (statusCode === 409) message = 'Conflict';
  else if (statusCode === 422) message = 'Unprocessable entity';
  else if (statusCode === 429) message = 'Too many requests';
  else if (statusCode === 500) message = 'Internal server error';
  else if (statusCode === 502) message = 'Bad gateway';
  else if (statusCode === 503) message = 'Service unavailable';
  else if (statusCode === 504) message = 'Gateway timeout';
  else message = err.message || 'Internal server error';
  
  res.status(statusCode).json({
    success: false,
    code: err.code || 'INTERNAL_ERROR',
    message,
    requestId,
  });
}
