import { noirWasmCompiler } from './NoirWasmCompiler';

export interface ProfilerRequest {
  sourceCode: string;
  cargoToml?: string;
}

export interface ProfilerResult {
  acirSVG: string;
  gatesSVG: string;
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
  private apiEndpoint: string;
  private serverBaseUrl: string;

  constructor() {
    this.apiEndpoint = '/api/profile/opcodes';
    // Use environment variable for server base URL, fallback to localhost:4000
    this.serverBaseUrl = import.meta.env.VITE_PROFILER_SERVER_URL || 'http://localhost:4000';
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
      
      console.log('[NoirProfilerService] SVG content extracted:', {
        mainAcirSVGLength: svgData.mainAcirSVG.length,
        mainGatesSVGLength: svgData.mainGatesSVG.length
      });

      return {
        acirSVG: svgData.mainAcirSVG,
        gatesSVG: svgData.mainGatesSVG,
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
    let mainGatesSVG = '';

    svgs.forEach(svg => {
      console.log(`[NoirProfilerService] Processing SVG: ${svg.filename} (${svg.type})`);
      
      // Extract ACIR opcodes SVG
      if (svg.filename.includes('main_acir_opcodes')) {
        mainAcirSVG = this.cleanSVGContent(svg.content);
      }
      
      // Extract proving backend gates SVG
      if (svg.filename.includes('main_gates')) {
        mainGatesSVG = this.cleanSVGContent(svg.content);
      }
    });

    return {
      mainAcirSVG,
      mainGatesSVG
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
    
    console.log('[NoirProfilerService] SVG cleaned, removed headers');
    
    return finalSVG;
  }




    


}
