/**
 * MetricsAggregationService - Aggregates and processes circuit complexity metrics
 * for real-time visualization and heatmap generation
 */

import { SvgOpcodesParser, LineOpcodesData } from './SvgOpcodesParser';
import { 
  LineMetrics, 
  FunctionMetrics, 
  FileMetrics, 
  CircuitComplexityReport, 
  HeatmapData, 
  MetricsDelta,
  MetricsComparison,
  MetricType,
  MetricsFilter,
  MetricsConfiguration,
  DEFAULT_METRICS_CONFIG,
  ExpressionMetrics,
  MetricValue,
  HotspotCriteria
} from '@/types/circuitMetrics';

export interface AggregationInput {
  acirSvg?: string;
  brilligSvg?: string;
  gatesSvg?: string;
  sourceCode: string;
  fileName?: string;
}

interface CachedReport {
  report: CircuitComplexityReport;
  cachedAt: number;
  sourceHash: string;
}

export class MetricsAggregationService {
  private svgParser: SvgOpcodesParser;
  private reportCache: Map<string, CachedReport>;
  private config: MetricsConfiguration;
  private previousReports: CircuitComplexityReport[];

  constructor(config?: Partial<MetricsConfiguration>) {
    this.svgParser = new SvgOpcodesParser();
    this.reportCache = new Map();
    this.config = { ...DEFAULT_METRICS_CONFIG, ...config };
    this.previousReports = [];
  }

  /**
   * Generate comprehensive circuit complexity report from SVG data
   */
  async generateComplexityReport(input: AggregationInput): Promise<CircuitComplexityReport> {
    const sourceHash = this.generateSourceHash(input.sourceCode);
    
    // Check cache first
    const cached = this.getCachedReport(sourceHash);
    if (cached) {
      return cached;
    }

    const fileName = input.fileName || 'main.nr';
    
    // Parse SVG data to extract line-level metrics

    const acirData = input.acirSvg ? this.svgParser.parseLineOpcodes(input.acirSvg) : [];
    const brilligData = input.brilligSvg ? this.svgParser.parseLineOpcodes(input.brilligSvg) : [];
    const gatesData = input.gatesSvg ? this.svgParser.parseLineOpcodes(input.gatesSvg) : [];


    // Aggregate metrics by line
    const lineMetrics = this.aggregateLineMetrics(acirData, brilligData, gatesData, fileName);
    
    // Calculate totals
    const totalAcirOpcodes = lineMetrics.reduce((sum, line) => sum + line.acirOpcodes, 0);
    const totalBrilligOpcodes = lineMetrics.reduce((sum, line) => sum + line.brilligOpcodes, 0);
    const totalGates = lineMetrics.reduce((sum, line) => sum + line.gates, 0);

    // Normalize heat values
    this.normalizeHeatValues(lineMetrics, totalAcirOpcodes, totalBrilligOpcodes, totalGates);

    // Extract function metrics (simplified for now - can be enhanced with AST parsing)
    const functionMetrics = this.extractFunctionMetrics(input.sourceCode, lineMetrics);

    // Create file metrics
    const fileMetrics: FileMetrics = {
      fileName,
      lines: lineMetrics,
      functions: functionMetrics,
      totalAcirOpcodes,
      totalBrilligOpcodes,
      totalGates
    };

    // Identify hotspots
    const hotspots = this.identifyHotspots(lineMetrics, {
      metricType: 'acir',
      minimumThreshold: 0.05, // 5% of total
      sortBy: 'percentage',
      maxResults: 10
    });

    // Create final report
    const report: CircuitComplexityReport = {
      files: [fileMetrics],
      totalAcirOpcodes,
      totalBrilligOpcodes,
      totalGates,
      hotspots,
      topFunctions: functionMetrics.slice(0, 5), // Top 5 functions
      generatedAt: new Date()
    };

    // Cache the report
    this.cacheReport(sourceHash, report);
    
    // Store for diff comparisons
    this.previousReports.push(report);
    if (this.previousReports.length > 10) {
      this.previousReports.shift(); // Keep only last 10 reports
    }

    return report;
  }

