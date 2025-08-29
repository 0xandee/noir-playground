import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Flame, TrendingUp } from 'lucide-react';

export interface ParsedFunctionData {
  functionName: string;
  lineRange: string;
  constraintCount: number;
  color: string;
  width: number;
  depth: number;
  x: number;
  y: number;
}

export interface LineComplexity {
  lineNumber: number;
  lineContent: string;
  constraints: number;
  complexity: number; // 1-10 scale
  functionName: string;
  color: 'red' | 'yellow' | 'green';
}

export interface ComplexityMetrics {
  totalConstraints: number;
  totalFunctions: number;
  averageComplexity: number;
  performanceRating: 'excellent' | 'good' | 'needs-optimization';
  recommendations: string[];
}

interface ComplexityAnalysisPanelProps {
  svgContent?: string;
  parsedData?: ParsedFunctionData[];
  lineComplexity?: LineComplexity[];
  isProfiling?: boolean;
  error?: string;
  onLineClick?: (lineNumber: number) => void;
  onFunctionClick?: (functionName: string) => void;
}

export const ComplexityAnalysisPanel: React.FC<ComplexityAnalysisPanelProps> = ({
  svgContent,
  parsedData,
  lineComplexity,
  isProfiling = false,
  error,
  onLineClick,
  onFunctionClick
}) => {
  const [activeTab, setActiveTab] = useState('overview');

  // Calculate overall metrics
  const metrics: ComplexityMetrics = {
    totalConstraints: parsedData?.reduce((sum, func) => sum + func.constraintCount, 0) || 0,
    totalFunctions: parsedData?.length || 0,
    averageComplexity: parsedData?.length ? 
      Math.round(parsedData.reduce((sum, func) => sum + func.constraintCount, 0) / parsedData.length) : 0,
    performanceRating: getPerformanceRating(parsedData),
    recommendations: generateRecommendations(parsedData)
  };

  if (isProfiling) {
    return (
      <div className="h-full flex flex-col">
        <header className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/30">
          <div className="flex items-center gap-2">
            <Flame className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-medium">Complexity Analysis</h2>
          </div>
          <Badge variant="secondary" className="animate-pulse">
            Profiling...
          </Badge>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p>Analyzing circuit complexity...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex flex-col">
        <header className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/30">
          <div className="flex items-center gap-2">
            <Flame className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-medium">Complexity Analysis</h2>
          </div>
          <Badge variant="destructive">Error</Badge>
        </header>
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center text-muted-foreground">
                            <Flame className="h-8 w-8 mx-auto mb-2 text-destructive" />
            <p className="text-sm">{error}</p>
            <p className="text-xs mt-1">Using mock data for demonstration</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <header className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <Flame className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-medium">Complexity Analysis</h2>
        </div>
        <Badge variant="secondary">
          {metrics.totalConstraints} constraints
        </Badge>
      </header>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-2 mx-4 mt-2">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="functions">Functions</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="flex-1 p-4 space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1 text-xs">
                {metrics.recommendations.map((rec, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span className="text-muted-foreground">{rec}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {parsedData && parsedData.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Function Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {parsedData.map((func, index) => (
                    <div 
                      key={index}
                      className="flex items-center justify-between p-2 rounded bg-muted/50 hover:bg-muted/70 cursor-pointer transition-colors"
                      onClick={() => onFunctionClick?.(func.functionName)}
                    >
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: func.color }}
                        />
                        <span className="text-sm font-medium">{func.functionName}</span>
                        <span className="text-xs text-muted-foreground">({func.lineRange})</span>
                      </div>
                      <Badge variant="outline">{func.constraintCount} constraints</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="functions" className="flex-1 p-4">
          {parsedData && parsedData.length > 0 ? (
            <div className="space-y-3">
              {parsedData.map((func, index) => (
                <Card key={index}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-medium">{func.functionName}</h3>
                      <Badge variant="outline">{func.constraintCount} constraints</Badge>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Line Range:</span>
                        <span>{func.lineRange}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Complexity Score:</span>
                        <span>{getComplexityScore(func.constraintCount)}/10</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Call Depth:</span>
                        <span>{func.depth}</span>
                      </div>
                    </div>
                    <div className="mt-3">
                      <div className="w-full bg-muted rounded-full h-2">
                        <div 
                          className="h-2 rounded-full transition-all duration-300"
                          style={{ 
                            width: `${(func.constraintCount / metrics.totalConstraints) * 100}%`,
                            backgroundColor: func.color 
                          }}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-8">
                              <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No function data available</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="lines" className="flex-1 p-4">
          {lineComplexity && lineComplexity.length > 0 ? (
            <div className="space-y-2">
              {lineComplexity.map((line, index) => (
                <div 
                  key={index}
                  className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors hover:bg-muted/50 ${
                    line.constraints > 0 ? 'bg-muted/30' : ''
                  }`}
                  onClick={() => onLineClick?.(line.lineNumber)}
                >
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="w-8 text-center">
                      {line.lineNumber}
                    </Badge>
                    <span className="text-sm font-mono">{line.lineContent}</span>
                  </div>
                  {line.constraints > 0 && (
                    <div className="flex items-center gap-2">
                      <Badge variant={getComplexityBadgeVariant(line.complexity)}>
                        {line.complexity}/10
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {line.constraints} constraints
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-8">
                              <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No line complexity data available</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Helper functions
function getPerformanceRating(parsedData?: ParsedFunctionData[]): ComplexityMetrics['performanceRating'] {
  if (!parsedData || parsedData.length === 0) return 'needs-optimization';
  
  const totalConstraints = parsedData.reduce((sum, func) => sum + func.constraintCount, 0);
  const avgConstraints = totalConstraints / parsedData.length;
  
  if (avgConstraints < 50) return 'excellent';
  if (avgConstraints < 100) return 'good';
  return 'needs-optimization';
}

function getPerformanceBadgeVariant(rating: string) {
  switch (rating) {
    case 'excellent': return 'default';
    case 'good': return 'secondary';
    case 'needs-optimization': return 'destructive';
    default: return 'outline';
  }
}

function getComplexityScore(constraints: number): number {
  if (constraints < 20) return 1;
  if (constraints < 50) return 3;
  if (constraints < 100) return 5;
  if (constraints < 200) return 7;
  return 10;
}

function getComplexityBadgeVariant(score: number) {
  if (score <= 3) return 'default';
  if (score <= 6) return 'secondary';
  return 'destructive';
}

function generateRecommendations(parsedData?: ParsedFunctionData[]): string[] {
  if (!parsedData || parsedData.length === 0) {
    return ['Run profiling to get optimization recommendations'];
  }

  const recommendations: string[] = [];
  const totalConstraints = parsedData.reduce((sum, func) => sum + func.constraintCount, 0);
  
  // Find the most complex function
  const mostComplex = parsedData.reduce((max, func) => 
    func.constraintCount > max.constraintCount ? func : max
  );
  
  if (mostComplex.constraintCount > 100) {
    recommendations.push(`Optimize ${mostComplex.functionName} function (${mostComplex.constraintCount} constraints)`);
  }
  
  if (totalConstraints > 500) {
    recommendations.push('Consider using unconstrained functions for heavy operations');
  }
  
  if (parsedData.length > 5) {
    recommendations.push('Break down complex functions into smaller, focused functions');
  }
  
  if (recommendations.length === 0) {
    recommendations.push('Your circuit looks well-optimized!');
  }
  
  return recommendations;
}
