import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { supabase } from '../_lib/supabase';
import { authenticate } from '../_lib/auth';
import { ApiError, sendError } from '../_lib/errors';
import { accountUpdateSchema, AccountUpdateBody } from '../_lib/validations';

/**
 * GET/PATCH/DELETE /api/accounts/[id]
 * Account operations
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
      throw ApiError.badRequest('Invalid account ID');
    }

    const accountId = validation.data;

    if (req.method === 'GET') {
      // Get single account details
      const { data: account, error } = await supabase
        .from('gmail_accounts')
        .select('id, email, is_active, sync_enabled, last_sync_at, scopes, created_at')
        .eq('id', accountId)
        .eq('user_id', userId)
        .single();

      if (error || !account) {
        throw ApiError.notFound('Gmail account');
      }

      res.status(200).json({ account });
    } else if (req.method === 'PATCH') {
      // Update account settings
      const validation = accountUpdateSchema.safeParse(req.body);
      if (!validation.success) {
        throw ApiError.badRequest('Validation failed', validation.error.errors);
      }

      const updates = validation.data as AccountUpdateBody;

      // Verify ownership
      const { data: existing } = await supabase
        .from('gmail_accounts')
        .select('id, user_id')
        .eq('id', accountId)
        .single();

      if (!existing) {
        throw ApiError.notFound('Gmail account');
      }

      if (existing.user_id !== userId) {
        throw ApiError.forbidden('You do not have access to this account');
      }

      // Build update data
      const updateData: Record<string, unknown> = {};
      if (typeof updates.sync_enabled === 'boolean') updateData.sync_enabled = updates.sync_enabled;
      if (typeof updates.is_active === 'boolean') updateData.is_active = updates.is_active;

      const { data: account, error } = await supabase
        .from('gmail_accounts')
        .update(updateData)
        .eq('id', accountId)
        .select('id, email, is_active, sync_enabled, last_sync_at, created_at')
        .single();

      if (error) {
        throw ApiError.internal('Failed to update account');
      }

      res.status(200).json({ account });
    } else if (req.method === 'DELETE') {
      // Delete account
      const { data: account } = await supabase
        .from('gmail_accounts')
        .select('id, user_id, email')
        .eq('id', accountId)
        .single();

      if (!account) {
        throw ApiError.notFound('Gmail account');
      }

      if (account.user_id !== userId) {
        throw ApiError.forbidden('You do not have access to this account');
      }

      // Delete the account (cascade will delete related emails, etc.)
      const { error } = await supabase.from('gmail_accounts').delete().eq('id', accountId);

      if (error) {
        throw ApiError.internal('Failed to delete account');
      }

      res.status(200).json({ success: true, message: 'Account removed successfully' });
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    sendError(res, error as Error);
  }
}
