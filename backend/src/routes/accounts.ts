import { Router, Response } from 'express';
import { supabase } from '../services/supabase.js';
import { gmailSyncService } from '../services/gmail-sync.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { ApiError, asyncHandler } from '../lib/errors.js';
import { createLogger } from '../lib/logger.js';
import {
    validate,
    accountUpdateSchema,
    accountIdParamSchema,
    AccountUpdateBody,
} from '../lib/validations.js';

const logger = createLogger('accounts');
const router = Router();

// All account routes require authentication
router.use(authenticate);

/**
 * GET /api/accounts
 * List user's Gmail accounts
 */
router.get(
    '/',
    asyncHandler(async (req: AuthRequest, res: Response) => {
        const userId = req.userId!;

        const { data: accounts, error } = await supabase
            .from('gmail_accounts')
            .select('id, email, is_active, sync_enabled, last_sync_at, created_at')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) {
            logger.error({ error, userId }, 'Failed to fetch accounts');
            throw ApiError.internal('Failed to fetch accounts');
        }

        res.json({ accounts });
    })
);

/**
 * GET /api/accounts/:id
 * Get single account details
 */
router.get(
    '/:id',
    validate({ params: accountIdParamSchema }),
    asyncHandler(async (req: AuthRequest, res: Response) => {
        const { id } = req.params;
        const userId = req.userId!;

        const { data: account, error } = await supabase
            .from('gmail_accounts')
            .select('id, email, is_active, sync_enabled, last_sync_at, scopes, created_at')
            .eq('id', id)
            .eq('user_id', userId)
            .single();

        if (error || !account) {
            throw ApiError.notFound('Gmail account');
        }

        res.json({ account });
    })
);

/**
 * PATCH /api/accounts/:id
 * Update account settings
 */
router.patch(
    '/:id',
    validate({ params: accountIdParamSchema, body: accountUpdateSchema }),
    asyncHandler(async (req: AuthRequest, res: Response) => {
        const { id } = req.params;
        const userId = req.userId!;
        const updates = req.body as AccountUpdateBody;

        // Verify ownership
        const { data: existing } = await supabase
            .from('gmail_accounts')
            .select('id, user_id')
            .eq('id', id)
            .single();

        if (!existing) {
            throw ApiError.notFound('Gmail account');
        }

        if (existing.user_id !== userId) {
            throw ApiError.forbidden('You do not have access to this account');
        }

        // Build update data
        const updateData: Record<string, unknown> = {};
        if (typeof updates.sync_enabled === 'boolean') updateData.sync_enabled = updates.sync_enabled;
        if (typeof updates.is_active === 'boolean') updateData.is_active = updates.is_active;

        const { data: account, error } = await supabase
            .from('gmail_accounts')
            .update(updateData)
            .eq('id', id)
            .select('id, email, is_active, sync_enabled, last_sync_at, created_at')
            .single();

        if (error) {
            logger.error({ error, accountId: id }, 'Failed to update account');
            throw ApiError.internal('Failed to update account');
        }

        logger.info({ userId, accountId: id, updates }, 'Account updated');

        res.json({ account });
    })
);

/**
 * POST /api/accounts/:id/sync
 * Trigger manual sync for account
 */
router.post(
    '/:id/sync',
    validate({ params: accountIdParamSchema }),
    asyncHandler(async (req: AuthRequest, res: Response) => {
        const { id } = req.params;
        const userId = req.userId!;
        const { syncType = 'delta' } = req.body;

        // Verify ownership and get account details
        const { data: account, error } = await supabase
            .from('gmail_accounts')
            .select('id, user_id, email, sync_enabled')
            .eq('id', id)
            .single();

        if (error || !account) {
            throw ApiError.notFound('Gmail account');
        }

        if (account.user_id !== userId) {
            throw ApiError.forbidden('You do not have access to this account');
        }

        if (!account.sync_enabled) {
            throw ApiError.badRequest('Sync is disabled for this account');
        }

        // Trigger sync in background
        gmailSyncService
            .syncAccount({ accountId: id, syncType })
            .then(() => logger.info({ accountId: id }, 'Manual sync completed'))
            .catch((err) => logger.error({ error: err, accountId: id }, 'Manual sync failed'));

        logger.info({ userId, accountId: id, syncType }, 'Manual sync triggered');

        res.json({
            message: 'Sync started',
            accountId: id,
            email: account.email,
        });
    })
);

/**
 * GET /api/accounts/:id/stats
 * Get account statistics
 */
router.get(
    '/:id/stats',
    validate({ params: accountIdParamSchema }),
    asyncHandler(async (req: AuthRequest, res: Response) => {
        const { id } = req.params;
        const userId = req.userId!;

        // Verify ownership
        const { data: account } = await supabase
            .from('gmail_accounts')
            .select('id, user_id')
            .eq('id', id)
            .single();

        if (!account) {
            throw ApiError.notFound('Gmail account');
        }

        if (account.user_id !== userId) {
            throw ApiError.forbidden('You do not have access to this account');
        }

        // Get email counts
        const { count: totalEmails } = await supabase
            .from('emails')
            .select('*', { count: 'exact', head: true })
            .eq('gmail_account_id', id);

        const { count: unreadEmails } = await supabase
            .from('emails')
            .select('*', { count: 'exact', head: true })
            .eq('gmail_account_id', id)
            .eq('is_read', false)
            .eq('is_archived', false);

        const { count: starredEmails } = await supabase
            .from('emails')
            .select('*', { count: 'exact', head: true })
            .eq('gmail_account_id', id)
            .eq('is_starred', true);

        // Get last sync info
        const { data: lastSync } = await supabase
            .from('sync_logs')
            .select('*')
            .eq('gmail_account_id', id)
            .order('started_at', { ascending: false })
            .limit(1)
            .single();

        res.json({
            stats: {
                totalEmails: totalEmails || 0,
                unreadEmails: unreadEmails || 0,
                starredEmails: starredEmails || 0,
                lastSync: lastSync || null,
            },
        });
    })
);

export default router;
