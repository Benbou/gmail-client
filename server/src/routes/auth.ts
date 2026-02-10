import { Router } from 'express';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { supabase } from '../lib/supabase.js';
import * as ee from '../lib/emailengine.js';
import { config } from '../config.js';
import { ApiError } from '../middleware/errorHandler.js';

export const authRouter = Router();

/**
 * GET /api/auth/google/start
 * Initiate Gmail OAuth via EmailEngine hosted auth page.
 */
authRouter.get('/google/start', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const userId = req.userId!;

    // Generate a unique EE account ID
    const eeAccountId = `gm-${userId.slice(0, 8)}-${Date.now().toString(36)}`;

    // Create a pending gmail_accounts record
    const { data: account, error: insertErr } = await supabase
      .from('gmail_accounts')
      .insert({
        user_id: userId,
        email: 'pending@connecting',
        emailengine_account_id: eeAccountId,
        is_active: false,
      })
      .select('id')
      .single();

    if (insertErr) throw insertErr;

    // Callback URL: EE will redirect here after OAuth
    const redirectUrl = `${config.frontendUrl}/inbox?connected=true&accountId=${account.id}`;

    // Register account in EmailEngine with hosted OAuth
    const result = await ee.createAccount(eeAccountId, 'pending', redirectUrl);

    res.json({ authUrl: result.url });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/auth/google/callback
 * (Kept for backward compatibility — EmailEngine hosted flow
 *  redirects directly to frontend, but if we need a server callback
 *  this route can handle it.)
 */
authRouter.get('/google/callback', async (req, res, next) => {
  try {
    const { accountId, error: oauthError } = req.query;

    const frontendUrl = config.frontendUrl;

    if (oauthError) {
      res.redirect(`${frontendUrl}/inbox?error=${oauthError}`);
      return;
    }

    // Redirect to frontend with success
    res.redirect(`${frontendUrl}/inbox?connected=true${accountId ? `&accountId=${accountId}` : ''}`);
  } catch (err) {
    next(err);
  }
});
