import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Code, 
  Cpu, 
  Layers
} from 'lucide-react';

export interface CircuitMetricsData {
  totalAcirOpcodes: number;
  totalBrilligOpcodes: number;
  totalGates: number;
}

interface CircuitMetricsProps {
  metrics: CircuitMetricsData;
  className?: string;
}

export const CircuitMetrics: React.FC<CircuitMetricsProps> = ({
  metrics,
  className = ''
}) => {
  return (
    <div className={`space-y-3 ${className}`}>
      {/* Compact Top-level Metrics */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border border-border/50 bg-card/50">
          <CardHeader className="pb-2 px-3 pt-3">
            <CardTitle className="text-xs font-medium flex items-center gap-1.5 text-muted-foreground">
              <Cpu className="h-3 w-3" />
              ACIR Opcodes
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3 pt-0">
            <div className="text-xl font-semibold text-foreground">{metrics.totalAcirOpcodes}</div>
            <p className="text-xs text-muted-foreground">Total constraints</p>
          </CardContent>
        </Card>

        <Card className="border border-border/50 bg-card/50">
          <CardHeader className="pb-2 px-3 pt-3">
            <CardTitle className="text-xs font-medium flex items-center gap-1.5 text-muted-foreground">
              <Code className="h-3 w-3" />
              Brillig Opcodes
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3 pt-0">
            <div className="text-xl font-semibold text-foreground">{metrics.totalBrilligOpcodes}</div>
            <p className="text-xs text-muted-foreground">Unconstrained code</p>
          </CardContent>
        </Card>

        <Card className="border border-border/50 bg-card/50">
          <CardHeader className="pb-2 px-3 pt-3">
            <CardTitle className="text-xs font-medium flex items-center gap-1.5 text-muted-foreground">
              <Layers className="h-3 w-3" />
              Total Gates
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3 pt-0">
            <div className="text-xl font-semibold text-foreground">{metrics.totalGates.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Backend gates</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
