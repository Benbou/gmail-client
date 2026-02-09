/**
 * Cloudflare Worker for Gmail Client Cron Jobs
 *
 * This worker triggers scheduled tasks on the Vercel backend:
 * - Email sync every 2 minutes
 * - Token refresh every 5 minutes
 * - Scheduled actions every minute
 */

interface Env {
  API_URL: string;
  CRON_SECRET: string;
}

interface ScheduledEvent {
  scheduledTime: number;
  cron: string;
}

export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    const { cron, scheduledTime } = event;

    console.log(`Cron triggered: ${cron} at ${new Date(scheduledTime).toISOString()}`);

    try {
      // Determine which job to run based on cron expression
      let endpoint: string;
      let jobName: string;

      if (cron === '*/2 * * * *') {
        // Email sync every 2 minutes
        endpoint = '/api/workers/sync';
        jobName = 'Email Sync';
      } else if (cron === '*/5 * * * *') {
        // Token refresh every 5 minutes
        endpoint = '/api/workers/refresh-tokens';
        jobName = 'Token Refresh';
      } else if (cron === '* * * * *') {
        // Scheduled actions every minute
        endpoint = '/api/workers/scheduled-actions';
        jobName = 'Scheduled Actions';
      } else {
        console.error(`Unknown cron expression: ${cron}`);
        return;
      }

      console.log(`Executing ${jobName}...`);

      const response = await fetch(`${env.API_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.CRON_SECRET}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (response.ok) {
        console.log(`${jobName} completed successfully:`, result);
      } else {
        console.error(`${jobName} failed:`, result);
      }
    } catch (error) {
      console.error('Cron job error:', error);
    }
  },
};
