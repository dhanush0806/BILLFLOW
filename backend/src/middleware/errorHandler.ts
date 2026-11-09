import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/response';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled Application Error:', err);

  // PostgreSQL unique constraint violation
  if (err.code === '23505') {
    return sendError(res, 'A record with this information already exists.', 409);
  }

  // PostgreSQL foreign key violation
  if (err.code === '23503') {
    return sendError(res, 'Referenced record does not exist or cannot be modified.', 400);
  }

  const statusCode = err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production' 
    ? 'An unexpected error occurred. Please try again.' 
    : err.message || 'Internal Server Error';

  return sendError(res, message, statusCode);
};
