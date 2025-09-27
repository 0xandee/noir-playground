import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

export interface CircuitMetricsData {
  totalAcirOpcodes: number;
  totalBrilligOpcodes: number;
  totalGates: number;
}

interface CircuitMetricsProps {
  metrics: CircuitMetricsData;
  className?: string;
}

interface MetricCardProps {
  value: number;
  label: string;
  shouldFormat?: boolean;
}

const MetricCard: React.FC<MetricCardProps> = ({ value, label, shouldFormat = false }) => (
  <Card className="border border-border/50 bg-card/50">
    <CardContent className="px-3 py-3">
      <div className="text-xl font-semibold text-foreground">
        {shouldFormat ? value.toLocaleString() : value}
      </div>
      <p className="text-muted-foreground" style={{fontSize: '13px'}}>
        {label}
      </p>
    </CardContent>
  </Card>
);

export const CircuitMetrics: React.FC<CircuitMetricsProps> = ({
  metrics,
  className = ''
}) => {
  const metricConfig = [
    { value: metrics.totalAcirOpcodes, label: 'ACIR Opcodes' },
    { value: metrics.totalBrilligOpcodes, label: 'Brillig Opcodes' },
    { value: metrics.totalGates, label: 'Proving Gates', shouldFormat: true }
  ];

  return (
    <div className={`grid grid-cols-3 gap-3 ${className}`}>
      {metricConfig.map((metric, index) => (
        <MetricCard
          key={index}
          value={metric.value}
          label={metric.label}
          shouldFormat={metric.shouldFormat}
        />
      ))}
    </div>
  );
};