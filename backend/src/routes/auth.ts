import { Router, Request, Response } from 'express';
import { randomBytes } from 'crypto';
import { supabase } from '../services/supabase.js';
import { getAuthUrl, getTokensFromCode, getUserEmail } from '../services/gmail-oauth.js';
import { generateTokens, verifyRefreshToken } from '../lib/jwt.js';
import { encrypt } from '../lib/crypto.js';
import { setOAuthState, getOAuthState, deleteOAuthState, blacklistToken } from '../lib/redis.js';
import { ApiError, asyncHandler } from '../lib/errors.js';
import { createLogger } from '../lib/logger.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import {
    validate,
    signupSchema,
    refreshTokenSchema,
    SignupBody,
} from '../lib/validations.js';

const logger = createLogger('auth');
const router = Router();

/**
 * POST /api/auth/signup
 * Create a new user account and return JWT tokens
 */
router.post(
    '/signup',
    validate({ body: signupSchema }),
    asyncHandler(async (req: Request<unknown, unknown, SignupBody>, res: Response) => {
        const { email, name } = req.body;

        logger.info({ email }, 'Signup attempt');

        // Check if user already exists
        const { data: existingUser } = await supabase
            .from('users')
            .select('id, email')
            .eq('email', email)
            .single();

        if (existingUser) {
            // User exists - return tokens for existing user
            logger.info({ email }, 'Existing user login');
            const tokens = generateTokens({ userId: existingUser.id, email: existingUser.email });
            return res.json({
                user: existingUser,
                ...tokens,
            });
        }

        // Create new user
        const { data: user, error } = await supabase
            .from('users')
            .insert({ email, name })
            .select('id, email, name, created_at')
            .single();

        if (error) {
            logger.error({ error, email }, 'Failed to create user');
            throw ApiError.internal('Failed to create user');
        }

        logger.info({ userId: user.id, email }, 'User created');

        // Generate JWT tokens
        const tokens = generateTokens({ userId: user.id, email: user.email });

        res.status(201).json({
            user,
            ...tokens,
        });
    })
);

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 */
router.post(
    '/refresh',
    validate({ body: refreshTokenSchema }),
    asyncHandler(async (req: Request, res: Response) => {
        const { refreshToken } = req.body;

        // Verify refresh token
        const payload = verifyRefreshToken(refreshToken);

        if (!payload) {
            throw ApiError.unauthorized('Invalid or expired refresh token');
        }

        // Verify user still exists
        const { data: user } = await supabase
            .from('users')
            .select('id, email')
            .eq('id', payload.userId)
            .single();

        if (!user) {
            throw ApiError.unauthorized('User not found');
        }

        // Generate new tokens
        const tokens = generateTokens({ userId: user.id, email: user.email });

        // Blacklist old refresh token
        await blacklistToken(refreshToken);

        logger.info({ userId: user.id }, 'Token refreshed');

        res.json(tokens);
    })
);

/**
 * POST /api/auth/logout
 * Logout user by blacklisting their tokens
 */
router.post(
    '/logout',
    authenticate,
    asyncHandler(async (req: AuthRequest, res: Response) => {
        const authHeader = req.headers.authorization;
        const token = authHeader?.startsWith('Bearer ')
            ? authHeader.slice(7)
            : authHeader;

        if (token) {
            await blacklistToken(token);
        }

        // Also blacklist refresh token if provided
        const { refreshToken } = req.body;
        if (refreshToken) {
            await blacklistToken(refreshToken);
        }

        logger.info({ userId: req.userId }, 'User logged out');

        res.json({ success: true, message: 'Logged out successfully' });
    })
);

/**
 * GET /api/auth/me
 * Get current user info
 */
router.get(
    '/me',
    authenticate,
    asyncHandler(async (req: AuthRequest, res: Response) => {
        const { data: user, error } = await supabase
            .from('users')
            .select('id, email, name, avatar_url, preferences, created_at')
            .eq('id', req.userId)
            .single();

        if (error || !user) {
            throw ApiError.notFound('User');
        }

        res.json({ user });
    })
);

/**
 * GET /api/auth/google/start
 * Initiate Gmail OAuth flow
 */
router.get(
    '/google/start',
    authenticate,
    asyncHandler(async (req: AuthRequest, res: Response) => {
        const userId = req.userId!;

        // Generate random state token
        const state = randomBytes(32).toString('hex');

        // Store state in Redis with user ID
        await setOAuthState(state, {
            userId,
            createdAt: Date.now(),
        });

        // Generate OAuth URL
        const authUrl = getAuthUrl(state);

        logger.info({ userId }, 'OAuth flow started');

        res.json({ authUrl });
    })
);

