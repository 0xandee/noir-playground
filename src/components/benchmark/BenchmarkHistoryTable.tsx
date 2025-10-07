import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { BenchmarkResult } from "@/types/benchmark";
import { Clock } from "lucide-react";

interface BenchmarkHistoryTableProps {
  history: BenchmarkResult[];
  className?: string;
}

interface HistoryRow {
  runNumber: number;
  timestamp: Date;
  compileTime: number;
  witnessTime: number;
  proofTime: number;
  verifyTime: number;
  totalTime: number;
  circuitSize?: number;
}

interface PercentageChange {
  compile: number | null;
  witness: number | null;
  proof: number | null;
  verify: number | null;
  total: number | null;
  circuitSize: number | null;
}

export const BenchmarkHistoryTable: React.FC<BenchmarkHistoryTableProps> = ({
  history,
  className = ""
}) => {
  // Convert benchmark results to table rows
  const rows: HistoryRow[] = history
    .slice()
    .reverse() // Reverse to get oldest first, then assign sequential numbers
    .map((result, index) => ({
      runNumber: index + 1, // First run = #1, latest run = highest number
      timestamp: result.createdAt,
      compileTime: result.stages.compile.avgTime,
      witnessTime: result.stages.witness.avgTime,
      proofTime: result.stages.proof.avgTime,
      verifyTime: result.stages.verify.avgTime,
      totalTime: result.summary.avgTotalTime,
      circuitSize: result.runs[0]?.circuitSize
    })); // Display oldest first, most recent last

  // Calculate percentage changes between consecutive runs
  const calculatePercentageChanges = (index: number): PercentageChange => {
    if (index === 0) {
      // First run (oldest), no previous to compare
      return {
        compile: null,
        witness: null,
        proof: null,
        verify: null,
        total: null,
        circuitSize: null
      };
    }

    const current = rows[index];
    const previous = rows[index - 1]; // Previous run (older)

    const calcChange = (curr: number, prev: number): number => {
      if (prev === 0) return 0;
      return ((curr - prev) / prev) * 100;
    };

    return {
      compile: calcChange(current.compileTime, previous.compileTime),
      witness: calcChange(current.witnessTime, previous.witnessTime),
      proof: calcChange(current.proofTime, previous.proofTime),
      verify: calcChange(current.verifyTime, previous.verifyTime),
      total: calcChange(current.totalTime, previous.totalTime),
      circuitSize:
        current.circuitSize && previous.circuitSize
          ? calcChange(current.circuitSize, previous.circuitSize)
          : null
    };
  };

  // Format time display
  const formatTime = (ms: number): string => {
    return Math.round(ms) + "ms";
  };

  // Format timestamp
  const formatTimestamp = (date: Date): string => {
    return new Date(date).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false
    });
  };

  // Render percentage change with color coding
  const renderPercentageChange = (change: number | null): JSX.Element | null => {
    if (change === null) return null;

    const isImprovement = change < 0; // Negative = faster = improvement
    const isRegression = change > 0; // Positive = slower = regression
    const colorClass = isImprovement
      ? "text-green-500"
      : isRegression
      ? "text-red-500"
      : "text-muted-foreground";

    return (
      <span className={`text-xs font-mono ${colorClass}`}>
        {change > 0 ? "+" : ""}
        {change.toFixed(1)}%
      </span>
    );
  };

  if (rows.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No benchmark history yet</p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full border-t ${className}`}>
      <div className="flex-1 overflow-auto">
        <Table className="border-b">
          <TableHeader>
            <TableRow>
              <TableHead className="w-12 text-center" style={{ fontSize: "13px" }}>
                #
              </TableHead>
              <TableHead className="text-center" style={{ fontSize: "13px" }}>
                Compile
              </TableHead>
              <TableHead className="text-center" style={{ fontSize: "13px" }}>
                Witness
              </TableHead>
              <TableHead className="text-center" style={{ fontSize: "13px" }}>
                Proof
              </TableHead>
              <TableHead className="text-center" style={{ fontSize: "13px" }}>
                Verify
              </TableHead>
              <TableHead className="text-center" style={{ fontSize: "13px" }}>
                Total
              </TableHead>
              <TableHead className="text-center" style={{ fontSize: "13px" }}>
                Circuit
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, index) => {
              const changes = calculatePercentageChanges(index);

              return (
                <TableRow key={index} className="hover:bg-muted/50">
                  <TableCell
                    className="font-mono text-center border-r"
                    style={{ fontSize: "13px" }}
                  >
                    {row.runNumber}
                  </TableCell>
                  <TableCell className="font-mono text-center border-r" style={{ fontSize: "13px" }}>
                    <div className="flex flex-col items-center gap-0.5">
                      <span>
                        {formatTime(row.compileTime)}
                      </span>
                      {renderPercentageChange(changes.compile)}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-center border-r" style={{ fontSize: "13px" }}>
                    <div className="flex flex-col items-center gap-0.5">
                      <span>
                        {formatTime(row.witnessTime)}
                      </span>
                      {renderPercentageChange(changes.witness)}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-center border-r" style={{ fontSize: "13px" }}>
                    <div className="flex flex-col items-center gap-0.5">
                      <span>
                        {formatTime(row.proofTime)}
                      </span>
                      {renderPercentageChange(changes.proof)}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-center border-r" style={{ fontSize: "13px" }}>
                    <div className="flex flex-col items-center gap-0.5">
                      <span>
                        {formatTime(row.verifyTime)}
                      </span>
                      {renderPercentageChange(changes.verify)}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-center border-r" style={{ fontSize: "13px" }}>
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="font-bold">
                        {formatTime(row.totalTime)}
                      </span>
                      {renderPercentageChange(changes.total)}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-center" style={{ fontSize: "13px" }}>
                    <div className="flex flex-col items-center gap-0.5">
                      <span>
                        {row.circuitSize ? row.circuitSize.toLocaleString() : "N/A"}
                      </span>
                      {renderPercentageChange(changes.circuitSize)}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
