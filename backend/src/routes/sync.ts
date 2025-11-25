import { Router, Response } from 'express';
import { supabase } from '../services/supabase.js';
import { gmailSyncService } from '../services/gmail-sync.js';
import { AuthRequest } from '../middleware/auth.js';

const router = Router();

/**
 * POST /api/sync/:accountId
 * Trigger manual sync for an account
 */
router.post('/:accountId', async (req: AuthRequest, res: Response) => {
    try {
        const { accountId } = req.params;
        const { syncType = 'delta' } = req.body;

        // Verify account exists and belongs to user
        const { data: account, error } = await supabase
            .from('gmail_accounts')
            .select('id, email, sync_enabled')
            .eq('id', accountId)
            .single();

        if (error || !account) {
            return res.status(404).json({ error: 'Account not found' });
        }

        if (!account.sync_enabled) {
            return res.status(400).json({ error: 'Sync is disabled for this account' });
        }

        // Trigger sync in background (don't wait for completion)
        gmailSyncService
            .syncAccount({ accountId, syncType })
            .then(() => console.log(`Sync completed for ${account.email}`))
            .catch((err) => console.error(`Sync failed for ${account.email}:`, err));

        res.json({
            message: 'Sync started',
            accountId,
            email: account.email,
        });
    } catch (error) {
        console.error('Trigger sync error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /api/sync/:accountId/labels
 * Sync labels for an account
 */
router.post('/:accountId/labels', async (req: AuthRequest, res: Response) => {
    try {
        const { accountId } = req.params;

        await gmailSyncService.syncLabels(accountId);

        res.json({ message: 'Labels synced successfully' });
    } catch (error) {
        console.error('Sync labels error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /api/sync/logs/:accountId
 * Get sync logs for an account
 */
router.get('/logs/:accountId', async (req: AuthRequest, res: Response) => {
    try {
        const { accountId } = req.params;
        const { limit = '10' } = req.query;

        const { data: logs, error } = await supabase
            .from('sync_logs')
            .select('*')
            .eq('gmail_account_id', accountId)
            .order('started_at', { ascending: false })
            .limit(parseInt(limit as string));

        if (error) {
            return res.status(500).json({ error: 'Failed to fetch sync logs' });
        }

        res.json({ logs });
    } catch (error) {
        console.error('Get sync logs error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
