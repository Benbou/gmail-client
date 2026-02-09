import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import { ApiError } from '../lib/errors.js';
import { createLogger } from '../lib/logger.js';

const logger = createLogger('auth');

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export interface AuthRequest extends Request {
  userId?: string;
  userEmail?: string;
}

/**
 * Extract token from Authorization header
 */
function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return null;
  }

  // Support both "Bearer <token>" and just "<token>"
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  return authHeader;
}

/**
 * Middleware to authenticate requests using Supabase JWT
 * Requires a valid Supabase access token in the Authorization header
 */
export async function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = extractToken(req);

    if (!token) {
      throw ApiError.unauthorized('No authorization token provided');
    }

    // Verify Supabase JWT token
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      logger.debug({ error: error?.message }, 'Token validation failed');
      throw ApiError.unauthorized('Invalid or expired token');
    }

    // Attach user info to request
    req.userId = user.id;
    req.userEmail = user.email;

    logger.debug({ userId: user.id }, 'User authenticated via Supabase');

    next();
  } catch (error) {
    if (error instanceof ApiError) {
      next(error);
    } else {
      next(ApiError.unauthorized('Authentication failed'));
    }
  }
}

/**
 * Optional authentication - continues even if no auth provided
 * User info will be attached if valid token is present
 */
export async function optionalAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = extractToken(req);

    if (token) {
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (!error && user) {
        req.userId = user.id;
        req.userEmail = user.email;
      }
    }

    next();
  } catch {
    // Silently continue without auth
    next();
  }
}

/**
 * Middleware to check if user owns the resource
 * Must be used after authenticate middleware
 */
export function requireOwnership(getResourceUserId: (req: Request) => Promise<string | null>) {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) {
        throw ApiError.unauthorized('Authentication required');
      }

      const resourceUserId = await getResourceUserId(req);

      if (!resourceUserId) {
        throw ApiError.notFound('Resource');
      }

      if (resourceUserId !== req.userId) {
        logger.warn(
          { userId: req.userId, resourceUserId },
          'Unauthorized access attempt'
        );
        throw ApiError.forbidden('You do not have access to this resource');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}
