import { Router } from 'express';
import { supabase } from '../lib/supabase.js';
import { sseManager } from '../realtime/sse.js';

export const webhooksRouter = Router();

interface EEWebhookPayload {
  account: string;       // EE account ID
  event: string;         // messageNew, messageDeleted, messageUpdated, accountInitialized, etc.
  data?: {
    id?: string;         // message ID
    path?: string;       // mailbox path
    email?: string;      // account email (for accountInitialized)
    [key: string]: any;
  };
}

/**
 * POST /api/webhooks/emailengine
 * Receives events from EmailEngine.
 * No auth middleware — EE uses a shared webhook secret or IP whitelist.
 */
webhooksRouter.post('/emailengine', async (req, res, next) => {
  try {
    const payload = req.body as EEWebhookPayload;
    const { account: eeAccountId, event, data } = payload;

    console.log(`[Webhook] ${event} for account ${eeAccountId}`);

    // Handle account initialization (OAuth complete)
    if (event === 'accountInitialized' || event === 'authenticationSuccess') {
      const email = data?.email || data?.name;

      if (email) {
        // Update the gmail_accounts record with the real email and mark active
        await supabase
          .from('gmail_accounts')
          .update({ email, is_active: true })
          .eq('emailengine_account_id', eeAccountId);
      } else {
        // Just mark active
        await supabase
          .from('gmail_accounts')
          .update({ is_active: true })
          .eq('emailengine_account_id', eeAccountId);
      }
    }

    // For email events, find which user owns this account and push SSE
    if (['messageNew', 'messageDeleted', 'messageUpdated'].includes(event)) {
      const { data: account } = await supabase
        .from('gmail_accounts')
        .select('user_id')
        .eq('emailengine_account_id', eeAccountId)
        .single();

      if (account?.user_id) {
        sseManager.sendToUser(account.user_id, {
          type: event,
          accountId: eeAccountId,
          messageId: data?.id,
          path: data?.path,
        });
      }
    }

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
