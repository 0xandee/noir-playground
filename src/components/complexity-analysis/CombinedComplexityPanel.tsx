import React, { useState, useRef, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Info, BarChart3, Table, Activity } from 'lucide-react';
import { SVGFlamegraphViewer } from './SVGFlamegraphViewer';
import { CircuitMetrics } from './CircuitMetrics';
import { ComplexityTableView } from './ComplexityTableView';
import { OptimizationInsightsView } from './OptimizationInsightsView';
import { NoirProfilerService, ProfilerResult } from '@/services/NoirProfilerService';
import { OptimizationAnalysisService } from '@/services/OptimizationAnalysisService';
import { LoadingState } from '@/components/ui/loading-state';


interface CombinedComplexityPanelProps {
  sourceCode: string;
  cargoToml?: string;
  onLineClick?: (lineNumber: number) => void;
  onFunctionClick?: (functionName: string) => void;
  className?: string;
  enableHeatmap?: boolean;
  onViewModeChange?: (viewMode: 'metrics' | 'flamegraph' | 'insights') => void;
  onRefresh?: () => void;
  viewMode?: 'metrics' | 'flamegraph' | 'insights';
  isProfiling?: boolean;
  profilerResult?: ProfilerResult | null;
  onProfilingStart?: () => void;
  onProfilingComplete?: (result: ProfilerResult) => void;
  onProfilingError?: (error: string) => void;
}

