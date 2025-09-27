import { generateCodePreview, getCachedPreview, setCachedPreview, generateCacheKey, type PreviewOptions } from '../utils/codePreviewGenerator';
import type { SharedSnippet } from '../types/snippet';

export interface PreviewGenerationResult {
  success: boolean;
  dataUrl?: string;
  blob?: Blob;
  error?: string;
  cached?: boolean;
}

export class PreviewService {
  private static instance: PreviewService;
  
  public static getInstance(): PreviewService {
    if (!PreviewService.instance) {
      PreviewService.instance = new PreviewService();
    }
    return PreviewService.instance;
  }

  /**
   * Generate a preview image for a code snippet
   */
  async generateSnippetPreview(
    snippet: SharedSnippet,
    options: PreviewOptions = {}
  ): Promise<PreviewGenerationResult> {
    try {
      const defaultOptions: PreviewOptions = {
        width: 1200,
        height: 630,
        fontSize: 14,
        theme: 'dark',
        title: snippet.title || 'Noir Code Snippet',
        maxLines: 20
      };

      const finalOptions = { ...defaultOptions, ...options };
      const cacheKey = generateCacheKey(snippet.code, finalOptions);
      
      // Check cache first
      const cachedPreview = getCachedPreview(cacheKey);
      if (cachedPreview) {
        return {
          success: true,
          dataUrl: cachedPreview,
          cached: true
        };
      }

      // Generate new preview
      const result = await generateCodePreview(snippet.code, finalOptions);
      
      // Cache the result
      setCachedPreview(cacheKey, result.dataUrl);

      return {
        success: true,
        dataUrl: result.dataUrl,
        blob: result.blob,
        cached: false
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Generate preview for code string (without snippet metadata)
   */
  async generateCodeStringPreview(
    code: string,
    title: string = 'Noir Code',
    options: PreviewOptions = {}
  ): Promise<PreviewGenerationResult> {
    try {
      const defaultOptions: PreviewOptions = {
        width: 1200,
        height: 630,
        fontSize: 14,
        theme: 'dark',
        title,
        maxLines: 20
      };

      const finalOptions = { ...defaultOptions, ...options };
      const cacheKey = generateCacheKey(code, finalOptions);
      
      // Check cache first
      const cachedPreview = getCachedPreview(cacheKey);
      if (cachedPreview) {
        return {
          success: true,
          dataUrl: cachedPreview,
          cached: true
        };
      }

      // Generate new preview
      const result = await generateCodePreview(code, finalOptions);
      
      // Cache the result
      setCachedPreview(cacheKey, result.dataUrl);

      return {
        success: true,
        dataUrl: result.dataUrl,
        blob: result.blob,
        cached: false
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Pre-generate preview for sharing workflow
   * This can be called when a snippet is about to be shared
   */
  async preGenerateSharePreview(snippet: SharedSnippet): Promise<boolean> {
    try {
      const result = await this.generateSnippetPreview(snippet);
      return result.success;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get preview for social media sharing
   * Returns a data URL that can be used in social media meta tags
   */
  async getSharePreviewUrl(snippet: SharedSnippet): Promise<string | null> {
    try {
      const result = await this.generateSnippetPreview(snippet, {
        width: 1200,
        height: 630,
        theme: 'dark'
      });
      
      return result.success ? result.dataUrl || null : null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Generate Twitter card sized preview
   */
  async getTwitterPreviewUrl(snippet: SharedSnippet): Promise<string | null> {
    try {
      const result = await this.generateSnippetPreview(snippet, {
        width: 1024,
        height: 512,
        theme: 'dark',
        fontSize: 12
      });
      
      return result.success ? result.dataUrl || null : null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Clear preview cache (useful for memory management)
   */
  clearCache(): void {
    // This is handled by the codePreviewGenerator cache functions
    // In a production environment, you might want to implement more sophisticated cache management
  }
}

// Export singleton instance
export const previewService = PreviewService.getInstance();