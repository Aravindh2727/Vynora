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
  private listeners = new Set<() => void>();
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    dedupes: 0,
    invalidations: 0,
    activeEntries: 0
  };

  /**
   * Subscribe to cache mutations (updates, inserts, deletions, background fetches).
   * Used by Global Search and realtime components to update without reloading.
   */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify(): void {
    this.listeners.forEach((fn) => {
      try {
        fn();
      } catch (err) {
        console.error('QueryCache subscriber error:', err);
      }
    });
  }

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
        this.notify();
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
    this.notify();
  }

  /**
   * In-place update of an existing record across cached domain lists.
   * Ensures instant reflection in Global Search and UI without waiting for a re-fetch.
   */
  updateItemInDomain(userId: string, domain: string, itemId: string, updatedFields: any): void {
    const prefix = `${userId}:${domain}`;
    let modified = false;

    for (const [key, entry] of this.cache.entries()) {
      if (key.startsWith(prefix) && Array.isArray(entry.data)) {
        entry.data = entry.data.map((item: any) => {
          const id = item?.id || item?._id;
          if (id === itemId) {
            modified = true;
            return { ...item, ...updatedFields, updatedAt: new Date().toISOString() };
          }
          return item;
        });
        if (modified) {
          entry.timestamp = Date.now();
        }
      }
    }

    if (modified) {
      this.notify();
    }
  }

  /**
   * In-place addition of a new record across cached domain lists.
   */
  addItemToDomain(userId: string, domain: string, newItem: any): void {
    const prefix = `${userId}:${domain}`;
    let added = false;

    for (const [key, entry] of this.cache.entries()) {
      if (key.startsWith(prefix) && Array.isArray(entry.data)) {
        const id = newItem?.id || newItem?._id;
        const exists = entry.data.some((item: any) => (item?.id || item?._id) === id);
        if (!exists) {
          entry.data = [newItem, ...entry.data];
          entry.timestamp = Date.now();
          added = true;
        }
      }
    }

    if (added) {
      this.notify();
    }
  }

  /**
   * In-place removal of a record from cached domain lists.
   */
  removeItemFromDomain(userId: string, domain: string, itemId: string): void {
    const prefix = `${userId}:${domain}`;
    let removed = false;

    for (const [key, entry] of this.cache.entries()) {
      if (key.startsWith(prefix) && Array.isArray(entry.data)) {
        const initialLen = entry.data.length;
        entry.data = entry.data.filter((item: any) => (item?.id || item?._id) !== itemId);
        if (entry.data.length !== initialLen) {
          entry.timestamp = Date.now();
          removed = true;
        }
      }
    }

    if (removed) {
      this.notify();
    }
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
    this.notify();
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
    this.notify();
  }

  /**
   * Complete cache purge (Called on global sign out or test teardown).
   */
  clearAll(): void {
    this.cache.clear();
    this.inFlight.clear();
    this.stats.activeEntries = 0;
    this.notify();
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

  /**
   * Search across all in-memory cached datasets for the active user.
   * Employs multi-tier matching: direct substring, normalized alphanumeric, and multi-token search.
   */
  searchCachedData(searchTerm: string, userId?: string): Array<{
    id: string;
    title: string;
    subtitle: string;
    domain: string;
    route: string;
  }> {
    if (!searchTerm || searchTerm.trim().length < 2) return [];

    const rawTerm = searchTerm.toLowerCase().trim();
    // Normalize: remove all spaces, hyphens, slashes, punctuation for fuzzy matching
    // (e.g. "tn 87e 3902" -> "tn87e3902")
    const normTerm = rawTerm.replace(/[^a-z0-9]/g, '');
    const searchTokens = rawTerm.split(/\s+/).filter(Boolean);

    const results: Array<{
      id: string;
      title: string;
      subtitle: string;
      domain: string;
      route: string;
    }> = [];

    const prefix = userId ? `${userId}:` : '';

    for (const [key, entry] of this.cache.entries()) {
      // If a userId is specified and entry has a differing userId prefix, skip
      if (prefix && key.includes(':') && !key.startsWith(prefix) && entry.userId && entry.userId !== userId) {
        continue;
      }
      if (Date.now() - entry.timestamp >= entry.ttl) continue;

      const domain = key.split(':')[1] || 'general';
      const items = Array.isArray(entry.data) ? entry.data : [];

      for (const item of items) {
        if (!item || typeof item !== 'object') continue;

        // Gather all text and number values from the object into a searchable pool
        const textValues: string[] = [];
        for (const [k, v] of Object.entries(item)) {
          if (v !== undefined && v !== null && (typeof v === 'string' || typeof v === 'number')) {
            textValues.push(String(v));
          }
        }

        const rawBlob = textValues.join(' ').toLowerCase();
        const normBlob = rawBlob.replace(/[^a-z0-9]/g, '');

        // Matching tiers:
        // Tier 1: Direct substring in raw text
        let isMatch = rawBlob.includes(rawTerm);

        // Tier 2: Normalized alphanumeric match (handles spacing differences like "tn 87e 3902" vs "TN 87 E 3902")
        if (!isMatch && normTerm.length >= 2 && normBlob.includes(normTerm)) {
          isMatch = true;
        }

        // Tier 3: All query tokens present in item (handles multi-word queries like "honda 3902")
        if (!isMatch && searchTokens.length > 1) {
          const allTokensMatch = searchTokens.every(tok => {
            const normTok = tok.replace(/[^a-z0-9]/g, '');
            return rawBlob.includes(tok) || (normTok.length >= 2 && normBlob.includes(normTok));
          });
          if (allTokensMatch) isMatch = true;
        }

        if (isMatch) {
          // Domain-specific title and route resolution
          let title = '';
          let subtitle = '';
          let route = '/';

          if (domain === 'vehicles') {
            title = String(item.name || item.model || 'Vehicle');
            const plate = item.licensePlate || item.rcNumber || item.plateNumber || '';
            const type = item.type || item.make || '';
            subtitle = [plate, type].filter(Boolean).join(' • ') || 'Vehicle Record';
            route = `/vehicles?vehicleId=${item.id || item._id || ''}`;
          } else if (domain === 'finance') {
            title = String(item.description || item.category || 'Transaction');
            const amt = item.amount !== undefined && item.amount !== null ? `₹${item.amount}` : '';
            subtitle = [item.category, amt, item.type].filter(Boolean).join(' • ');
            route = '/finance';
          } else if (domain === 'tasks') {
            title = String(item.title || item.task || 'Task');
            subtitle = [item.priority ? `${item.priority} priority` : '', item.category].filter(Boolean).join(' • ');
            route = '/tasks';
          } else if (domain === 'medicine') {
            title = String(item.name || item.medicineName || 'Medicine');
            subtitle = [item.dosage, item.frequency].filter(Boolean).join(' • ');
            route = '/medicine';
          } else if (domain === 'bills') {
            title = String(item.title || item.name || item.payee || 'Bill');
            const amt = item.amount !== undefined && item.amount !== null ? `₹${item.amount}` : '';
            subtitle = [item.payee, amt, item.dueDate].filter(Boolean).join(' • ');
            route = '/bills';
          } else if (domain === 'loans') {
            title = String(item.lender || item.borrower || item.title || 'Loan');
            const amt = item.amount !== undefined && item.amount !== null ? `₹${item.amount}` : '';
            subtitle = [item.type ? `Loan ${item.type}` : '', amt].filter(Boolean).join(' • ');
            route = '/loans';
          } else if (domain === 'agriculture') {
            title = String(item.cropName || item.name || 'Crop');
            subtitle = [item.variety, item.field, item.season].filter(Boolean).join(' • ');
            route = '/agriculture';
          } else if (domain === 'dairy') {
            title = String(item.name || (item.tag ? `Cow #${item.tag}` : 'Cattle'));
            subtitle = [item.breed, item.status].filter(Boolean).join(' • ');
            route = '/dairy';
          } else if (domain === 'documents') {
            title = String(item.title || item.name || item.docName || 'Document');
            subtitle = [item.category, item.docNumber].filter(Boolean).join(' • ');
            route = '/digital-locker';
          } else if (domain === 'contacts') {
            title = String(item.name || 'Emergency Contact');
            subtitle = [item.relation, item.phone].filter(Boolean).join(' • ');
            route = '/emergency';
          } else if (domain === 'inventory') {
            title = String(item.itemName || item.name || 'Asset');
            subtitle = [item.category, item.brand, item.room].filter(Boolean).join(' • ');
            route = '/home-inventory';
          } else if (domain === 'student') {
            title = String(item.title || item.subject || 'Student Task');
            subtitle = [item.type, item.dueDate].filter(Boolean).join(' • ');
            route = '/student';
          } else {
            title = String(item.title || item.name || item.description || domain.toUpperCase());
            subtitle = domain.toUpperCase();
          }

          results.push({
            id: item.id || item._id || `${domain}-${results.length}-${Math.random().toString(36).substring(2, 6)}`,
            title,
            subtitle: subtitle || `${domain.toUpperCase()} Record`,
            domain,
            route
          });

          if (results.length >= 15) break;
        }
      }
      if (results.length >= 15) break;
    }

    return results;
  }
}

// Global Singleton Instance
export const queryCache = new QueryCacheEngine();
