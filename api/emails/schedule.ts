import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../lib/supabase';
import { authenticate } from '../lib/auth';
import { ApiError, sendError } from '../lib/errors';
import { scheduleSendSchema, ScheduleSendBody } from '../lib/validations';

/**
 * POST /api/emails/schedule
 * Schedule an email to be sent later
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Check method
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // Authenticate user
    const authResult = await authenticate(req);
    if (authResult.error || !authResult.userId) {
      throw ApiError.unauthorized(authResult.error || 'Unauthorized');
    }

    const userId = authResult.userId;

    // Validate body
    const validation = scheduleSendSchema.safeParse(req.body);
    if (!validation.success) {
      throw ApiError.badRequest('Validation failed', validation.error.errors);
    }

    const { scheduledAt, ...emailData } = validation.data as ScheduleSendBody;

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

    res.status(200).json({
      success: true,
      action,
      draft,
    });
  } catch (error) {
    sendError(res, error as Error);
  }
}
