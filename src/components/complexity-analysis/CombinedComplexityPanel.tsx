import React, { useState, useRef, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Info, BarChart3 } from 'lucide-react';
import { SVGFlamegraphViewer } from './SVGFlamegraphViewer';
import { CircuitMetrics } from './CircuitMetrics';
import { NoirProfilerService, ProfilerResult } from '@/services/NoirProfilerService';


interface CombinedComplexityPanelProps {
  sourceCode: string;
  cargoToml?: string;
  onLineClick?: (lineNumber: number) => void;
  onFunctionClick?: (functionName: string) => void;
  className?: string;
  enableHeatmap?: boolean;
}

export const CombinedComplexityPanel: React.FC<CombinedComplexityPanelProps> = ({
  sourceCode,
  cargoToml,
  onLineClick,
  onFunctionClick,
  className,
  enableHeatmap = false
}) => {
  const [selectedView, setSelectedView] = useState<'acir' | 'gates'>('acir');

  const [profilerResult, setProfilerResult] = useState<ProfilerResult | null>(null);
  const [isProfiling, setIsProfiling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastProfiled, setLastProfiled] = useState<Date | null>(null);

  const profilerService = useMemo(() => new NoirProfilerService(), []);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const prevEnableHeatmapRef = useRef<boolean>(enableHeatmap);

  const handleProfiling = useCallback(async () => {
    if (!sourceCode.trim()) {
      setError('No source code to profile');
      return;
    }
    setIsProfiling(true);
    setError(null);
    try {
      const result = await profilerService.profileCircuit({
        sourceCode: sourceCode.trim(),
        cargoToml: cargoToml || undefined
      });

      setProfilerResult(result);
      setLastProfiled(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Profiling failed');
    } finally {
      setIsProfiling(false);
    }
  }, [sourceCode, cargoToml, profilerService]);



  const handleRefresh = () => {
    if (sourceCode.trim() && enableHeatmap) {
      handleProfiling();
    }
  };

  const handleFunctionClick = (functionName: string) => {
    onFunctionClick?.(functionName);

    // Highlight the function in the SVG viewer
    // This could be enhanced with more sophisticated highlighting
  };

  const handleLineClick = (lineNumber: number) => {
    onLineClick?.(lineNumber);

    // This could trigger scrolling to the line in the editor
  };

  // Auto-profile when source code changes (with debouncing) - only if heatmap is enabled
  React.useEffect(() => {
    if (!sourceCode.trim() || !enableHeatmap) return;

    // Clear any existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Set new timeout
    debounceTimeoutRef.current = setTimeout(() => {
      if (sourceCode.trim() && enableHeatmap) {
        handleProfiling();
      }
    }, 3000); // 3-second delay

    // Cleanup function to clear timeout if effect runs again
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [sourceCode, handleProfiling]);

  // Auto-analyze immediately when heatmap is turned on (if code exists)
  React.useEffect(() => {
    const prevEnableHeatmap = prevEnableHeatmapRef.current;
    prevEnableHeatmapRef.current = enableHeatmap;

    // Only trigger analysis if heatmap was just turned on (false -> true) and we have code
    if (!prevEnableHeatmap && enableHeatmap && sourceCode.trim()) {
      handleProfiling();
    }
  }, [enableHeatmap, sourceCode, handleProfiling]);

  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  // Helper function to get current SVG content based on selection
  const getCurrentSVGContent = () => {
    if (!profilerResult) return '';
    
    switch (selectedView) {
      case 'acir':
        return profilerResult.acirSVG || '';
      case 'gates':
        return profilerResult.gatesSVG || '';
      default:
        return profilerResult.acirSVG || '';
    }
  };



  return (
    <div className={`h-full flex flex-col ${className || ''}`}>
      <header className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-medium">Complexity Analysis</h2>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isProfiling || !sourceCode.trim() || !enableHeatmap}
            title={enableHeatmap ? "Refresh analysis" : "Enable heatmap to analyze"}
          >
            <RefreshCw className={`h-3 w-3 ${isProfiling ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </header>

      {!profilerResult && !isProfiling && (
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center text-muted-foreground">
            <Info className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No complexity analysis available</p>
            <p className="text-xs mt-1">
              {enableHeatmap ? "Start typing or click refresh to analyze" : "Enable heatmap to start analysis"}
            </p>
          </div>
        </div>
      )}

      {isProfiling && (
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center text-muted-foreground">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p>Analyzing circuit complexity...</p>
            <p className="text-xs mt-1">This may take a few seconds</p>
          </div>
        </div>
      )}

      {profilerResult && !isProfiling && (
        <div className="flex-1 p-4 overflow-hidden">
          {/* Circuit Metrics - Show at the top if available */}
          {profilerResult.circuitMetrics && (
            <div className="mb-4">
              <CircuitMetrics 
                metrics={profilerResult.circuitMetrics} 
                className="w-full"
              />
            </div>
          )}

          {/* View Toggle Buttons */}
          <div className="flex gap-2 mb-4 justify-center">
            <Button
              variant={selectedView === 'acir' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedView('acir')}
              className="text-xs px-4"
            >
              ACIR Opcodes
            </Button>
            <Button
              variant={selectedView === 'gates' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedView('gates')}
              className="text-xs px-4"
            >
              Proving Gates
            </Button>
          </div>
          
          {/* SVG Viewer */}
          <SVGFlamegraphViewer
            svgContent={getCurrentSVGContent()}
            onFunctionClick={handleFunctionClick}
            onLineClick={handleLineClick}
            className="h-full"
          />
        </div>
      )}

      {error && (
        <div className="p-4 border-t border-border bg-destructive/10">
          <div className="flex items-center gap-2 text-destructive">
            <Info className="h-4 w-4" />
            <span className="text-sm font-medium">Error:</span>
            <span className="text-sm">{error}</span>
          </div>
        </div>
      )}
    </div>
  );
};


