import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { supabase } from '../../_lib/supabase';
import { authenticate } from '../../_lib/auth';
import { ApiError, sendError } from '../../_lib/errors';
import { emailSnoozeSchema, EmailSnoozeBody } from '../../_lib/validations';

/**
 * POST /api/emails/[id]/snooze
 * Snooze an email until specified time
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
    const idValidation = uuidSchema.safeParse(id);
    if (!idValidation.success) {
      throw ApiError.badRequest('Invalid email ID');
    }

    const emailId = idValidation.data;

    // Validate body
    const bodyValidation = emailSnoozeSchema.safeParse(req.body);
    if (!bodyValidation.success) {
      throw ApiError.badRequest('Validation failed', bodyValidation.error.errors);
    }

    const { until } = bodyValidation.data as EmailSnoozeBody;

    // Verify email belongs to user
    const { data: email, error: fetchError } = await supabase
      .from('emails')
      .select('*, gmail_accounts!inner(user_id)')
      .eq('id', emailId)
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
    await supabase.from('emails').update({ is_archived: true }).eq('id', emailId);

    // Create scheduled action to unsnooze
    const { data: action, error } = await supabase
      .from('scheduled_actions')
      .insert({
        user_id: userId,
        email_id: emailId,
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

    res.status(200).json({ action, message: 'Email snoozed successfully' });
  } catch (error) {
    sendError(res, error as Error);
  }
}