  /**
   * Generate heatmap data for Monaco editor overlay
   */
  generateHeatmapData(
    report: CircuitComplexityReport, 
    filter: MetricsFilter
  ): HeatmapData[] {
    const fileMetrics = report.files[0]; // Assuming single file for now
    if (!fileMetrics) return [];

    return fileMetrics.lines
      .filter(line => this.passesFilter(line, filter, report))
      .map(line => this.createHeatmapData(line, filter.metricType))
      .sort((a, b) => b.heatValue - a.heatValue);
  }

  /**
   * Compare current metrics with previous runs
   */
  compareWithPrevious(
    currentReport: CircuitComplexityReport,
    metricType: MetricType = 'acir'
  ): MetricsComparison | null {
    if (this.previousReports.length < 2) return null;

    const previousReport = this.previousReports[this.previousReports.length - 2];
    const currentLines = currentReport.files[0]?.lines || [];
    const previousLines = previousReport.files[0]?.lines || [];

    const deltas: MetricsDelta[] = [];

    // Create map of previous metrics for quick lookup
    const previousMap = new Map<number, LineMetrics>();
    previousLines.forEach(line => previousMap.set(line.lineNumber, line));

    // Calculate deltas for each line
    currentLines.forEach(currentLine => {
      const previousLine = previousMap.get(currentLine.lineNumber);
      if (previousLine) {
        const currentValue = this.getMetricValue(currentLine, metricType);
        const previousValue = this.getMetricValue(previousLine, metricType);
        const delta = currentValue - previousValue;
        const deltaPercentage = previousValue > 0 ? (delta / previousValue) * 100 : 0;

        if (delta !== 0) {
          deltas.push({
            lineNumber: currentLine.lineNumber,
            previousValue,
            currentValue,
            delta,
            deltaPercentage,
            isImprovement: delta < 0,
            isRegression: delta > 0
          });
        }
      }
    });

    // Calculate overall change
    const currentTotal = this.getReportTotal(currentReport, metricType);
    const previousTotal = this.getReportTotal(previousReport, metricType);
    const overallChange = currentTotal - previousTotal;
    const overallChangePercentage = previousTotal > 0 ? (overallChange / previousTotal) * 100 : 0;

    return {
      deltas,
      overallChange,
      overallChangePercentage,
      isOverallImprovement: overallChange < 0,
      comparedAt: new Date(),
      baselineLabel: 'Previous Run'
    };
  }

  /**
   * Aggregate line-level metrics from different SVG sources
   */
  private aggregateLineMetrics(
    acirData: LineOpcodesData[],
    brilligData: LineOpcodesData[],
    gatesData: LineOpcodesData[],
    fileName: string
  ): LineMetrics[] {
    const lineMap = new Map<number, LineMetrics>();

    // Process ACIR data
    acirData.forEach(data => {
      const existing = lineMap.get(data.lineNumber) || this.createEmptyLineMetrics(data.lineNumber, fileName);
      existing.acirOpcodes += data.opcodes;
      existing.expressions.push(this.createExpressionMetrics(data, 'acir'));
      lineMap.set(data.lineNumber, existing);
    });

    // Process Brillig data (if available)
    brilligData.forEach(data => {
      const existing = lineMap.get(data.lineNumber) || this.createEmptyLineMetrics(data.lineNumber, fileName);
      existing.brilligOpcodes += data.opcodes;
      existing.expressions.push(this.createExpressionMetrics(data, 'brillig'));
      lineMap.set(data.lineNumber, existing);
    });

    // Process Gates data (if available)
    gatesData.forEach(data => {
      const existing = lineMap.get(data.lineNumber) || this.createEmptyLineMetrics(data.lineNumber, fileName);
      existing.gates += data.opcodes; // Assuming opcodes represent gates in this context
      existing.expressions.push(this.createExpressionMetrics(data, 'gates'));
      lineMap.set(data.lineNumber, existing);
    });

    // Calculate total cost for each line
    lineMap.forEach(line => {
      line.totalCost = line.acirOpcodes + line.brilligOpcodes + line.gates;
    });

    return Array.from(lineMap.values()).sort((a, b) => a.lineNumber - b.lineNumber);
  }

