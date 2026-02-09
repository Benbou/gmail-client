import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../../lib/supabase';
import { getTokensFromCode, getUserEmail } from '../../lib/gmail-oauth';
import { encrypt } from '../../lib/crypto';
import { getOAuthState, deleteOAuthState } from '../../lib/redis';
import { gmailSyncService } from '../../services/gmail-sync';

/**
 * GET /api/auth/google/callback
 * Handle Gmail OAuth callback
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Check method
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { code, state, error: oauthError } = req.query;

    // Handle OAuth errors
    if (oauthError) {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      return res.redirect(`${frontendUrl}/oauth/error?error=${oauthError}`);
    }

    if (!code || !state) {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      return res.redirect(`${frontendUrl}/oauth/error?error=missing_params`);
    }

    // Verify state token
    const stateData = await getOAuthState(state as string);
    if (!stateData) {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      return res.redirect(`${frontendUrl}/oauth/error?error=invalid_state`);
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

        // Trigger sync for updated account
        gmailSyncService
          .syncAccount({ accountId: existingAccount.id, syncType: 'full' })
          .catch((err) => console.error('Sync failed after update:', err));

        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        return res.redirect(
          `${frontendUrl}/inbox?connected=true&accountId=${existingAccount.id}&updated=true`
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
        throw error;
      }

      // Trigger initial sync
      gmailSyncService
        .syncAccount({ accountId: account.id, syncType: 'full' })
        .catch((err) => console.error('Initial sync failed:', err));

      // Redirect to frontend inbox with success
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      res.redirect(`${frontendUrl}/inbox?connected=true&accountId=${account.id}`);
    } catch (error) {
      console.error('OAuth callback failed:', error);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      res.redirect(`${frontendUrl}/oauth/error?error=callback_failed`);
    }
  } catch (error) {
    console.error('Callback handler error:', error);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/oauth/error?error=server_error`);
  }
}