export const CombinedComplexityPanel: React.FC<CombinedComplexityPanelProps> = ({
  sourceCode,
  cargoToml,
  onLineClick,
  onFunctionClick,
  className,
  enableHeatmap = false,
  onViewModeChange,
  onRefresh,
  viewMode: externalViewMode,
  isProfiling: externalIsProfiling,
  profilerResult: externalProfilerResult,
  onProfilingStart,
  onProfilingComplete,
  onProfilingError
}) => {
  const [internalViewMode, setInternalViewMode] = useState<'metrics' | 'flamegraph' | 'insights'>('metrics');
  const [internalProfilerResult, setInternalProfilerResult] = useState<ProfilerResult | null>(null);
  const [internalIsProfiling, setInternalIsProfiling] = useState(false);

  // Use external state if provided, otherwise use internal state
  const viewMode = externalViewMode ?? internalViewMode;
  const profilerResult = externalProfilerResult ?? internalProfilerResult;
  const isProfiling = externalIsProfiling ?? internalIsProfiling;

  const setViewMode = (mode: 'metrics' | 'flamegraph' | 'insights') => {
    if (onViewModeChange) {
      onViewModeChange(mode);
    } else {
      setInternalViewMode(mode);
    }
  };

  const setProfilerResult = externalProfilerResult !== undefined ? () => {} : setInternalProfilerResult;
  const setIsProfiling = externalIsProfiling !== undefined ? () => {} : setInternalIsProfiling;
  const [error, setError] = useState<string | null>(null);
  const [lastProfiled, setLastProfiled] = useState<Date | null>(null);

  const profilerService = useMemo(() => new NoirProfilerService(), []);
  const optimizationAnalysisService = useMemo(() => new OptimizationAnalysisService(), []);
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

  // Memoize optimization insights report
  const optimizationReport = useMemo(() => {
    if (!profilerResult?.complexityReport || !sourceCode) {
      return null;
    }
    return optimizationAnalysisService.analyzeCircuit(
      profilerResult.complexityReport,
      sourceCode
    );
  }, [profilerResult?.complexityReport, sourceCode, optimizationAnalysisService]);

  const handleProfiling = useCallback(async () => {
    if (!sourceCode.trim()) {
      const errorMsg = 'No source code to profile';
      setError(errorMsg);
      if (onProfilingError) {
        onProfilingError(errorMsg);
      }
      return;
    }

    // Prevent duplicate profiling calls
    if (isProfiling || profilingQueuedRef.current) {
      return;
    }

    profilingQueuedRef.current = true;
    setIsProfiling(true);
    if (onProfilingStart) {
      onProfilingStart();
    }
    setError(null);
    try {
      const result = await profilerService.profileCircuit({
        sourceCode: sourceCode.trim(),
        cargoToml: cargoToml || undefined
      });

      setProfilerResult(result);
      setLastProfiled(new Date());
      if (onProfilingComplete) {
        onProfilingComplete(result);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Profiling failed';
      setError(errorMsg);
      if (onProfilingError) {
        onProfilingError(errorMsg);
      }
    } finally {
      setIsProfiling(false);
      profilingQueuedRef.current = false;
    }
  }, [sourceCode, cargoToml, profilerService, isProfiling, setIsProfiling, setProfilerResult, onProfilingStart, onProfilingComplete, onProfilingError]);



  const handleRefresh = () => {
    if (onRefresh) {
      onRefresh();
    } else {
      if (sourceCode.trim()) {
        handleProfiling();
      }
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
    if (!prevEnableHeatmap && enableHeatmap && sourceCode.trim() && !isProfiling && !profilingQueuedRef.current) {
      // Clear any pending timeout since we want immediate analysis when heatmap is toggled on
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
        debounceTimeoutRef.current = null;
      }
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
    <div className={`flex flex-col ${className || ''}`}>

      {!profilerResult && !isProfiling && (
        <div className="flex items-center justify-center p-8 min-h-[300px]">
          <div className="text-center text-muted-foreground">
            <Info className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No complexity analysis available</p>
            <p className="mt-1" style={{fontSize: '13px'}}>
              Click refresh to analyze circuit complexity
            </p>
          </div>
        </div>
      )}

      {isProfiling && (
        <LoadingState message="Analyzing circuit complexity..." />
      )}

      {profilerResult && !isProfiling && (
        <div className={viewMode === 'flamegraph' ? 'px-4 pt-4' : viewMode === 'insights' ? 'px-4 pt-4' : ''}>
          {/* Content Area - Flamegraph, Metrics, or Insights View */}
          <div>
            {viewMode === 'flamegraph' ? (
              /* Dual SVG Viewers - Vertical Stack */
              <div className="flex flex-col gap-4 pb-4">
                {/* ACIR Opcodes Flamegraph */}
                <div className="min-h-[400px]">
                  <SVGFlamegraphViewer
                    title="ACIR Opcodes"
                    svgContent={profilerResult.acirSVG || ''}
                    onFunctionClick={handleFunctionClick}
                    onLineClick={handleLineClick}
                    className=""
                  />
                </div>

                {/* Proving Gates Flamegraph */}
                <div className="min-h-[400px]">
                  <SVGFlamegraphViewer
                    title="Proving Gates"
                    svgContent={profilerResult.gatesSVG || ''}
                    onFunctionClick={handleFunctionClick}
                    onLineClick={handleLineClick}
                    className=""
                  />
                </div>
              </div>
            ) : viewMode === 'insights' ? (
              /* Optimization Insights View */
              <div className="pb-4">
                {optimizationReport ? (
                  <OptimizationInsightsView
                    report={optimizationReport}
                    onLineClick={handleLineClick}
                  />
                ) : (
                  <div className="flex items-center justify-center p-8 min-h-[300px]">
                    <div className="text-center text-muted-foreground">
                      <Info className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No optimization insights available</p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Metrics View */
              <div className="flex flex-col">
                {/* Circuit Metrics - Show in metrics view */}
                {profilerResult.circuitMetrics && (
                  <div className="p-4 border-b border-border">
                    <CircuitMetrics
                      metrics={profilerResult.circuitMetrics}
                      className="w-full"
                    />
                  </div>
                )}
                <div>
                  <ComplexityTableView
                    data={tableData}
                    onLineClick={handleLineClick}
                    className=""
                  />
                </div>
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