  /**
   * Normalize heat values for visualization (0-1 scale)
   */
  private normalizeHeatValues(
    lines: LineMetrics[], 
    totalAcir: number, 
    totalBrillig: number, 
    totalGates: number
  ): void {
    const maxCost = Math.max(...lines.map(line => line.totalCost));
    
    lines.forEach(line => {
      if (maxCost > 0) {
        line.normalizedHeat = line.totalCost / maxCost;
        line.percentage = (line.totalCost / (totalAcir + totalBrillig + totalGates)) * 100;
      } else {
        line.normalizedHeat = 0;
        line.percentage = 0;
      }
    });
  }

  /**
   * Extract function-level metrics (simplified version)
   */
  private extractFunctionMetrics(sourceCode: string, lineMetrics: LineMetrics[]): FunctionMetrics[] {
    const functions: FunctionMetrics[] = [];
    const lines = sourceCode.split('\n');
    
    // Simple regex to find function definitions - can be enhanced with proper AST parsing
    const functionRegex = /^\s*(pub\s+)?fn\s+(\w+)/;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const match = line.match(functionRegex);
      
      if (match) {
        const functionName = match[2];
        const startLine = i + 1;
        
        // Find function end (simplified - look for next function or end of file)
        let endLine = lines.length;
        for (let j = i + 1; j < lines.length; j++) {
          if (lines[j].match(functionRegex)) {
            endLine = j;
            break;
          }
        }

        // Aggregate metrics for this function
        const functionLines = lineMetrics.filter(
          line => line.lineNumber >= startLine && line.lineNumber < endLine
        );

        const totalAcir = functionLines.reduce((sum, line) => sum + line.acirOpcodes, 0);
        const totalBrillig = functionLines.reduce((sum, line) => sum + line.brilligOpcodes, 0);
        const totalGates = functionLines.reduce((sum, line) => sum + line.gates, 0);
        const totalCost = totalAcir + totalBrillig + totalGates;

        functions.push({
          functionName,
          packageName: 'main', // Could be extracted from Nargo.toml
          startLine,
          endLine,
          acirOpcodes: totalAcir,
          brilligOpcodes: totalBrillig,
          gates: totalGates,
          expressionWidth: `${endLine - startLine} lines`,
          normalizedHeat: 0, // Will be calculated after all functions are found
          percentage: 0
        });
      }
    }

    // Normalize function heat values
    const maxFunctionCost = Math.max(...functions.map(f => f.acirOpcodes + f.brilligOpcodes + f.gates));
    if (maxFunctionCost > 0) {
      functions.forEach(func => {
        const totalCost = func.acirOpcodes + func.brilligOpcodes + func.gates;
        func.normalizedHeat = totalCost / maxFunctionCost;
        func.percentage = (totalCost / maxFunctionCost) * 100;
      });
    }

