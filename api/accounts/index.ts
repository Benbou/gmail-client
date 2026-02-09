import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../lib/supabase';
import { authenticate } from '../lib/auth';
import { ApiError, sendError } from '../lib/errors';

/**
 * GET/POST /api/accounts
 * List user's Gmail accounts
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Authenticate user
    const authResult = await authenticate(req);
    if (authResult.error || !authResult.userId) {
      throw ApiError.unauthorized(authResult.error || 'Unauthorized');
    }

    const userId = authResult.userId;

    if (req.method === 'GET') {
      const { data: accounts, error } = await supabase
        .from('gmail_accounts')
        .select('id, email, is_active, sync_enabled, last_sync_at, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        throw ApiError.internal('Failed to fetch accounts');
      }

      res.status(200).json({ accounts });
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    sendError(res, error as Error);
  }
}
