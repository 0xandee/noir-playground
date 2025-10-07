import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Trash2, Database, RefreshCw } from 'lucide-react';
import { dependencyCacheService } from '@/services/DependencyCacheService';
import { CacheStats } from '@/types/dependencyCache';
import { toast } from 'sonner';

/**
 * Panel for managing dependency cache
 * Displays cache statistics and provides clear cache functionality
 */
export function CacheManagementPanel() {
  const [stats, setStats] = useState<CacheStats>({
    dependencyCount: 0,
    treeCount: 0,
    totalSizeBytes: 0,
    hits: 0,
    misses: 0
  });
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Load cache statistics
   */
  const loadStats = async () => {
    setIsLoading(true);
    try {
      const cacheStats = await dependencyCacheService.getStats();
      setStats(cacheStats);
    } catch (error) {
      console.error('Failed to load cache stats:', error);
      toast.error('Failed to load cache statistics');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Clear all cached data
   */
  const handleClearCache = async () => {
    setIsLoading(true);
    try {
      await dependencyCacheService.clearCache();
      await loadStats(); // Reload stats after clearing
      toast.success('Cache cleared successfully');
    } catch (error) {
      console.error('Failed to clear cache:', error);
      toast.error('Failed to clear cache');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Format bytes to human-readable string
   */
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  /**
   * Calculate cache hit rate percentage
   */
  const getCacheHitRate = (): string => {
    const total = stats.hits + stats.misses;
    if (total === 0) return 'N/A';
    const rate = (stats.hits / total) * 100;
    return rate.toFixed(1) + '%';
  };

  /**
   * Calculate cache usage percentage
   */
  const getCacheUsagePercentage = (): number => {
    const maxSize = 50 * 1024 * 1024; // 50MB
    return (stats.totalSizeBytes / maxSize) * 100;
  };

  // Load stats on mount
  useEffect(() => {
    loadStats();
  }, []);

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            <CardTitle>Dependency Cache</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={loadStats}
            disabled={isLoading}
            title="Refresh statistics"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        <CardDescription>
          Local browser cache for Noir libraries (IndexedDB)
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Cache Size */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Storage Used</Label>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold">
              {formatBytes(stats.totalSizeBytes)}
            </span>
            <span className="text-sm text-muted-foreground">
              / 50 MB
            </span>
          </div>
          {/* Progress bar */}
          <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
            <div
              className="bg-primary h-full transition-all duration-300"
              style={{ width: `${Math.min(getCacheUsagePercentage(), 100)}%` }}
            />
          </div>
        </div>

        {/* Statistics Grid */}
        <div className="grid grid-cols-2 gap-4 pt-2">
          {/* Cached Dependencies */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">
              Cached Libraries
            </Label>
            <div className="text-xl font-semibold">
              {stats.dependencyCount}
            </div>
          </div>

          {/* Cache Hit Rate */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">
              Hit Rate
            </Label>
            <div className="text-xl font-semibold">
              {getCacheHitRate()}
            </div>
          </div>

          {/* Cache Hits */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">
              Hits
            </Label>
            <div className="text-lg font-medium text-green-600 dark:text-green-400">
              {stats.hits}
            </div>
          </div>

          {/* Cache Misses */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">
              Misses
            </Label>
            <div className="text-lg font-medium text-orange-600 dark:text-orange-400">
              {stats.misses}
            </div>
          </div>
        </div>

        {/* Clear Cache Button */}
        <div className="pt-2">
          <Button
            variant="destructive"
            size="sm"
            onClick={handleClearCache}
            disabled={isLoading || stats.dependencyCount === 0}
            className="w-full"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Clear Cache
          </Button>
          {stats.dependencyCount === 0 && (
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Cache is empty
            </p>
          )}
        </div>

        {/* Info Note */}
        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground">
            Cache persists across sessions. Libraries are cached by version
            (e.g., bignum@v0.8.0). Oldest entries are auto-evicted when cache
            exceeds 50MB.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
