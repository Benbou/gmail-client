import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyCronSecret } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { gmailService } from '../services/gmail-service';

/**
 * Worker endpoint: Scheduled actions
 * Called by Cloudflare Worker every minute
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify cron secret
  if (!verifyCronSecret(req)) {
    return res.status(401).json({ error: 'Unauthorized cron request' });
  }

  try {
    const now = new Date().toISOString();

    // Get pending actions that are due
    const { data: actions, error } = await supabase
      .from('scheduled_actions')
      .select(`
        *,
        emails (*),
        drafts (*)
      `)
      .eq('status', 'pending')
      .lte('scheduled_at', now);

    if (error) {
      console.error('Error fetching scheduled actions:', error);
      return res.status(500).json({ error: 'Failed to fetch scheduled actions' });
    }

    if (!actions || actions.length === 0) {
      return res.json({ success: true, processed: 0, message: 'No actions due' });
    }

    console.log(`Processing ${actions.length} scheduled actions`);

    let completed = 0;
    let failed = 0;

    for (const action of actions) {
      try {
        if (action.action_type === 'snooze') {
          // Un-archive the email (bring back to inbox)
          await supabase
            .from('emails')
            .update({ is_archived: false })
            .eq('id', action.email_id);

          console.log(`Email ${action.email_id} unsnoozed`);
        } else if (action.action_type === 'send_later') {
          // Send the scheduled email
          const draft = Array.isArray(action.drafts) ? action.drafts[0] : action.drafts;

          if (draft && action.gmail_account_id) {
            const { data: account } = await supabase
              .from('gmail_accounts')
              .select('email')
              .eq('id', action.gmail_account_id)
              .single();

            if (account) {
              await gmailService.sendEmail(action.gmail_account_id, {
                from: account.email,
                to: draft.to_emails || [],
                cc: draft.cc_emails,
                bcc: draft.bcc_emails,
                subject: draft.subject || '',
                body: draft.body_text || '',
                bodyHtml: draft.body_html,
              });

              // Delete the draft after sending
              await supabase.from('drafts').delete().eq('id', draft.id);

              console.log(`Scheduled email sent for action ${action.id}`);
            }
          }
        }

        // Mark action as completed
        await supabase
          .from('scheduled_actions')
          .update({
            status: 'completed',
            executed_at: new Date().toISOString(),
          })
          .eq('id', action.id);

        completed++;
      } catch (err) {
        console.error(`Failed to execute action ${action.id}:`, err);
        failed++;

        // Mark action as failed
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

    console.log('Scheduled actions processed');

    return res.json({
      success: true,
      processed: actions.length,
      completed,
      failed,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Scheduled actions worker error:', error);
    return res.status(500).json({ error: 'Scheduled actions processing failed' });
  }
}
