import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { supabase } from '../../_lib/supabase';
import { authenticate } from '../../_lib/auth';
import { ApiError, sendError } from '../../_lib/errors';
import { gmailService } from '../../_services/gmail-service';

/**
 * POST /api/emails/[id]/archive
 * Archive an email - syncs to Gmail
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
    const { id } = req.query;

    // Validate UUID
    const uuidSchema = z.string().uuid();
    const validation = uuidSchema.safeParse(id);
    if (!validation.success) {
      throw ApiError.badRequest('Invalid email ID');
    }

    const emailId = validation.data;

    // Get email with account info
    const { data: email, error: fetchError } = await supabase
      .from('emails')
      .select('*, gmail_accounts!inner(id, user_id)')
      .eq('id', emailId)
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
      .eq('id', emailId)
      .select()
      .single();

    if (error) {
      throw ApiError.internal('Failed to archive email');
    }

    // Sync to Gmail (remove INBOX label)
    gmailService
      .syncEmailUpdate(email.gmail_accounts.id, email.gmail_message_id, { is_archived: true })
      .catch((err) => console.error('Failed to sync archive to Gmail:', err));

    res.status(200).json({ email: updatedEmail });
  } catch (error) {
    sendError(res, error as Error);
  }
}
