import { google, gmail_v1 } from 'googleapis';
import { supabase, GmailAccount } from './supabase.js';
import { decrypt, safeDecrypt } from '../lib/crypto.js';
import { createLogger } from '../lib/logger.js';

const logger = createLogger('gmail-service');

interface SendEmailOptions {
    from: string;
    to: string[];
    cc?: string[];
    bcc?: string[];
    subject: string;
    body: string;
    bodyHtml?: string;
    inReplyTo?: string;
    threadId?: string;
}

interface EmailUpdateOptions {
    is_read?: boolean;
    is_starred?: boolean;
    is_archived?: boolean;
    label_ids?: string[];
}

/**
 * Gmail Service for sending emails and syncing updates
 */
class GmailService {
    private oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
    );

    /**
     * Get authenticated Gmail client for an account
     */
    private async getGmailClient(accountId: string): Promise<gmail_v1.Gmail> {
        const { data: account, error } = await supabase
            .from('gmail_accounts')
            .select('*')
            .eq('id', accountId)
            .single();

        if (error || !account) {
            throw new Error(`Account not found: ${accountId}`);
        }

        // Decrypt tokens
        const accessToken = safeDecrypt(account.access_token);
        const refreshToken = safeDecrypt(account.refresh_token);

        if (!accessToken && !refreshToken) {
            throw new Error('No valid tokens for account');
        }

        // Check if token needs refresh
        const tokenExpiry = account.token_expiry ? new Date(account.token_expiry) : null;
        const needsRefresh = !tokenExpiry || tokenExpiry.getTime() - Date.now() < 5 * 60 * 1000;

        if (needsRefresh && refreshToken) {
            logger.debug({ accountId }, 'Refreshing access token');
            this.oauth2Client.setCredentials({ refresh_token: refreshToken });
            const { credentials } = await this.oauth2Client.refreshAccessToken();

            // Update tokens in database (encrypted)
            const { encrypt } = await import('../lib/crypto.js');
            await supabase
                .from('gmail_accounts')
                .update({
                    access_token: encrypt(credentials.access_token!),
                    token_expiry: credentials.expiry_date
                        ? new Date(credentials.expiry_date).toISOString()
                        : null,
                })
                .eq('id', accountId);

            this.oauth2Client.setCredentials(credentials);
        } else {
            this.oauth2Client.setCredentials({ access_token: accessToken });
        }

        return google.gmail({ version: 'v1', auth: this.oauth2Client });
    }

    /**
     * Build RFC 2822 formatted email
     */
    private buildRawEmail(options: SendEmailOptions): string {
        const boundary = `boundary_${Date.now()}`;
        const lines: string[] = [];

        // Headers
        lines.push(`From: ${options.from}`);
        lines.push(`To: ${options.to.join(', ')}`);

        if (options.cc?.length) {
            lines.push(`Cc: ${options.cc.join(', ')}`);
        }

        if (options.bcc?.length) {
            lines.push(`Bcc: ${options.bcc.join(', ')}`);
        }

        lines.push(`Subject: ${options.subject}`);

        if (options.inReplyTo) {
            lines.push(`In-Reply-To: ${options.inReplyTo}`);
            lines.push(`References: ${options.inReplyTo}`);
        }

        lines.push('MIME-Version: 1.0');

        if (options.bodyHtml) {
            // Multipart email (text + HTML)
            lines.push(`Content-Type: multipart/alternative; boundary="${boundary}"`);
            lines.push('');

            // Plain text part
            lines.push(`--${boundary}`);
            lines.push('Content-Type: text/plain; charset=UTF-8');
            lines.push('Content-Transfer-Encoding: base64');
            lines.push('');
            lines.push(Buffer.from(options.body).toString('base64'));

            // HTML part
            lines.push(`--${boundary}`);
            lines.push('Content-Type: text/html; charset=UTF-8');
            lines.push('Content-Transfer-Encoding: base64');
            lines.push('');
            lines.push(Buffer.from(options.bodyHtml).toString('base64'));

            lines.push(`--${boundary}--`);
        } else {
            // Plain text only
            lines.push('Content-Type: text/plain; charset=UTF-8');
            lines.push('Content-Transfer-Encoding: base64');
            lines.push('');
            lines.push(Buffer.from(options.body).toString('base64'));
        }

        return lines.join('\r\n');
    }

    /**
     * Send an email via Gmail API
     */
    async sendEmail(
        accountId: string,
        options: SendEmailOptions
    ): Promise<{ id: string; threadId: string }> {
        const gmail = await this.getGmailClient(accountId);

        const rawEmail = this.buildRawEmail(options);
        const encodedEmail = Buffer.from(rawEmail)
            .toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');

        const response = await gmail.users.messages.send({
            userId: 'me',
            requestBody: {
                raw: encodedEmail,
                threadId: options.threadId,
            },
        });

        logger.info(
            { accountId, messageId: response.data.id, to: options.to },
            'Email sent via Gmail'
        );

        return {
            id: response.data.id!,
            threadId: response.data.threadId!,
        };
    }

    /**
     * Sync email update to Gmail (labels, read status, etc.)
     */
    async syncEmailUpdate(
        accountId: string,
        gmailMessageId: string,
        updates: EmailUpdateOptions
    ): Promise<void> {
        const gmail = await this.getGmailClient(accountId);

        const addLabelIds: string[] = [];
        const removeLabelIds: string[] = [];

        // Handle read/unread
        if (updates.is_read === true) {
            removeLabelIds.push('UNREAD');
        } else if (updates.is_read === false) {
            addLabelIds.push('UNREAD');
        }

        // Handle starred
        if (updates.is_starred === true) {
            addLabelIds.push('STARRED');
        } else if (updates.is_starred === false) {
            removeLabelIds.push('STARRED');
        }

        // Handle archive (remove from INBOX)
        if (updates.is_archived === true) {
            removeLabelIds.push('INBOX');
        } else if (updates.is_archived === false) {
            addLabelIds.push('INBOX');
        }

        // Only make API call if there are changes
        if (addLabelIds.length > 0 || removeLabelIds.length > 0) {
            await gmail.users.messages.modify({
                userId: 'me',
                id: gmailMessageId,
                requestBody: {
                    addLabelIds: addLabelIds.length > 0 ? addLabelIds : undefined,
                    removeLabelIds: removeLabelIds.length > 0 ? removeLabelIds : undefined,
                },
            });

            logger.debug(
                { accountId, gmailMessageId, addLabelIds, removeLabelIds },
                'Email labels updated in Gmail'
            );
        }
    }

    /**
     * Move email to trash in Gmail
     */
    async trashEmail(accountId: string, gmailMessageId: string): Promise<void> {
        const gmail = await this.getGmailClient(accountId);

        await gmail.users.messages.trash({
            userId: 'me',
            id: gmailMessageId,
        });

        logger.debug({ accountId, gmailMessageId }, 'Email trashed in Gmail');
    }

    /**
     * Permanently delete email from Gmail
     */
    async deleteEmail(accountId: string, gmailMessageId: string): Promise<void> {
        const gmail = await this.getGmailClient(accountId);

        await gmail.users.messages.delete({
            userId: 'me',
            id: gmailMessageId,
        });

        logger.debug({ accountId, gmailMessageId }, 'Email deleted from Gmail');
    }

    /**
     * Untrash an email (restore from trash)
     */
    async untrashEmail(accountId: string, gmailMessageId: string): Promise<void> {
        const gmail = await this.getGmailClient(accountId);

        await gmail.users.messages.untrash({
            userId: 'me',
            id: gmailMessageId,
        });

        logger.debug({ accountId, gmailMessageId }, 'Email untrashed in Gmail');
    }

    /**
     * Create a draft in Gmail
     */
    async createDraft(
        accountId: string,
        options: SendEmailOptions
    ): Promise<{ id: string; messageId: string }> {
        const gmail = await this.getGmailClient(accountId);

        const rawEmail = this.buildRawEmail(options);
        const encodedEmail = Buffer.from(rawEmail)
            .toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');

        const response = await gmail.users.drafts.create({
            userId: 'me',
            requestBody: {
                message: {
                    raw: encodedEmail,
                    threadId: options.threadId,
                },
            },
        });

        logger.debug(
            { accountId, draftId: response.data.id },
            'Draft created in Gmail'
        );

        return {
            id: response.data.id!,
            messageId: response.data.message?.id!,
        };
    }

    /**
     * Send a draft from Gmail
     */
    async sendDraft(accountId: string, draftId: string): Promise<{ id: string; threadId: string }> {
        const gmail = await this.getGmailClient(accountId);

        const response = await gmail.users.drafts.send({
            userId: 'me',
            requestBody: {
                id: draftId,
            },
        });

        logger.info(
            { accountId, draftId, messageId: response.data.id },
            'Draft sent via Gmail'
        );

        return {
            id: response.data.id!,
            threadId: response.data.threadId!,
        };
    }

    /**
     * Delete a draft from Gmail
     */
    async deleteDraft(accountId: string, draftId: string): Promise<void> {
        const gmail = await this.getGmailClient(accountId);

        await gmail.users.drafts.delete({
            userId: 'me',
            id: draftId,
        });

        logger.debug({ accountId, draftId }, 'Draft deleted from Gmail');
    }
}

// Export singleton instance
export const gmailService = new GmailService();
