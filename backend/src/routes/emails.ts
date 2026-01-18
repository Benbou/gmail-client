import { Router, Response } from 'express';
import { supabase } from '../services/supabase.js';
import { gmailService } from '../services/gmail-service.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { ApiError, asyncHandler } from '../lib/errors.js';
import { createLogger } from '../lib/logger.js';
import {
    validate,
    emailListQuerySchema,
    emailUpdateSchema,
    emailSnoozeSchema,
    emailIdParamSchema,
    sendEmailSchema,
    scheduleSendSchema,
    EmailListQuery,
    EmailUpdateBody,
    EmailSnoozeBody,
    SendEmailBody,
    ScheduleSendBody,
} from '../lib/validations.js';

const logger = createLogger('emails');
const router = Router();

// All email routes require authentication
router.use(authenticate);

/**
 * GET /api/emails
 * List emails with filtering and pagination
 */
router.get(
    '/',
    validate({ query: emailListQuerySchema }),
    asyncHandler(async (req: AuthRequest, res: Response) => {
        const userId = req.userId!;
        const {
            account_id,
            page,
            limit,
            is_read,
            is_archived,
            label_id,
            search,
            sort,
            order,
        } = req.query as unknown as EmailListQuery;

        let query = supabase
            .from('emails')
            .select('*, gmail_accounts!inner(user_id, email as account_email)', {
                count: 'exact',
            });

        // Filter by user's accounts only
        query = query.eq('gmail_accounts.user_id', userId);

        // Filter by specific account
        if (account_id) {
            query = query.eq('gmail_account_id', account_id);
        }

        // Filter by read status
        if (is_read !== undefined) {
            query = query.eq('is_read', is_read);
        }

        // Filter by archived status
        query = query.eq('is_archived', is_archived);

        // Filter by label
        if (label_id) {
            query = query.contains('label_ids', [label_id]);
        }

        // Full-text search
        if (search) {
            query = query.or(
                `subject.ilike.%${search}%,from_email.ilike.%${search}%,snippet.ilike.%${search}%`
            );
        }

        // Sorting
        const sortOrder = order === 'asc' ? { ascending: true } : { ascending: false };
        query = query.order(sort, sortOrder);

        // Pagination
        const offset = (page - 1) * limit;
        query = query.range(offset, offset + limit - 1);

        const { data: emails, error, count } = await query;

        if (error) {
            logger.error({ error, userId }, 'Failed to fetch emails');
            throw ApiError.internal('Failed to fetch emails');
        }

        res.json({
            emails,
            pagination: {
                page,
                limit,
                total: count,
                totalPages: Math.ceil((count || 0) / limit),
            },
        });
    })
);

/**
 * GET /api/emails/:id
 * Get single email details
 */
router.get(
    '/:id',
    validate({ params: emailIdParamSchema }),
    asyncHandler(async (req: AuthRequest, res: Response) => {
        const { id } = req.params;
        const userId = req.userId!;

        const { data: email, error } = await supabase
            .from('emails')
            .select('*, gmail_accounts!inner(user_id, email)')
            .eq('id', id)
            .single();

        if (error || !email) {
            throw ApiError.notFound('Email');
        }

        // Verify ownership
        if (email.gmail_accounts.user_id !== userId) {
            throw ApiError.forbidden('You do not have access to this email');
        }

        res.json({ email });
    })
);

/**
 * PATCH /api/emails/:id
 * Update email (mark read, star, etc.) - syncs to Gmail
 */
router.patch(
    '/:id',
    validate({ params: emailIdParamSchema, body: emailUpdateSchema }),
    asyncHandler(async (req: AuthRequest, res: Response) => {
        const { id } = req.params;
        const userId = req.userId!;
        const updates = req.body as EmailUpdateBody;

        // Get email with account info
        const { data: email, error: fetchError } = await supabase
            .from('emails')
            .select('*, gmail_accounts!inner(id, user_id, access_token, refresh_token)')
            .eq('id', id)
            .single();

        if (fetchError || !email) {
            throw ApiError.notFound('Email');
        }

        if (email.gmail_accounts.user_id !== userId) {
            throw ApiError.forbidden('You do not have access to this email');
        }

        // Build update data
        const updateData: Record<string, unknown> = {};
        if (typeof updates.is_read === 'boolean') updateData.is_read = updates.is_read;
        if (typeof updates.is_starred === 'boolean') updateData.is_starred = updates.is_starred;
        if (typeof updates.is_archived === 'boolean') updateData.is_archived = updates.is_archived;
        if (updates.label_ids) updateData.label_ids = updates.label_ids;

        // Update in database
        const { data: updatedEmail, error: updateError } = await supabase
            .from('emails')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (updateError) {
            logger.error({ error: updateError, emailId: id }, 'Failed to update email');
            throw ApiError.internal('Failed to update email');
        }

        // Sync changes to Gmail in background
        gmailService
            .syncEmailUpdate(email.gmail_accounts.id, email.gmail_message_id, updates)
            .catch((err) => logger.error({ error: err, emailId: id }, 'Failed to sync update to Gmail'));

        logger.info({ userId, emailId: id, updates }, 'Email updated');

        res.json({ email: updatedEmail });
    })
);

