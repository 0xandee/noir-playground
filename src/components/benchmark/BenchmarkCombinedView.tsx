import React from "react";
import { BenchmarkResult, BenchmarkComparison } from "@/types/benchmark";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap, Loader2 } from "lucide-react";
import { Bar, BarChart, XAxis, YAxis, LabelList } from "recharts";
import { ChartConfig, ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { BenchmarkHistoryTable } from "./BenchmarkHistoryTable";

interface BenchmarkCombinedViewProps {
  result?: BenchmarkResult;
  isRunning: boolean;
  comparison?: BenchmarkComparison;
  showComparison?: boolean;
  history?: BenchmarkResult[];
}

export const BenchmarkCombinedView = ({
  result,
  isRunning,
  comparison,
  showComparison = false,
  history = []
}: BenchmarkCombinedViewProps) => {
  // Show empty state only when not running and no result
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

  // Show main layout when running or when we have results
  return (
    <div>
      <div className="py-4 px-4">
        <div className="pb-4">
          <h3 className="text-sm font-semibold">Recent Run</h3>
        </div>
        <div>
          <PipelineVisualization result={result} isRunning={isRunning} />
          {result && <DetailedStatistics comparison={comparison} showComparison={showComparison} />}
        </div>
      </div>
      {/* Benchmark History - always show if available */}
      {history.length > 0 && (
        <div>
          <div className="px-4 py-4 space-y-4">
            <h3 className="text-sm font-semibold">History</h3>
          </div>
          <BenchmarkHistoryTable history={history} />
        </div>
      )}
    </div>
  );
};


const PipelineVisualization = ({ result, isRunning }: { result?: BenchmarkResult; isRunning: boolean }) => {
  const [activeSegment, setActiveSegment] = React.useState<string | null>(null);

  // Show loading state when running
  if (isRunning) {
    return (
      <Card>
        <CardContent className="pt-6 pb-6">
          <div className="text-center py-8">
            <div className="text-muted-foreground text-sm">
              <Loader2 className="h-8 w-8 mx-auto mb-3 opacity-50 animate-spin" />
              <p>Running benchmark...</p>
              <p className="text-xs mt-2">Check console for progress</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // If no result and not running, return null
  if (!result) {
    return null;
  }

  // Extract raw times from result
  const rawTimes = {
    compile: result.stages.compile.avgTime,
    witness: result.stages.witness.avgTime,
    proof: result.stages.proof.avgTime,
    verify: result.stages.verify.avgTime,
  };

  // Check if times are cumulative by comparing witness to compile
  // If witness > compile, they're likely cumulative
  const areCumulative = rawTimes.witness > rawTimes.compile &&
    rawTimes.proof > rawTimes.witness &&
    rawTimes.verify > rawTimes.proof;

  // Calculate individual stage times (handle both cumulative and individual data)
  const stageTimes = areCumulative ? {
    compile: rawTimes.compile,
    witness: rawTimes.witness - rawTimes.compile,
    proof: rawTimes.proof - rawTimes.witness,
    verify: rawTimes.verify - rawTimes.proof,
  } : rawTimes;

  // Apply logarithmic scaling for better visual distribution of small values
  // Use log1p (log(1 + x)) to handle 0 and small values gracefully
  // Apply scaling exponent to reduce expansion of small values
  const logScale = (value: number) => Math.pow(Math.log1p(value), 2);

  const chartData = [
    {
      stage: "pipeline",
      compile: logScale(stageTimes.compile),
      witness: logScale(stageTimes.witness),
      proof: logScale(stageTimes.proof),
      verify: logScale(stageTimes.verify),
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

  // Calculate total time for percentage calculations
  const totalTime = stageTimes.compile + stageTimes.witness + stageTimes.proof + stageTimes.verify;

  // Custom label renderer for bar segments
  const renderLabel = (
    props: { x?: string | number; y?: string | number; width?: string | number; height?: string | number },
    stageName: string,
    color: string,
    actualTime: number,
    totalTime: number
  ) => {
    const { x, y, width, height } = props;

    // Convert to numbers
    const numWidth = typeof width === 'string' ? parseFloat(width) : (width ?? 0);
    const numX = typeof x === 'string' ? parseFloat(x) : (x ?? 0);
    const numY = typeof y === 'string' ? parseFloat(y) : (y ?? 0);
    const numHeight = typeof height === 'string' ? parseFloat(height) : (height ?? 0);

    // Calculate percentage
    const percentage = (actualTime / totalTime) * 100;

    // Always render labels for all segments
    const centerX = numX + numWidth / 2;
    const labelY = numY + numHeight + 10; // Position below the bar

    return (
      <g>
        <circle cx={centerX} cy={labelY} r={3} fill={color} />
        <text
          x={centerX}
          y={labelY + 16}
          textAnchor="middle"
          fontSize="11"
          fontWeight="bold"
          fill="hsl(var(--foreground))"
        >
          {stageName}
        </text>
        <text
          x={centerX}
          y={labelY + 32}
          textAnchor="middle"
          fontSize="11"
          fontFamily="monospace"
          fill="hsl(var(--foreground))"
        >
          {Math.round(actualTime)}ms
        </text>
        <text
          x={centerX}
          y={labelY + 48}
          textAnchor="middle"
          fontSize="11"
          fontFamily="monospace"
          fill="hsl(var(--muted-foreground))"
        >
          {percentage.toFixed(1)}%
        </text>
      </g>
    );
  };

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        {/* Interactive Stacked Bar Chart */}
        <ChartContainer config={chartConfig} className="h-[82px] w-full block">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ left: 0, right: 0, top: 0, bottom: 60 }}
            width={undefined}
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

                // Get actual time from stageTimes instead of log-scaled value
                const actualTime = stageTimes[hoveredItem.dataKey as keyof typeof stageTimes];

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
                        {Math.round(actualTime)}ms
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
              minPointSize={3}
              isAnimationActive={false}
              onMouseEnter={() => setActiveSegment('compile')}
              onMouseLeave={() => setActiveSegment(null)}
            >
              <LabelList content={(props) => renderLabel(props, 'Compile', chartConfig.compile.color, stageTimes.compile, totalTime)} />
            </Bar>
            <Bar
              dataKey="witness"
              stackId="a"
              fill="var(--color-witness)"
              minPointSize={3}
              isAnimationActive={false}
              onMouseEnter={() => setActiveSegment('witness')}
              onMouseLeave={() => setActiveSegment(null)}
            >
              <LabelList content={(props) => renderLabel(props, 'Witness', chartConfig.witness.color, stageTimes.witness, totalTime)} />
            </Bar>
            <Bar
              dataKey="proof"
              stackId="a"
              fill="var(--color-proof)"
              minPointSize={3}
              isAnimationActive={false}
              onMouseEnter={() => setActiveSegment('proof')}
              onMouseLeave={() => setActiveSegment(null)}
            >
              <LabelList content={(props) => renderLabel(props, 'Proof', chartConfig.proof.color, stageTimes.proof, totalTime)} />
            </Bar>
            <Bar
              dataKey="verify"
              stackId="a"
              fill="var(--color-verify)"
              radius={[0, 4, 4, 0]}
              minPointSize={3}
              isAnimationActive={false}
              onMouseEnter={() => setActiveSegment('verify')}
              onMouseLeave={() => setActiveSegment(null)}
            >
              <LabelList content={(props) => renderLabel(props, 'Verify', chartConfig.verify.color, stageTimes.verify, totalTime)} />
            </Bar>
          </BarChart>
        </ChartContainer>

        {/* Performance Summary */}
        <div className="grid grid-cols-2 gap-4 pt-2 border-t">
          <div className="text-center space-y-1">
            <div className="text-muted-foreground text-xs">Total Time</div>
            <div className="font-mono text-foreground font-bold">
              {result.summary.avgTotalTime.toFixed(0)}ms{result.config.numberOfRuns > 1 && <span className="text-muted-foreground text-xs font-normal"> ± {result.summary.stdDevTime.toFixed(0)}ms</span>}
            </div>
          </div>

          <div className="text-center space-y-1">
            <div className="text-muted-foreground text-xs">Proof Size</div>
            <div className="font-mono text-foreground font-bold">
              {(result.summary.avgProofSize / 1024).toFixed(1)}KB
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const DetailedStatistics = ({
  comparison,
  showComparison
}: {
  comparison?: BenchmarkComparison;
  showComparison: boolean;
}) => {
  return (
    <>
      {/* Comparison Results */}
      {showComparison && comparison && <ComparisonStats comparison={comparison} />}
    </>
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
            className={`font-mono font-bold text-lg ${isImprovement ? 'text-green-500' : overallImprovement < 0 ? 'text-red-500' : 'text-muted-foreground'
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
                className={`font-mono ${improvement.isImprovement
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
