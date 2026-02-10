import { supabase } from '../lib/supabase.js';
import * as ee from '../lib/emailengine.js';

const INTERVAL_MS = 60_000; // 60 seconds

/**
 * Process pending snooze actions that are due.
 */
async function processPendingSnoozes(): Promise<void> {
  try {
    const { data: actions, error } = await supabase
      .from('scheduled_actions')
      .select('id, email_id, ee_account_id, gmail_account_id, payload')
      .eq('action_type', 'snooze')
      .eq('status', 'pending')
      .lte('scheduled_at', new Date().toISOString())
      .limit(50);

    if (error) {
      console.error('[SnoozeWorker] Failed to fetch pending actions:', error.message);
      return;
    }

    if (!actions?.length) return;

    console.log(`[SnoozeWorker] Processing ${actions.length} pending snooze(s)`);

    for (const action of actions) {
      try {
        const eeAccountId = action.ee_account_id;
        const messageId = action.email_id || action.payload?.message_id;

        if (!eeAccountId || !messageId) {
          throw new Error('Missing eeAccountId or messageId');
        }

        // Move message back to INBOX
        await ee.moveMessage(eeAccountId, messageId, 'INBOX');

        // Mark action as completed
        await supabase
          .from('scheduled_actions')
          .update({ status: 'completed', executed_at: new Date().toISOString() })
          .eq('id', action.id);
      } catch (err) {
        console.error(`[SnoozeWorker] Failed to process action ${action.id}:`, (err as Error).message);

        // Mark as failed
        await supabase
          .from('scheduled_actions')
          .update({
            status: 'failed',
            error_message: (err as Error).message,
            executed_at: new Date().toISOString(),
          })
          .eq('id', action.id);
      }
    }
  } catch (err) {
    console.error('[SnoozeWorker] Unexpected error:', (err as Error).message);
  }
}

let intervalId: ReturnType<typeof setInterval> | null = null;

export function startSnoozeWorker(): void {
  console.log('[SnoozeWorker] Started (interval: 60s)');
  // Run immediately on startup
  processPendingSnoozes();
  intervalId = setInterval(processPendingSnoozes, INTERVAL_MS);
}

export function stopSnoozeWorker(): void {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log('[SnoozeWorker] Stopped');
  }
}
