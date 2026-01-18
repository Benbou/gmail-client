import { Router, Response } from 'express';
import { supabase } from '../services/supabase.js';
import { gmailSyncService } from '../services/gmail-sync.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { ApiError, asyncHandler } from '../lib/errors.js';
import { createLogger } from '../lib/logger.js';
import {
    validate,
    syncTriggerSchema,
    syncLogsQuerySchema,
    accountIdParamSchemaAlt,
    SyncTriggerBody,
} from '../lib/validations.js';

const logger = createLogger('sync');
const router = Router();

// All sync routes require authentication
router.use(authenticate);

/**
 * POST /api/sync/:accountId
 * Trigger manual sync for an account
 */
router.post(
    '/:accountId',
    validate({
        params: accountIdParamSchemaAlt,
        body: syncTriggerSchema,
    }),
    asyncHandler(async (req: AuthRequest, res: Response) => {
        const { accountId } = req.params;
        const userId = req.userId!;
        const { syncType } = req.body as SyncTriggerBody;

        // Verify account exists and belongs to user
        const { data: account, error } = await supabase
            .from('gmail_accounts')
            .select('id, user_id, email, sync_enabled')
            .eq('id', accountId)
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

        // Trigger sync in background (don't wait for completion)
        gmailSyncService
            .syncAccount({ accountId, syncType })
            .then(() => logger.info({ accountId, email: account.email }, 'Sync completed'))
            .catch((err) => logger.error({ error: err, accountId }, 'Sync failed'));

        logger.info({ userId, accountId, syncType }, 'Sync triggered');

        res.json({
            message: 'Sync started',
            accountId,
            email: account.email,
            syncType,
        });
    })
);

/**
 * POST /api/sync/:accountId/labels
 * Sync labels for an account
 */
router.post(
    '/:accountId/labels',
    validate({ params: accountIdParamSchemaAlt }),
    asyncHandler(async (req: AuthRequest, res: Response) => {
        const { accountId } = req.params;
        const userId = req.userId!;

        // Verify account belongs to user
        const { data: account, error } = await supabase
            .from('gmail_accounts')
            .select('id, user_id, email')
            .eq('id', accountId)
            .single();

        if (error || !account) {
            throw ApiError.notFound('Gmail account');
        }

        if (account.user_id !== userId) {
            throw ApiError.forbidden('You do not have access to this account');
        }

        await gmailSyncService.syncLabels(accountId);

        logger.info({ userId, accountId }, 'Labels synced');

        res.json({ message: 'Labels synced successfully' });
    })
);

/**
 * GET /api/sync/logs/:accountId
 * Get sync logs for an account
 */
router.get(
    '/logs/:accountId',
    validate({
        params: accountIdParamSchemaAlt,
        query: syncLogsQuerySchema,
    }),
    asyncHandler(async (req: AuthRequest, res: Response) => {
        const { accountId } = req.params;
        const userId = req.userId!;
        const limit = (req.query as { limit?: number }).limit ?? 10;

        // Verify account belongs to user
        const { data: account, error: accountError } = await supabase
            .from('gmail_accounts')
            .select('id, user_id')
            .eq('id', accountId)
            .single();

        if (accountError || !account) {
            throw ApiError.notFound('Gmail account');
        }

        if (account.user_id !== userId) {
            throw ApiError.forbidden('You do not have access to this account');
        }

        const { data: logs, error } = await supabase
            .from('sync_logs')
            .select('*')
            .eq('gmail_account_id', accountId)
            .order('started_at', { ascending: false })
            .limit(limit);

        if (error) {
            throw ApiError.internal('Failed to fetch sync logs');
        }

        res.json({ logs });
    })
);

/**
 * GET /api/sync/status/:accountId
 * Get current sync status for an account
 */
router.get(
    '/status/:accountId',
    validate({ params: accountIdParamSchemaAlt }),
    asyncHandler(async (req: AuthRequest, res: Response) => {
        const { accountId } = req.params;
        const userId = req.userId!;

        // Verify account belongs to user
        const { data: account, error: accountError } = await supabase
            .from('gmail_accounts')
            .select('id, user_id, last_sync_at, sync_enabled')
            .eq('id', accountId)
            .single();

        if (accountError || !account) {
            throw ApiError.notFound('Gmail account');
        }

        if (account.user_id !== userId) {
            throw ApiError.forbidden('You do not have access to this account');
        }

        // Check if there's a running sync
        const { data: runningSync } = await supabase
            .from('sync_logs')
            .select('*')
            .eq('gmail_account_id', accountId)
            .eq('status', 'running')
            .order('started_at', { ascending: false })
            .limit(1)
            .single();

        // Get last completed sync
        const { data: lastSync } = await supabase
            .from('sync_logs')
            .select('*')
            .eq('gmail_account_id', accountId)
            .in('status', ['success', 'failed'])
            .order('started_at', { ascending: false })
            .limit(1)
            .single();

        res.json({
            status: {
                isRunning: !!runningSync,
                currentSync: runningSync || null,
                lastSync: lastSync || null,
                lastSyncAt: account.last_sync_at,
                syncEnabled: account.sync_enabled,
            },
        });
    })
);

export default router;
