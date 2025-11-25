import { google } from 'googleapis';
import { supabase, Email, GmailAccount, SyncLog } from './supabase.js';
import { getGmailClient, refreshAccessToken } from './gmail-oauth.js';

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
    /**
     * Sync emails for a specific Gmail account
     */
    async syncAccount(options: SyncOptions): Promise<void> {
        const { accountId, syncType, maxResults = 500 } = options;

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

        } catch (error) {
            console.error('Sync error:', error);

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
        const now = new Date();
        const expiry = account.token_expiry ? new Date(account.token_expiry) : null;

        // If token expires in less than 5 minutes, refresh it
        if (!expiry || expiry.getTime() - now.getTime() < 5 * 60 * 1000) {
            console.log(`Refreshing token for account ${account.email}`);

            const newTokens = await refreshAccessToken(account.refresh_token!);

            // Update token in database
            await supabase
                .from('gmail_accounts')
                .update({
                    access_token: newTokens.access_token!,
                    token_expiry: newTokens.expiry_date
                        ? new Date(newTokens.expiry_date).toISOString()
                        : null,
                })
                .eq('id', account.id);

            return newTokens.access_token!;
        }

        return account.access_token!;
    }

    /**
     * Perform full sync (initial sync or resync)
     */
    private async performFullSync(
        account: GmailAccount,
        accessToken: string,
        maxResults: number
    ): Promise<void> {
        console.log(`Starting full sync for ${account.email}`);

        const gmail = getGmailClient(accessToken);

        // Fetch message IDs
        const listResponse = await gmail.users.messages.list({
            userId: 'me',
            maxResults,
            labelIds: ['INBOX'], // Start with inbox, expand later
        });

        const messages = listResponse.data.messages || [];
        console.log(`Found ${messages.length} messages to sync`);

        // Process in batches of 100
        const batchSize = 100;
        for (let i = 0; i < messages.length; i += batchSize) {
            const batch = messages.slice(i, i + batchSize);
            await this.processBatch(gmail, account.id, batch);
        }

        // Store history ID for future delta syncs
        if (listResponse.data.resultSizeEstimate && messages.length > 0) {
            // Get the latest history ID from the last message
            const lastMessage = await gmail.users.messages.get({
                userId: 'me',
                id: messages[messages.length - 1].id!,
            });

            if (lastMessage.data.historyId) {
                await supabase
                    .from('gmail_accounts')
                    .update({ sync_history_id: lastMessage.data.historyId })
                    .eq('id', account.id);
            }
        }

        console.log(`Full sync completed for ${account.email}`);
    }

    /**
     * Perform delta sync using History API
     */
    private async performDeltaSync(
        account: GmailAccount,
        accessToken: string
    ): Promise<void> {
        console.log(`Starting delta sync for ${account.email}`);

        if (!account.sync_history_id) {
            console.log('No history ID, falling back to full sync');
            return this.performFullSync(account, accessToken, 500);
        }

        const gmail = getGmailClient(accessToken);

        try {
            // Fetch history changes since last sync
            const historyResponse = await gmail.users.history.list({
                userId: 'me',
                startHistoryId: account.sync_history_id,
                historyTypes: ['messageAdded', 'messageDeleted', 'labelAdded', 'labelRemoved'],
            });

            const history = historyResponse.data.history || [];
            console.log(`Found ${history.length} history items`);

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
                if (item.labelsAdded || item.labelsRemoved) {
                    // TODO: Update email labels in database
                }
            }

            // Update history ID
            if (historyResponse.data.historyId) {
                await supabase
                    .from('gmail_accounts')
                    .update({ sync_history_id: historyResponse.data.historyId })
                    .eq('id', account.id);
            }

            console.log(`Delta sync completed for ${account.email}`);
        } catch (error: any) {
            // If history ID is too old, fall back to full sync
            if (error.code === 404) {
                console.log('History ID expired, performing full sync');
                return this.performFullSync(account, accessToken, 500);
            }
            throw error;
        }
    }

    /**
     * Process a batch of messages
     */
    private async processBatch(
        gmail: any,
        accountId: string,
        messages: Array<{ id: string }>
    ): Promise<void> {
        // Fetch full message details
        const fullMessages = await Promise.all(
            messages.map((msg) =>
                gmail.users.messages.get({
                    userId: 'me',
                    id: msg.id,
                    format: 'full',
                })
            )
        );

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

        console.log(`Processed batch of ${messages.length} emails`);
    }

    /**
     * Transform Gmail API message to our Email schema
     */
    private transformGmailMessage(accountId: string, message: any): Partial<Email> {
        const headers = message.payload?.headers || [];
        const getHeader = (name: string) =>
            headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value;

        // Extract email addresses from header
        const extractEmails = (header: string | undefined): string[] => {
            if (!header) return [];
            const matches = header.match(/[\w.-]+@[\w.-]+\.\w+/g);
            return matches || [];
        };

        // Get email body
        const getBody = (payload: any): { text: string; html: string } => {
            let text = '';
            let html = '';

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
                    }
                }
            }

            return { text, html };
        };

        const body = getBody(message.payload);
        const from = getHeader('from') || '';
        const fromMatch = from.match(/(.+?)\s*<(.+?)>/) || [null, from, from];

        return {
            gmail_account_id: accountId,
            gmail_message_id: message.id,
            gmail_thread_id: message.threadId,
            subject: getHeader('subject') || '(no subject)',
            from_email: fromMatch[2]?.trim(),
            from_name: fromMatch[1]?.trim(),
            to_emails: extractEmails(getHeader('to')),
            cc_emails: extractEmails(getHeader('cc')),
            bcc_emails: extractEmails(getHeader('bcc')),
            snippet: message.snippet || '',
            body_text: body.text,
            body_html: body.html,
            received_at: new Date(parseInt(message.internalDate)).toISOString(),
            is_read: !message.labelIds?.includes('UNREAD'),
            is_starred: message.labelIds?.includes('STARRED') || false,
            is_archived: !message.labelIds?.includes('INBOX'),
            label_ids: message.labelIds || [],
            attachments: [], // TODO: Parse attachments
            headers: Object.fromEntries(
                headers.map((h: any) => [h.name, h.value])
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
        const gmail = getGmailClient(accessToken);

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

        console.log(`Synced ${labels.length} labels for ${account.email}`);
    }
}

// Export singleton instance
export const gmailSyncService = new GmailSyncService();
