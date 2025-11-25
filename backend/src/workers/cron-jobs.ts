import cron from 'node-cron';
import { supabase } from '../services/supabase.js';
import { gmailSyncService } from '../services/gmail-sync.js';
import { refreshAccessToken } from '../services/gmail-oauth.js';

/**
 * Background worker for automatic email syncing
 * Runs every 2 minutes and syncs all active accounts
 */
export function startSyncWorker() {
    console.log('📅 Starting auto-sync worker (runs every 2 minutes)');

    cron.schedule('*/2 * * * *', async () => {
        try {
            console.log('🔄 Running scheduled email sync...');

            // Get all active accounts with sync enabled
            const { data: accounts, error } = await supabase
                .from('gmail_accounts')
                .select('id, email, sync_enabled, is_active')
                .eq('is_active', true)
                .eq('sync_enabled', true);

            if (error) {
                console.error('Error fetching accounts for sync:', error);
                return;
            }

            if (!accounts || accounts.length === 0) {
                console.log('No accounts to sync');
                return;
            }

            console.log(`Syncing ${accounts.length} accounts...`);

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

            console.log('✅ Scheduled sync completed');
        } catch (error) {
            console.error('Sync worker error:', error);
        }
    });
}

/**
 * Token refresh worker
 * Runs every 5 minutes to proactively refresh expiring tokens
 */
export function startTokenRefreshWorker() {
    console.log('🔑 Starting token refresh worker (runs every 5 minutes)');

    cron.schedule('*/5 * * * *', async () => {
        try {
            console.log('🔄 Checking for expiring tokens...');

            const tenMinutesFromNow = new Date(Date.now() + 10 * 60 * 1000).toISOString();

            // Get accounts with tokens expiring soon
            const { data: accounts, error } = await supabase
                .from('gmail_accounts')
                .select('id, email, refresh_token, token_expiry')
                .is('token_expiry', 'not', null)
                .lt('token_expiry', tenMinutesFromNow)
                .eq('is_active', true);

            if (error) {
                console.error('Error fetching accounts for token refresh:', error);
                return;
            }

            if (!accounts || accounts.length === 0) {
                console.log('No tokens need refreshing');
                return;
            }

            console.log(`Refreshing tokens for ${accounts.length} accounts...`);

            for (const account of accounts) {
                try {
                    if (!account.refresh_token) {
                        console.warn(`No refresh token for ${account.email}`);
                        continue;
                    }

                    const newTokens = await refreshAccessToken(account.refresh_token);

                    await supabase
                        .from('gmail_accounts')
                        .update({
                            access_token: newTokens.access_token!,
                            token_expiry: newTokens.expiry_date
                                ? new Date(newTokens.expiry_date).toISOString()
                                : null,
                        })
                        .eq('id', account.id);

                    console.log(`✅ Refreshed token for ${account.email}`);
                } catch (err) {
                    console.error(`Failed to refresh token for ${account.email}:`, err);

                    // Mark account as needing re-authentication
                    await supabase
                        .from('gmail_accounts')
                        .update({ sync_enabled: false })
                        .eq('id', account.id);
                }
            }

            console.log('✅ Token refresh completed');
        } catch (error) {
            console.error('Token refresh worker error:', error);
        }
    });
}

/**
 * Scheduled actions worker
 * Runs every minute to process pending scheduled actions
 */
export function startScheduledActionsWorker() {
    console.log('⏰ Starting scheduled actions worker (runs every minute)');

    cron.schedule('* * * * *', async () => {
        try {
            const now = new Date().toISOString();

            // Get pending actions that are due
            const { data: actions, error } = await supabase
                .from('scheduled_actions')
                .select('*, emails(*)')
                .eq('status', 'pending')
                .lte('scheduled_at', now);

            if (error) {
                console.error('Error fetching scheduled actions:', error);
                return;
            }

            if (!actions || actions.length === 0) {
                return; // No actions due
            }

            console.log(`Processing ${actions.length} scheduled actions...`);

            for (const action of actions) {
                try {
                    if (action.action_type === 'snooze') {
                        // Un-archive the email (bring back to inbox)
                        await supabase
                            .from('emails')
                            .update({ is_archived: false })
                            .eq('id', action.email_id);

                        console.log(`✅ Unsnoozed email ${action.email_id}`);
                    } else if (action.action_type === 'send_later') {
                        // TODO: Send the draft email
                        console.log(`📧 Sending scheduled email ${action.email_id}`);
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
                    console.error(`Failed to execute action ${action.id}:`, err);

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

            console.log('✅ Scheduled actions processed');
        } catch (error) {
            console.error('Scheduled actions worker error:', error);
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
    console.log('✅ All background workers started');
}
