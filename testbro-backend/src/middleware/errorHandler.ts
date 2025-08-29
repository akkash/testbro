import { Request, Response, NextFunction } from 'express';
import { APIError } from '../types';

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      user?: any;
      organizationId?: string;
      projectId?: string;
    }
  }
}

// Custom error class
export class AppError extends Error {
  public code: string;
  public statusCode: number;
  public details?: any;

  constructor(code: string, message: string, statusCode: number = 500, details?: any) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.name = 'AppError';
  }
}

// Error handling middleware
export const errorHandler = (
  error: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Log error
  console.error('Error occurred:', {
    name: error.name,
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    userId: req.user?.id,
    timestamp: new Date().toISOString(),
  });

  // Handle different error types
  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      error: error.code,
      message: error.message,
      details: error.details,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // Handle validation errors (e.g., from Joi)
  if (error.name === 'ValidationError') {
    res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'Invalid request data',
      details: error.message,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // Handle Supabase errors
  if (error.message?.includes('supabase')) {
    res.status(500).json({
      error: 'DATABASE_ERROR',
      message: 'Database operation failed',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // Handle JWT errors
  if (error.name === 'JsonWebTokenError') {
    res.status(401).json({
      error: 'INVALID_TOKEN',
      message: 'Invalid authentication token',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // Handle rate limiting errors
  if (error.message?.includes('rate limit')) {
    res.status(429).json({
      error: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests. Please try again later.',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // Generic error response
  res.status(500).json({
    error: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred',
    timestamp: new Date().toISOString(),
  });
};

// 404 handler
export const notFoundHandler = (_req: Request, _res: Response, next: NextFunction): void => {
  const error = new AppError(
    'NOT_FOUND',
    `Route ${_req.method} ${_req.path} not found`,
    404
  );
  next(error);
};

// Async error wrapper
export const asyncHandler = (fn: Function) => {
  return (_req: Request, _res: Response, next: NextFunction): void => {
    Promise.resolve(fn(_req, _res, next)).catch(next);
  };
};

// Validation error formatter
export const formatValidationError = (error: any): APIError => {
  return {
    code: 'VALIDATION_ERROR',
    message: 'Request validation failed',
    details: error.details?.map((detail: any) => ({
      field: detail.path?.join('.'),
      message: detail.message,
      value: detail.context?.value,
    })),
    timestamp: new Date().toISOString(),
  };
};

// Database error formatter
export const formatDatabaseError = (error: any): APIError => {
  // Don't expose sensitive database error details in production
  if (process.env.NODE_ENV === 'production') {
    return {
      code: 'DATABASE_ERROR',
      message: 'Database operation failed',
      timestamp: new Date().toISOString(),
    };
  }

  return {
    code: 'DATABASE_ERROR',
    message: error.message || 'Database operation failed',
    details: {
      code: error.code,
      details: error.details,
      hint: error.hint,
    },
    timestamp: new Date().toISOString(),
  };
};
