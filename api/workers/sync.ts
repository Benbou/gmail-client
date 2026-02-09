import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyCronSecret } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { gmailSyncService } from '../services/gmail-sync';

/**
 * Worker endpoint: Email sync
 * Called by Cloudflare Worker every 2 minutes
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
    // Get all active accounts with sync enabled
    const { data: accounts, error } = await supabase
      .from('gmail_accounts')
      .select('id, email, sync_enabled, is_active')
      .eq('is_active', true)
      .eq('sync_enabled', true);

    if (error) {
      console.error('Error fetching accounts for sync:', error);
      return res.status(500).json({ error: 'Failed to fetch accounts' });
    }

    if (!accounts || accounts.length === 0) {
      return res.json({ success: true, synced: 0, message: 'No accounts to sync' });
    }

    console.log(`Syncing ${accounts.length} accounts`);

    // Sync each account in parallel
    const syncPromises = accounts.map((account) =>
      gmailSyncService
        .syncAccount({
          accountId: account.id,
          syncType: 'delta',
        })
        .catch((err) => {
          console.error(`Sync failed for ${account.email}:`, err.message);
        })
    );

    await Promise.allSettled(syncPromises);

    console.log('Scheduled sync completed');

    return res.json({
      success: true,
      synced: accounts.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Sync worker error:', error);
    return res.status(500).json({ error: 'Sync failed' });
  }
}
