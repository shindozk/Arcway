import { createLogger } from './logger';

const log = createLogger('cache');

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const store = new Map<string, CacheEntry<unknown>>();

/**
 * Get a cached value or compute and cache a new one.
 * @param key  Unique cache key
 * @param ttl  Time-to-live in milliseconds (default 5 minutes)
 * @param fn   Async function that produces the value on cache miss
 */
export async function cached<T>(key: string, ttl: number, fn: () => Promise<T>): Promise<T> {
  const entry = store.get(key) as CacheEntry<T> | undefined;
  if (entry && Date.now() - entry.timestamp < ttl) {
    log.debug(`cache HIT: ${key}`);
    return entry.data;
  }
  log.debug(`cache MISS: ${key}`);
  const data = await fn();
  store.set(key, { data, timestamp: Date.now() });
  return data;
}


/** Check if a cache key has valid (non-expired) data. */
export function hasCache(key: string, ttl: number): boolean {
  const entry = store.get(key);
  return entry !== undefined && Date.now() - entry.timestamp < ttl;
}

/** Invalidate a specific cache key. */
export function invalidateCache(key: string): void {
  store.delete(key);
}


// ── TTL constants ──────────────────────────────────────────────────────────
export const TTL = {
  /** Home page tab data (trending, popular, new, updated) */
  HOME_TAB: 5 * 60 * 1000,      // 5 minutes
  /** Search results */
  SEARCH: 3 * 60 * 1000,         // 3 minutes
} as const;