/**
 * POST /api/emails/:id/archive
 * Archive an email - syncs to Gmail
 */
router.post(
    '/:id/archive',
    validate({ params: emailIdParamSchema }),
    asyncHandler(async (req: AuthRequest, res: Response) => {
        const { id } = req.params;
        const userId = req.userId!;

        // Get email with account info
        const { data: email, error: fetchError } = await supabase
            .from('emails')
            .select('*, gmail_accounts!inner(id, user_id)')
            .eq('id', id)
            .single();

        if (fetchError || !email) {
            throw ApiError.notFound('Email');
        }

        if (email.gmail_accounts.user_id !== userId) {
            throw ApiError.forbidden('You do not have access to this email');
        }

        // Update in database
        const { data: updatedEmail, error } = await supabase
            .from('emails')
            .update({ is_archived: true })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            throw ApiError.internal('Failed to archive email');
        }

        // Sync to Gmail (remove INBOX label)
        gmailService
            .syncEmailUpdate(email.gmail_accounts.id, email.gmail_message_id, { is_archived: true })
            .catch((err) => logger.error({ error: err, emailId: id }, 'Failed to sync archive to Gmail'));

        logger.info({ userId, emailId: id }, 'Email archived');

        res.json({ email: updatedEmail });
    })
);

/**
 * POST /api/emails/:id/snooze
 * Snooze an email until specified time
 */
router.post(
    '/:id/snooze',
    validate({ params: emailIdParamSchema, body: emailSnoozeSchema }),
    asyncHandler(async (req: AuthRequest, res: Response) => {
        const { id } = req.params;
        const userId = req.userId!;
        const { until } = req.body as EmailSnoozeBody;

        // Verify email belongs to user
        const { data: email, error: fetchError } = await supabase
            .from('emails')
            .select('*, gmail_accounts!inner(user_id)')
            .eq('id', id)
            .single();

        if (fetchError || !email) {
            throw ApiError.notFound('Email');
        }

        if (email.gmail_accounts.user_id !== userId) {
            throw ApiError.forbidden('You do not have access to this email');
        }

        // Validate snooze time is in the future
        const snoozeTime = new Date(until);
        if (snoozeTime <= new Date()) {
            throw ApiError.badRequest('Snooze time must be in the future');
        }

        // Archive the email
        await supabase
            .from('emails')
            .update({ is_archived: true })
            .eq('id', id);

        // Create scheduled action to unsnooze
        const { data: action, error } = await supabase
            .from('scheduled_actions')
            .insert({
                user_id: userId,
                email_id: id,
                gmail_account_id: email.gmail_account_id,
                action_type: 'snooze',
                scheduled_at: until,
                status: 'pending',
                payload: {
                    original_labels: email.label_ids || [],
                    was_read: email.is_read,
                },
            })
            .select()
            .single();

        if (error) {
            throw ApiError.internal('Failed to schedule snooze');
        }

        logger.info({ userId, emailId: id, until }, 'Email snoozed');

        res.json({ action, message: 'Email snoozed successfully' });
    })
);

/**
 * DELETE /api/emails/:id
 * Delete an email - syncs to Gmail
 */
