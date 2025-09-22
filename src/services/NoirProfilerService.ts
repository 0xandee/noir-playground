import { noirWasmCompiler, NoirWasmCompiler } from './NoirWasmCompiler';
import { MetricsAggregationService, AggregationInput } from './MetricsAggregationService';
import { CircuitComplexityReport, ExpressionMetrics } from '@/types/circuitMetrics';

export interface ProfilerRequest {
  sourceCode: string;
  cargoToml?: string;
  fileName?: string;
}

export interface ComplexityTableData {
  lineNumber: number;
  column: number;
  expression: string;
  acirOpcodes: number;
  brilligOpcodes: number;
  gates: number;
  totalCost: number;
  percentage: number;
  fileName: string;
}

export interface ProfilerResult {
  acirSVG: string;
  gatesSVG: string;
  brilligSVG?: string; // Added for Brillig opcodes
  source: 'noir-profiler'
  error?: string;
  message?: string;
  circuitMetrics?: {
    totalAcirOpcodes: number;
    totalBrilligOpcodes: number;
    totalGates: number;
  };
  // New enhanced metrics
  complexityReport?: CircuitComplexityReport;
}

// Server API response types
interface ServerProfilerResponse {
  success: boolean;
  svgs: Array<{
    content: string;
    filename: string;
    function?: string;
    type: string;
  }>;
  circuitMetrics?: {
    totalAcirOpcodes: number;
    totalBrilligOpcodes: number;
    totalGates: number;
  };
  tempFileCreated: boolean;
  error?: string;
}

export class NoirProfilerService {
  private apiEndpoint: string;
  private serverBaseUrl: string;
  private metricsService: MetricsAggregationService;

  constructor() {
    this.apiEndpoint = '/api/profile/opcodes';
    // Use environment variable for server base URL, fallback to localhost:4000
    this.serverBaseUrl = import.meta.env.VITE_PROFILER_SERVER_URL || 'http://localhost:4000';
    this.metricsService = new MetricsAggregationService();
  }



