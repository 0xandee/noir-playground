import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Info } from 'lucide-react';

interface SVGFlamegraphViewerProps {
  svgContent?: string;
  onFunctionClick?: (functionName: string) => void;
  onLineClick?: (lineNumber: number) => void;
  className?: string;
}



export const SVGFlamegraphViewer: React.FC<SVGFlamegraphViewerProps> = ({
  svgContent,
  onFunctionClick,
  onLineClick,
  className = ''
}) => {
  const svgRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sanitizedSvg, setSanitizedSvg] = useState<string | null>(null);

  // Sanitize SVG content by removing embedded scripts and problematic elements
  const sanitizeSvgContent = useCallback((svgContent: string): string => {
    try {
      // Remove script tags and their content
      let cleaned = svgContent.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

      // Remove event handlers that might cause errors
      cleaned = cleaned.replace(/\s+on\w+\s*=\s*"[^"]*"/gi, '');
      cleaned = cleaned.replace(/\s+on\w+\s*=\s*'[^']*'/gi, '');

      // Remove any remaining JavaScript function calls
      cleaned = cleaned.replace(/javascript:[^"']*/gi, '');

      // Remove any CDATA sections that might contain scripts
      cleaned = cleaned.replace(/<!\[CDATA\[[\s\S]*?\]\]>/gi, '');

      return cleaned;
    } catch (error) {
      console.warn('Failed to sanitize SVG content:', error);
      return svgContent; // Return original if sanitization fails
    }
  }, []);

  // Process SVG content when it changes
  useEffect(() => {
    if (!svgContent) {
      setSanitizedSvg(null);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const sanitized = sanitizeSvgContent(svgContent);
      setSanitizedSvg(sanitized);
    } catch (err) {
      setError(`Failed to process SVG: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setSanitizedSvg(null);
    } finally {
      setIsLoading(false);
    }
  }, [svgContent, sanitizeSvgContent]);

  // Handle function clicks
  const handleFunctionClick = useCallback((functionName: string) => {
    onFunctionClick?.(functionName);
  }, [onFunctionClick]);

  // Handle line clicks
  const handleLineClick = useCallback((lineNumber: number) => {
    onLineClick?.(lineNumber);
  }, [onLineClick]);

  // Handle SVG clicks to extract function/line information
  const handleSvgClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;

    // Look for text elements that might contain function or line information
    if (target.tagName === 'text' || target.tagName === 'tspan') {
      const textContent = target.textContent || '';

      // Try to extract line numbers from text like "main.nr:42"
      const lineMatch = textContent.match(/\.nr:(\d+)/);
      if (lineMatch) {
        const lineNumber = parseInt(lineMatch[1], 10);
        handleLineClick(lineNumber);
        return;
      }

      // Try to extract function names
      const functionMatch = textContent.match(/^([a-zA-Z_][a-zA-Z0-9_]*)/);
      if (functionMatch && !textContent.includes(':')) {
        handleFunctionClick(functionMatch[1]);
        return;
      }
    }
  }, [handleFunctionClick, handleLineClick]);





  if (isLoading) {
    return (
      <div className={`h-full flex flex-col ${className}`}>
        <header className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/30">
          <h2 className="text-sm font-medium">SVG Flamegraph</h2>
          <Badge variant="secondary" className="animate-pulse">Loading...</Badge>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p>Parsing SVG content...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`h-full flex flex-col ${className}`}>
        <header className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/30">
          <h2 className="text-sm font-medium">SVG Flamegraph</h2>
          <Badge variant="destructive">Error</Badge>
        </header>
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center text-muted-foreground">
            <Info className="h-8 w-8 mx-auto mb-2 text-destructive" />
            <p className="text-sm">{error}</p>
            <p className="text-xs mt-1">SVG content could not be parsed</p>
          </div>
        </div>
      </div>
    );
  }

  if (!svgContent) {
    return (
      <div className={`h-full flex flex-col ${className}`}>
        <header className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/30">
          <h2 className="text-sm font-medium">SVG Flamegraph</h2>
          <Badge variant="outline">No Data</Badge>
        </header>
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center text-muted-foreground">
            <Info className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No SVG content available</p>
            <p className="text-xs mt-1">Run profiling to generate flamegraph</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-full flex flex-col ${className}`}>
      {/* <header className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-medium">SVG Flamegraph</h2>
          <Badge variant="secondary">{svgElements.length} functions</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleExportPNG} title="Export as PNG">
            <Download className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="sm" onClick={handleExportSVG} title="Export as SVG">
            <ExternalLink className="h-3 w-3" />
          </Button>
        </div>
      </header> */}

      {/* Search Bar */}
      {/* <div className="p-3 border-b border-border bg-muted/20">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search functions, lines, or constraints..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
        {searchQuery && (
          <div className="mt-2 text-xs text-muted-foreground">
            {highlightedElements.size} matches found
          </div>
        )}
      </div> */}

      {/* SVG Content */}
      <div className="flex-1 overflow-auto p-2">
        <div
          ref={svgRef}
          className="relative w-full cursor-pointer"
          onClick={handleSvgClick}
        >
          {sanitizedSvg ? (
            <div
              className="w-full h-auto block mx-auto min-w-full max-w-full"
              dangerouslySetInnerHTML={{ __html: sanitizedSvg }}
            />
          ) : (
            <div className="flex items-center justify-center p-8">
              <div className="text-center text-muted-foreground">
                <Info className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Processing SVG content...</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
