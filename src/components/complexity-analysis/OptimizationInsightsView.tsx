import React from 'react';
import { OptimizationInsightsReport } from '@/types/optimizationInsights';
import { OptimizationInsightsTableView } from './OptimizationInsightsTableView';

interface OptimizationInsightsViewProps {
  report: OptimizationInsightsReport;
  onLineClick?: (lineNumber: number) => void;
}

export const OptimizationInsightsView: React.FC<
  OptimizationInsightsViewProps
> = ({ report, onLineClick }) => {

  // Empty state
  if (report.suggestions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <h3 className="text-lg font-semibold mb-2">
          No Optimization Suggestions
        </h3>
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
