import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Info } from 'lucide-react';

interface SVGFlamegraphViewerProps {
  svgContent?: string;
  onFunctionClick?: (functionName: string) => void;
  onLineClick?: (lineNumber: number) => void;
  className?: string;
  title?: string;
}



export const SVGFlamegraphViewer: React.FC<SVGFlamegraphViewerProps> = ({
  svgContent,
  onFunctionClick,
  onLineClick,
  className = '',
  title
}) => {
  const svgRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle function clicks
  const handleFunctionClick = useCallback((functionName: string) => {
    onFunctionClick?.(functionName);
  }, [onFunctionClick]);

  // Handle line clicks
  const handleLineClick = useCallback((lineNumber: number) => {
    onLineClick?.(lineNumber);
  }, [onLineClick]);





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
        {title && (
          <header className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/30">
            <h2 className="text-sm font-medium">{title}</h2>
            <Badge variant="outline">No Data</Badge>
          </header>
        )}
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
      {title && (
        <header className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/30">
          <h2 className="text-sm font-medium">{title}</h2>
        </header>
      )}

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
          className="relative w-full"
        >
          {/* Use object tag for full SVG functionality including JavaScript */}
          <object
            data={`data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgContent)))}`}
            type="image/svg+xml"
            className="w-full h-auto cursor-pointer block mx-auto min-w-full max-w-full"
            onLoad={(e) => {
              // SVG loaded successfully
            }}
            onError={(e) => {
              // Fallback to iframe if object fails
            }}
          >
            {/* Fallback: iframe for better SVG support */}
            <iframe
              src={`data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgContent)))}`}
              className="w-full h-auto border-0 block mx-auto min-w-full max-w-full"
              title="SVG Flamegraph"
              sandbox="allow-scripts allow-same-origin"
            />
          </object>

        </div>
      </div>
    </div>
  );
};
