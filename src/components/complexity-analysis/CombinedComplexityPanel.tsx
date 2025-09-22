import React, { useState, useRef, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Info, BarChart3, Table, Activity } from 'lucide-react';
import { SVGFlamegraphViewer } from './SVGFlamegraphViewer';
import { CircuitMetrics } from './CircuitMetrics';
import { ComplexityTableView } from './ComplexityTableView';
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
  const [viewMode, setViewMode] = useState<'table' | 'flamegraph'>('table');
  const [profilerResult, setProfilerResult] = useState<ProfilerResult | null>(null);
  const [isProfiling, setIsProfiling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastProfiled, setLastProfiled] = useState<Date | null>(null);

  const profilerService = useMemo(() => new NoirProfilerService(), []);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const prevEnableHeatmapRef = useRef<boolean>(enableHeatmap);
  const shouldProfileRef = useRef<boolean>(false);
  const profilingQueuedRef = useRef<boolean>(false);

  // Memoize table data to prevent unnecessary re-renders
  const tableData = useMemo(() => {
    return profilerResult?.complexityReport
      ? profilerService.getTableData(profilerResult.complexityReport)
      : [];
  }, [profilerResult?.complexityReport, profilerService]);

  const handleProfiling = useCallback(async () => {
    if (!sourceCode.trim()) {
      setError('No source code to profile');
      return;
    }

    // Prevent duplicate profiling calls
    if (isProfiling || profilingQueuedRef.current) {
      return;
    }

    profilingQueuedRef.current = true;
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
      profilingQueuedRef.current = false;
    }
  }, [sourceCode, cargoToml, profilerService, isProfiling]);



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
    // Only run this effect for source code changes, not heatmap toggles
    if (!sourceCode.trim() || !enableHeatmap) {
      shouldProfileRef.current = false;
      return;
    }

    shouldProfileRef.current = true;

    // Clear any existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Set new timeout
    debounceTimeoutRef.current = setTimeout(() => {
      if (shouldProfileRef.current && sourceCode.trim() && enableHeatmap && !isProfiling && !profilingQueuedRef.current) {
        handleProfiling();
      }
    }, 3000); // 3-second delay

    // Cleanup function to clear timeout if effect runs again
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceCode]); // Only trigger on source code changes, not heatmap toggle

  // Auto-analyze immediately when heatmap is turned on (if code exists)
  React.useEffect(() => {
    const prevEnableHeatmap = prevEnableHeatmapRef.current;
    prevEnableHeatmapRef.current = enableHeatmap;

    // Only trigger analysis if heatmap was just turned on (false -> true) and we have code
    // Also make sure there's no pending timeout to avoid conflicts
    if (!prevEnableHeatmap && enableHeatmap && sourceCode.trim() && !isProfiling && !debounceTimeoutRef.current && !profilingQueuedRef.current) {
      handleProfiling();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enableHeatmap]); // Only trigger on heatmap toggle, not source code changes

  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);




  return (
    <div className={`h-full flex flex-col ${className || ''}`}>
      <header className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-medium">Complexity Analysis</h2>
        </div>

        <div className="flex items-center gap-2">
          {/* View Toggle Buttons */}
          {profilerResult && (
            <div className="flex items-center gap-1 mr-2">
              <Button
                variant={viewMode === 'table' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('table')}
                className="h-7 px-2"
              >
                <Table className="h-3 w-3 mr-1" />
                Table
              </Button>
              <Button
                variant={viewMode === 'flamegraph' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('flamegraph')}
                className="h-7 px-2"
              >
                <Activity className="h-3 w-3 mr-1" />
                Flamegraph
              </Button>
            </div>
          )}

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
            <p className="mt-1" style={{fontSize: '13px'}}>
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
            <p className="mt-1" style={{fontSize: '13px'}}>This may take a few seconds</p>
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

          {/* Content Area - Flamegraph or Table View */}
          <div className="h-full">
            {viewMode === 'flamegraph' ? (
              /* Dual SVG Viewers - Vertical Stack */
              <div className="flex flex-col gap-4 h-full">
                {/* ACIR Opcodes Flamegraph */}
                <div className="flex-1 min-h-0">
                  <SVGFlamegraphViewer
                    title="ACIR Opcodes"
                    svgContent={profilerResult.acirSVG || ''}
                    onFunctionClick={handleFunctionClick}
                    onLineClick={handleLineClick}
                    className="h-full"
                  />
                </div>

                {/* Proving Gates Flamegraph */}
                <div className="flex-1 min-h-0">
                  <SVGFlamegraphViewer
                    title="Proving Gates"
                    svgContent={profilerResult.gatesSVG || ''}
                    onFunctionClick={handleFunctionClick}
                    onLineClick={handleLineClick}
                    className="h-full"
                  />
                </div>
              </div>
            ) : (
              /* Table View */
              <div className="h-full">
                <ComplexityTableView
                  data={tableData}
                  onLineClick={handleLineClick}
                  className="h-full"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 border-t border-border bg-destructive/10">
          <div className="flex items-center gap-2 text-destructive">
            <Info className="h-4 w-4" />
            <span className="font-medium" style={{fontSize: '13px'}}>Error:</span>
            <span style={{fontSize: '13px'}}>{error}</span>
          </div>
        </div>
      )}
    </div>
  );
};


