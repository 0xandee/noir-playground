import React, { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { OptimizationSuggestion } from '@/types/optimizationInsights';

interface OptimizationInsightsTableViewProps {
  suggestions: OptimizationSuggestion[];
  onLineClick?: (lineNumber: number) => void;
  className?: string;
}

type SortField = 'lineNumber' | 'severity' | 'impact';
type SortDirection = 'asc' | 'desc';

/**
 * Get numeric value for severity for sorting
 */
const getSeverityValue = (severity: string): number => {
  switch (severity) {
    case 'high':
      return 3;
    case 'medium':
      return 2;
    case 'low':
      return 1;
    default:
      return 0;
  }
};

export const OptimizationInsightsTableView: React.FC<OptimizationInsightsTableViewProps> = ({
  suggestions,
  onLineClick,
  className = ''
}) => {
  const [sortField, setSortField] = useState<SortField>('lineNumber');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Filter and sort data
  const processedData = useMemo(() => {
    return [...suggestions].sort((a, b) => {
      let aValue: number;
      let bValue: number;

      switch (sortField) {
        case 'lineNumber':
          aValue = a.lineNumber;
          bValue = b.lineNumber;
          break;
        case 'severity':
          aValue = getSeverityValue(a.severity);
          bValue = getSeverityValue(b.severity);
          break;
        case 'impact':
          aValue = a.impact.estimatedSavings;
          bValue = b.impact.estimatedSavings;
          break;
        default:
          return 0;
      }

      if (sortDirection === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });
  }, [suggestions, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc'); // Default to descending for new field
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return null;
    }
    return sortDirection === 'asc'
      ? <ArrowUp className="h-3 w-3 ml-0.5" />
      : <ArrowDown className="h-3 w-3 ml-0.5" />;
  };

  const handleRowClick = (item: OptimizationSuggestion) => {
    if (onLineClick && item.lineNumber > 0) {
      onLineClick(item.lineNumber);
    }
  };

  const truncateText = (text: string, maxLength: number = 80): string => {
    return text.length > maxLength ? text.substring(0, maxLength - 3) + '...' : text;
  };

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Table */}
      <div className="flex-1 overflow-auto">
        <Table className="border-b">
          <TableHeader>
            <TableRow>
              <TableHead className="w-20 text-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('lineNumber')}
                  className="h-auto p-0 font-medium hover:bg-transparent gap-0"
                  style={{ fontSize: '13px' }}
                >
                  Line
                  {getSortIcon('lineNumber')}
                </Button>
              </TableHead>
              <TableHead>
                <span className="font-medium" style={{ fontSize: '13px' }}>
                  Code
                </span>
              </TableHead>
              <TableHead>
                <span className="font-medium" style={{ fontSize: '13px' }}>
                  Issue
                </span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {processedData.map((item, index) => (
              <TableRow
                key={item.id || `suggestion-${index}`}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleRowClick(item)}
              >
                <TableCell className="font-mono text-center border-r" style={{ fontSize: '13px' }}>
                  {item.lineNumber > 0 ? item.lineNumber : '-'}
                </TableCell>
                <TableCell className="font-mono max-w-md border-r" style={{ fontSize: '13px' }}>
                  {item.codeSnippet ? (
                    <span title={item.codeSnippet}>
                      {truncateText(item.codeSnippet, 60)}
                    </span>
                  ) : (
                    <span className="text-muted-foreground italic">-</span>
                  )}
                </TableCell>
                <TableCell style={{ fontSize: '13px' }}>
                  <div>{item.description}</div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {processedData.length === 0 && (
          <div className="flex items-center justify-center p-8 text-muted-foreground">
            <div className="text-center">
              <p>No optimization suggestions available</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

