import { SVGFlamegraphParser, CompleteProfilerData, ParsedFlamegraphData, ParsedBrilligData } from './SVGFlamegraphParser';
import { REAL_SVG_DATA } from './RealSVGData';
import { ParsedFunctionData, LineComplexity } from '@/components/ComplexityAnalysisPanel';

export interface ProfilerRequest {
  sourceCode: string;
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
  parsedData: ParsedFunctionData[];
  lineComplexity: LineComplexity[];
  completeData: CompleteProfilerData;
  source: 'noir-profiler' | 'mock-fallback' | 'mock-data';
  error?: string;
  message?: string;
  recommendations?: string[];
}

export class NoirProfilerService {
  private parser: SVGFlamegraphParser;
  private apiEndpoint: string;

  constructor() {
    this.parser = new SVGFlamegraphParser();
    // API endpoint for future use (currently disabled)
    this.apiEndpoint = '/profiler';
  }

  /**
   * Generate mock SVG data based on source code
   */
  private generateMockDataFromSource(sourceCode: string) {
    // Use real SVG data from @target/ folder
    return {
      acirSVG: REAL_SVG_DATA.acirSVG,
      brilligQuotientSVG: REAL_SVG_DATA.brilligQuotientSVG,
      brilligInvertSVG: REAL_SVG_DATA.brilligInvertSVG,
      mainGatesSVG: REAL_SVG_DATA.mainGatesSVG
    };
  }

  /**
   * Profile a Noir circuit and return complexity analysis
   */
  async profileCircuit(request: ProfilerRequest): Promise<ProfilerResult> {
    try {
      console.log('[NoirProfilerService] Starting circuit profiling...');
      
      // Since API endpoints aren't working in this repo, always use mock data
      console.log('[NoirProfilerService] Using mock data (API bypassed)');
      
      // Generate mock data based on source code
      const mockData = this.generateMockDataFromSource(request.sourceCode);
      
      // Parse the mock SVG data
      const completeData = this.parser.parseCompleteProfilerData(
        mockData.acirSVG,
        mockData.brilligQuotientSVG,
        request.sourceCode
      );

      // Extract parsed function data
      const parsedData = completeData.acir.functions;
      
      // Extract line-by-line complexity
      const lineComplexity = this.parser.extractLineComplexity(
        completeData.acir,
        request.sourceCode
      );

      console.log('[NoirProfilerService] Mock data parsing completed:', {
        functions: parsedData.length,
        totalConstraints: completeData.acir.totalConstraints,
        totalBrillig: completeData.brillig.totalBrilligOpcode,
        lines: lineComplexity.length
      });

      // Store the original SVG content for display
      completeData.acir.svgContent = mockData.acirSVG;
      completeData.brillig.quotientSVG = mockData.brilligQuotientSVG;
      completeData.brillig.invertSVG = mockData.brilligInvertSVG;
      completeData.mainGatesSVG = mockData.mainGatesSVG;

      console.log('[NoirProfilerService] SVG content stored:', {
        acirSVGLength: mockData.acirSVG.length,
        brilligQuotientLength: mockData.brilligQuotientSVG.length,
        brilligInvertLength: mockData.brilligInvertSVG.length,
        mainGatesLength: mockData.mainGatesSVG.length,
        storedAcirSVG: !!completeData.acir.svgContent,
        storedBrilligQuotient: !!completeData.brillig.quotientSVG,
        storedBrilligInvert: !!completeData.brillig.invertSVG,
        storedMainGates: !!completeData.mainGatesSVG
      });

      return {
        parsedData,
        lineComplexity,
        completeData,
        source: 'mock-data',
        message: 'Using mock data for demonstration (API disabled)'
      };

    } catch (error) {
      console.error('[NoirProfilerService] Mock data generation failed:', error);
      
      // Return basic mock data as final fallback
      return this.getMockProfilerResult(request.sourceCode);
    }
  }

  /**
   * Get mock profiler result for development/testing
   */
  private getMockProfilerResult(sourceCode: string): ProfilerResult {
    console.log('[NoirProfilerService] Using mock profiler data');
    
    // Create mock SVG data
    const mockAcirSVG = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1200" height="800" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="800" height="40" fill="#ff6b6b" opacity="0.8">
    <title>main:1-5: 156 constraints</title>
  </rect>
  <text x="10" y="25" font-size="12">main function (156 constraints)</text>
  
  <rect x="0" y="50" width="400" height="30" fill="#4ecdc4" opacity="0.8">
    <title>add:8-12: 89 constraints</title>
  </rect>
  <text x="10" y="70" font-size="12">add function (89 constraints)</text>
  
  <rect x="0" y="90" width="200" height="25" fill="#45b7d1" opacity="0.8">
    <title>multiply:15-18: 45 constraints</title>
  </rect>
  <text x="10" y="110" font-size="12">multiply function (45 constraints)</text>
</svg>`;

    const mockBrilligQuotientSVG = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="300" height="30" fill="#ff9ff3" opacity="0.8">
    <title>integer_quotient: 67 operations</title>
  </rect>
  <text x="10" y="20" font-size="12">Integer Quotient Operations (67)</text>
  
  <rect x="0" y="40" width="200" height="25" fill="#feca57" opacity="0.8">
    <title>field_operations: 45 operations</title>
  </rect>
  <text x="10" y="55" font-size="12">Field Operations (45)</text>
</svg>`;

    const mockBrilligInvertSVG = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="250" height="30" fill="#ff6b6b" opacity="0.8">
    <title>field_invert: 34 operations</title>
  </rect>
  <text x="10" y="20" font-size="12">Field Inversion Operations (34)</text>
  
  <rect x="0" y="40" width="180" height="25" fill="#48dbfb" opacity="0.8">
    <title>arithmetic: 28 operations</title>
  </rect>
  <text x="10" y="55" font-size="12">Arithmetic Operations (28)</text>
</svg>`;

    // Parse the mock SVG data
    const completeData = this.parser.parseCompleteProfilerData(
      mockAcirSVG,
      mockBrilligQuotientSVG,
      sourceCode
    );

    // Extract parsed function data
    const parsedData = completeData.acir.functions;
    
    // Extract line-by-line complexity
    const lineComplexity = this.parser.extractLineComplexity(
      completeData.acir,
      sourceCode
    );

    // Store the original SVG content for display
    completeData.acir.svgContent = mockAcirSVG;
    completeData.brillig.quotientSVG = mockBrilligQuotientSVG;
    completeData.brillig.invertSVG = mockBrilligInvertSVG;

    return {
      parsedData,
      lineComplexity,
      completeData,
      source: 'mock-fallback',
      message: 'Using fallback mock data',
      recommendations: [
        'Consider inlining small functions to reduce ACIR overhead',
        'Field inversions are expensive - cache results if possible',
        'Total complexity (290) is acceptable for production use'
      ]
    };
  }

  /**
   * Check if the profiler service is available
   * Note: Currently disabled since API endpoints aren't working in this repo
   */
  async checkAvailability(): Promise<boolean> {
    // API endpoints are disabled, always return false
    console.log('[NoirProfilerService] API endpoints disabled, using mock data only');
    return false;
    
    /* Future implementation when API is working:
    try {
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sourceCode: 'fn main() -> Field { 1 }'
        }),
      });

      return response.ok;
    } catch (error) {
      console.error('[NoirProfilerService] Availability check failed:', error);
      return false;
    }
    */
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
      source: 'mock-data',
      message: 'Mock profiling data export'
    }, null, 2);
  }
}
