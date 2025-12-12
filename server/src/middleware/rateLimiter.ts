import { Request, Response, NextFunction } from 'express';

interface RateLimitEntry {
  count: number;
  resetAt: number;
  blockedUntil?: number;
}

export class RateLimiter {
  private attempts: Map<string, RateLimitEntry> = new Map();
  private windowMs: number;
  private maxAttempts: number;
  private blockDurationMs: number;

  constructor(
    windowMs = 15 * 60 * 1000, // 15 minutes
    maxAttempts = 5,
    blockDurationMs = 60 * 60 * 1000 // 1 hour
  ) {
    this.windowMs = windowMs;
    this.maxAttempts = maxAttempts;
    this.blockDurationMs = blockDurationMs;

    // Clean up old entries every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.attempts.entries()) {
      if (entry.resetAt < now && (!entry.blockedUntil || entry.blockedUntil < now)) {
        this.attempts.delete(key);
      }
    }
  }

  private getClientKey(req: Request): string {
    // Use IP address as the key
    return req.ip || req.socket.remoteAddress || 'unknown';
  }

  middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const key = this.getClientKey(req);
      const now = Date.now();
      const entry = this.attempts.get(key);

      // Check if client is blocked
      if (entry?.blockedUntil && entry.blockedUntil > now) {
        const retryAfter = Math.ceil((entry.blockedUntil - now) / 1000);
        res.set('Retry-After', String(retryAfter));
        return res.status(429).json({
          error: 'Too many failed attempts. Please try again later.',
          retryAfter,
        });
      }

      // Reset window if expired
      if (!entry || entry.resetAt < now) {
        this.attempts.set(key, {
          count: 1,
          resetAt: now + this.windowMs,
        });
        return next();
      }

      // Increment attempt counter
      entry.count += 1;

      // Check if max attempts exceeded
      if (entry.count > this.maxAttempts) {
        entry.blockedUntil = now + this.blockDurationMs;
        const retryAfter = Math.ceil(this.blockDurationMs / 1000);
        res.set('Retry-After', String(retryAfter));
        return res.status(429).json({
          error: 'Too many failed attempts. Account temporarily locked.',
          retryAfter,
        });
      }

      next();
    };
  }

  resetClient(req: Request) {
    const key = this.getClientKey(req);
    this.attempts.delete(key);
  }
}
