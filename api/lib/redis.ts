// Simple in-memory store for OAuth state and rate limiting (Vercel serverless environment)
// For production, consider using Vercel KV or Upstash Redis

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

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    const expiry = ttlSeconds ? Date.now() + ttlSeconds * 1000 : null;
    this.store.set(key, { value, expiry });
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }
}

const memoryStore = new MemoryStore();

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
  await memoryStore.set(`${OAUTH_STATE_PREFIX}${state}`, JSON.stringify(data), OAUTH_STATE_TTL);
}

export async function getOAuthState(state: string): Promise<OAuthStateData | null> {
  const data = await memoryStore.get(`${OAUTH_STATE_PREFIX}${state}`);
  if (!data) return null;
  return JSON.parse(data);
}

export async function deleteOAuthState(state: string): Promise<void> {
  await memoryStore.del(`${OAUTH_STATE_PREFIX}${state}`);
}
