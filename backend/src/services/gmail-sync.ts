import { google, gmail_v1 } from 'googleapis';
import { supabase, Email, GmailAccount } from './supabase.js';
import { getGmailClient, refreshAccessToken } from './gmail-oauth.js';
import { decrypt, encrypt, safeDecrypt } from '../lib/crypto.js';
import { createLogger } from '../lib/logger.js';

const logger = createLogger('gmail-sync');

interface SyncOptions {
    accountId: string;
    syncType: 'full' | 'delta';
    maxResults?: number;
}

/**
 * Gmail Email Sync Service
 * Handles fetching and syncing emails from Gmail to database
 */
export class GmailSyncService {
    private oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
    );

    /**
     * Sync emails for a specific Gmail account
     */
    async syncAccount(options: SyncOptions): Promise<void> {
        const { accountId, syncType, maxResults = 500 } = options;

        logger.info({ accountId, syncType }, 'Starting sync');

        // Get account from database
        const { data: account, error: accountError } = await supabase
            .from('gmail_accounts')
            .select('*')
            .eq('id', accountId)
            .single();

        if (accountError || !account) {
            throw new Error(`Account not found: ${accountId}`);
        }

        // Create sync log
        const { data: syncLog } = await supabase
            .from('sync_logs')
            .insert({
                gmail_account_id: accountId,
                sync_type: syncType,
                status: 'running',
            })
            .select()
            .single();

        try {
            // Ensure token is fresh
            const accessToken = await this.ensureFreshToken(account);

            if (syncType === 'full') {
                await this.performFullSync(account, accessToken, maxResults);
            } else {
                await this.performDeltaSync(account, accessToken);
            }

            // Update sync log as success
            await supabase
                .from('sync_logs')
                .update({
                    status: 'success',
                    completed_at: new Date().toISOString(),
                })
                .eq('id', syncLog!.id);

            // Update account last sync time
            await supabase
                .from('gmail_accounts')
                .update({ last_sync_at: new Date().toISOString() })
                .eq('id', accountId);

            logger.info({ accountId, syncType }, 'Sync completed successfully');
        } catch (error) {
            logger.error({ error, accountId, syncType }, 'Sync failed');

            // Update sync log as failed
            await supabase
                .from('sync_logs')
                .update({
                    status: 'failed',
                    completed_at: new Date().toISOString(),
                    errors: [{ message: (error as Error).message }],
                })
                .eq('id', syncLog!.id);

            throw error;
        }
    }

    /**
     * Ensure access token is fresh, refresh if needed
     */
    private async ensureFreshToken(account: GmailAccount): Promise<string> {
        // Decrypt tokens
        const accessToken = safeDecrypt(account.access_token);
        const refreshToken = safeDecrypt(account.refresh_token);

        if (!accessToken && !refreshToken) {
            throw new Error('No valid tokens for account');
        }

        const now = new Date();
        const expiry = account.token_expiry ? new Date(account.token_expiry) : null;

        // If token expires in less than 5 minutes, refresh it
        if (!expiry || expiry.getTime() - now.getTime() < 5 * 60 * 1000) {
            if (!refreshToken) {
                throw new Error('Token expired and no refresh token available');
            }

            logger.debug({ accountId: account.id }, 'Refreshing access token');

            const newTokens = await refreshAccessToken(refreshToken);

            // Update token in database (encrypted)
            await supabase
                .from('gmail_accounts')
                .update({
                    access_token: encrypt(newTokens.access_token!),
                    token_expiry: newTokens.expiry_date
                        ? new Date(newTokens.expiry_date).toISOString()
                        : null,
                })
                .eq('id', account.id);

            return newTokens.access_token!;
        }

        return accessToken!;
    }

    /**
     * Get Gmail client with access token
     */
    private getGmailClient(accessToken: string): gmail_v1.Gmail {
        this.oauth2Client.setCredentials({ access_token: accessToken });
        return google.gmail({ version: 'v1', auth: this.oauth2Client });
    }

    /**
     * Perform full sync (initial sync or resync)
     */
    private async performFullSync(
        account: GmailAccount,
        accessToken: string,
        maxResults: number
    ): Promise<void> {
        logger.info({ accountId: account.id, email: account.email }, 'Starting full sync');

        const gmail = this.getGmailClient(accessToken);

        // Fetch message IDs
        const listResponse = await gmail.users.messages.list({
            userId: 'me',
            maxResults,
            labelIds: ['INBOX'], // Start with inbox, expand later
        });

        const messages = listResponse.data.messages || [];
        logger.info({ accountId: account.id, messageCount: messages.length }, 'Messages to sync');

        // Process in batches of 50 (to avoid overwhelming the API)
        const batchSize = 50;
        for (let i = 0; i < messages.length; i += batchSize) {
            const batch = messages.slice(i, i + batchSize).filter((m): m is { id: string } => !!m.id);
            await this.processBatch(gmail, account.id, batch);
            logger.debug(
                { accountId: account.id, processed: Math.min(i + batchSize, messages.length) },
                'Batch processed'
            );
        }

        // Store history ID for future delta syncs
        if (messages.length > 0) {
            // Get the latest history ID from the first (most recent) message
            const firstMessage = await gmail.users.messages.get({
                userId: 'me',
                id: messages[0].id!,
            });

            if (firstMessage.data.historyId) {
                await supabase
                    .from('gmail_accounts')
                    .update({ sync_history_id: firstMessage.data.historyId })
                    .eq('id', account.id);
            }
        }

        logger.info({ accountId: account.id, email: account.email }, 'Full sync completed');
    }

    /**
     * Perform delta sync using History API
     */
    private async performDeltaSync(
        account: GmailAccount,
        accessToken: string
    ): Promise<void> {
        logger.info({ accountId: account.id, email: account.email }, 'Starting delta sync');

        if (!account.sync_history_id) {
            logger.info({ accountId: account.id }, 'No history ID, falling back to full sync');
            return this.performFullSync(account, accessToken, 500);
        }

        const gmail = this.getGmailClient(accessToken);

        try {
            // Fetch history changes since last sync
            const historyResponse = await gmail.users.history.list({
                userId: 'me',
                startHistoryId: account.sync_history_id,
                historyTypes: ['messageAdded', 'messageDeleted', 'labelAdded', 'labelRemoved'],
            });

            const history = historyResponse.data.history || [];
            logger.debug({ accountId: account.id, historyCount: history.length }, 'History items found');

            // Process each history item
            for (const item of history) {
                // Messages added
                if (item.messagesAdded) {
                    const messages = item.messagesAdded.map((m) => ({ id: m.message!.id! }));
                    await this.processBatch(gmail, account.id, messages);
                }

                // Messages deleted
                if (item.messagesDeleted) {
                    for (const deleted of item.messagesDeleted) {
                        await this.deleteMessage(account.id, deleted.message!.id!);
                    }
                }

                // Labels changed (update existing emails)
                if (item.labelsAdded) {
                    for (const change of item.labelsAdded) {
                        await this.updateEmailLabels(
                            account.id,
                            change.message!.id!,
                            change.labelIds || [],
                            'add'
                        );
                    }
                }

                if (item.labelsRemoved) {
                    for (const change of item.labelsRemoved) {
                        await this.updateEmailLabels(
                            account.id,
                            change.message!.id!,
                            change.labelIds || [],
                            'remove'
                        );
                    }
                }
            }

            // Update history ID
            if (historyResponse.data.historyId) {
                await supabase
                    .from('gmail_accounts')
                    .update({ sync_history_id: historyResponse.data.historyId })
                    .eq('id', account.id);
            }

            logger.info({ accountId: account.id, email: account.email }, 'Delta sync completed');
        } catch (error: unknown) {
            // If history ID is too old, fall back to full sync
            const apiError = error as { code?: number };
            if (apiError.code === 404) {
                logger.warn({ accountId: account.id }, 'History ID expired, performing full sync');
                return this.performFullSync(account, accessToken, 500);
            }
            throw error;
        }
    }

    /**
     * Update email labels after a label change
     */
    private async updateEmailLabels(
        accountId: string,
        gmailMessageId: string,
        labelIds: string[],
        action: 'add' | 'remove'
    ): Promise<void> {
        // Get current email
        const { data: email } = await supabase
            .from('emails')
            .select('label_ids, is_read, is_starred, is_archived')
            .eq('gmail_account_id', accountId)
            .eq('gmail_message_id', gmailMessageId)
            .single();

        if (!email) return;

        const currentLabels = new Set(email.label_ids || []);
        const updates: Record<string, unknown> = {};

        for (const labelId of labelIds) {
            if (action === 'add') {
                currentLabels.add(labelId);

                // Update flags based on labels
                if (labelId === 'UNREAD') updates.is_read = false;
                if (labelId === 'STARRED') updates.is_starred = true;
                if (labelId === 'INBOX') updates.is_archived = false;
            } else {
                currentLabels.delete(labelId);

                // Update flags based on labels
                if (labelId === 'UNREAD') updates.is_read = true;
                if (labelId === 'STARRED') updates.is_starred = false;
                if (labelId === 'INBOX') updates.is_archived = true;
            }
        }

        updates.label_ids = Array.from(currentLabels);

        await supabase
            .from('emails')
            .update(updates)
            .eq('gmail_account_id', accountId)
            .eq('gmail_message_id', gmailMessageId);
    }

    /**
     * Process a batch of messages
     */
    private async processBatch(
        gmail: gmail_v1.Gmail,
        accountId: string,
        messages: Array<{ id: string }>
    ): Promise<void> {
        // Fetch full message details with concurrency limit
        const results = await Promise.allSettled(
            messages.map((msg) =>
                gmail.users.messages.get({
                    userId: 'me',
                    id: msg.id,
                    format: 'full',
                })
            )
        );

        // Filter successful responses
        const fullMessages = results
            .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
            .map((r) => r.value);

        // Log any failures
        const failures = results.filter((r) => r.status === 'rejected');
        if (failures.length > 0) {
            logger.warn({ accountId, failureCount: failures.length }, 'Some messages failed to fetch');
        }

        // Transform and insert into database
        const emailsToInsert = fullMessages.map((response) =>
            this.transformGmailMessage(accountId, response.data)
        );

        // Upsert emails (insert or update if exists)
        for (const email of emailsToInsert) {
            await supabase.from('emails').upsert(email, {
                onConflict: 'gmail_account_id,gmail_message_id',
            });
        }
    }

    /**
     * Transform Gmail API message to our Email schema
     */
    private transformGmailMessage(accountId: string, message: gmail_v1.Schema$Message): Partial<Email> {
        const headers = message.payload?.headers || [];
        const getHeader = (name: string): string | undefined =>
            headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value || undefined;

        // Extract email addresses from header
        const extractEmails = (header: string | undefined): string[] => {
            if (!header) return [];
            const matches = header.match(/[\w.-]+@[\w.-]+\.\w+/g);
            return matches || [];
        };

        // Get email body
        const getBody = (payload: gmail_v1.Schema$MessagePart | undefined): { text: string; html: string } => {
            let text = '';
            let html = '';

            if (!payload) return { text, html };

            if (payload.body?.data) {
                const decoded = Buffer.from(payload.body.data, 'base64').toString('utf-8');
                if (payload.mimeType === 'text/plain') {
                    text = decoded;
                } else if (payload.mimeType === 'text/html') {
                    html = decoded;
                }
            }

            // Check parts for multipart messages
            if (payload.parts) {
                for (const part of payload.parts) {
                    if (part.mimeType === 'text/plain' && part.body?.data) {
                        text = Buffer.from(part.body.data, 'base64').toString('utf-8');
                    } else if (part.mimeType === 'text/html' && part.body?.data) {
                        html = Buffer.from(part.body.data, 'base64').toString('utf-8');
                    } else if (part.mimeType?.startsWith('multipart/') && part.parts) {
                        // Handle nested multipart
                        for (const nestedPart of part.parts) {
                            if (nestedPart.mimeType === 'text/plain' && nestedPart.body?.data) {
                                text = Buffer.from(nestedPart.body.data, 'base64').toString('utf-8');
                            } else if (nestedPart.mimeType === 'text/html' && nestedPart.body?.data) {
                                html = Buffer.from(nestedPart.body.data, 'base64').toString('utf-8');
                            }
                        }
                    }
                }
            }

            return { text, html };
        };

        // Extract attachments metadata
        const extractAttachments = (payload: gmail_v1.Schema$MessagePart | undefined): Array<{
            filename: string;
            mimeType: string;
            size: number;
            attachmentId: string;
        }> => {
            const attachments: Array<{
                filename: string;
                mimeType: string;
                size: number;
                attachmentId: string;
            }> = [];

            const processPartForAttachments = (part: gmail_v1.Schema$MessagePart) => {
                if (part.filename && part.body?.attachmentId) {
                    attachments.push({
                        filename: part.filename,
                        mimeType: part.mimeType || 'application/octet-stream',
                        size: part.body.size || 0,
                        attachmentId: part.body.attachmentId,
                    });
                }
                if (part.parts) {
                    part.parts.forEach(processPartForAttachments);
                }
            };

            if (payload) {
                processPartForAttachments(payload);
            }

            return attachments;
        };

        const body = getBody(message.payload);
        const from = getHeader('from') || '';
        const fromMatch = from.match(/(.+?)\s*<(.+?)>/) || [null, from, from];

        return {
            gmail_account_id: accountId,
            gmail_message_id: message.id || undefined,
            gmail_thread_id: message.threadId || undefined,
            subject: getHeader('subject') || '(no subject)',
            from_email: fromMatch[2]?.trim(),
            from_name: fromMatch[1]?.trim()?.replace(/^"(.+)"$/, '$1'),
            to_emails: extractEmails(getHeader('to')),
            cc_emails: extractEmails(getHeader('cc')),
            bcc_emails: extractEmails(getHeader('bcc')),
            snippet: message.snippet || '',
            body_text: body.text,
            body_html: body.html,
            received_at: message.internalDate
                ? new Date(parseInt(message.internalDate)).toISOString()
                : undefined,
            is_read: !message.labelIds?.includes('UNREAD'),
            is_starred: message.labelIds?.includes('STARRED') || false,
            is_archived: !message.labelIds?.includes('INBOX'),
            label_ids: message.labelIds || [],
            attachments: extractAttachments(message.payload),
            headers: Object.fromEntries(
                headers.map((h) => [h.name, h.value])
            ),
        };
    }

    /**
     * Delete a message from database
     */
    private async deleteMessage(accountId: string, gmailMessageId: string): Promise<void> {
        await supabase
            .from('emails')
            .delete()
            .eq('gmail_account_id', accountId)
            .eq('gmail_message_id', gmailMessageId);
    }

    /**
     * Sync labels for an account
     */
    async syncLabels(accountId: string): Promise<void> {
        const { data: account } = await supabase
            .from('gmail_accounts')
            .select('*')
            .eq('id', accountId)
            .single();

        if (!account) {
            throw new Error('Account not found');
        }

        const accessToken = await this.ensureFreshToken(account);
        const gmail = this.getGmailClient(accessToken);

        const response = await gmail.users.labels.list({ userId: 'me' });
        const labels = response.data.labels || [];

        for (const label of labels) {
            await supabase.from('labels').upsert(
                {
                    gmail_account_id: accountId,
                    gmail_label_id: label.id!,
                    name: label.name!,
                    type: label.type === 'system' ? 'system' : 'user',
                    color: label.color?.backgroundColor,
                    message_count: label.messagesTotal || 0,
                },
                { onConflict: 'gmail_account_id,gmail_label_id' }
            );
        }

        logger.info({ accountId, labelCount: labels.length }, 'Labels synced');
    }
}

// Export singleton instance
export const gmailSyncService = new GmailSyncService();
