import { Router, Request, Response } from 'express';
import { supabase } from '../services/supabase.js';
import { getAuthUrl, getTokensFromCode, getUserEmail } from '../services/gmail-oauth.js';
import { randomBytes } from 'crypto';

const router = Router();

// Temporary state storage (use Redis in production)
const pendingStates = new Map<string, { userId: string; createdAt: number }>();

// Clean up expired states every minute
setInterval(() => {
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    for (const [state, data] of pendingStates.entries()) {
        if (data.createdAt < fiveMinutesAgo) {
            pendingStates.delete(state);
        }
    }
}, 60000);

/**
 * POST /api/auth/signup
 * Create a new user account
 */
router.post('/signup', async (req: Request, res: Response) => {
    try {
        const { email, name } = req.body;

        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        // Check if user already exists
        const { data: existingUser } = await supabase
            .from('users')
            .select('id')
            .eq('email', email)
            .single();

        if (existingUser) {
            return res.status(409).json({ error: 'User already exists' });
        }

        // Create new user
        const { data: user, error } = await supabase
            .from('users')
            .insert({ email, name })
            .select()
            .single();

        if (error) {
            console.error('Error creating user:', error);
            return res.status(500).json({ error: 'Failed to create user' });
        }

        res.json({ user });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /api/auth/google/start
 * Initiate Gmail OAuth flow
 */
router.get('/google/start', async (req: Request, res: Response) => {
    try {
        // In production, get userId from session/JWT
        const userId = req.query.userId as string;

        if (!userId) {
            return res.status(400).json({ error: 'userId is required' });
        }

        // Generate random state token
        const state = randomBytes(32).toString('hex');

        // Store state with user ID (expires in 5 minutes)
        pendingStates.set(state, {
            userId,
            createdAt: Date.now(),
        });

        // Generate OAuth URL
        const authUrl = getAuthUrl(state);

        res.json({ authUrl });
    } catch (error) {
        console.error('OAuth start error:', error);
        res.status(500).json({ error: 'Failed to generate auth URL' });
    }
});

/**
 * GET /api/auth/google/callback
 * Handle Gmail OAuth callback
 */
router.get('/google/callback', async (req: Request, res: Response) => {
    try {
        const { code, state } = req.query;

        if (!code || !state) {
            return res.status(400).send('Missing code or state parameter');
        }

        // Verify state token
        const stateData = pendingStates.get(state as string);
        if (!stateData) {
            return res.status(400).send('Invalid or expired state token');
        }

        // Remove used state
        pendingStates.delete(state as string);

        // Exchange code for tokens
        const tokens = await getTokensFromCode(code as string);

        if (!tokens.access_token || !tokens.refresh_token) {
            return res.status(500).send('Failed to obtain tokens');
        }

        // Get user's Gmail address
        const gmailEmail = await getUserEmail(tokens.access_token);

        // Store Gmail account in database
        const { data: account, error } = await supabase
            .from('gmail_accounts')
            .insert({
                user_id: stateData.userId,
                email: gmailEmail,
                access_token: tokens.access_token, // TODO: Encrypt in production
                refresh_token: tokens.refresh_token, // TODO: Encrypt in production
                token_expiry: tokens.expiry_date
                    ? new Date(tokens.expiry_date).toISOString()
                    : null,
                scopes: tokens.scope?.split(' ') || [],
            })
            .select()
            .single();

        if (error) {
            console.error('Error storing Gmail account:', error);
            return res.status(500).send('Failed to store account');
        }

        // Redirect to frontend success page
        res.redirect(`http://localhost:5173/oauth/success?accountId=${account.id}`);
    } catch (error) {
        console.error('OAuth callback error:', error);
        res.status(500).send('OAuth failed');
    }
});

/**
 * DELETE /api/auth/google/:accountId
 * Remove a Gmail account
 */
router.delete('/google/:accountId', async (req: Request, res: Response) => {
    try {
        const { accountId } = req.params;
        // TODO: Verify userId from JWT matches account owner

        const { error } = await supabase
            .from('gmail_accounts')
            .delete()
            .eq('id', accountId);

        if (error) {
            console.error('Error deleting account:', error);
            return res.status(500).json({ error: 'Failed to delete account' });
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Delete account error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
