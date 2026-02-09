import { Router, Request, Response } from 'express';
import { randomBytes } from 'crypto';
import { supabase } from '../services/supabase.js';
import { getAuthUrl, getTokensFromCode, getUserEmail } from '../services/gmail-oauth.js';
import { encrypt } from '../lib/crypto.js';
import { setOAuthState, getOAuthState, deleteOAuthState } from '../lib/redis.js';
import { ApiError, asyncHandler } from '../lib/errors.js';
import { createLogger } from '../lib/logger.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { gmailSyncService } from '../services/gmail-sync.js';

const logger = createLogger('auth');
const router = Router();

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

        // Trigger sync for updated account
        gmailSyncService
          .syncAccount({ accountId: existingAccount.id, syncType: 'full' })
          .then(() =>
            logger.info({ accountId: existingAccount.id }, 'Sync triggered after token update')
          )
          .catch((err) =>
            logger.error({ error: err, accountId: existingAccount.id }, 'Sync failed after update')
          );

        return res.redirect(
          `${process.env.FRONTEND_URL || 'http://localhost:5173'}/inbox?connected=true&accountId=${existingAccount.id}&updated=true`
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

      // ✅ NOUVEAU : Déclencher sync initiale immédiatement
      gmailSyncService
        .syncAccount({ accountId: account.id, syncType: 'full' })
        .then(() =>
          logger.info({ accountId: account.id }, 'Initial sync completed for new account')
        )
        .catch((err) =>
          logger.error({ error: err, accountId: account.id }, 'Initial sync failed for new account')
        );

      // Redirect to frontend inbox with success
      res.redirect(
        `${process.env.FRONTEND_URL || 'http://localhost:5173'}/inbox?connected=true&accountId=${account.id}`
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
    const { error } = await supabase.from('gmail_accounts').delete().eq('id', accountId);

    if (error) {
      logger.error({ error, accountId }, 'Failed to delete Gmail account');
      throw ApiError.internal('Failed to delete account');
    }

    logger.info({ userId, accountId, email: account.email }, 'Gmail account removed');

    res.json({ success: true, message: 'Account removed successfully' });
  })
);

export default router;
