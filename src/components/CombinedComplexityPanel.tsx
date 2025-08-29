import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, RefreshCw, Info } from 'lucide-react';
import { SVGFlamegraphViewer } from './SVGFlamegraphViewer';
import { ComplexityAnalysisPanel } from './ComplexityAnalysisPanel';
import { ParsedFunctionData, LineComplexity } from './ComplexityAnalysisPanel';
import { NoirProfilerService, ProfilerResult } from '@/services/NoirProfilerService';
import { REAL_SVG_DATA, SVG_METADATA } from '@/services/RealSVGData';

interface CombinedComplexityPanelProps {
  sourceCode: string;
  onLineClick?: (lineNumber: number) => void;
  onFunctionClick?: (functionName: string) => void;
}

export const CombinedComplexityPanel: React.FC<CombinedComplexityPanelProps> = ({
  sourceCode,
  onLineClick,
  onFunctionClick
}) => {
  const [activeTab, setActiveTab] = useState('svg');
  const [selectedSVG, setSelectedSVG] = useState<'acir' | 'brilligQuotient' | 'brilligInvert' | 'mainGates'>('acir');
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
        sourceCode: sourceCode.trim()
      });

      setProfilerResult(result);
      setLastProfiled(new Date());
      
      console.log('[CombinedComplexityPanel] Profiling completed:', {
        source: result.source,
        functions: result.parsedData.length,
        totalConstraints: result.completeData.acir.totalConstraints
      });

    } catch (err) {
      console.error('[CombinedComplexityPanel] Profiling failed:', err);
      setError(err instanceof Error ? err.message : 'Profiling failed');
    } finally {
      setIsProfiling(false);
    }
  };

  const handleExportData = async () => {
    if (!profilerResult) return;

    try {
      const exportData = await profilerService.exportProfilingData();
      const blob = new Blob([exportData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `noir-complexity-analysis-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export data:', error);
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
    
    switch (selectedSVG) {
      case 'acir':
        return profilerResult.completeData.acir.svgContent || '';
      case 'brilligQuotient':
        return profilerResult.completeData.brillig.quotientSVG || '';
      case 'brilligInvert':
        return profilerResult.completeData.brillig.invertSVG || '';
      case 'mainGates':
        return profilerResult.completeData.mainGatesSVG || '';
      default:
        return '';
    }
  };

  return (
    <div className="h-full flex flex-col">
      <header className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-medium">Complexity Analysis</h2>
          {profilerResult && (
            <Badge variant={profilerResult.source === 'noir-profiler' ? 'default' : 'secondary'}>
              {profilerResult.source === 'noir-profiler' ? 'Live Data' : 'Mock Data'}
            </Badge>
          )}
          {lastProfiled && (
            <Badge variant="outline" className="text-xs">
              {lastProfiled.toLocaleTimeString()}
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {profilerResult && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleExportData}
              title="Export analysis data"
            >
              <Download className="h-3 w-3" />
            </Button>
          )}
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
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-2 mx-4 mt-2">
            <TabsTrigger value="svg">SVG Only</TabsTrigger>
            <TabsTrigger value="analysis">Analysis Only</TabsTrigger>
          </TabsList>



          <TabsContent value="svg" className="flex-1 p-4">
            {/* SVG Selector */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Select SVG View:</label>
              <select
                value={selectedSVG}
                onChange={(e) => setSelectedSVG(e.target.value as any)}
                className="w-full p-2 border border-border rounded bg-background text-foreground"
              >
                <option value="acir">ACIR Opcodes ({SVG_METADATA.acir.totalSamples} samples)</option>
                <option value="brilligQuotient">Brillig Integer Quotient ({SVG_METADATA.brilligQuotient.totalSamples} samples)</option>
                <option value="brilligInvert">Brillig Field Invert ({SVG_METADATA.brilligInvert.totalSamples} samples)</option>
                <option value="mainGates">Main Gates ({SVG_METADATA.mainGates.totalSamples} samples)</option>
              </select>
            </div>



            <SVGFlamegraphViewer
              svgContent={getCurrentSVGContent()}
              onFunctionClick={handleFunctionClick}
              onLineClick={handleLineClick}
              className="h-full"
            />
          </TabsContent>

          <TabsContent value="analysis" className="flex-1 p-4">
            <ComplexityAnalysisPanel
              parsedData={profilerResult.parsedData}
              lineComplexity={profilerResult.lineComplexity}
              onLineClick={handleLineClick}
              onFunctionClick={handleFunctionClick}
              error={profilerResult.error}
            />
          </TabsContent>
        </Tabs>
      )}

      {error && (
        <div className="p-4 border-t border-border bg-destructive/10">
          <div className="flex items-center gap-2 text-destructive">
            <Info className="h-4 w-4" />
            <span className="text-sm font-medium">Error:</span>
            <span className="text-sm">{error}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Using mock data for demonstration. Check the console for details.
          </p>
        </div>
      )}
    </div>
  );
};

/**
 * Generate SVG content from parsed function data for display
 * This is a fallback when the original SVG is not available
 */
function generateSVGFromParsedData(functions: ParsedFunctionData[]): string {
  if (functions.length === 0) return '';

  const width = 1200;
  const height = Math.max(800, functions.length * 60 + 100);
  
  let svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">`;

  functions.forEach((func, index) => {
    const y = index * 60 + 20;
    const barWidth = Math.min((func.constraintCount / 200) * width * 0.8, width * 0.8);
    
    svgContent += `
  <rect x="20" y="${y}" width="${barWidth}" height="40" fill="${func.color}" opacity="0.8">
    <title>${func.functionName}:${func.lineRange}: ${func.constraintCount} constraints</title>
  </rect>
  <text x="30" y="${y + 25}" font-size="12">${func.functionName} function (${func.constraintCount} constraints)</text>`;
  });

  svgContent += `
</svg>`;

  return svgContent;
}
