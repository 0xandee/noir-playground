/**
 * Type definitions for dependency caching system
 */

/**
 * Cached dependency with all files and metadata
 */
export interface CachedDependency {
  /** Cache key: "owner/repo@tag" (e.g., "noir-lang/noir-bignum@v0.8.0") */
  key: string;

  /** All files in this dependency version */
  files: Record<string, string>; // filename → content

  /** GitHub repository owner/name */
  repository: string;

  /** Git tag/version */
  tag: string;

  /** Optional subdirectory within the repository */
  directory?: string;

  /** Timestamp when this was first cached */
  cachedAt: number;

  /** Timestamp when this was last accessed (for LRU eviction) */
  lastAccessedAt: number;

  /** Total size in bytes of all file contents */
  sizeBytes: number;
}

/**
 * Cached dependency tree for a specific project configuration
 */
export interface CachedDependencyTree {
  /** Cache key: hash of root Nargo.toml */
  key: string;

  /** Complete resolved dependency graph (including transitive dependencies) */
  resolvedDependencies: Record<string, CachedDependency>;

  /** Original Nargo.toml content (for verification) */
  rootManifest: string;

  /** Timestamp when this tree was cached */
  cachedAt: number;

  /** Timestamp when this tree was last accessed */
  lastAccessedAt: number;
}

/**
 * Cache statistics
 */
export interface CacheStats {
  /** Total number of cached dependencies */
  dependencyCount: number;

  /** Total number of cached dependency trees */
  treeCount: number;

  /** Total cache size in bytes */
  totalSizeBytes: number;

  /** Number of cache hits since initialization */
  hits: number;

  /** Number of cache misses since initialization */
  misses: number;
}

/**
 * Cache operation result
 */
export interface CacheOperationResult {
  success: boolean;
  error?: string;
  data?: unknown;
}
