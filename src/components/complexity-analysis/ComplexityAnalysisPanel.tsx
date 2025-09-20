import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Flame, TrendingUp } from 'lucide-react';

interface ComplexityAnalysisPanelProps {
  svgContent?: string;
  isProfiling?: boolean;
  error?: string;
}

export const ComplexityAnalysisPanel: React.FC<ComplexityAnalysisPanelProps> = ({
  svgContent,
  isProfiling = false,
  error
}) => {

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

      </header>

            <div className="flex-1 p-4">
        <div className="text-center text-muted-foreground py-8">
          <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>Complexity analysis panel</p>
          <p className="text-xs mt-1">Ready for future enhancements</p>
        </div>
      </div>
    </div>
  );
};


