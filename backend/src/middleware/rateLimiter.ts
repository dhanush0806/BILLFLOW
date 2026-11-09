import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/response';

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const hits = new Map<string, RateLimitRecord>();

export const rateLimiter = (maxRequests = 50, windowMs = 15 * 60 * 1000) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const record = hits.get(ip);

    if (!record || now > record.resetTime) {
      hits.set(ip, { count: 1, resetTime: now + windowMs });
      return next();
    }

    if (record.count >= maxRequests) {
      return sendError(
        res,
        'Too many authentication attempts. Please try again after 15 minutes.',
        429
      );
    }

    record.count += 1;
    next();
  };
};
