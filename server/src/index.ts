import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from './config.js';
import { errorHandler } from './middleware/errorHandler.js';
import { authRouter } from './routes/auth.js';
import { accountsRouter } from './routes/accounts.js';
import { emailsRouter } from './routes/emails.js';
import { emailActionsRouter } from './routes/emailActions.js';
import { labelsRouter } from './routes/labels.js';
import { searchRouter } from './routes/search.js';
import { webhooksRouter } from './routes/webhooks.js';
import { sseRouter } from './realtime/sse.js';
import { startSnoozeWorker, stopSnoozeWorker } from './services/snoozeWorker.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

// ── Middleware ──────────────────────────────────────────
app.use(cors({
  origin: config.frontendUrl,
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

// ── API Routes ─────────────────────────────────────────
app.use('/api/auth', authRouter);
app.use('/api/accounts', accountsRouter);
app.use('/api/emails', emailActionsRouter); // Must be before emailsRouter for /:id/* routes
app.use('/api/emails', emailsRouter);
app.use('/api/labels', labelsRouter);
app.use('/api/search', searchRouter);
app.use('/api/webhooks', webhooksRouter);
app.use('/api/events', sseRouter);

// ── Health check ───────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Static frontend (production) ───────────────────────
const frontendDist = path.resolve(__dirname, '../public');
app.use(express.static(frontendDist));

// SPA fallback: serve index.html for all non-API routes
app.get('{*path}', (req, res, next) => {
  if (req.path.startsWith('/api/')) {
    next();
    return;
  }
  res.sendFile(path.join(frontendDist, 'index.html'));
});

// ── Error handler (must be last) ───────────────────────
app.use(errorHandler);

// ── Start server ───────────────────────────────────────
const server = app.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`);
  startSnoozeWorker();
});

// Graceful shutdown
function shutdown() {
  console.log('Shutting down...');
  stopSnoozeWorker();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
  // Force close after 10s
  setTimeout(() => process.exit(1), 10_000);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

export default app;
