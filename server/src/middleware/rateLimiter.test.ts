import { describe, expect, it, beforeEach } from 'vitest';
import { RateLimiter } from './rateLimiter';
import type { Request, Response, NextFunction } from 'express';

describe('RateLimiter', () => {
  let rateLimiter: RateLimiter;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let statusCode: number;
  let responseData: any;

  beforeEach(() => {
    rateLimiter = new RateLimiter(1000, 3, 2000); // 1s window, 3 attempts, 2s block
    mockReq = {
      ip: '127.0.0.1',
      socket: { remoteAddress: '127.0.0.1' } as any,
    };
    statusCode = 200;
    responseData = null;
    mockRes = {
      status: (code: number) => {
        statusCode = code;
        return mockRes as Response;
      },
      json: (data: any) => {
        responseData = data;
        return mockRes as Response;
      },
      set: () => mockRes as Response,
    };
    mockNext = () => {};
  });

  it('allows first request', () => {
    const middleware = rateLimiter.middleware();
    middleware(mockReq as Request, mockRes as Response, mockNext);
    expect(statusCode).toBe(200);
  });

  it('allows requests within limit', () => {
    const middleware = rateLimiter.middleware();
    middleware(mockReq as Request, mockRes as Response, mockNext);
    middleware(mockReq as Request, mockRes as Response, mockNext);
    middleware(mockReq as Request, mockRes as Response, mockNext);
    expect(statusCode).toBe(200);
  });

  it('blocks requests exceeding limit', () => {
    const middleware = rateLimiter.middleware();
    for (let i = 0; i < 4; i++) {
      middleware(mockReq as Request, mockRes as Response, mockNext);
    }
    expect(statusCode).toBe(429);
    expect(responseData.error).toBeTruthy();
  });

  it('resets client on successful authentication', () => {
    const middleware = rateLimiter.middleware();
    middleware(mockReq as Request, mockRes as Response, mockNext);
    rateLimiter.resetClient(mockReq as Request);
    middleware(mockReq as Request, mockRes as Response, mockNext);
    expect(statusCode).toBe(200);
  });
});
