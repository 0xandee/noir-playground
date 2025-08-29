import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Info, BarChart3 } from 'lucide-react';
import { SVGFlamegraphViewer } from './SVGFlamegraphViewer';
import { NoirProfilerService, ProfilerResult } from '@/services/NoirProfilerService';


interface CombinedComplexityPanelProps {
  sourceCode: string;
  cargoToml?: string;
  onLineClick?: (lineNumber: number) => void;
  onFunctionClick?: (functionName: string) => void;
  className?: string;
}

export const CombinedComplexityPanel: React.FC<CombinedComplexityPanelProps> = ({
  sourceCode,
  cargoToml,
  onLineClick,
  onFunctionClick,
  className
}) => {
  const [selectedView, setSelectedView] = useState<'acir' | 'gates'>('acir');

  const [profilerResult, setProfilerResult] = useState<ProfilerResult | null>(null);
  const [isProfiling, setIsProfiling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastProfiled, setLastProfiled] = useState<Date | null>(null);

  const profilerService = new NoirProfilerService();

  const handleProfiling = async () => {
    if (!sourceCode.trim()) {
      setError('No source code to profile');
      return;
    }

    setIsProfiling(true);
    setError(null);

    try {
      console.log('[CombinedComplexityPanel] Starting profiling...');

      const result = await profilerService.profileCircuit({
        sourceCode: sourceCode.trim(),
        cargoToml: cargoToml || undefined
      });

      setProfilerResult(result);
      setLastProfiled(new Date());

      console.log('[CombinedComplexityPanel] Profiling completed:', {
        source: result.source,
        acirSVGLength: result.acirSVG.length,
        gatesSVGLength: result.gatesSVG.length
      });

    } catch (err) {
      console.error('[CombinedComplexityPanel] Profiling failed:', err);
      setError(err instanceof Error ? err.message : 'Profiling failed');
    } finally {
      setIsProfiling(false);
    }
  };



  const handleRefresh = () => {
    if (sourceCode.trim()) {
      handleProfiling();
    }
  };

  const handleFunctionClick = (functionName: string) => {
    onFunctionClick?.(functionName);

    // Highlight the function in the SVG viewer
    // This could be enhanced with more sophisticated highlighting
    console.log(`[CombinedComplexityPanel] Function clicked: ${functionName}`);
  };

  const handleLineClick = (lineNumber: number) => {
    onLineClick?.(lineNumber);

    // This could trigger scrolling to the line in the editor
    console.log(`[CombinedComplexityPanel] Line clicked: ${lineNumber}`);
  };

  // Auto-profile when source code changes (with debouncing)
  React.useEffect(() => {
    if (!sourceCode.trim()) return;

    const timeoutId = setTimeout(() => {
      if (sourceCode.trim().length > 50) { // Only profile substantial code
        handleProfiling();
      }
    }, 2000); // Wait 2 seconds after user stops typing

    return () => clearTimeout(timeoutId);
  }, [sourceCode]);

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
            disabled={isProfiling || !sourceCode.trim()}
            title="Refresh analysis"
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
            <p className="text-xs mt-1">Start typing or click refresh to analyze</p>
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
        <div className="flex-1 p-4">
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


