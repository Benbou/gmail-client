import type { VercelRequest } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

/**
 * Extract token from Authorization header
 */
function extractToken(req: VercelRequest): string | null {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return null;
  }

  // Support both "Bearer <token>" and just "<token>"
  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  return typeof authHeader === 'string' ? authHeader : null;
}

export interface AuthResult {
  userId?: string;
  userEmail?: string;
  error?: string;
}

/**
 * Authenticate Vercel API request using Supabase JWT
 */
export async function authenticate(req: VercelRequest): Promise<AuthResult> {
  try {
    const token = extractToken(req);

    if (!token) {
      return { error: 'No authorization token provided' };
    }

    // Verify Supabase JWT token
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return { error: 'Invalid or expired token' };
    }

    return {
      userId: user.id,
      userEmail: user.email,
    };
  } catch (error) {
    return { error: 'Authentication failed' };
  }
}

/**
 * Verify cron secret for worker endpoints
 */
export function verifyCronSecret(req: VercelRequest): boolean {
  const authHeader = req.headers.authorization;
  const expectedSecret = `Bearer ${process.env.CRON_SECRET}`;

  return authHeader === expectedSecret;
}
