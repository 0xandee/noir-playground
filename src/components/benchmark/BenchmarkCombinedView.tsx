import React from "react";
import { BenchmarkResult, BenchmarkProgress, BenchmarkComparison } from "@/types/benchmark";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Zap, Loader2 } from "lucide-react";
import { Bar, BarChart, XAxis, YAxis, LabelList } from "recharts";
import { ChartConfig, ChartContainer, ChartTooltip } from "@/components/ui/chart";

interface BenchmarkCombinedViewProps {
  result?: BenchmarkResult;
  progress?: BenchmarkProgress;
  isRunning: boolean;
  comparison?: BenchmarkComparison;
  showComparison?: boolean;
}

export const BenchmarkCombinedView = ({
  result,
  progress,
  isRunning,
  comparison,
  showComparison = false
}: BenchmarkCombinedViewProps) => {
  if (!result && !isRunning) {
    return (
      <div className="px-4 py-8 text-center">
        <div className="text-muted-foreground text-sm">
          <Zap className="h-8 w-8 mx-auto mb-3 opacity-50" />
          <p>Run a benchmark to see performance analysis</p>
        </div>
      </div>
    );
  }

  if (isRunning && progress) {
    return <RunningVisualization progress={progress} />;
  }

  if (result) {
    return (
      <div className="px-4 py-4 space-y-4">
        <PipelineVisualization result={result} />
        <DetailedStatistics result={result} comparison={comparison} showComparison={showComparison} />
      </div>
    );
  }

  return null;
};

const RunningVisualization = ({ progress }: { progress: BenchmarkProgress }) => {
  const progressPercentage = (progress.currentRun / progress.totalRuns) * 100;

  return (
    <Card className="mx-4 my-6">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
            <CardTitle className="text-sm">Running Benchmark</CardTitle>
          </div>
          <span className="text-xs text-muted-foreground">
            {progress.currentRun}/{progress.totalRuns}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">{progress.currentStage}</span>
            <span className="text-muted-foreground">{Math.round(progressPercentage)}%</span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>
      </CardContent>
    </Card>
  );
};

