import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { supabase } from '../../lib/supabase';
import { authenticate } from '../../lib/auth';
import { ApiError, sendError } from '../../lib/errors';

/**
 * GET /api/accounts/[id]/stats
 * Get account statistics
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Check method
    if (req.method !== 'GET') {
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
      throw ApiError.badRequest('Invalid account ID');
    }

    const accountId = validation.data;

    // Verify ownership
    const { data: account } = await supabase
      .from('gmail_accounts')
      .select('id, user_id')
      .eq('id', accountId)
      .single();

    if (!account) {
      throw ApiError.notFound('Gmail account');
    }

    if (account.user_id !== userId) {
      throw ApiError.forbidden('You do not have access to this account');
    }

    // Get email counts
    const { count: totalEmails } = await supabase
      .from('emails')
      .select('*', { count: 'exact', head: true })
      .eq('gmail_account_id', accountId);

    const { count: unreadEmails } = await supabase
      .from('emails')
      .select('*', { count: 'exact', head: true })
      .eq('gmail_account_id', accountId)
      .eq('is_read', false)
      .eq('is_archived', false);

    const { count: starredEmails } = await supabase
      .from('emails')
      .select('*', { count: 'exact', head: true })
      .eq('gmail_account_id', accountId)
      .eq('is_starred', true);

    // Get last sync info
    const { data: lastSync } = await supabase
      .from('sync_logs')
      .select('*')
      .eq('gmail_account_id', accountId)
      .order('started_at', { ascending: false })
      .limit(1)
      .single();

    res.status(200).json({
      stats: {
        totalEmails: totalEmails || 0,
        unreadEmails: unreadEmails || 0,
        starredEmails: starredEmails || 0,
        lastSync: lastSync || null,
      },
    });
  } catch (error) {
    sendError(res, error as Error);
  }
}
