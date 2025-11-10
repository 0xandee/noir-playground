import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Zap } from 'lucide-react';
import { OptimizationInsightsReport } from '@/types/optimizationInsights';
import { OptimizationInsightsTableView } from './OptimizationInsightsTableView';

interface OptimizationInsightsViewProps {
  report: OptimizationInsightsReport;
  onLineClick?: (lineNumber: number) => void;
}

/**
 * Get color for circuit complexity badge
 */
const getComplexityColor = (complexity: string) => {
  switch (complexity) {
    case 'low':
      return 'bg-green-500 hover:bg-green-600';
    case 'medium':
      return 'bg-yellow-500 hover:bg-yellow-600';
    case 'high':
      return 'bg-red-500 hover:bg-red-600';
    default:
      return 'bg-gray-500 hover:bg-gray-600';
  }
};

/**
 * Get description for circuit complexity
 */
const getComplexityDescription = (complexity: string, gates: number) => {
  switch (complexity) {
    case 'low':
      return `Your circuit has ${gates.toLocaleString()} gates, which is relatively simple and should prove quickly.`;
    case 'medium':
      return `Your circuit has ${gates.toLocaleString()} gates. This is moderate complexity with reasonable proving times.`;
    case 'high':
      return `Your circuit has ${gates.toLocaleString()} gates, which is quite complex. Consider optimization to reduce proving time.`;
    default:
      return '';
  }
};

export const OptimizationInsightsView: React.FC<
  OptimizationInsightsViewProps
> = ({ report, onLineClick }) => {

  // Empty state
  if (report.suggestions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <div className="rounded-full bg-green-100 dark:bg-green-900 p-3 mb-4">
          <Zap className="h-8 w-8 text-green-600 dark:text-green-400" />
        </div>
        <h3 className="text-lg font-semibold mb-2">
          No Optimization Suggestions
        </h3>
        <p className="text-sm text-muted-foreground max-w-md mb-4">
          {getComplexityDescription(
            report.circuitComplexity,
            report.totalGates
          )}
        </p>
        <Badge
          className={`${getComplexityColor(report.circuitComplexity)} text-white`}
        >
          {report.circuitComplexity.toUpperCase()} COMPLEXITY
        </Badge>
      </div>
    );
  }

  return (
    <OptimizationInsightsTableView
      suggestions={report.suggestions}
      onLineClick={onLineClick}
    />
  );
};
