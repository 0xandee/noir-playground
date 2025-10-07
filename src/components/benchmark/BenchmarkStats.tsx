import React from "react";
import { BenchmarkResult, BenchmarkComparison, STAGE_NAMES } from "@/types/benchmark";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TrendingUp, TrendingDown, Minus, Clock, MemoryStick, Zap, Target } from "lucide-react";

interface BenchmarkStatsProps {
  result?: BenchmarkResult;
  comparison?: BenchmarkComparison;
  showComparison?: boolean;
}

export const BenchmarkStats = ({ result, comparison, showComparison = false }: BenchmarkStatsProps) => {
  if (!result) {
    return (
      <div className="px-4 py-8 text-center text-muted-foreground text-sm">
        No benchmark data available
      </div>
    );
  }

  return (
    <div className="px-4 py-4 space-y-6">
      {/* Multi-run Statistics (only show if more than 1 run) */}
      {result.summary.totalRuns > 1 && <MultiRunStats result={result} />}

      {/* Stage Breakdown */}
      <StageBreakdown result={result} />

      {/* Comparison Results */}
      {showComparison && comparison && <ComparisonStats comparison={comparison} />}

      {/* Detailed Metrics Table */}
      <DetailedMetricsTable result={result} />
    </div>
  );
};

const MultiRunStats = ({ result }: { result: BenchmarkResult }) => {
  const cv = (result.summary.stdDevTime / result.summary.avgTotalTime) * 100; // Coefficient of variation

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-foreground text-sm">
          Multi-Run Statistics ({result.summary.totalRuns} runs)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="text-muted-foreground text-xs">Average Time</div>
            <div className="font-mono text-foreground font-bold text-sm">
              {result.summary.avgTotalTime.toFixed(1)}ms
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-muted-foreground text-xs">Std Deviation</div>
            <div className="font-mono text-foreground text-sm">
              ±{result.summary.stdDevTime.toFixed(1)}ms
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-muted-foreground text-xs">Min Time</div>
            <div className="font-mono text-green-600 text-sm">
              {result.summary.minTotalTime.toFixed(1)}ms
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-muted-foreground text-xs">Max Time</div>
            <div className="font-mono text-red-500 text-sm">
              {result.summary.maxTotalTime.toFixed(1)}ms
            </div>
          </div>
        </div>

        {/* Consistency indicator */}
        <div className="pt-2 border-t border-border">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-xs">Consistency</span>
            <Badge variant={cv < 5 ? 'default' : cv < 15 ? 'secondary' : 'destructive'}>
              {cv < 5 ? 'Excellent' : cv < 15 ? 'Good' : 'Variable'} ({cv.toFixed(1)}% CV)
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const StageBreakdown = ({ result }: { result: BenchmarkResult }) => {
  const stages = [
    { key: STAGE_NAMES.COMPILE, name: 'Compilation', stage: result.stages.compile, icon: <Target className="h-4 w-4" /> },
    { key: STAGE_NAMES.WITNESS, name: 'Witness Generation', stage: result.stages.witness, icon: <Clock className="h-4 w-4" /> },
    { key: STAGE_NAMES.PROOF, name: 'Proof Generation', stage: result.stages.proof, icon: <Target className="h-4 w-4 text-yellow-500" /> },
    { key: STAGE_NAMES.VERIFY, name: 'Verification', stage: result.stages.verify, icon: <Clock className="h-4 w-4" /> },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-foreground text-sm">
          Pipeline Stage Breakdown
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {stages.map((stage) => (
            <div key={stage.key} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
              <div className="flex items-center gap-3">
                {stage.icon}
                <div>
                  <div className="text-foreground font-medium text-[13px]">
                    {stage.name}
                  </div>
                  <div className="text-muted-foreground text-[11px]">
                    {stage.stage.successRate.toFixed(1)}% success rate
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono text-foreground font-bold text-[13px]">
                  {stage.stage.avgTime.toFixed(1)}ms
                </div>
                <div className="text-muted-foreground font-mono text-[11px]">
                  {stage.stage.avgPercentage.toFixed(1)}%
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

const ComparisonStats = ({ comparison }: { comparison: BenchmarkComparison }) => {
  const overallImprovement = comparison.overallImprovement;
  const isImprovement = overallImprovement > 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-foreground flex items-center gap-2 text-sm">
          {isImprovement ? (
            <TrendingUp className="h-4 w-4 text-green-500" />
          ) : overallImprovement < 0 ? (
            <TrendingDown className="h-4 w-4 text-red-500" />
          ) : (
            <Minus className="h-4 w-4 text-muted-foreground" />
          )}
          Performance Comparison
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Change */}
        <div className="text-center p-3 rounded-lg bg-muted/30">
          <div className="text-muted-foreground mb-1 text-xs">
            Overall Performance Change
          </div>
          <div
            className={`font-mono font-bold text-lg ${
              isImprovement ? 'text-green-500' : overallImprovement < 0 ? 'text-red-500' : 'text-muted-foreground'
            }`}
          >
            {isImprovement ? '+' : ''}{overallImprovement.toFixed(1)}%
          </div>
          <div className="text-muted-foreground mt-1 text-[11px]">
            {comparison.summary}
          </div>
        </div>

        {/* Stage-by-stage comparison */}
        <div className="space-y-2">
          <div className="text-muted-foreground text-xs">
            Stage-by-Stage Changes
          </div>
          {comparison.improvements.map((improvement) => (
            <div key={improvement.stage} className="flex items-center justify-between py-2">
              <span className="text-foreground capitalize text-[13px]">
                {improvement.stage}
              </span>
              <div className="flex items-center gap-2">
                {improvement.isImprovement ? (
                  <TrendingUp className="h-3 w-3 text-green-500" />
                ) : improvement.percentageChange < 0 ? (
                  <TrendingDown className="h-3 w-3 text-red-500" />
                ) : (
                  <Minus className="h-3 w-3 text-muted-foreground" />
                )}
                <span
                  className={`font-mono text-xs ${
                    improvement.isImprovement
                      ? 'text-green-500'
                      : improvement.percentageChange < 0
                        ? 'text-red-500'
                        : 'text-muted-foreground'
                  }`}
                >
                  {improvement.percentageChange > 0 ? '+' : ''}{improvement.percentageChange.toFixed(1)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

const DetailedMetricsTable = ({ result }: { result: BenchmarkResult }) => {
  const stages = [
    { key: STAGE_NAMES.COMPILE, name: 'Compile', stage: result.stages.compile },
    { key: STAGE_NAMES.WITNESS, name: 'Witness', stage: result.stages.witness },
    { key: STAGE_NAMES.PROOF, name: 'Proof', stage: result.stages.proof },
    { key: STAGE_NAMES.VERIFY, name: 'Verify', stage: result.stages.verify },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-foreground text-sm">
          Detailed Metrics
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-left">Stage</TableHead>
              <TableHead className="text-right">Time</TableHead>
              <TableHead className="text-right">%</TableHead>
              {result.summary.totalRuns > 1 && (
                <TableHead className="text-right">±</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {stages.map((stage) => (
              <TableRow key={stage.key}>
                <TableCell className="text-foreground text-[13px]">
                  {stage.name}
                </TableCell>
                <TableCell className="text-right font-mono text-foreground text-[13px]">
                  {stage.stage.avgTime.toFixed(1)}ms
                </TableCell>
                <TableCell className="text-right font-mono text-foreground text-[13px]">
                  {stage.stage.avgPercentage.toFixed(1)}%
                </TableCell>
                {result.summary.totalRuns > 1 && (
                  <TableCell className="text-right font-mono text-muted-foreground text-xs">
                    ±{stage.stage.stdDevTime.toFixed(1)}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};