import jwt from 'jsonwebtoken';
import { createLogger } from './logger.js';

const logger = createLogger('jwt');

export interface JWTPayload {
    userId: string;
    email: string;
    iat?: number;
    exp?: number;
}

export interface TokenPair {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
}

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || JWT_SECRET;
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

/**
 * Generate access and refresh tokens
 */
export function generateTokens(payload: Omit<JWTPayload, 'iat' | 'exp'>): TokenPair {
    if (!JWT_SECRET) {
        throw new Error('JWT_SECRET environment variable is required');
    }

    const accessToken = jwt.sign(payload, JWT_SECRET, {
        expiresIn: ACCESS_TOKEN_EXPIRY,
    });

    const refreshToken = jwt.sign(
        { ...payload, type: 'refresh' },
        JWT_REFRESH_SECRET!,
        { expiresIn: REFRESH_TOKEN_EXPIRY }
    );

    return {
        accessToken,
        refreshToken,
        expiresIn: 15 * 60, // 15 minutes in seconds
    };
}

/**
 * Verify and decode an access token
 */
export function verifyAccessToken(token: string): JWTPayload | null {
    if (!JWT_SECRET) {
        throw new Error('JWT_SECRET environment variable is required');
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
        return decoded;
    } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            logger.debug('Access token expired');
        } else if (error instanceof jwt.JsonWebTokenError) {
            logger.warn('Invalid access token');
        }
        return null;
    }
}

/**
 * Verify and decode a refresh token
 */
export function verifyRefreshToken(token: string): JWTPayload | null {
    if (!JWT_REFRESH_SECRET) {
        throw new Error('JWT_REFRESH_SECRET environment variable is required');
    }

    try {
        const decoded = jwt.verify(token, JWT_REFRESH_SECRET) as JWTPayload & { type?: string };
        if (decoded.type !== 'refresh') {
            logger.warn('Token is not a refresh token');
            return null;
        }
        return decoded;
    } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            logger.debug('Refresh token expired');
        } else if (error instanceof jwt.JsonWebTokenError) {
            logger.warn('Invalid refresh token');
        }
        return null;
    }
}

/**
 * Decode a token without verification (for debugging)
 */
export function decodeToken(token: string): JWTPayload | null {
    try {
        return jwt.decode(token) as JWTPayload;
    } catch {
        return null;
    }
}