const PipelineVisualization = ({ result }: { result: BenchmarkResult }) => {
  const [activeSegment, setActiveSegment] = React.useState<string | null>(null);

  const chartData = [
    {
      stage: "pipeline",
      compile: result.stages.compile.avgTime,
      witness: result.stages.witness.avgTime,
      proof: result.stages.proof.avgTime,
      verify: result.stages.verify.avgTime,
    }
  ];

  const chartConfig = {
    compile: {
      label: "Compile",
      color: "hsl(217, 91%, 60%)", // blue
    },
    witness: {
      label: "Witness",
      color: "hsl(271, 91%, 65%)", // purple
    },
    proof: {
      label: "Proof",
      color: "hsl(25, 95%, 53%)", // orange
    },
    verify: {
      label: "Verify",
      color: "hsl(142, 76%, 36%)", // green
    },
  } satisfies ChartConfig;

  // Custom label renderer for bar segments
  const renderLabel = (props: any, stageName: string, color: string) => {
    const { x, y, width, height, value } = props;
    if (!width || width < 20) return null; // Don't render if segment too small

    const centerX = x + width / 2;
    const labelY = y + height + 10; // Position below the bar

    return (
      <g>
        {/* Color indicator dot */}
        <circle cx={centerX} cy={labelY} r={3} fill={color} />
        {/* Stage name */}
        <text
          x={centerX}
          y={labelY + 12}
          textAnchor="middle"
          fontSize="11"
          fill="hsl(var(--muted-foreground))"
        >
          {stageName}
        </text>
        {/* Time value */}
        <text
          x={centerX}
          y={labelY + 24}
          textAnchor="middle"
          fontSize="11"
          fontFamily="monospace"
          fill="hsl(var(--foreground))"
        >
          {Math.round(value)}ms
        </text>
      </g>
    );
  };

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        {/* Interactive Stacked Bar Chart */}
        <ChartContainer config={chartConfig} className="h-20 w-full block">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ left: 0, right: 0, top: 0, bottom: 40 }}
            width={undefined}
            height={80}
            barCategoryGap={0}
          >
            <XAxis type="number" hide domain={[0, 'dataMax']} />
            <YAxis type="category" dataKey="stage" hide />
            <ChartTooltip
              cursor={false}
              content={({ active, payload }) => {
                if (!active || !activeSegment || !payload) return null;

                const hoveredItem = payload.find(item => item.dataKey === activeSegment);
                if (!hoveredItem) return null;

                return (
                  <div className="rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-2.5 w-2.5 rounded-sm"
                        style={{ backgroundColor: hoveredItem.color }}
                      />
                      <span className="text-muted-foreground">
                        {chartConfig[hoveredItem.dataKey as keyof typeof chartConfig]?.label}
                      </span>
                      <span className="font-mono font-medium ml-auto">
                        {Number(hoveredItem.value).toFixed(0)}ms
                      </span>
                    </div>
                  </div>
                );
              }}
            />
            <Bar
              dataKey="compile"
              stackId="a"
              fill="var(--color-compile)"
              radius={[4, 0, 0, 4]}
              onMouseEnter={() => setActiveSegment('compile')}
              onMouseLeave={() => setActiveSegment(null)}
            >
              <LabelList content={(props) => renderLabel(props, 'Compile', chartConfig.compile.color)} />
            </Bar>
            <Bar
              dataKey="witness"
              stackId="a"
              fill="var(--color-witness)"
              onMouseEnter={() => setActiveSegment('witness')}
              onMouseLeave={() => setActiveSegment(null)}
            >
              <LabelList content={(props) => renderLabel(props, 'Witness', chartConfig.witness.color)} />
            </Bar>
            <Bar
              dataKey="proof"
              stackId="a"
              fill="var(--color-proof)"
              onMouseEnter={() => setActiveSegment('proof')}
              onMouseLeave={() => setActiveSegment(null)}
            >
              <LabelList content={(props) => renderLabel(props, 'Proof', chartConfig.proof.color)} />
            </Bar>
            <Bar
              dataKey="verify"
              stackId="a"
              fill="var(--color-verify)"
              radius={[0, 4, 4, 0]}
              onMouseEnter={() => setActiveSegment('verify')}
              onMouseLeave={() => setActiveSegment(null)}
            >
              <LabelList content={(props) => renderLabel(props, 'Verify', chartConfig.verify.color)} />
            </Bar>
          </BarChart>
        </ChartContainer>

        {/* Performance Summary */}
        <div className="grid grid-cols-3 gap-4 pt-2 border-t">
          <div className="text-center space-y-1">
            <div className="text-muted-foreground text-xs">Total Time</div>
            <div className="font-mono text-foreground font-bold">
              {result.summary.avgTotalTime.toFixed(0)}ms
            </div>
          </div>

          <div className="text-center space-y-1">
            <div className="text-muted-foreground text-xs">Proof Size</div>
            <div className="font-mono text-foreground font-bold">
              {(result.summary.avgProofSize / 1024).toFixed(1)}KB
            </div>
          </div>

          <div className="text-center space-y-1">
            <div className="text-muted-foreground text-xs">Success Rate</div>
            <div className="font-mono text-foreground font-bold">
              {((result.summary.successfulRuns / result.summary.totalRuns) * 100).toFixed(1)}%
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const DetailedStatistics = ({
  result,
  comparison,
  showComparison
}: {
  result: BenchmarkResult;
  comparison?: BenchmarkComparison;
  showComparison: boolean;
}) => {
  return (
    <>
      {/* Multi-run Statistics (only show if more than 1 run) */}
      {result.summary.totalRuns > 1 && <MultiRunStats result={result} />}


      {/* Comparison Results */}
      {showComparison && comparison && <ComparisonStats comparison={comparison} />}

    </>
  );
};

const MultiRunStats = ({ result }: { result: BenchmarkResult }) => {
  const cv = (result.summary.stdDevTime / result.summary.avgTotalTime) * 100;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">
          Multi-Run Statistics ({result.summary.totalRuns} runs)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Average</span>
          <span className="font-mono font-bold">{result.summary.avgTotalTime.toFixed(1)}ms ±{result.summary.stdDevTime.toFixed(1)}ms</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Range</span>
          <span className="font-mono">{result.summary.minTotalTime.toFixed(1)}ms - {result.summary.maxTotalTime.toFixed(1)}ms</span>
        </div>
        <div className="flex items-center justify-between text-xs pt-2 border-t">
          <span className="text-muted-foreground">Consistency</span>
          <Badge variant={cv < 5 ? 'default' : cv < 15 ? 'secondary' : 'destructive'} className="text-xs">
            {cv.toFixed(1)}% CV
          </Badge>
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
        <CardTitle className="text-sm">Performance Comparison</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Change */}
        <div className="text-center p-3 rounded bg-muted/30">
          <div className="text-muted-foreground text-xs mb-1">Overall Change</div>
          <div
            className={`font-mono font-bold text-lg ${
              isImprovement ? 'text-green-500' : overallImprovement < 0 ? 'text-red-500' : 'text-muted-foreground'
            }`}
          >
            {isImprovement ? '+' : ''}{overallImprovement.toFixed(1)}%
          </div>
          <div className="text-muted-foreground text-xs mt-1">{comparison.summary}</div>
        </div>

        {/* Stage-by-stage comparison */}
        <div className="space-y-1">
          <div className="text-muted-foreground text-xs mb-2">By Stage</div>
          {comparison.improvements.map((improvement) => (
            <div key={improvement.stage} className="flex items-center justify-between py-1.5 text-xs">
              <span className="capitalize">{improvement.stage}</span>
              <span
                className={`font-mono ${
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
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
