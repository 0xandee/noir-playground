import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Search,
  Download,
  ExternalLink,
  Info
} from 'lucide-react';

interface SVGFlamegraphViewerProps {
  svgContent?: string;
  onFunctionClick?: (functionName: string) => void;
  onLineClick?: (lineNumber: number) => void;
  className?: string;
}

interface SVGElement {
  functionName: string;
  lineRange: string;
  constraints: number;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
}

export const SVGFlamegraphViewer: React.FC<SVGFlamegraphViewerProps> = ({
  svgContent,
  onFunctionClick,
  onLineClick,
  className = ''
}) => {
  console.log("🚀 ~ SVGFlamegraphViewer ~ svgContent:", svgContent)
  const svgRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedElements, setHighlightedElements] = useState<Set<string>>(new Set());
  const [svgElements, setSvgElements] = useState<SVGElement[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Parse SVG content and extract interactive elements
  useEffect(() => {
    if (!svgContent) {
      setSvgElements([]);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const parser = new DOMParser();
      const svgDoc = parser.parseFromString(svgContent, 'image/svg+xml');
      
      // Check for parsing errors
      const parserError = svgDoc.querySelector('parsererror');
      if (parserError) {
        throw new Error('Failed to parse SVG content');
      }

      // Extract all rect elements with title attributes (these contain function data)
      const rects = svgDoc.querySelectorAll('rect[title]');
      const elements: SVGElement[] = [];

      rects.forEach((rect) => {
        const title = rect.getAttribute('title');
        if (!title) return;

        // Parse title format: "main:1-5: 156 constraints"
        const match = title.match(/(\w+):(\d+-\d+):\s*(\d+)\s*constraints/);
        if (match) {
          const [, functionName, lineRange, constraints] = match;
          
          elements.push({
            functionName,
            lineRange,
            constraints: parseInt(constraints, 10),
            x: parseFloat(rect.getAttribute('x') || '0'),
            y: parseFloat(rect.getAttribute('y') || '0'),
            width: parseFloat(rect.getAttribute('width') || '0'),
            height: parseFloat(rect.getAttribute('height') || '0'),
            color: rect.getAttribute('fill') || '#000000'
          });
        }
      });

      setSvgElements(elements);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse SVG');
      setSvgElements([]);
    } finally {
      setIsLoading(false);
    }
  }, [svgContent]);

  // Handle search highlighting


  // Search functionality
  useEffect(() => {
    if (!searchQuery.trim()) {
      setHighlightedElements(new Set());
      return;
    }

    const query = searchQuery.toLowerCase();
    const highlighted = new Set<string>();

    svgElements.forEach(element => {
      if (
        element.functionName.toLowerCase().includes(query) ||
        element.lineRange.includes(query) ||
        element.constraints.toString().includes(query)
      ) {
        highlighted.add(element.functionName);
      }
    });

    setHighlightedElements(highlighted);
  }, [searchQuery, svgElements]);

  // Handle function clicks
  const handleFunctionClick = useCallback((functionName: string) => {
    onFunctionClick?.(functionName);
  }, [onFunctionClick]);

  // Handle line clicks
  const handleLineClick = useCallback((lineNumber: number) => {
    onLineClick?.(lineNumber);
  }, [onLineClick]);

  // Export functions
  const handleExportPNG = useCallback(() => {
    if (!svgRef.current) return;
    
    // Create a canvas and draw the SVG
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const svgElement = svgRef.current.querySelector('svg');
    if (!svgElement) return;

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const img = new Image();
    
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      
      // Download the canvas as PNG
      const link = document.createElement('a');
      link.download = 'flamegraph.png';
      link.href = canvas.toDataURL();
      link.click();
    };
    
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  }, []);

  const handleExportSVG = useCallback(() => {
    if (!svgContent) return;
    
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'flamegraph.svg';
    link.click();
    URL.revokeObjectURL(url);
  }, [svgContent]);

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
      <div className="flex-1 overflow-auto p-4">
        <div 
          ref={svgRef}
          className="relative"
        >
          <div 
            dangerouslySetInnerHTML={{ __html: svgContent }}
            className="cursor-pointer"
            onClick={(e) => {
              // Handle clicks on SVG elements
              const target = e.target as HTMLElement;
              if (target.tagName === 'rect' && target.getAttribute('title')) {
                const title = target.getAttribute('title')!;
                const match = title.match(/(\w+):(\d+-\d+):\s*(\d+)\s*constraints/);
                if (match) {
                  const [, functionName, lineRange] = match;
                  handleFunctionClick(functionName);
                  
                  // Extract line numbers and trigger line click
                  const lineMatch = lineRange.match(/(\d+)-(\d+)/);
                  if (lineMatch) {
                    const startLine = parseInt(lineMatch[1], 10);
                    handleLineClick(startLine);
                  }
                }
              }
            }}
          />
          
          {/* Search highlighting overlay */}
          {searchQuery && highlightedElements.size > 0 && (
            <div className="absolute inset-0 pointer-events-none">
              {svgElements
                .filter(element => highlightedElements.has(element.functionName))
                .map((element, index) => (
                  <div
                    key={index}
                    className="absolute border-2 border-yellow-400 bg-yellow-400/20 animate-pulse"
                    style={{
                      left: element.x,
                      top: element.y,
                      width: element.width,
                      height: element.height,
                      zIndex: 10
                    }}
                  />
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Function Summary */}
      {svgElements.length > 0 && (
        <div className="p-3 border-t border-border bg-muted/20">
          <h3 className="text-xs font-medium mb-2">Function Summary</h3>
          <div className="space-y-1">
            {svgElements.slice(0, 3).map((element, index) => (
              <div key={index} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: element.color }}
                  />
                  <span className="font-medium">{element.functionName}</span>
                  <span className="text-muted-foreground">({element.lineRange})</span>
                </div>
                <Badge variant="outline" className="text-xs">
                  {element.constraints} constraints
                </Badge>
              </div>
            ))}
            {svgElements.length > 3 && (
              <div className="text-xs text-muted-foreground text-center">
                +{svgElements.length - 3} more functions
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
