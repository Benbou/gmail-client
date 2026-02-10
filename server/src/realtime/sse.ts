import type { Request, Response } from 'express';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { Router } from 'express';

export const sseRouter = Router();

interface SSEClient {
  userId: string;
  res: Response;
}

class SSEManager {
  private clients: SSEClient[] = [];

  addClient(userId: string, res: Response): void {
    this.clients.push({ userId, res });
  }

  removeClient(res: Response): void {
    this.clients = this.clients.filter((c) => c.res !== res);
  }

  sendToUser(userId: string, data: unknown): void {
    const payload = `data: ${JSON.stringify(data)}\n\n`;
    for (const client of this.clients) {
      if (client.userId === userId) {
        client.res.write(payload);
      }
    }
  }

  broadcast(data: unknown): void {
    const payload = `data: ${JSON.stringify(data)}\n\n`;
    for (const client of this.clients) {
      client.res.write(payload);
    }
  }

  get connectionCount(): number {
    return this.clients.length;
  }
}

export const sseManager = new SSEManager();

/**
 * GET /api/events
 * Server-Sent Events endpoint for real-time updates.
 */
sseRouter.get('/', requireAuth, (req: AuthenticatedRequest, res) => {
  const userId = req.userId!;

  // SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no', // Disable nginx buffering
  });

  // Send initial connection event
  res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);

  // Heartbeat every 30s to keep connection alive
  const heartbeat = setInterval(() => {
    res.write(': heartbeat\n\n');
  }, 30_000);

  sseManager.addClient(userId, res);

  // Cleanup on disconnect
  req.on('close', () => {
    clearInterval(heartbeat);
    sseManager.removeClient(res);
  });
});