router.delete(
    '/:id',
    validate({ params: emailIdParamSchema }),
    asyncHandler(async (req: AuthRequest, res: Response) => {
        const { id } = req.params;
        const userId = req.userId!;

        // Get email with account info
        const { data: email, error: fetchError } = await supabase
            .from('emails')
            .select('*, gmail_accounts!inner(id, user_id)')
            .eq('id', id)
            .single();

        if (fetchError || !email) {
            throw ApiError.notFound('Email');
        }

        if (email.gmail_accounts.user_id !== userId) {
            throw ApiError.forbidden('You do not have access to this email');
        }

        // Delete from database
        const { error } = await supabase.from('emails').delete().eq('id', id);

        if (error) {
            throw ApiError.internal('Failed to delete email');
        }

        // Move to trash in Gmail
        gmailService
            .trashEmail(email.gmail_accounts.id, email.gmail_message_id)
            .catch((err) => logger.error({ error: err, emailId: id }, 'Failed to trash email in Gmail'));

        logger.info({ userId, emailId: id }, 'Email deleted');

        res.json({ success: true });
    })
);

/**
 * POST /api/emails/send
 * Send a new email
 */
router.post(
    '/send',
    validate({ body: sendEmailSchema }),
    asyncHandler(async (req: AuthRequest, res: Response) => {
        const userId = req.userId!;
        const emailData = req.body as SendEmailBody;

        // Verify account belongs to user
        const { data: account, error: accountError } = await supabase
            .from('gmail_accounts')
            .select('id, user_id, email')
            .eq('id', emailData.accountId)
            .single();

        if (accountError || !account) {
            throw ApiError.notFound('Gmail account');
        }

        if (account.user_id !== userId) {
            throw ApiError.forbidden('You do not have access to this account');
        }

        // Send via Gmail API
        const sentMessage = await gmailService.sendEmail(emailData.accountId, {
            from: account.email,
            to: emailData.to,
            cc: emailData.cc,
            bcc: emailData.bcc,
            subject: emailData.subject,
            body: emailData.body,
            bodyHtml: emailData.bodyHtml,
            inReplyTo: emailData.inReplyTo,
            threadId: emailData.threadId,
        });

        logger.info(
            { userId, accountId: emailData.accountId, to: emailData.to },
            'Email sent'
        );

        res.json({
            success: true,
            messageId: sentMessage.id,
            threadId: sentMessage.threadId,
        });
    })
);

/**
 * POST /api/emails/schedule
 * Schedule an email to be sent later
 */
router.post(
    '/schedule',
    validate({ body: scheduleSendSchema }),
    asyncHandler(async (req: AuthRequest, res: Response) => {
        const userId = req.userId!;
        const { scheduledAt, ...emailData } = req.body as ScheduleSendBody;

        // Verify account belongs to user
        const { data: account, error: accountError } = await supabase
            .from('gmail_accounts')
            .select('id, user_id, email')
            .eq('id', emailData.accountId)
            .single();

        if (accountError || !account) {
            throw ApiError.notFound('Gmail account');
        }

        if (account.user_id !== userId) {
            throw ApiError.forbidden('You do not have access to this account');
        }

        // Validate scheduled time is in the future
        const sendTime = new Date(scheduledAt);
        if (sendTime <= new Date()) {
            throw ApiError.badRequest('Scheduled time must be in the future');
        }

        // Create draft first
        const { data: draft, error: draftError } = await supabase
            .from('drafts')
            .insert({
                user_id: userId,
                gmail_account_id: emailData.accountId,
                to_emails: emailData.to,
                cc_emails: emailData.cc,
                bcc_emails: emailData.bcc,
                subject: emailData.subject,
                body_text: emailData.body,
                body_html: emailData.bodyHtml,
                is_scheduled: true,
            })
            .select()
            .single();

        if (draftError) {
            throw ApiError.internal('Failed to create draft');
        }

        // Create scheduled action
        const { data: action, error: actionError } = await supabase
            .from('scheduled_actions')
            .insert({
                user_id: userId,
                gmail_account_id: emailData.accountId,
                action_type: 'send_later',
                scheduled_at: scheduledAt,
                status: 'pending',
                payload: {
                    draft_id: draft.id,
                    from: account.email,
                    to: emailData.to,
                    cc: emailData.cc,
                    bcc: emailData.bcc,
                    subject: emailData.subject,
                },
            })
            .select()
            .single();

        if (actionError) {
            // Clean up draft if action creation fails
            await supabase.from('drafts').delete().eq('id', draft.id);
            throw ApiError.internal('Failed to schedule email');
        }

        // Link draft to action
        await supabase
            .from('drafts')
            .update({ scheduled_action_id: action.id })
            .eq('id', draft.id);

        logger.info(
            { userId, accountId: emailData.accountId, scheduledAt },
            'Email scheduled'
        );

        res.json({
            success: true,
            action,
            draft,
        });
    })
);

export default router;
