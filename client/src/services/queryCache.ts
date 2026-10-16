/**
 * Vynora Intelligent Multi-User Query Cache Engine (Layer B & C)
 * High-performance in-memory caching with:
 * - Strict multi-tenant user isolation (all private keys prefixed with userId)
 * - Request deduplication (in-flight promise sharing eliminates duplicate concurrent Firestore reads)
 * - Fine-grained TTL & freshness management
 * - Targeted cache invalidation upon CRUD operations
 * - Immediate cache purging upon sign-out / account switching
 * - Zero caching of decrypted Password Vault credentials
 */

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  userId: string;
}

export interface CacheStats {
  hits: number;
  misses: number;
  dedupes: number;
  invalidations: number;
  activeEntries: number;
}

// Configurable domain TTL policies (in milliseconds)
export const CACHE_TTL = {
  PROFILE: 5 * 60 * 1000,       // 5 minutes
  DASHBOARD: 45 * 1000,          // 45 seconds
  TRANSACTIONS: 30 * 1000,       // 30 seconds
  TASKS: 30 * 1000,              // 30 seconds
  BILLS: 45 * 1000,              // 45 seconds
  VEHICLES: 60 * 1000,           // 1 minute
  DAIRY: 45 * 1000,              // 45 seconds
  AGRICULTURE: 45 * 1000,        // 45 seconds
  LOANS: 60 * 1000,              // 1 minute
  INVENTORY: 60 * 1000,          // 1 minute
  GOALS: 60 * 1000,              // 1 minute
  STUDENT: 60 * 1000,            // 1 minute
  DOCUMENTS: 60 * 1000,          // 1 minute
  CONTACTS: 2 * 60 * 1000,       // 2 minutes
  HEALTH: 60 * 1000,             // 1 minute
  FAMILY: 45 * 1000,             // 45 seconds
  REPORTS: 60 * 1000             // 1 minute
};

class QueryCacheEngine {
  private cache = new Map<string, CacheEntry<any>>();
  private inFlight = new Map<string, Promise<any>>();
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    dedupes: 0,
    invalidations: 0,
    activeEntries: 0
  };

  /**
   * Generates a secure, user-isolated cache key.
   */
  makeKey(userId: string, domain: string, queryId = 'default'): string {
    const cleanUid = userId || 'anonymous';
    return `${cleanUid}:${domain}:${queryId}`;
  }

  /**
   * Retrieves or fetches data with in-flight deduplication and TTL checking.
   */
  async fetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number = CACHE_TTL.DASHBOARD,
    forceRefresh = false
  ): Promise<T> {
    const now = Date.now();
    const entry = this.cache.get(key);

    // 1. Return fresh cached data if valid and not forcing refresh
    if (!forceRefresh && entry && (now - entry.timestamp < entry.ttl)) {
      this.stats.hits++;
      return entry.data as T;
    }

    // 2. In-flight request deduplication: Share active promise if query is already running
    if (this.inFlight.has(key)) {
      this.stats.dedupes++;
      return this.inFlight.get(key) as Promise<T>;
    }

    // 3. Cache miss: Execute fetcher and register in-flight promise
    this.stats.misses++;
    const promise = (async () => {
      try {
        const result = await fetcher();
        const userId = key.split(':')[0] || 'anonymous';
        
        this.cache.set(key, {
          data: result,
          timestamp: Date.now(),
          ttl,
          userId
        });
        this.stats.activeEntries = this.cache.size;
        return result;
      } finally {
        this.inFlight.delete(key);
      }
    })();

    this.inFlight.set(key, promise);
    return promise;
  }

  /**
   * Peek at existing cached data synchronously (returns null if absent or expired)
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp >= entry.ttl) {
      return null;
    }
    return entry.data as T;
  }

  /**
   * Directly sets/updates a cache entry (useful for optimistic updates).
   */
  set<T>(key: string, data: T, ttl: number = CACHE_TTL.DASHBOARD): void {
    const userId = key.split(':')[0] || 'anonymous';
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
      userId
    });
    this.stats.activeEntries = this.cache.size;
  }

  /**
   * Invalidates a specific key or all keys matching a prefix/pattern.
   */
  invalidate(pattern: string | RegExp): void {
    let count = 0;
    for (const key of this.cache.keys()) {
      if (typeof pattern === 'string') {
        if (key === pattern || key.startsWith(pattern)) {
          this.cache.delete(key);
          count++;
        }
      } else if (pattern.test(key)) {
        this.cache.delete(key);
        count++;
      }
    }
    this.stats.invalidations += count;
    this.stats.activeEntries = this.cache.size;
  }

  /**
   * Immediately purges all cached data for a specific user (Called on Sign Out / Account Switch).
   */
  clearUser(userId: string): void {
    const prefix = `${userId}:`;
    let count = 0;
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
        count++;
      }
    }
    // Also cancel any in-flight promises matching the user
    for (const key of this.inFlight.keys()) {
      if (key.startsWith(prefix)) {
        this.inFlight.delete(key);
      }
    }
    this.stats.invalidations += count;
    this.stats.activeEntries = this.cache.size;
  }

  /**
   * Complete cache purge (Called on global sign out or test teardown).
   */
  clearAll(): void {
    this.cache.clear();
    this.inFlight.clear();
    this.stats.activeEntries = 0;
  }

  /**
   * Returns live diagnostic metrics for telemetry and performance verification.
   */
  getStats(): CacheStats {
    return {
      ...this.stats,
      activeEntries: this.cache.size
    };
  }

  /**
   * Resets diagnostic counters.
   */
  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      dedupes: 0,
      invalidations: 0,
      activeEntries: this.cache.size
    };
  }
}

// Global Singleton Instance
export const queryCache = new QueryCacheEngine();