/**
 * GET /api/auth/google/callback
 * Handle Gmail OAuth callback
 */
router.get(
    '/google/callback',
    asyncHandler(async (req: Request, res: Response) => {
        const { code, state, error: oauthError } = req.query;

        // Handle OAuth errors
        if (oauthError) {
            logger.warn({ error: oauthError }, 'OAuth error from Google');
            return res.redirect(
                `${process.env.FRONTEND_URL || 'http://localhost:5173'}/oauth/error?error=${oauthError}`
            );
        }

        if (!code || !state) {
            throw ApiError.badRequest('Missing code or state parameter');
        }

        // Verify state token from Redis
        const stateData = await getOAuthState(state as string);
        if (!stateData) {
            logger.warn('Invalid or expired OAuth state');
            return res.redirect(
                `${process.env.FRONTEND_URL || 'http://localhost:5173'}/oauth/error?error=invalid_state`
            );
        }

        // Remove used state
        await deleteOAuthState(state as string);

        try {
            // Exchange code for tokens
            const tokens = await getTokensFromCode(code as string);

            if (!tokens.access_token || !tokens.refresh_token) {
                throw new Error('Failed to obtain tokens');
            }

            // Get user's Gmail address
            const gmailEmail = await getUserEmail(tokens.access_token);

            // Check if account already exists
            const { data: existingAccount } = await supabase
                .from('gmail_accounts')
                .select('id')
                .eq('user_id', stateData.userId)
                .eq('email', gmailEmail)
                .single();

            if (existingAccount) {
                // Update existing account with new tokens
                await supabase
                    .from('gmail_accounts')
                    .update({
                        access_token: encrypt(tokens.access_token),
                        refresh_token: encrypt(tokens.refresh_token),
                        token_expiry: tokens.expiry_date
                            ? new Date(tokens.expiry_date).toISOString()
                            : null,
                        scopes: tokens.scope?.split(' ') || [],
                        is_active: true,
                    })
                    .eq('id', existingAccount.id);

                logger.info(
                    { userId: stateData.userId, email: gmailEmail },
                    'Gmail account tokens updated'
                );

                return res.redirect(
                    `${process.env.FRONTEND_URL || 'http://localhost:5173'}/oauth/success?accountId=${existingAccount.id}&updated=true`
                );
            }

            // Store new Gmail account with encrypted tokens
            const { data: account, error } = await supabase
                .from('gmail_accounts')
                .insert({
                    user_id: stateData.userId,
                    email: gmailEmail,
                    access_token: encrypt(tokens.access_token),
                    refresh_token: encrypt(tokens.refresh_token),
                    token_expiry: tokens.expiry_date
                        ? new Date(tokens.expiry_date).toISOString()
                        : null,
                    scopes: tokens.scope?.split(' ') || [],
                })
                .select('id')
                .single();

            if (error) {
                logger.error({ error, email: gmailEmail }, 'Failed to store Gmail account');
                throw error;
            }

            logger.info(
                { userId: stateData.userId, accountId: account.id, email: gmailEmail },
                'Gmail account connected'
            );

            // Redirect to frontend success page
            res.redirect(
                `${process.env.FRONTEND_URL || 'http://localhost:5173'}/oauth/success?accountId=${account.id}`
            );
        } catch (error) {
            logger.error({ error }, 'OAuth callback failed');
            res.redirect(
                `${process.env.FRONTEND_URL || 'http://localhost:5173'}/oauth/error?error=callback_failed`
            );
        }
    })
);

/**
 * DELETE /api/auth/google/:accountId
 * Remove a Gmail account
 */
router.delete(
    '/google/:accountId',
    authenticate,
    asyncHandler(async (req: AuthRequest, res: Response) => {
        const { accountId } = req.params;
        const userId = req.userId!;

        // Verify account belongs to user
        const { data: account } = await supabase
            .from('gmail_accounts')
            .select('id, user_id, email')
            .eq('id', accountId)
            .single();

        if (!account) {
            throw ApiError.notFound('Gmail account');
        }

        if (account.user_id !== userId) {
            throw ApiError.forbidden('You do not have access to this account');
        }

        // Delete the account (cascade will delete related emails, etc.)
        const { error } = await supabase
            .from('gmail_accounts')
            .delete()
            .eq('id', accountId);

        if (error) {
            logger.error({ error, accountId }, 'Failed to delete Gmail account');
            throw ApiError.internal('Failed to delete account');
        }

        logger.info({ userId, accountId, email: account.email }, 'Gmail account removed');

        res.json({ success: true, message: 'Account removed successfully' });
    })
);

export default router;
