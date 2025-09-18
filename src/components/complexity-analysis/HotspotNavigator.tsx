/**
 * HotspotNavigator - Displays circuit complexity hotspots with navigation
 */

import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Flame, 
  TrendingUp, 
  ArrowUp, 
  ArrowDown, 
  Target,
  Filter,
  SortAsc,
  SortDesc
} from 'lucide-react';
import { 
  CircuitComplexityReport, 
  LineMetrics, 
  FunctionMetrics, 
  MetricType 
} from '@/types/circuitMetrics';

interface HotspotNavigatorProps {
  report: CircuitComplexityReport;
  metricType: MetricType;
  onLineClick?: (lineNumber: number) => void;
  onFunctionClick?: (functionName: string, startLine: number) => void;
  selectedLine?: number;
  className?: string;
  maxHotspots?: number;
  showFunctions?: boolean;
}

type SortOrder = 'desc' | 'asc';
type ViewMode = 'lines' | 'functions' | 'mixed';

export const HotspotNavigator: React.FC<HotspotNavigatorProps> = ({
  report,
  metricType,
  onLineClick,
  onFunctionClick,
  selectedLine,
  className,
  maxHotspots = 10,
  showFunctions = true
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('lines');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [minThreshold, setMinThreshold] = useState<number>(1);

  // Get metric value from line or function
  const getMetricValue = (item: LineMetrics | FunctionMetrics): number => {
    switch (metricType) {
      case 'acir': return item.acirOpcodes;
      case 'brillig': return item.brilligOpcodes;
      case 'gates': return item.gates;
      default: return item.acirOpcodes + item.brilligOpcodes + item.gates;
    }
  };

  // Processed hotspot data
  const hotspots = useMemo(() => {
    const fileMetrics = report.files[0];
    if (!fileMetrics) return { lines: [], functions: [] };

    // Process lines
    const lines = fileMetrics.lines
      .filter(line => getMetricValue(line) >= minThreshold)
      .sort((a, b) => {
        const aValue = getMetricValue(a);
        const bValue = getMetricValue(b);
        return sortOrder === 'desc' ? bValue - aValue : aValue - bValue;
      })
      .slice(0, maxHotspots);

    // Process functions
    const functions = fileMetrics.functions
      .filter(func => getMetricValue(func) >= minThreshold)
      .sort((a, b) => {
        const aValue = getMetricValue(a);
        const bValue = getMetricValue(b);
        return sortOrder === 'desc' ? bValue - aValue : aValue - bValue;
      })
      .slice(0, maxHotspots);

    return { lines, functions };
  }, [report, metricType, sortOrder, minThreshold, maxHotspots, getMetricValue]);

  // Format metric value for display
  const formatMetricValue = (value: number): string => {
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}k`;
    }
    return value.toString();
  };

  // Get heat level color
  const getHeatColor = (normalizedHeat: number): string => {
    if (normalizedHeat >= 0.7) return 'text-red-500';
    if (normalizedHeat >= 0.4) return 'text-yellow-500';
    return 'text-green-500';
  };

  // Get metric type label
  const getMetricLabel = (): string => {
    switch (metricType) {
      case 'acir': return 'ACIR Opcodes';
      case 'brillig': return 'Brillig Opcodes';
      case 'gates': return 'Proving Gates';
      default: return 'Total Cost';
    }
  };

  // Render line hotspot item
  const renderLineHotspot = (line: LineMetrics, index: number) => {
    const metricValue = getMetricValue(line);
    const isSelected = selectedLine === line.lineNumber;

    return (
      <div
        key={`line-${line.lineNumber}`}
        className={`
          group cursor-pointer border rounded-lg p-3 transition-all hover:shadow-sm
          ${isSelected 
            ? 'border-primary bg-primary/5 shadow-sm' 
            : 'border-border hover:border-primary/50'
          }
        `}
        onClick={() => onLineClick?.(line.lineNumber)}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="h-5 px-2 text-xs">
              #{index + 1}
            </Badge>
            <span className="font-mono text-sm font-medium">
              Line {line.lineNumber}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Flame className={`h-3 w-3 ${getHeatColor(line.normalizedHeat)}`} />
            <span className="text-xs font-medium">
              {formatMetricValue(metricValue)}
            </span>
          </div>
        </div>

        <div className="text-xs text-muted-foreground mb-2">
          {line.percentage.toFixed(1)}% of total circuit cost
        </div>

        {line.expressions.length > 0 && (
          <div className="text-xs">
            <span className="text-muted-foreground">Expressions: </span>
            <span className="font-mono">
              {line.expressions.slice(0, 2).map(expr => 
                expr.expression.substring(0, 30) + (expr.expression.length > 30 ? '...' : '')
              ).join(', ')}
              {line.expressions.length > 2 && ` +${line.expressions.length - 2} more`}
            </span>
          </div>
        )}
      </div>
    );
  };

  // Render function hotspot item
  const renderFunctionHotspot = (func: FunctionMetrics, index: number) => {
    const metricValue = getMetricValue(func);

    return (
      <div
        key={`function-${func.functionName}`}
        className="group cursor-pointer border rounded-lg p-3 transition-all hover:shadow-sm hover:border-primary/50"
        onClick={() => onFunctionClick?.(func.functionName, func.startLine)}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="h-5 px-2 text-xs">
              #{index + 1}
            </Badge>
            <span className="font-mono text-sm font-medium">
              {func.functionName}()
            </span>
          </div>
          <div className="flex items-center gap-1">
            <TrendingUp className={`h-3 w-3 ${getHeatColor(func.normalizedHeat)}`} />
            <span className="text-xs font-medium">
              {formatMetricValue(metricValue)}
            </span>
          </div>
        </div>

        <div className="text-xs text-muted-foreground mb-1">
          Lines {func.startLine}-{func.endLine} • {func.percentage.toFixed(1)}% of total
        </div>

        <div className="text-xs text-muted-foreground">
          {func.expressionWidth}
        </div>
      </div>
    );
  };

  return (
    <div className={`h-full flex flex-col ${className || ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-medium">Hotspots</h3>
        </div>
        <Badge variant="outline" className="text-xs">
          {getMetricLabel()}
        </Badge>
      </div>

      {/* Controls */}
      <div className="p-3 border-b border-border space-y-3">
        <div className="flex items-center gap-2">
          <Select value={viewMode} onValueChange={(value: ViewMode) => setViewMode(value)}>
            <SelectTrigger className="h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="lines">Lines Only</SelectItem>
              {showFunctions && <SelectItem value="functions">Functions Only</SelectItem>}
              {showFunctions && <SelectItem value="mixed">Mixed View</SelectItem>}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
            className="h-7 px-2"
          >
            {sortOrder === 'desc' ? 
              <SortDesc className="h-3 w-3" /> : 
              <SortAsc className="h-3 w-3" />
            }
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-3 w-3 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Min:</span>
          <Select 
            value={minThreshold.toString()} 
            onValueChange={(value) => setMinThreshold(parseInt(value))}
          >
            <SelectTrigger className="h-7 text-xs flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1+ ops</SelectItem>
              <SelectItem value="5">5+ ops</SelectItem>
              <SelectItem value="10">10+ ops</SelectItem>
              <SelectItem value="50">50+ ops</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2">
          {viewMode === 'lines' && (
            <>
              {hotspots.lines.length === 0 ? (
                <div className="text-center py-8">
                  <Target className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">
                    No line hotspots found
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Try lowering the threshold
                  </p>
                </div>
              ) : (
                hotspots.lines.map((line, index) => renderLineHotspot(line, index))
              )}
            </>
          )}

          {viewMode === 'functions' && showFunctions && (
            <>
              {hotspots.functions.length === 0 ? (
                <div className="text-center py-8">
                  <TrendingUp className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">
                    No function hotspots found
                  </p>
                </div>
              ) : (
                hotspots.functions.map((func, index) => renderFunctionHotspot(func, index))
              )}
            </>
          )}

          {viewMode === 'mixed' && showFunctions && (
            <>
              {hotspots.lines.length === 0 && hotspots.functions.length === 0 ? (
                <div className="text-center py-8">
                  <Target className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">
                    No hotspots found
                  </p>
                </div>
              ) : (
                <>
                  {hotspots.functions.length > 0 && (
                    <>
                      <div className="text-xs font-medium text-muted-foreground mb-2">
                        Functions
                      </div>
                      {hotspots.functions.slice(0, 3).map((func, index) => 
                        renderFunctionHotspot(func, index)
                      )}
                      {hotspots.functions.length > 0 && hotspots.lines.length > 0 && (
                        <Separator className="my-3" />
                      )}
                    </>
                  )}
                  
                  {hotspots.lines.length > 0 && (
                    <>
                      <div className="text-xs font-medium text-muted-foreground mb-2">
                        Lines
                      </div>
                      {hotspots.lines.slice(0, 5).map((line, index) => 
                        renderLineHotspot(line, index)
                      )}
                    </>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </ScrollArea>

      {/* Footer with summary */}
      <div className="p-3 border-t border-border bg-muted/20">
        <div className="text-xs text-muted-foreground">
          Showing top {Math.min(maxHotspots, 
            viewMode === 'functions' ? hotspots.functions.length : 
            viewMode === 'lines' ? hotspots.lines.length :
            hotspots.lines.length + hotspots.functions.length
          )} hotspots
        </div>
        {report.totalAcirOpcodes + report.totalBrilligOpcodes + report.totalGates > 0 && (
          <div className="text-xs text-muted-foreground mt-1">
            Total circuit cost: {formatMetricValue(
              metricType === 'acir' ? report.totalAcirOpcodes :
              metricType === 'brillig' ? report.totalBrilligOpcodes :
              metricType === 'gates' ? report.totalGates :
              report.totalAcirOpcodes + report.totalBrilligOpcodes + report.totalGates
            )} {metricType === 'gates' ? 'gates' : 'ops'}
          </div>
        )}
      </div>
    </div>
  );
};