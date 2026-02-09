import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../_lib/supabase';
import { authenticate } from '../_lib/auth';
import { ApiError, sendError } from '../_lib/errors';
import { emailListQuerySchema, EmailListQuery } from '../_lib/validations';

/**
 * GET /api/emails
 * List emails with filtering and pagination
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

    // Validate query parameters
    const validation = emailListQuerySchema.safeParse(req.query);
    if (!validation.success) {
      throw ApiError.badRequest('Validation failed', validation.error.errors);
    }

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
    } = validation.data as EmailListQuery;

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
      throw ApiError.internal('Failed to fetch emails');
    }

    res.status(200).json({
      emails,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    sendError(res, error as Error);
  }
}
