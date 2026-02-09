import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { supabase } from '../_lib/supabase';
import { authenticate } from '../_lib/auth';
import { ApiError, sendError } from '../_lib/errors';
import { emailUpdateSchema, EmailUpdateBody } from '../_lib/validations';
import { gmailService } from '../_services/gmail-service';

/**
 * GET/PATCH/DELETE /api/emails/[id]
 * Email operations
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
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

    if (req.method === 'GET') {
      // Get single email details
      const { data: email, error } = await supabase
        .from('emails')
        .select('*, gmail_accounts!inner(user_id, email)')
        .eq('id', emailId)
        .single();

      if (error || !email) {
        throw ApiError.notFound('Email');
      }

      // Verify ownership
      if (email.gmail_accounts.user_id !== userId) {
        throw ApiError.forbidden('You do not have access to this email');
      }

      res.status(200).json({ email });
    } else if (req.method === 'PATCH') {
      // Update email (mark read, star, etc.)
      const validation = emailUpdateSchema.safeParse(req.body);
      if (!validation.success) {
        throw ApiError.badRequest('Validation failed', validation.error.errors);
      }

      const updates = validation.data as EmailUpdateBody;

      // Get email with account info
      const { data: email, error: fetchError } = await supabase
        .from('emails')
        .select('*, gmail_accounts!inner(id, user_id, access_token, refresh_token)')
        .eq('id', emailId)
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
        .eq('id', emailId)
        .select()
        .single();

      if (updateError) {
        throw ApiError.internal('Failed to update email');
      }

      // Sync changes to Gmail in background
      gmailService
        .syncEmailUpdate(email.gmail_accounts.id, email.gmail_message_id, updates)
        .catch((err) => console.error('Failed to sync update to Gmail:', err));

      res.status(200).json({ email: updatedEmail });
    } else if (req.method === 'DELETE') {
      // Delete email
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

      // Delete from database
      const { error } = await supabase.from('emails').delete().eq('id', emailId);

      if (error) {
        throw ApiError.internal('Failed to delete email');
      }

      // Move to trash in Gmail
      gmailService
        .trashEmail(email.gmail_accounts.id, email.gmail_message_id)
        .catch((err) => console.error('Failed to trash email in Gmail:', err));

      res.status(200).json({ success: true });
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    sendError(res, error as Error);
  }
}