  /**
   * Profile a Noir circuit by compiling and calling the server API
   */
  async profileCircuit(request: ProfilerRequest): Promise<ProfilerResult> {
    try {
      // Step 1: Compile the source code to get real artifacts

      // Use provided cargoToml or default from NoirWasmCompiler
      const cargoTomlToUse = request.cargoToml || NoirWasmCompiler.getDefaultCargoToml();

      const compilationResult = await noirWasmCompiler.compileProgram(request.sourceCode, cargoTomlToUse);

      if (!compilationResult.success) {
        throw new Error(`Compilation failed: ${compilationResult.error}`);
      }

      if (!compilationResult.program) {
        throw new Error('No compiled program available after successful compilation');
      }

      // Step 2: Create artifact from compilation result
      const artifact = compilationResult.program.program;

      // Step 3: Make request to server API
      const requestBody = {
        artifact,
        sourceCode: request.sourceCode,
        cargoToml: cargoTomlToUse // Always include cargoToml (either user-provided or default)
      };


      const response = await fetch(`${this.serverBaseUrl}${this.apiEndpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });


      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server responded with status: ${response.status}`);
      }

      const serverResponse: ServerProfilerResponse = await response.json();

      if (!serverResponse.success) {
        throw new Error(serverResponse.error || 'Server profiling failed');
      }


      // Step 4: Extract SVG content from server response
      const svgData = this.extractSVGDataFromResponse(serverResponse.svgs);

      // Step 5: Generate enhanced complexity report
      const complexityReport = await this.generateComplexityReport({
        acirSvg: svgData.mainAcirSVG,
        gatesSvg: svgData.mainGatesSVG,
        brilligSvg: svgData.brilligSVG,
        sourceCode: request.sourceCode,
        fileName: request.fileName
      });

      // Step 6: Automatically output console table with opcode analysis
      this.generateOpcodeConsoleTable(complexityReport, serverResponse.circuitMetrics);

      return {
        acirSVG: svgData.mainAcirSVG,
        gatesSVG: svgData.mainGatesSVG,
        brilligSVG: svgData.brilligSVG,
        source: 'noir-profiler',
        message: `Profiling completed via server API with real compilation using ${request.cargoToml ? 'user-provided' : 'default'} Nargo.toml`,
        circuitMetrics: serverResponse.circuitMetrics,
        complexityReport
      };

    } catch (error) {
      throw error; // Re-throw the error
    }
  }

  /**
   * Generate comprehensive complexity report from SVG data
   */
  private async generateComplexityReport(input: AggregationInput): Promise<CircuitComplexityReport> {
    return await this.metricsService.generateComplexityReport(input);
  }

  /**
   * Extract SVG data from server response
   */
  private extractSVGDataFromResponse(svgs: Array<{ content: string; filename: string; function?: string; type: string }>) {
    let mainAcirSVG = '';
    let mainGatesSVG = '';
    let brilligSVG = '';

    svgs.forEach(svg => {
      // Extract ACIR opcodes SVG
      if (svg.filename.includes('main_acir_opcodes')) {
        mainAcirSVG = this.cleanSVGContent(svg.content);
      }
      
      // Extract proving backend gates SVG
      if (svg.filename.includes('main_gates')) {
        mainGatesSVG = this.cleanSVGContent(svg.content);
      }

      // Extract Brillig opcodes SVG (if available)
      if (svg.filename.includes('brillig_opcodes')) {
        brilligSVG = this.cleanSVGContent(svg.content);
      }
    });

    return {
      mainAcirSVG,
      mainGatesSVG,
      brilligSVG
    };
  }

  /**
   * Clean SVG content by removing the file path header
   */
  private cleanSVGContent(svgContent: string): string {
    // Remove the file path header that noir-profiler adds
    // This header contains UUIDs and file paths like: "47fbed73-ce64-42c2-b7f1-d2e0bb01c797"

    // Pattern 1: Remove text elements containing UUIDs (8-4-4-4-12 format)
    let cleanedSVG = svgContent.replace(
      /<text[^>]*>[^<]*[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}[^<]*<\/text>/gi,
      ''
    );

    // Pattern 1.5: Remove text elements containing the specific UUID format you mentioned
    cleanedSVG = cleanedSVG.replace(
      /<text[^>]*>[^<]*47fbed73-ce64-42c2-b7f1-d2e0bb01c797[^<]*<\/text>/gi,
      ''
    );

    // Pattern 2: Remove text elements containing long file paths
    cleanedSVG = cleanedSVG.replace(
      /<text[^>]*>[^<]*\/data\/[^<]*<\/text>/gi,
      ''
    );

    // Pattern 3: Remove text elements containing "noir-playground-server"
    cleanedSVG = cleanedSVG.replace(
      /<text[^>]*>[^<]*noir-playground-server[^<]*<\/text>/gi,
      ''
    );

    // Pattern 4: Remove any remaining text elements that look like file paths
    cleanedSVG = cleanedSVG.replace(
      /<text[^>]*>[^<]*\/[^<]*\/[^<]*\/[^<]*\/[^<]*<\/text>/gi,
      ''
    );

    // Also remove any empty text elements that might be left
    const finalSVG = cleanedSVG.replace(
      /<text[^>]*><\/text>/g,
      ''
    );

    return finalSVG;
  }

  /**
   * Get current complexity report for source code (cached if available)
   */
  public async getComplexityReport(sourceCode: string, cargoToml?: string, fileName?: string): Promise<CircuitComplexityReport | null> {
    try {
      const result = await this.profileCircuit({ sourceCode, cargoToml, fileName });
      return result.complexityReport || null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get metrics comparison between current and previous runs
   */
  public getMetricsComparison(currentReport: CircuitComplexityReport, metricType: 'acir' | 'brillig' | 'gates' = 'acir') {
    return this.metricsService.compareWithPrevious(
      currentReport,
      metricType
    );
  }

  /**
   * Clear all cached metrics and reports
   */
  public clearCache(): void {
    this.metricsService.clearCache();
  }

  /**
   * Update metrics configuration
   */
  public updateMetricsConfig(config: Partial<import('@/types/circuitMetrics').MetricsConfiguration>): void {
    this.metricsService.updateConfiguration(config);
  }

  /**
   * Generate table data for UI display from complexity report
   */
  public getTableData(complexityReport: CircuitComplexityReport): ComplexityTableData[] {
    if (!complexityReport || !complexityReport.files?.length) {
      return [];
    }

    const fileMetrics = complexityReport.files[0];
    if (!fileMetrics?.lines?.length) {
      return [];
    }

    // Collect all expressions from all lines
    const allExpressions: ComplexityTableData[] = [];

    fileMetrics.lines.forEach(line => {
      if (line.expressions && line.expressions.length > 0) {
        line.expressions.forEach(expr => {
          const totalCost = expr.acirOpcodes + expr.brilligOpcodes + expr.gates;
          // Use original SVG percentage if available, otherwise calculate locally
          const percentage = (expr as ExpressionMetrics & { originalPercentage?: number }).originalPercentage ||
            (complexityReport.totalAcirOpcodes + complexityReport.totalBrilligOpcodes + complexityReport.totalGates > 0
              ? (totalCost / (complexityReport.totalAcirOpcodes + complexityReport.totalBrilligOpcodes + complexityReport.totalGates)) * 100
              : 0);

          allExpressions.push({
            lineNumber: line.lineNumber,
            column: expr.column || 0,
            expression: expr.expression || 'Unknown expression',
            acirOpcodes: expr.acirOpcodes,
            brilligOpcodes: expr.brilligOpcodes,
            gates: expr.gates,
            totalCost,
            percentage,
            fileName: line.fileName || 'main.nr'
          });
        });
      } else if (line.acirOpcodes > 0 || line.brilligOpcodes > 0 || line.gates > 0) {
        // Include lines with opcodes but no specific expressions
        allExpressions.push({
          lineNumber: line.lineNumber,
          column: 0,
          expression: `Line ${line.lineNumber} (no specific expression)`,
          acirOpcodes: line.acirOpcodes,
          brilligOpcodes: line.brilligOpcodes,
          gates: line.gates,
          totalCost: line.totalCost || (line.acirOpcodes + line.brilligOpcodes + line.gates),
          percentage: line.percentage || 0,
          fileName: line.fileName || 'main.nr'
        });
      }
    });

    // Deduplicate expressions by grouping same line+column+expression and aggregating values
    const expressionMap = new Map<string, ComplexityTableData>();

    allExpressions.forEach(expr => {
      const key = `${expr.lineNumber}:${expr.column}:${expr.expression}`;
      const existing = expressionMap.get(key);

      if (existing) {
        // Aggregate values for duplicate expressions
        existing.acirOpcodes += expr.acirOpcodes;
        existing.brilligOpcodes += expr.brilligOpcodes;
        existing.gates += expr.gates;
        existing.totalCost = existing.acirOpcodes + existing.brilligOpcodes + existing.gates;
        // Use the higher percentage (they should be similar)
        existing.percentage = Math.max(existing.percentage, expr.percentage);
      } else {
        expressionMap.set(key, { ...expr });
      }
    });

    // Convert back to array and sort by percentage descending (highest cost first)
    return Array.from(expressionMap.values()).sort((a, b) => b.percentage - a.percentage);
  }

  /**
   * Generate and output a detailed console table of all expressions with opcodes and percentages
   */
  private generateOpcodeConsoleTable(complexityReport: CircuitComplexityReport, serverMetrics?: { totalAcirOpcodes: number; totalBrilligOpcodes: number; totalGates: number }): void {
    if (!complexityReport || !complexityReport.files?.length) {
      console.warn('No complexity report data available for console table');
      return;
    }

    const fileMetrics = complexityReport.files[0];
    if (!fileMetrics?.lines?.length) {
      console.warn('No line metrics available for console table');
      return;
    }

    // Collect all expressions from all lines
    const allExpressions: Array<{
      lineNumber: number;
      column: number;
      expression: string;
      acirOpcodes: number;
      brilligOpcodes: number;
      gates: number;
      totalCost: number;
      percentage: number;
      fileName: string;
    }> = [];

    fileMetrics.lines.forEach(line => {
      if (line.expressions && line.expressions.length > 0) {
        line.expressions.forEach(expr => {
          const totalCost = expr.acirOpcodes + expr.brilligOpcodes + expr.gates;
          // Use original SVG percentage if available, otherwise calculate locally
          const percentage = (expr as ExpressionMetrics & { originalPercentage?: number }).originalPercentage ||
            (complexityReport.totalAcirOpcodes + complexityReport.totalBrilligOpcodes + complexityReport.totalGates > 0
              ? (totalCost / (complexityReport.totalAcirOpcodes + complexityReport.totalBrilligOpcodes + complexityReport.totalGates)) * 100
              : 0);

          allExpressions.push({
            lineNumber: line.lineNumber,
            column: expr.column || 0,
            expression: expr.expression || 'Unknown expression',
            acirOpcodes: expr.acirOpcodes,
            brilligOpcodes: expr.brilligOpcodes,
            gates: expr.gates,
            totalCost,
            percentage,
            fileName: line.fileName || 'main.nr'
          });
        });
      } else if (line.acirOpcodes > 0 || line.brilligOpcodes > 0 || line.gates > 0) {
        // Include lines with opcodes but no specific expressions
        allExpressions.push({
          lineNumber: line.lineNumber,
          column: 0,
          expression: `Line ${line.lineNumber} (no specific expression)`,
          acirOpcodes: line.acirOpcodes,
          brilligOpcodes: line.brilligOpcodes,
          gates: line.gates,
          totalCost: line.totalCost || (line.acirOpcodes + line.brilligOpcodes + line.gates),
          percentage: line.percentage || 0,
          fileName: line.fileName || 'main.nr'
        });
      }
    });

    // Deduplicate expressions by grouping same line+column+expression and aggregating values
    const expressionMap = new Map<string, {
      lineNumber: number;
      column: number;
      expression: string;
      acirOpcodes: number;
      brilligOpcodes: number;
      gates: number;
      totalCost: number;
      percentage: number;
      fileName: string;
    }>();

    allExpressions.forEach(expr => {
      const key = `${expr.lineNumber}:${expr.column}:${expr.expression}`;
      const existing = expressionMap.get(key);

      if (existing) {
        // Aggregate values for duplicate expressions
        existing.acirOpcodes += expr.acirOpcodes;
        existing.brilligOpcodes += expr.brilligOpcodes;
        existing.gates += expr.gates;
        existing.totalCost = existing.acirOpcodes + existing.brilligOpcodes + existing.gates;
        // Use the higher percentage (they should be similar)
        existing.percentage = Math.max(existing.percentage, expr.percentage);
      } else {
        expressionMap.set(key, { ...expr });
      }
    });

    // Convert back to array
    const deduplicatedExpressions = Array.from(expressionMap.values());

    // Sort by percentage descending (highest cost first)
    deduplicatedExpressions.sort((a, b) => b.percentage - a.percentage);

    // Helper function to decode HTML entities
    const decodeHtmlEntities = (text: string): string => {
      return text
        .replace(/&gt;/g, '>')
        .replace(/&lt;/g, '<')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");
    };

    // Format data for console.table
    const tableData = deduplicatedExpressions.map((expr) => {
      const decodedExpression = decodeHtmlEntities(expr.expression);
      return {
        'Line': expr.lineNumber,
        'Expression': decodedExpression.length > 60 ? decodedExpression.substring(0, 57) + '...' : decodedExpression,
        'ACIR': expr.acirOpcodes,
        'Percentage': `${expr.percentage.toFixed(2)}%`
      };
    });

    // Use server metrics if available, otherwise fall back to complexity report
    const actualMetrics = serverMetrics || {
      totalAcirOpcodes: complexityReport.totalAcirOpcodes,
      totalBrilligOpcodes: complexityReport.totalBrilligOpcodes,
      totalGates: complexityReport.totalGates
    };

    // Output summary header
    console.log('\n🔥 Circuit Complexity Analysis - Detailed Expression Breakdown');
    console.log('================================================================');
    console.log(`Total ACIR Opcodes: ${actualMetrics.totalAcirOpcodes}`);
    console.log(`Total Brillig Opcodes: ${actualMetrics.totalBrilligOpcodes}`);
    console.log(`Total Gates: ${actualMetrics.totalGates}`);
    console.log(`Total Expressions: ${deduplicatedExpressions.length}`);
    console.log('================================================================\n');

    // Output the main table
    console.table(tableData);

    // Output top 5 hotspots if available
    if (complexityReport.hotspots && complexityReport.hotspots.length > 0) {
      console.log('\n🎯 Top Performance Hotspots:');
      console.log('-----------------------------');
      complexityReport.hotspots.slice(0, 5).forEach((hotspot, index) => {
        console.log(`${index + 1}. Line ${hotspot.lineNumber}: ${hotspot.percentage.toFixed(2)}% (${hotspot.totalCost} total cost)`);
      });
    }

    console.log('\n📊 Use this data to identify the most expensive expressions in your circuit.');
    console.log('💡 Focus optimization efforts on expressions with high percentages.');
  }
}
