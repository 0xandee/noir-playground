import { SVGFlamegraphParser, CompleteProfilerData, ParsedFlamegraphData, ParsedBrilligData } from './SVGFlamegraphParser';
import { ParsedFunctionData, LineComplexity } from '@/components/ComplexityAnalysisPanel';
import { noirWasmCompiler } from './NoirWasmCompiler';

export interface ProfilerRequest {
  sourceCode: string;
  cargoToml?: string;
}

export interface ProfilerResponse {
  success: boolean;
  data: {
    acirSVG: string;
    brilligQuotientSVG: string;
    brilligInvertSVG: string;
    source: string;
    error?: string;
    message?: string;
  };
}

export interface ProfilerResult {
  svgContent: string;
  source: 'noir-profiler'
  error?: string;
  message?: string;
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
  tempFileCreated: boolean;
  error?: string;
}

export class NoirProfilerService {
  private parser: SVGFlamegraphParser;
  private apiEndpoint: string;
  private serverBaseUrl: string;

  constructor() {
    this.parser = new SVGFlamegraphParser();
    this.apiEndpoint = '/api/profile/opcodes';
    // Use environment variable for server base URL, fallback to localhost:4000
    this.serverBaseUrl = import.meta.env.VITE_PROFILER_SERVER_URL || 'http://localhost:4000';
  }

  /**
   * Generate a simple hash from bytecode content
   */
  private generateHash(bytecode: string): string {
    let hash = 0;
    for (let i = 0; i < bytecode.length; i++) {
      const char = bytecode.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString();
  }

  /**
   * Profile a Noir circuit by compiling and calling the server API
   */
  async profileCircuit(request: ProfilerRequest): Promise<ProfilerResult> {
    try {
      console.log('[NoirProfilerService] Starting circuit profiling via server API...');
      console.log('[NoirProfilerService] Server URL:', this.serverBaseUrl);
      
      // Step 1: Compile the source code to get real artifacts
      console.log('[NoirProfilerService] Compiling source code for profiling...');
      console.log('[NoirProfilerService] Source code length:', request.sourceCode.length);
      console.log('[NoirProfilerService] Cargo.toml provided:', !!request.cargoToml);
      
      const compilationResult = await noirWasmCompiler.compileProgram(request.sourceCode, request.cargoToml);
      
      console.log('[NoirProfilerService] Compilation result:', {
        success: compilationResult.success,
        hasProgram: !!compilationResult.program,
        compilationTime: compilationResult.compilationTime,
        error: compilationResult.error
      });
      
      if (!compilationResult.success) {
        throw new Error(`Compilation failed: ${compilationResult.error}`);
      }
      
      if (!compilationResult.program) {
        throw new Error('No compiled program available after successful compilation');
      }
      
      console.log('[NoirProfilerService] Compilation successful, creating artifact...');
      
      // Step 2: Create artifact from compilation result
      const artifact = compilationResult.program.program;

      // Step 3: Make request to server API
      console.log('[NoirProfilerService] Sending artifact to server for profiling...');
      const response = await fetch(`${this.serverBaseUrl}${this.apiEndpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ artifact })
      });

      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }

      const serverResponse: ServerProfilerResponse = await response.json();
      
      if (!serverResponse.success) {
        throw new Error(serverResponse.error || 'Server profiling failed');
      }

      console.log('[NoirProfilerService] Server profiling successful:', {
        svgsGenerated: serverResponse.svgs.length,
        tempFileCreated: serverResponse.tempFileCreated
      });

      // Step 4: Extract SVG content from server response
      const svgData = this.extractSVGDataFromResponse(serverResponse.svgs);
      
      console.log('[NoirProfilerService] Main ACIR SVG content extracted:', {
        mainAcirSVGLength: svgData.mainAcirSVG.length
      });

      return {
        svgContent: svgData.mainAcirSVG,
        source: 'noir-profiler',
        message: 'Profiling completed via server API with real compilation'
      };

    } catch (error) {
      console.error('[NoirProfilerService] Profiling failed:', error);
      throw error; // Re-throw the error - no fallback to mock data
    }
  }

  /**
   * Extract SVG data from server response
   */
  private extractSVGDataFromResponse(svgs: Array<{ content: string; filename: string; function?: string; type: string }>) {
    let mainAcirSVG = '';

    svgs.forEach(svg => {
      console.log(`[NoirProfilerService] Processing SVG: ${svg.filename} (${svg.type})`);
      
      // Only extract the main ACIR opcodes SVG
      if (svg.filename.includes('main_acir_opcodes')) {
        mainAcirSVG = svg.content;
        console.log(`[NoirProfilerService] Found main ACIR SVG: ${svg.content.length} chars`);
      }
    });

    return {
      mainAcirSVG
    };
  }




    


  /**
   * Get profiling statistics
   */
  async getProfilingStats(): Promise<{
    totalRequests: number;
    successRate: number;
    averageResponseTime: number;
  }> {
    return {
      totalRequests: 0,
      successRate: 100,
      averageResponseTime: 0
    };
  }

  /**
   * Get optimization recommendations
   */
  async getOptimizationRecommendations(): Promise<string[]> {
    return [
      'Consider inlining small functions to reduce ACIR overhead',
      'Field inversions are expensive - cache results if possible',
      'Use range checks sparingly as they generate many constraints',
      'Consider using lookup tables for repeated calculations'
    ];
  }

  /**
   * Export profiling data
   */
  async exportProfilingData(): Promise<string> {
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      source: 'server-api',
      message: 'Profiling data export from server API'
    }, null, 2);
  }
}
