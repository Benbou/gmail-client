import { Redis as RedisInstance } from 'ioredis';
import { createLogger } from './logger.js';

const logger = createLogger('redis');

// Redis connection configuration
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const USE_MEMORY_FALLBACK = process.env.USE_MEMORY_FALLBACK === 'true';

// Type for Redis client
type RedisClient = RedisInstance;

// In-memory fallback for development without Redis
class MemoryStore {
    private store = new Map<string, { value: string; expiry: number | null }>();

    async get(key: string): Promise<string | null> {
        const item = this.store.get(key);
        if (!item) return null;
        if (item.expiry && Date.now() > item.expiry) {
            this.store.delete(key);
            return null;
        }
        return item.value;
    }

    async set(key: string, value: string, mode?: string, ttl?: number): Promise<'OK'> {
        const expiry = mode === 'EX' && ttl ? Date.now() + ttl * 1000 : null;
        this.store.set(key, { value, expiry });
        return 'OK';
    }

    async setex(key: string, ttl: number, value: string): Promise<'OK'> {
        return this.set(key, value, 'EX', ttl);
    }

    async del(key: string): Promise<number> {
        return this.store.delete(key) ? 1 : 0;
    }

    async exists(key: string): Promise<number> {
        const item = this.store.get(key);
        if (!item) return 0;
        if (item.expiry && Date.now() > item.expiry) {
            this.store.delete(key);
            return 0;
        }
        return 1;
    }

    async incr(key: string): Promise<number> {
        const current = await this.get(key);
        const newValue = (parseInt(current || '0', 10) + 1).toString();
        await this.set(key, newValue);
        return parseInt(newValue, 10);
    }

    async expire(key: string, seconds: number): Promise<number> {
        const item = this.store.get(key);
        if (!item) return 0;
        item.expiry = Date.now() + seconds * 1000;
        return 1;
    }

    async ttl(key: string): Promise<number> {
        const item = this.store.get(key);
        if (!item) return -2;
        if (!item.expiry) return -1;
        const remaining = Math.ceil((item.expiry - Date.now()) / 1000);
        return remaining > 0 ? remaining : -2;
    }

    // Cleanup expired keys periodically
    cleanup(): void {
        const now = Date.now();
        for (const [key, item] of this.store.entries()) {
            if (item.expiry && now > item.expiry) {
                this.store.delete(key);
            }
        }
    }
}

// Create Redis client or memory fallback
let redisClient: RedisClient | MemoryStore;
let memoryStore: MemoryStore | null = null;
let actualRedisClient: RedisInstance | null = null;

if (USE_MEMORY_FALLBACK) {
    logger.info('Using in-memory store (development mode)');
    memoryStore = new MemoryStore();
    redisClient = memoryStore;

    // Cleanup expired keys every minute
    setInterval(() => memoryStore?.cleanup(), 60000);
} else {
    actualRedisClient = new RedisInstance(REDIS_URL, {
        maxRetriesPerRequest: 3,
        lazyConnect: true,
    });
    redisClient = actualRedisClient;

    actualRedisClient.on('connect', () => {
        logger.info('Redis connected');
    });

    actualRedisClient.on('error', (error: Error) => {
        logger.error({ error }, 'Redis connection error');
    });

    actualRedisClient.on('close', () => {
        logger.warn('Redis connection closed');
    });
}

export const redis = redisClient as RedisClient;

// ============================================
// OAuth State Management
// ============================================

const OAUTH_STATE_PREFIX = 'oauth:state:';
const OAUTH_STATE_TTL = 300; // 5 minutes

export interface OAuthStateData {
    userId: string;
    createdAt: number;
}

export async function setOAuthState(state: string, data: OAuthStateData): Promise<void> {
    await redis.setex(
        `${OAUTH_STATE_PREFIX}${state}`,
        OAUTH_STATE_TTL,
        JSON.stringify(data)
    );
}

export async function getOAuthState(state: string): Promise<OAuthStateData | null> {
    const data = await redis.get(`${OAUTH_STATE_PREFIX}${state}`);
    if (!data) return null;
    return JSON.parse(data);
}

export async function deleteOAuthState(state: string): Promise<void> {
    await redis.del(`${OAUTH_STATE_PREFIX}${state}`);
}

// ============================================
// Rate Limiting Helpers
// ============================================

const RATE_LIMIT_PREFIX = 'ratelimit:';

export async function checkRateLimit(
    key: string,
    maxRequests: number,
    windowSeconds: number
): Promise<{ allowed: boolean; remaining: number; resetIn: number }> {
    const redisKey = `${RATE_LIMIT_PREFIX}${key}`;
    const current = await redis.incr(redisKey);

    if (current === 1) {
        await redis.expire(redisKey, windowSeconds);
    }

    const ttl = await redis.ttl(redisKey);

    return {
        allowed: current <= maxRequests,
        remaining: Math.max(0, maxRequests - current),
        resetIn: ttl > 0 ? ttl : windowSeconds,
    };
}

export default redis;
