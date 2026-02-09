import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../_lib/supabase';
import { authenticate } from '../_lib/auth';
import { ApiError, sendError } from '../_lib/errors';
import { sendEmailSchema, SendEmailBody } from '../_lib/validations';
import { gmailService } from '../_services/gmail-service';

/**
 * POST /api/emails/send
 * Send a new email
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
    const validation = sendEmailSchema.safeParse(req.body);
    if (!validation.success) {
      throw ApiError.badRequest('Validation failed', validation.error.errors);
    }

    const emailData = validation.data as SendEmailBody;

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

    res.status(200).json({
      success: true,
      messageId: sentMessage.id,
      threadId: sentMessage.threadId,
    });
  } catch (error) {
    sendError(res, error as Error);
  }
}
