import { Router, Response } from 'express';
import { supabase } from '../services/supabase.js';
import { AuthRequest } from '../middleware/auth.js';

const router = Router();

/**
 * GET /api/emails
 * List emails with filtering and pagination
 */
router.get('/', async (req: AuthRequest, res: Response) => {
    try {
        const {
            account_id,
            page = '1',
            limit = '50',
            is_read,
            is_archived = 'false',
            label_id,
            search,
            sort = 'received_at',
            order = 'desc',
        } = req.query;

        const userId = req.query.userId as string; // TODO: Get from JWT

        if (!userId) {
            return res.status(400).json({ error: 'userId required' });
        }

        let query = supabase
            .from('emails')
            .select('*, gmail_accounts!inner(user_id, email as account_email)', {
                count: 'exact',
            });

        // Filter by user's accounts
        query = query.eq('gmail_accounts.user_id', userId);

        // Filter by specific account
        if (account_id) {
            query = query.eq('gmail_account_id', account_id);
        }

        // Filter by read status
        if (is_read !== undefined) {
            query = query.eq('is_read', is_read === 'true');
        }

        // Filter by archived status
        query = query.eq('is_archived', is_archived === 'true');

        // Filter by label
        if (label_id) {
            query = query.contains('label_ids', [label_id]);
        }

        // Full-text search
        if (search) {
            query = query.textSearch('subject', search);
        }

        // Sorting
        const sortOrder = order === 'asc' ? { ascending: true } : { ascending: false };
        query = query.order(sort as string, sortOrder);

        // Pagination
        const pageNum = parseInt(page as string);
        const limitNum = Math.min(parseInt(limit as string), 100);
        const offset = (pageNum - 1) * limitNum;

        query = query.range(offset, offset + limitNum - 1);

        const { data: emails, error, count } = await query;

        if (error) {
            console.error('Error fetching emails:', error);
            return res.status(500).json({ error: 'Failed to fetch emails' });
        }

        res.json({
            emails,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total: count,
                totalPages: Math.ceil((count || 0) / limitNum),
            },
        });
    } catch (error) {
        console.error('List emails error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /api/emails/:id
 * Get single email details
 */
router.get('/:id', async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;

        const { data: email, error } = await supabase
            .from('emails')
            .select('*, gmail_accounts(email)')
            .eq('id', id)
            .single();

        if (error) {
            console.error('Error fetching email:', error);
            return res.status(404).json({ error: 'Email not found' });
        }

        res.json({ email });
    } catch (error) {
        console.error('Get email error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * PATCH /api/emails/:id
 * Update email (mark read, star, etc.)
 */
router.patch('/:id', async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { is_read, is_starred, is_archived, label_ids } = req.body;

        const updateData: any = {};
        if (typeof is_read === 'boolean') updateData.is_read = is_read;
        if (typeof is_starred === 'boolean') updateData.is_starred = is_starred;
        if (typeof is_archived === 'boolean') updateData.is_archived = is_archived;
        if (label_ids) updateData.label_ids = label_ids;

        const { data: email, error } = await supabase
            .from('emails')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Error updating email:', error);
            return res.status(500).json({ error: 'Failed to update email' });
        }

        // TODO: Also update in Gmail via API

        res.json({ email });
    } catch (error) {
        console.error('Update email error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /api/emails/:id/archive
 * Archive an email
 */
router.post('/:id/archive', async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;

        const { data: email, error } = await supabase
            .from('emails')
            .update({ is_archived: true })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            return res.status(500).json({ error: 'Failed to archive email' });
        }

        res.json({ email });
    } catch (error) {
        console.error('Archive email error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /api/emails/:id/snooze
 * Snooze an email until specified time
 */
router.post('/:id/snooze', async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { until } = req.body;

        if (!until) {
            return res.status(400).json({ error: 'until timestamp required' });
        }

        const userId = req.query.userId as string; // TODO: Get from JWT

        // Archive the email
        await supabase
            .from('emails')
            .update({ is_archived: true })
            .eq('id', id);

        // Create scheduled action
        const { data: action, error } = await supabase
            .from('scheduled_actions')
            .insert({
                user_id: userId,
                email_id: id,
                action_type: 'snooze',
                scheduled_at: until,
                status: 'pending',
                payload: { original_labels: [] }, // Store original state
            })
            .select()
            .single();

        if (error) {
            return res.status(500).json({ error: 'Failed to schedule snooze' });
        }

        res.json({ action });
    } catch (error) {
        console.error('Snooze email error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * DELETE /api/emails/:id
 * Delete an email
 */
router.delete('/:id', async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;

        const { error } = await supabase.from('emails').delete().eq('id', id);

        if (error) {
            return res.status(500).json({ error: 'Failed to delete email' });
        }

        // TODO: Also delete from Gmail via API

        res.json({ success: true });
    } catch (error) {
        console.error('Delete email error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
