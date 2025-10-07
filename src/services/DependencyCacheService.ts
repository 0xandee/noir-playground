import { CachedDependency, CachedDependencyTree, CacheStats } from '@/types/dependencyCache';

/**
 * Service for caching Noir dependencies in browser IndexedDB
 *
 * Provides two-level caching:
 * 1. Individual dependencies (by repo@tag)
 * 2. Complete dependency trees (by Nargo.toml hash)
 */
export class DependencyCacheService {
  private readonly DB_NAME = 'noir-playground-dependencies';
  private readonly DB_VERSION = 1;
  private readonly DEPENDENCY_STORE = 'dependency-files';
  private readonly TREE_STORE = 'dependency-trees';
  private readonly MAX_CACHE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB

  private dbPromise: Promise<IDBDatabase> | null = null;

  // Runtime statistics
  private stats: CacheStats = {
    dependencyCount: 0,
    treeCount: 0,
    totalSizeBytes: 0,
    hits: 0,
    misses: 0
  };

  /**
   * Initialize IndexedDB (lazy - only opens DB on first use)
   */
  private async getDB(): Promise<IDBDatabase> {
    if (!this.dbPromise) {
      this.dbPromise = this.initDB();
    }
    return this.dbPromise;
  }

  /**
   * Initialize IndexedDB with schema
   */
  private initDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) {
        reject(new Error('IndexedDB not supported in this browser'));
        return;
      }

      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB'));
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create dependency-files store
        if (!db.objectStoreNames.contains(this.DEPENDENCY_STORE)) {
          const depStore = db.createObjectStore(this.DEPENDENCY_STORE, { keyPath: 'key' });
          depStore.createIndex('lastAccessedAt', 'lastAccessedAt', { unique: false });
          depStore.createIndex('cachedAt', 'cachedAt', { unique: false });
        }

        // Create dependency-trees store
        if (!db.objectStoreNames.contains(this.TREE_STORE)) {
          const treeStore = db.createObjectStore(this.TREE_STORE, { keyPath: 'key' });
          treeStore.createIndex('lastAccessedAt', 'lastAccessedAt', { unique: false });
          treeStore.createIndex('cachedAt', 'cachedAt', { unique: false });
        }
      };
    });
  }

  /**
   * Generate cache key for a dependency
   */
  generateCacheKey(repository: string, tag: string): string {
    // Extract owner/repo from git URL if needed
    const repoPath = repository.replace(/^https?:\/\/github\.com\//, '').replace(/\.git$/, '');
    return `${repoPath}@${tag}`;
  }

  /**
   * Generate cache key for a dependency tree (hash of Nargo.toml)
   */
  async hashManifest(manifest: string): Promise<string> {
    try {
      // Use Web Crypto API for fast hashing
      const encoder = new TextEncoder();
      const data = encoder.encode(manifest);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      return `tree-${hashHex.substring(0, 16)}`; // Use first 16 chars
    } catch (error) {
      // Fallback to simple hash if crypto API unavailable
      console.warn('Crypto API unavailable, using fallback hash');
      return `tree-${this.simpleHash(manifest)}`;
    }
  }

  /**
   * Simple hash fallback (for environments without crypto API)
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Get cached dependency by key
   */
  async getDependency(key: string): Promise<CachedDependency | null> {
    try {
      const db = await this.getDB();
      const tx = db.transaction(this.DEPENDENCY_STORE, 'readonly');
      const store = tx.objectStore(this.DEPENDENCY_STORE);

      const request = store.get(key);

      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          const result = request.result as CachedDependency | undefined;
          if (result) {
            this.stats.hits++;
            // Update access time asynchronously (don't block)
            this.updateAccessTime(key, this.DEPENDENCY_STORE).catch(console.warn);
          } else {
            this.stats.misses++;
          }
          resolve(result || null);
        };
        request.onerror = () => {
          reject(new Error(`Failed to get dependency: ${key}`));
        };
      });
    } catch (error) {
      console.warn('Cache read failed, falling back to network:', error);
      this.stats.misses++;
      return null;
    }
  }

  /**
   * Save dependency to cache
   */
  async saveDependency(dep: CachedDependency): Promise<void> {
    try {
      const db = await this.getDB();

      // Check cache size and evict if necessary
      const currentSize = await this.getCacheSize();
      if (currentSize + dep.sizeBytes > this.MAX_CACHE_SIZE_BYTES) {
        await this.evictLRU(dep.sizeBytes);
      }

      const tx = db.transaction(this.DEPENDENCY_STORE, 'readwrite');
      const store = tx.objectStore(this.DEPENDENCY_STORE);

      await new Promise<void>((resolve, reject) => {
        const request = store.put(dep);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(new Error(`Failed to save dependency: ${dep.key}`));
      });

      console.log(`✓ Cached dependency: ${dep.key} (${this.formatBytes(dep.sizeBytes)})`);
    } catch (error) {
      if ((error as Error).name === 'QuotaExceededError') {
        console.warn('Storage quota exceeded, attempting to free space');
        try {
          await this.evictLRU(dep.sizeBytes * 2); // Make extra room
          await this.saveDependency(dep); // Retry once
        } catch (retryError) {
          console.error('Failed to save dependency after eviction:', retryError);
        }
      } else {
        console.error('Failed to cache dependency (non-critical):', error);
      }
    }
  }

  /**
   * Get cached dependency tree by key
   */
  async getDependencyTree(key: string): Promise<CachedDependencyTree | null> {
    try {
      const db = await this.getDB();
      const tx = db.transaction(this.TREE_STORE, 'readonly');
      const store = tx.objectStore(this.TREE_STORE);

      const request = store.get(key);

      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          const result = request.result as CachedDependencyTree | undefined;
          if (result) {
            this.stats.hits++;
            // Update access time asynchronously
            this.updateAccessTime(key, this.TREE_STORE).catch(console.warn);
          } else {
            this.stats.misses++;
          }
          resolve(result || null);
        };
        request.onerror = () => {
          reject(new Error(`Failed to get dependency tree: ${key}`));
        };
      });
    } catch (error) {
      console.warn('Cache read failed for tree:', error);
      this.stats.misses++;
      return null;
    }
  }

  /**
   * Save dependency tree to cache
   */
  async saveDependencyTree(tree: CachedDependencyTree): Promise<void> {
    try {
      const db = await this.getDB();
      const tx = db.transaction(this.TREE_STORE, 'readwrite');
      const store = tx.objectStore(this.TREE_STORE);

      await new Promise<void>((resolve, reject) => {
        const request = store.put(tree);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(new Error(`Failed to save dependency tree: ${tree.key}`));
      });

      console.log(`✓ Cached dependency tree: ${tree.key} (${Object.keys(tree.resolvedDependencies).length} dependencies)`);
    } catch (error) {
      console.error('Failed to cache dependency tree (non-critical):', error);
    }
  }

  /**
   * Update last accessed timestamp for LRU tracking
   */
  private async updateAccessTime(key: string, storeName: string): Promise<void> {
    try {
      const db = await this.getDB();
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);

      const getRequest = store.get(key);

      await new Promise<void>((resolve, reject) => {
        getRequest.onsuccess = () => {
          const record = getRequest.result;
          if (record) {
            record.lastAccessedAt = Date.now();
            const putRequest = store.put(record);
            putRequest.onsuccess = () => resolve();
            putRequest.onerror = () => reject();
          } else {
            resolve();
          }
        };
        getRequest.onerror = () => reject();
      });
    } catch (error) {
      // Non-critical - just log
      console.debug('Failed to update access time:', error);
    }
  }

  /**
   * Get total cache size in bytes
   */
  async getCacheSize(): Promise<number> {
    try {
      const db = await this.getDB();
      const tx = db.transaction(this.DEPENDENCY_STORE, 'readonly');
      const store = tx.objectStore(this.DEPENDENCY_STORE);
      const request = store.getAll();

      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          const deps = request.result as CachedDependency[];
          const totalSize = deps.reduce((sum, dep) => sum + dep.sizeBytes, 0);
          resolve(totalSize);
        };
        request.onerror = () => {
          reject(new Error('Failed to calculate cache size'));
        };
      });
    } catch (error) {
      console.warn('Failed to get cache size:', error);
      return 0;
    }
  }

  /**
   * Evict least recently used entries to free up space
   */
  private async evictLRU(bytesNeeded: number): Promise<void> {
    try {
      const db = await this.getDB();
      const tx = db.transaction(this.DEPENDENCY_STORE, 'readwrite');
      const store = tx.objectStore(this.DEPENDENCY_STORE);
      const index = store.index('lastAccessedAt');

      // Get all entries sorted by last access time (oldest first)
      const request = index.getAll();

      await new Promise<void>((resolve, reject) => {
        request.onsuccess = async () => {
          const deps = request.result as CachedDependency[];

          let freedBytes = 0;
          const toDelete: string[] = [];

          // Delete oldest entries until we free enough space
          for (const dep of deps) {
            if (freedBytes >= bytesNeeded) break;
            toDelete.push(dep.key);
            freedBytes += dep.sizeBytes;
          }

          // Delete the entries
          const deleteTx = db.transaction(this.DEPENDENCY_STORE, 'readwrite');
          const deleteStore = deleteTx.objectStore(this.DEPENDENCY_STORE);

          for (const key of toDelete) {
            deleteStore.delete(key);
            console.log(`Evicted (LRU): ${key}`);
          }

          await new Promise<void>((resolveDelete) => {
            deleteTx.oncomplete = () => resolveDelete();
          });

          resolve();
        };
        request.onerror = () => reject(new Error('Failed to evict LRU entries'));
      });
    } catch (error) {
      console.error('Failed to evict LRU entries:', error);
      throw error;
    }
  }

  /**
   * Clear all cached data
   */
  async clearCache(): Promise<void> {
    try {
      const db = await this.getDB();

      // Clear dependency files
      const depTx = db.transaction(this.DEPENDENCY_STORE, 'readwrite');
      const depStore = depTx.objectStore(this.DEPENDENCY_STORE);
      await new Promise<void>((resolve, reject) => {
        const request = depStore.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(new Error('Failed to clear dependency store'));
      });

      // Clear dependency trees
      const treeTx = db.transaction(this.TREE_STORE, 'readwrite');
      const treeStore = treeTx.objectStore(this.TREE_STORE);
      await new Promise<void>((resolve, reject) => {
        const request = treeStore.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(new Error('Failed to clear tree store'));
      });

      // Reset stats
      this.stats = {
        dependencyCount: 0,
        treeCount: 0,
        totalSizeBytes: 0,
        hits: 0,
        misses: 0
      };

      console.log('✓ Cache cleared successfully');
    } catch (error) {
      console.error('Failed to clear cache:', error);
      throw error;
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<CacheStats> {
    try {
      const db = await this.getDB();

      // Count dependencies
      const depTx = db.transaction(this.DEPENDENCY_STORE, 'readonly');
      const depStore = depTx.objectStore(this.DEPENDENCY_STORE);
      const depCountRequest = depStore.count();

      const dependencyCount = await new Promise<number>((resolve, reject) => {
        depCountRequest.onsuccess = () => resolve(depCountRequest.result);
        depCountRequest.onerror = () => reject();
      });

      // Count trees
      const treeTx = db.transaction(this.TREE_STORE, 'readonly');
      const treeStore = treeTx.objectStore(this.TREE_STORE);
      const treeCountRequest = treeStore.count();

      const treeCount = await new Promise<number>((resolve, reject) => {
        treeCountRequest.onsuccess = () => resolve(treeCountRequest.result);
        treeCountRequest.onerror = () => reject();
      });

      // Get total size
      const totalSizeBytes = await this.getCacheSize();

      return {
        dependencyCount,
        treeCount,
        totalSizeBytes,
        hits: this.stats.hits,
        misses: this.stats.misses
      };
    } catch (error) {
      console.warn('Failed to get cache stats:', error);
      return this.stats;
    }
  }

  /**
   * Format bytes to human-readable string
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Calculate size of string content in bytes
   */
  calculateContentSize(files: Record<string, string>): number {
    return Object.values(files).reduce((total, content) => {
      return total + new Blob([content]).size;
    }, 0);
  }
}

// Export singleton instance
export const dependencyCacheService = new DependencyCacheService();
