import { Request, Response, NextFunction } from 'express';

export interface AuthRequest extends Request {
    userId?: string;
}

/**
 * Middleware to authenticate requests using JWT or session
 * For now, this is a placeholder - will be implemented with full auth
 */
export function authenticate(
    req: AuthRequest,
    res: Response,
    next: NextFunction
) {
    // TODO: Implement JWT verification
    // For now, allow all requests (development only)

    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({ error: 'No authorization header' });
    }

    // Extract userId from token (placeholder)
    // In production, verify JWT and extract user ID
    req.userId = 'temp-user-id';

    next();
}

/**
 * Optional authentication - doesn't block if no auth provided
 */
export function optionalAuth(
    req: AuthRequest,
    res: Response,
    next: NextFunction
) {
    const authHeader = req.headers.authorization;

    if (authHeader) {
        // Extract userId if present
        req.userId = 'temp-user-id';
    }

    next();
}
