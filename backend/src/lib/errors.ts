import { Request, Response, NextFunction } from 'express';
import { createLogger } from './logger.js';

const logger = createLogger('error-handler');

/**
 * Custom API Error class
 */
export class ApiError extends Error {
    constructor(
        public statusCode: number,
        message: string,
        public code?: string,
        public details?: unknown
    ) {
        super(message);
        this.name = 'ApiError';
        Error.captureStackTrace(this, this.constructor);
    }

    static badRequest(message: string, details?: unknown): ApiError {
        return new ApiError(400, message, 'BAD_REQUEST', details);
    }

    static unauthorized(message: string = 'Unauthorized'): ApiError {
        return new ApiError(401, message, 'UNAUTHORIZED');
    }

    static forbidden(message: string = 'Forbidden'): ApiError {
        return new ApiError(403, message, 'FORBIDDEN');
    }

    static notFound(resource: string = 'Resource'): ApiError {
        return new ApiError(404, `${resource} not found`, 'NOT_FOUND');
    }

    static conflict(message: string): ApiError {
        return new ApiError(409, message, 'CONFLICT');
    }

    static tooManyRequests(retryAfter?: number): ApiError {
        const error = new ApiError(429, 'Too many requests', 'RATE_LIMIT_EXCEEDED');
        if (retryAfter) {
            (error as any).retryAfter = retryAfter;
        }
        return error;
    }

    static internal(message: string = 'Internal server error'): ApiError {
        return new ApiError(500, message, 'INTERNAL_ERROR');
    }

    static serviceUnavailable(message: string = 'Service unavailable'): ApiError {
        return new ApiError(503, message, 'SERVICE_UNAVAILABLE');
    }
}

/**
 * Async handler wrapper to catch errors in async route handlers
 */
export function asyncHandler(
    fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
    return (req: Request, res: Response, next: NextFunction) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}

/**
 * Global error handler middleware
 */
export function errorHandler(
    err: Error | ApiError,
    req: Request,
    res: Response,
    _next: NextFunction
): void {
    // Log the error
    const requestId = (req as any).requestId;
    const errorLog = {
        requestId,
        method: req.method,
        url: req.originalUrl,
        error: err.message,
        stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined,
    };

    if (err instanceof ApiError) {
        if (err.statusCode >= 500) {
            logger.error(errorLog, 'Server error');
        } else {
            logger.warn(errorLog, 'Client error');
        }

        res.status(err.statusCode).json({
            error: err.message,
            code: err.code,
            details: err.details,
            ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
        });
        return;
    }

    // Unknown errors
    logger.error({ ...errorLog, stack: err.stack }, 'Unhandled error');

    res.status(500).json({
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
        ...(process.env.NODE_ENV !== 'production' && {
            message: err.message,
            stack: err.stack,
        }),
    });
}

/**
 * 404 handler for undefined routes
 */
export function notFoundHandler(req: Request, res: Response): void {
    res.status(404).json({
        error: 'Route not found',
        code: 'NOT_FOUND',
        path: req.originalUrl,
    });
}
