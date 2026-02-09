import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyCronSecret } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { refreshAccessToken } from '../lib/gmail-oauth';
import { encrypt, safeDecrypt } from '../lib/crypto';

/**
 * Worker endpoint: Token refresh
 * Called by Cloudflare Worker every 5 minutes
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify cron secret
  if (!verifyCronSecret(req)) {
    return res.status(401).json({ error: 'Unauthorized cron request' });
  }

  try {
    const tenMinutesFromNow = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    // Get accounts with tokens expiring soon
    const { data: accounts, error } = await supabase
      .from('gmail_accounts')
      .select('id, email, refresh_token, token_expiry')
      .not('token_expiry', 'is', null)
      .lt('token_expiry', tenMinutesFromNow)
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching accounts for token refresh:', error);
      return res.status(500).json({ error: 'Failed to fetch accounts' });
    }

    if (!accounts || accounts.length === 0) {
      return res.json({ success: true, refreshed: 0, message: 'No tokens need refreshing' });
    }

    console.log(`Refreshing tokens for ${accounts.length} accounts`);

    let refreshed = 0;
    let failed = 0;

    for (const account of accounts) {
      try {
        // Decrypt the refresh token
        const refreshToken = safeDecrypt(account.refresh_token);

        if (!refreshToken) {
          console.warn(`No valid refresh token for ${account.email}`);
          failed++;
          continue;
        }

        const newTokens = await refreshAccessToken(refreshToken);

        // Store encrypted token
        await supabase
          .from('gmail_accounts')
          .update({
            access_token: encrypt(newTokens.access_token!),
            token_expiry: newTokens.expiry_date
              ? new Date(newTokens.expiry_date).toISOString()
              : null,
          })
          .eq('id', account.id);

        console.log(`Token refreshed for ${account.email}`);
        refreshed++;
      } catch (err) {
        console.error(`Failed to refresh token for ${account.email}:`, err);
        failed++;

        // Mark account as needing re-authentication
        await supabase
          .from('gmail_accounts')
          .update({ sync_enabled: false })
          .eq('id', account.id);
      }
    }

    console.log('Token refresh completed');

    return res.json({
      success: true,
      refreshed,
      failed,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Token refresh worker error:', error);
    return res.status(500).json({ error: 'Token refresh failed' });
  }
}
