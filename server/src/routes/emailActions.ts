import { Router } from 'express';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { supabase } from '../lib/supabase.js';
import * as ee from '../lib/emailengine.js';
import { ApiError } from '../middleware/errorHandler.js';

export const emailActionsRouter = Router();

/**
 * Resolve the EE account ID from a gmail_account_id, verifying ownership.
 */
async function resolveEEAccount(
  userId: string,
  gmailAccountId: string,
): Promise<{ eeAccountId: string; gmailAccountId: string }> {
  const { data, error } = await supabase
    .from('gmail_accounts')
    .select('id, emailengine_account_id')
    .eq('id', gmailAccountId)
    .eq('user_id', userId)
    .eq('is_active', true)
    .single();

  if (error || !data?.emailengine_account_id) {
    throw ApiError.notFound('Account not found');
  }

  return { eeAccountId: data.emailengine_account_id, gmailAccountId: data.id };
}

/**
 * POST /api/emails/:id/archive
 */
emailActionsRouter.post('/:id/archive', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { account_id } = req.body;
    if (!account_id) throw ApiError.badRequest('account_id is required');
    const messageId = req.params.id as string;

    const { eeAccountId } = await resolveEEAccount(req.userId!, account_id);
    await ee.moveMessage(eeAccountId, messageId, '[Gmail]/All Mail');

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/emails/:id/star
 */
emailActionsRouter.post('/:id/star', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { account_id, starred } = req.body;
    if (!account_id) throw ApiError.badRequest('account_id is required');
    const messageId = req.params.id as string;

    const { eeAccountId } = await resolveEEAccount(req.userId!, account_id);

    if (starred) {
      await ee.updateFlags(eeAccountId, messageId, { add: ['\\Flagged'] });
    } else {
      await ee.updateFlags(eeAccountId, messageId, { delete: ['\\Flagged'] });
    }

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/emails/:id/read
 */
emailActionsRouter.post('/:id/read', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { account_id, is_read } = req.body;
    if (!account_id) throw ApiError.badRequest('account_id is required');
    const messageId = req.params.id as string;

    const { eeAccountId } = await resolveEEAccount(req.userId!, account_id);

    if (is_read) {
      await ee.updateFlags(eeAccountId, messageId, { add: ['\\Seen'] });
    } else {
      await ee.updateFlags(eeAccountId, messageId, { delete: ['\\Seen'] });
    }

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/emails/:id/trash
 */
emailActionsRouter.post('/:id/trash', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { account_id } = req.body;
    if (!account_id) throw ApiError.badRequest('account_id is required');
    const messageId = req.params.id as string;

    const { eeAccountId } = await resolveEEAccount(req.userId!, account_id);
    await ee.deleteMessage(eeAccountId, messageId);

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/emails/:id/snooze
 * Archives the email + creates a scheduled_action to un-snooze later.
 */
emailActionsRouter.post('/:id/snooze', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { account_id, until } = req.body;
    if (!account_id || !until) throw ApiError.badRequest('account_id and until are required');
    const messageId = req.params.id as string;

    const { eeAccountId, gmailAccountId } = await resolveEEAccount(req.userId!, account_id);

    // Archive the email
    await ee.moveMessage(eeAccountId, messageId, '[Gmail]/All Mail');

    // Create scheduled action to move back to inbox
    const { error } = await supabase
      .from('scheduled_actions')
      .insert({
        user_id: req.userId,
        gmail_account_id: gmailAccountId,
        email_id: messageId,
        ee_account_id: eeAccountId,
        action_type: 'snooze',
        scheduled_at: until,
        status: 'pending',
        payload: { message_id: messageId },
      });

    if (error) throw error;

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});
