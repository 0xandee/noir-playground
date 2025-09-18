import { noirWasmCompiler, NoirWasmCompiler } from './NoirWasmCompiler';
import { MetricsAggregationService, AggregationInput } from './MetricsAggregationService';
import { CircuitComplexityReport } from '@/types/circuitMetrics';

export interface ProfilerRequest {
  sourceCode: string;
  cargoToml?: string;
  fileName?: string;
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
      console.error('[NoirProfilerService] Profiling failed:', error);
      throw error; // Re-throw the error - no fallback to mock data
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
      console.error('[NoirProfilerService] Failed to get complexity report:', error);
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
}
