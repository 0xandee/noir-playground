import React, { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ComplexityTableData } from '@/services/NoirProfilerService';

interface ComplexityTableViewProps {
  data: ComplexityTableData[];
  onLineClick?: (lineNumber: number) => void;
  className?: string;
}

type SortField = 'lineNumber' | 'expression' | 'acirOpcodes' | 'percentage';
type SortDirection = 'asc' | 'desc';

export const ComplexityTableView: React.FC<ComplexityTableViewProps> = ({
  data,
  onLineClick,
  className = ''
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('percentage');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Helper function to decode HTML entities
  const decodeHtmlEntities = (text: string): string => {
    return text
      .replace(/&gt;/g, '>')
      .replace(/&lt;/g, '<')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
  };

  // Filter and sort data
  const processedData = useMemo(() => {
    let filteredData = data;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filteredData = data.filter(item => {
        const decodedExpression = decodeHtmlEntities(item.expression).toLowerCase();
        return (
          decodedExpression.includes(query) ||
          item.lineNumber.toString().includes(query) ||
          item.fileName.toLowerCase().includes(query)
        );
      });
    }

    // Apply sorting
    return filteredData.sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortField) {
        case 'lineNumber':
          aValue = a.lineNumber;
          bValue = b.lineNumber;
          break;
        case 'expression':
          aValue = decodeHtmlEntities(a.expression).toLowerCase();
          bValue = decodeHtmlEntities(b.expression).toLowerCase();
          break;
        case 'acirOpcodes':
          aValue = a.acirOpcodes;
          bValue = b.acirOpcodes;
          break;
        case 'percentage':
          aValue = a.percentage;
          bValue = b.percentage;
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
  }, [data, searchQuery, sortField, sortDirection]);

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
      return <ArrowUpDown className="h-3 w-3 ml-1 opacity-50" />;
    }
    return sortDirection === 'asc'
      ? <ArrowUp className="h-3 w-3 ml-1" />
      : <ArrowDown className="h-3 w-3 ml-1" />;
  };

  const handleRowClick = (item: ComplexityTableData) => {
    if (onLineClick) {
      onLineClick(item.lineNumber);
    }
  };

  const truncateExpression = (expression: string, maxLength: number = 60): string => {
    const decoded = decodeHtmlEntities(expression);
    return decoded.length > maxLength ? decoded.substring(0, maxLength - 3) + '...' : decoded;
  };

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Search Bar */}
      {/* <div className="p-4 border-b border-border bg-muted/20">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search expressions, lines, or files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
        {searchQuery && (
          <div className="mt-2 text-muted-foreground" style={{fontSize: '13px'}}>
            {processedData.length} of {data.length} expressions shown
          </div>
        )}
      </div> */}

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-20">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('lineNumber')}
                  className="h-auto p-0 font-medium hover:bg-transparent"
                  style={{fontSize: '13px'}}
                >
                  Line
                  {getSortIcon('lineNumber')}
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('expression')}
                  className="h-auto p-0 font-medium hover:bg-transparent"
                  style={{fontSize: '13px'}}
                >
                  Expression
                  {getSortIcon('expression')}
                </Button>
              </TableHead>
              <TableHead className="w-24">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('acirOpcodes')}
                  className="h-auto p-0 font-medium hover:bg-transparent"
                  style={{fontSize: '13px'}}
                >
                  ACIR
                  {getSortIcon('acirOpcodes')}
                </Button>
              </TableHead>
              <TableHead className="w-24">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('percentage')}
                  className="h-auto p-0 font-medium hover:bg-transparent"
                  style={{fontSize: '13px'}}
                >
                  %
                  {getSortIcon('percentage')}
                </Button>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {processedData.map((item, index) => (
              <TableRow
                key={`${item.lineNumber}-${item.column}-${index}`}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleRowClick(item)}
                title="Click to jump to line in code"
              >
                <TableCell className="font-mono" style={{fontSize: '13px'}}>
                  <Badge variant="outline" className="font-mono">
                    {item.lineNumber}
                  </Badge>
                </TableCell>
                <TableCell className="font-mono max-w-md" style={{fontSize: '13px'}}>
                  <span title={decodeHtmlEntities(item.expression)}>
                    {truncateExpression(item.expression)}
                  </span>
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="secondary">
                    {item.acirOpcodes}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  <Badge
                    variant={item.percentage > 10 ? "destructive" : item.percentage > 5 ? "default" : "outline"}
                  >
                    {item.percentage.toFixed(2)}%
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {processedData.length === 0 && (
          <div className="flex items-center justify-center p-8 text-muted-foreground">
            <div className="text-center">
              <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No expressions found</p>
              <p className="mt-1" style={{fontSize: '13px'}}>
                {searchQuery ? 'Try adjusting your search query' : 'No data available'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};