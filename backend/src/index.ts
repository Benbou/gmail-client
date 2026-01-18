import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

// Load environment variables first
dotenv.config();

// Import after dotenv
import authRoutes from './routes/auth.js';
import accountsRoutes from './routes/accounts.js';
import emailsRoutes from './routes/emails.js';
import syncRoutes from './routes/sync.js';
import { errorHandler, notFoundHandler } from './lib/errors.js';
import { requestLogger, logger } from './lib/logger.js';

const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// ============================================
// Security Middleware
// ============================================

// Helmet for security headers
app.use(helmet({
    contentSecurityPolicy: isProduction,
    crossOriginEmbedderPolicy: false,
}));

// CORS configuration with whitelist
const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    process.env.FRONTEND_URL,
].filter(Boolean) as string[];

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (!origin) {
            return callback(null, true);
        }

        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else if (!isProduction) {
            // In development, allow all origins but log warnings
            logger.warn({ origin }, 'CORS: Allowing unlisted origin in development');
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
    exposedHeaders: ['X-Request-ID', 'X-RateLimit-Limit', 'X-RateLimit-Remaining'],
    maxAge: 86400, // 24 hours
}));

// ============================================
// Rate Limiting
// ============================================

// General API rate limit
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // 1000 requests per window
    message: {
        error: 'Too many requests',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: 15 * 60,
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.path === '/health',
});

// Stricter limit for auth endpoints
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // 20 requests per window
    message: {
        error: 'Too many authentication attempts',
        code: 'AUTH_RATE_LIMIT_EXCEEDED',
        retryAfter: 15 * 60,
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Stricter limit for email sending
const sendLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 100, // 100 emails per hour
    message: {
        error: 'Email sending limit exceeded',
        code: 'EMAIL_RATE_LIMIT_EXCEEDED',
        retryAfter: 60 * 60,
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Apply general rate limiter to all routes
app.use(generalLimiter);

// ============================================
// Body Parsing & Logging
// ============================================

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use(requestLogger());

// ============================================
// Health Check (no rate limit)
// ============================================

app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
    });
});

// ============================================
// API Routes
// ============================================

app.get('/api', (req, res) => {
    res.json({
        message: 'Gmail Client API',
        version: '1.0.0',
        docs: '/api/docs',
    });
});

// Auth routes with stricter rate limiting
app.use('/api/auth', authLimiter, authRoutes);

// Protected routes
app.use('/api/accounts', accountsRoutes);
app.use('/api/emails', emailsRoutes);
app.use('/api/sync', syncRoutes);

// Email sending with additional rate limit
app.use('/api/emails/send', sendLimiter);
app.use('/api/emails/schedule', sendLimiter);

// ============================================
// Error Handling
// ============================================

// 404 handler for undefined routes
app.use(notFoundHandler);

// Global error handler (must be last)
app.use(errorHandler);

// ============================================
// Server Startup
// ============================================

const server = app.listen(PORT, () => {
    logger.info({
        port: PORT,
        environment: process.env.NODE_ENV || 'development',
        corsOrigins: allowedOrigins,
    }, 'Server started');
});

// Graceful shutdown
const shutdown = (signal: string) => {
    logger.info({ signal }, 'Shutdown signal received');
    server.close(() => {
        logger.info('Server closed');
        process.exit(0);
    });

    // Force close after 30 seconds
    setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
    }, 30000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export default app;