    return functions.sort((a, b) => (b.acirOpcodes + b.brilligOpcodes + b.gates) - (a.acirOpcodes + a.brilligOpcodes + a.gates));
  }

  /**
   * Identify performance hotspots based on criteria
   */
  private identifyHotspots(lines: LineMetrics[], criteria: HotspotCriteria): LineMetrics[] {
    return lines
      .filter(line => {
        const metricValue = this.getMetricValue(line, criteria.metricType);
        return criteria.sortBy === 'percentage' 
          ? line.percentage >= criteria.minimumThreshold * 100
          : metricValue >= criteria.minimumThreshold;
      })
      .sort((a, b) => {
        const aValue = criteria.sortBy === 'percentage' ? a.percentage : this.getMetricValue(a, criteria.metricType);
        const bValue = criteria.sortBy === 'percentage' ? b.percentage : this.getMetricValue(b, criteria.metricType);
        return bValue - aValue;
      })
      .slice(0, criteria.maxResults);
  }

  /**
   * Helper methods
   */
  private createEmptyLineMetrics(lineNumber: number, fileName: string): LineMetrics {
    return {
      lineNumber,
      fileName,
      acirOpcodes: 0,
      brilligOpcodes: 0,
      gates: 0,
      expressions: [],
      totalCost: 0,
      normalizedHeat: 0,
      percentage: 0
    };
  }

  private createExpressionMetrics(data: LineOpcodesData, type: string): ExpressionMetrics {
    return {
      expression: data.expression,
      column: data.column,
      acirOpcodes: type === 'acir' ? data.opcodes : 0,
      brilligOpcodes: type === 'brillig' ? data.opcodes : 0,
      gates: type === 'gates' ? data.opcodes : 0,
      opcodeTypes: [type]
    };
  }

  private passesFilter(line: LineMetrics, filter: MetricsFilter, report: CircuitComplexityReport): boolean {
    const thresholdPercentage = filter.threshold;
    return line.percentage >= thresholdPercentage;
  }

  private createHeatmapData(line: LineMetrics, metricType: MetricType): HeatmapData {
    const primaryMetric = this.getMetricValue(line, metricType);
    const badgeText = this.formatBadgeText(line, metricType);
    const tooltipContent = this.formatTooltipContent(line);

    return {
      lineNumber: line.lineNumber,
      heatValue: line.normalizedHeat,
      primaryMetric,
      metricType,
      badgeText,
      tooltipContent
    };
  }

  private getMetricValue(line: LineMetrics, metricType: MetricType): number {
    switch (metricType) {
      case 'acir': return line.acirOpcodes;
      case 'brillig': return line.brilligOpcodes;
      case 'gates': return line.gates;
      default: return line.totalCost;
    }
  }

  private getReportTotal(report: CircuitComplexityReport, metricType: MetricType): number {
    switch (metricType) {
      case 'acir': return report.totalAcirOpcodes;
      case 'brillig': return report.totalBrilligOpcodes;
      case 'gates': return report.totalGates;
      default: return report.totalAcirOpcodes + report.totalBrilligOpcodes + report.totalGates;
    }
  }

  private formatBadgeText(line: LineMetrics, metricType: MetricType): string {
    const value = this.getMetricValue(line, metricType);
    const suffix = metricType === 'gates' ? 'g' : 'ops';
    return `${value}${suffix}`;
  }

  private formatTooltipContent(line: LineMetrics): string {
    return `ACIR: ${line.acirOpcodes} ops | Brillig: ${line.brilligOpcodes} ops | Gates: ${line.gates} | ${line.percentage.toFixed(2)}%`;
  }

  private generateSourceHash(source: string): string {
    let hash = 0;
    for (let i = 0; i < source.length; i++) {
      const char = source.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  private getCachedReport(sourceHash: string): CircuitComplexityReport | null {
    const cached = this.reportCache.get(sourceHash);
    if (cached && (Date.now() - cached.cachedAt) < this.config.cacheTimeoutMs) {
      return cached.report;
    }
    if (cached) {
      this.reportCache.delete(sourceHash);
    }
    return null;
  }

  private cacheReport(sourceHash: string, report: CircuitComplexityReport): void {
    this.reportCache.set(sourceHash, {
      report,
      cachedAt: Date.now(),
      sourceHash
    });
  }

  /**
   * Public utility methods
   */
  public clearCache(): void {
    this.reportCache.clear();
    this.previousReports = [];
  }

  public updateConfiguration(config: Partial<MetricsConfiguration>): void {
    this.config = { ...this.config, ...config };
  }

  public getConfiguration(): MetricsConfiguration {
    return { ...this.config };
  }
}