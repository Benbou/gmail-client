import cron from 'node-cron';
import { supabase } from '../services/supabase.js';
import { gmailSyncService } from '../services/gmail-sync.js';
import { refreshAccessToken } from '../services/gmail-oauth.js';
import { gmailService } from '../services/gmail-service.js';
import { encrypt, safeDecrypt } from '../lib/crypto.js';
import { createLogger } from '../lib/logger.js';

const logger = createLogger('cron-jobs');

/**
 * Background worker for automatic email syncing
 * Runs every 2 minutes and syncs all active accounts
 */
export function startSyncWorker() {
    logger.info('Starting auto-sync worker (runs every 2 minutes)');

    cron.schedule('*/2 * * * *', async () => {
        try {
            logger.debug('Running scheduled email sync...');

            // Get all active accounts with sync enabled
            const { data: accounts, error } = await supabase
                .from('gmail_accounts')
                .select('id, email, sync_enabled, is_active')
                .eq('is_active', true)
                .eq('sync_enabled', true);

            if (error) {
                logger.error({ error }, 'Error fetching accounts for sync');
                return;
            }

            if (!accounts || accounts.length === 0) {
                logger.debug('No accounts to sync');
                return;
            }

            logger.info({ count: accounts.length }, 'Syncing accounts');

            // Sync each account in parallel
            const syncPromises = accounts.map((account) =>
                gmailSyncService
                    .syncAccount({
                        accountId: account.id,
                        syncType: 'delta',
                    })
                    .catch((err) => {
                        logger.error({ email: account.email, error: err.message }, 'Sync failed');
                    })
            );

            await Promise.allSettled(syncPromises);

            logger.debug('Scheduled sync completed');
        } catch (error) {
            logger.error({ error }, 'Sync worker error');
        }
    });
}

/**
 * Token refresh worker
 * Runs every 5 minutes to proactively refresh expiring tokens
 */
export function startTokenRefreshWorker() {
    logger.info('Starting token refresh worker (runs every 5 minutes)');

    cron.schedule('*/5 * * * *', async () => {
        try {
            logger.debug('Checking for expiring tokens...');

            const tenMinutesFromNow = new Date(Date.now() + 10 * 60 * 1000).toISOString();

            // Get accounts with tokens expiring soon
            const { data: accounts, error } = await supabase
                .from('gmail_accounts')
                .select('id, email, refresh_token, token_expiry')
                .not('token_expiry', 'is', null)
                .lt('token_expiry', tenMinutesFromNow)
                .eq('is_active', true);

            if (error) {
                logger.error({ error }, 'Error fetching accounts for token refresh');
                return;
            }

            if (!accounts || accounts.length === 0) {
                logger.debug('No tokens need refreshing');
                return;
            }

            logger.info({ count: accounts.length }, 'Refreshing tokens');

            for (const account of accounts) {
                try {
                    // Decrypt the refresh token
                    const refreshToken = safeDecrypt(account.refresh_token);

                    if (!refreshToken) {
                        logger.warn({ email: account.email }, 'No valid refresh token');
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

                    logger.debug({ email: account.email }, 'Token refreshed');
                } catch (err) {
                    logger.error({ email: account.email, error: err }, 'Failed to refresh token');

                    // Mark account as needing re-authentication
                    await supabase
                        .from('gmail_accounts')
                        .update({ sync_enabled: false })
                        .eq('id', account.id);
                }
            }

            logger.debug('Token refresh completed');
        } catch (error) {
            logger.error({ error }, 'Token refresh worker error');
        }
    });
}

/**
 * Scheduled actions worker
 * Runs every minute to process pending scheduled actions
 */
export function startScheduledActionsWorker() {
    logger.info('Starting scheduled actions worker (runs every minute)');

    cron.schedule('* * * * *', async () => {
        try {
            const now = new Date().toISOString();

            // Get pending actions that are due
            const { data: actions, error } = await supabase
                .from('scheduled_actions')
                .select('*, emails(*), drafts(*)')
                .eq('status', 'pending')
                .lte('scheduled_at', now);

            if (error) {
                logger.error({ error }, 'Error fetching scheduled actions');
                return;
            }

            if (!actions || actions.length === 0) {
                return; // No actions due
            }

            logger.info({ count: actions.length }, 'Processing scheduled actions');

            for (const action of actions) {
                try {
                    if (action.action_type === 'snooze') {
                        // Un-archive the email (bring back to inbox)
                        await supabase
                            .from('emails')
                            .update({ is_archived: false })
                            .eq('id', action.email_id);

                        logger.debug({ emailId: action.email_id }, 'Email unsnoozed');
                    } else if (action.action_type === 'send_later') {
                        // Send the scheduled email
                        const draft = action.drafts;
                        if (draft) {
                            const { data: account } = await supabase
                                .from('gmail_accounts')
                                .select('email')
                                .eq('id', action.gmail_account_id)
                                .single();

                            if (account) {
                                await gmailService.sendEmail(action.gmail_account_id!, {
                                    from: account.email,
                                    to: draft.to_emails || [],
                                    cc: draft.cc_emails,
                                    bcc: draft.bcc_emails,
                                    subject: draft.subject || '',
                                    body: draft.body_text || '',
                                    bodyHtml: draft.body_html,
                                });

                                // Delete the draft after sending
                                await supabase.from('drafts').delete().eq('id', draft.id);

                                logger.info({ actionId: action.id }, 'Scheduled email sent');
                            }
                        }
                    }

                    // Mark action as completed
                    await supabase
                        .from('scheduled_actions')
                        .update({
                            status: 'completed',
                            executed_at: new Date().toISOString(),
                        })
                        .eq('id', action.id);
                } catch (err) {
                    logger.error({ actionId: action.id, error: err }, 'Failed to execute action');

                    // Mark action as failed
                    await supabase
                        .from('scheduled_actions')
                        .update({
                            status: 'failed',
                            error_message: (err as Error).message,
                            executed_at: new Date().toISOString(),
                        })
                        .eq('id', action.id);
                }
            }

            logger.debug('Scheduled actions processed');
        } catch (error) {
            logger.error({ error }, 'Scheduled actions worker error');
        }
    });
}

/**
 * Start all background workers
 */
export function startAllWorkers() {
    startSyncWorker();
    startTokenRefreshWorker();
    startScheduledActionsWorker();
    logger.info('All background workers started');
}
