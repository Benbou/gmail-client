import type { VercelRequest, VercelResponse } from '@vercel/node';
import { randomBytes } from 'crypto';
import { authenticate } from '../../_lib/auth';
import { getAuthUrl } from '../../_lib/gmail-oauth';
import { setOAuthState } from '../../_lib/redis';
import { ApiError, sendError } from '../../_lib/errors';

/**
 * GET /api/auth/google/start
 * Initiate Gmail OAuth flow
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

    // Generate random state token
    const state = randomBytes(32).toString('hex');

    // Store state with user ID
    await setOAuthState(state, {
      userId,
      createdAt: Date.now(),
    });

    // Generate OAuth URL
    const authUrl = getAuthUrl(state);

    res.status(200).json({ authUrl });
  } catch (error) {
    sendError(res, error as Error);
  }
}
