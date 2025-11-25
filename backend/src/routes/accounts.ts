import { Router, Response } from 'express';
import { supabase } from '../services/supabase.js';
import { AuthRequest } from '../middleware/auth.js';

const router = Router();

/**
 * GET /api/accounts
 * List user's Gmail accounts
 */
router.get('/', async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.query.userId as string; // TODO: Get from JWT

        if (!userId) {
            return res.status(400).json({ error: 'userId is required' });
        }

        const { data: accounts, error } = await supabase
            .from('gmail_accounts')
            .select('id, email, is_active, sync_enabled, last_sync_at, created_at')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching accounts:', error);
            return res.status(500).json({ error: 'Failed to fetch accounts' });
        }

        res.json({ accounts });
    } catch (error) {
        console.error('List accounts error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * PATCH /api/accounts/:id
 * Update account settings
 */
router.patch('/:id', async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { sync_enabled, is_active } = req.body;

        const updateData: any = {};
        if (typeof sync_enabled === 'boolean') updateData.sync_enabled = sync_enabled;
        if (typeof is_active === 'boolean') updateData.is_active = is_active;

        const { data: account, error } = await supabase
            .from('gmail_accounts')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Error updating account:', error);
            return res.status(500).json({ error: 'Failed to update account' });
        }

        res.json({ account });
    } catch (error) {
        console.error('Update account error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /api/accounts/sync/:id
 * Trigger manual sync for account
 */
router.post('/sync/:id', async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;

        // TODO: Trigger sync worker for this account
        // For now, just return success
        res.json({ message: 'Sync triggered', accountId: id });
    } catch (error) {
        console.error('Trigger sync error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
