// Line analysis service with real SVG opcode parsing

import { SvgOpcodesParser, LineOpcodesData } from './SvgOpcodesParser';
import { NoirProfilerService } from './NoirProfilerService';

export interface LineAnalysisResult {
  lineNumber: number;
  lineText: string;
  opcodes: string[];
  constraints: ConstraintInfo[];
  error?: string;
}

export interface ConstraintInfo {
  type: 'assert' | 'constrain' | 'arithmetic' | 'comparison' | 'type_conversion';
  expression: string;
  complexity: number;
  cost: number;
}

export interface LineAnalysisRequest {
  sourceCode: string;
  lineNumber: number;
  cargoToml?: string;
}

export class LineAnalysisService {
  private svgParser: SvgOpcodesParser;
  private profilerService: NoirProfilerService;
  private opcodesCache: Map<string, LineOpcodesData[]> = new Map();

  constructor() {
    this.svgParser = new SvgOpcodesParser();
    this.profilerService = new NoirProfilerService();
  }

  /**
   * Analyze a specific line of Noir code - Real SVG opcode parsing
   */
  async analyzeLine(request: LineAnalysisRequest): Promise<LineAnalysisResult> {
    const { sourceCode, lineNumber, cargoToml } = request;
    
    console.log(`[LineAnalysisService] Step 1: analyzeLine called for line ${lineNumber}`);
    
    // Get the line text
    const lines = sourceCode.split('\n');
    const lineText = lines[lineNumber - 1] || '';
    
    console.log(`[LineAnalysisService] Step 2: Line text: "${lineText.trim()}"`);
    
    // Skip empty lines and comments
    if (!lineText.trim() || lineText.trim().startsWith('//')) {
      console.log(`[LineAnalysisService] Step 3: Skipping line ${lineNumber} (empty or comment)`);
      return {
        lineNumber,
        lineText,
        opcodes: [],
        constraints: []
      };
    }
    
    try {
      console.log(`[LineAnalysisService] Step 3: Getting real opcode data from SVG parsing`);
      // Get real opcode data from SVG parsing
      const realOpcodes = await this.getRealOpcodesForLine(sourceCode, lineNumber, cargoToml);
      
      console.log(`[LineAnalysisService] Step 4: Real opcodes result:`, realOpcodes);
      
      // For now, use simple mock constraints (we'll implement real constraints later)
      const mockConstraints = this.getMockConstraintsForLine(lineNumber, lineText);
      
      const result = {
        lineNumber,
        lineText,
        opcodes: realOpcodes,
        constraints: mockConstraints
      };
      
      console.log(`[LineAnalysisService] Step 5: Final result:`, result);
      return result;
    } catch (error) {
      console.error('[LineAnalysisService] Real opcode analysis failed, falling back to mock data:', error);
      
      // Fallback to mock data if real analysis fails
      const mockData = this.getMockDataForLine(lineNumber, lineText);
      return {
        lineNumber,
        lineText,
        opcodes: mockData.opcodes,
        constraints: mockData.constraints
      };
    }
  }

  /**
   * Get simple mock data for a line
   */
  private getMockDataForLine(lineNumber: number, lineText: string): { opcodes: string[]; constraints: ConstraintInfo[] } {
    // Skip empty lines and comments
    if (!lineText.trim() || lineText.trim().startsWith('//')) {
      return { opcodes: [], constraints: [] };
    }

    // Simple mock data based on line content
    const opcodes: string[] = [];
    const constraints: ConstraintInfo[] = [];

    // Mock opcodes
    if (lineText.includes('assert')) {
      opcodes.push('ASSERT');
    }
    if (lineText.includes('+')) {
      opcodes.push('ADD');
    }
    if (lineText.includes('>')) {
      opcodes.push('GT');
    }
    if (lineText.includes('as')) {
      opcodes.push('CAST');
    }
    if (lineText.includes('let')) {
      opcodes.push('STORE');
    }

    // Mock constraints
    if (lineText.includes('assert')) {
      constraints.push({
        type: 'assert',
        expression: lineText.trim(),
        complexity: 0,
        cost: 0
      });
    }
    if (lineText.includes('+')) {
      constraints.push({
        type: 'arithmetic',
        expression: 'addition operation',
        complexity: 0,
        cost: 0
      });
    }
    if (lineText.includes('>')) {
      constraints.push({
        type: 'comparison',
        expression: 'greater than comparison',
        complexity: 0,
        cost: 0
      });
    }
    if (lineText.includes('as')) {
      constraints.push({
        type: 'type_conversion',
        expression: 'type conversion',
        complexity: 0,
        cost: 0
      });
    }

    return { opcodes, constraints };
  }



  /**
   * Get real opcodes for a specific line using SVG parsing
   */
  private async getRealOpcodesForLine(sourceCode: string, lineNumber: number, cargoToml?: string): Promise<string[]> {
    console.log(`[LineAnalysisService] Step 3.1: getRealOpcodesForLine called for line ${lineNumber}`);
    
    // Create cache key based on source code hash
    const cacheKey = this.createCacheKey(sourceCode, cargoToml);
    console.log(`[LineAnalysisService] Step 3.2: Cache key: "${cacheKey}"`);
    
    // Check cache first
    if (this.opcodesCache.has(cacheKey)) {
      console.log(`[LineAnalysisService] Step 3.3: Found cached SVG data`);
      const cachedData = this.opcodesCache.get(cacheKey)!;
      const lineData = this.getExactLineData(cachedData, lineNumber, sourceCode);
      return this.formatOpcodesForLine(lineData);
    }
    
    console.log(`[LineAnalysisService] Step 3.3: No cache found, calling profiler service`);
    // Get SVG data from profiler service
    const profilerResult = await this.profilerService.profileCircuit({
      sourceCode,
      cargoToml
    });
    
    console.log(`[LineAnalysisService] Step 3.4: Profiler result:`, {
      hasAcirSVG: !!profilerResult.acirSVG,
      acirSVGLength: profilerResult.acirSVG?.length || 0,
      source: profilerResult.source
    });
    
    if (!profilerResult.acirSVG) {
      throw new Error('No SVG data available from profiler');
    }
    
    console.log(`[LineAnalysisService] Step 3.5: Parsing SVG content (${profilerResult.acirSVG.length} chars)`);
    // Parse SVG to get line-specific opcode data
    const allLineData = this.svgParser.parseLineOpcodes(profilerResult.acirSVG);
    
    console.log(`[LineAnalysisService] Step 3.6: Parsed ${allLineData.length} line expressions from SVG`);
    this.svgParser.debugPrintLineTotals(profilerResult.acirSVG);
    this.svgParser.debugPrintAvailableLines(profilerResult.acirSVG);
    
    // Cache the parsed data
    this.opcodesCache.set(cacheKey, allLineData);
    console.log(`[LineAnalysisService] Step 3.7: Cached parsed data`);
    
    // Get data for the specific line with exact matching
    const lineData = this.getExactLineData(allLineData, lineNumber, sourceCode);
    console.log(`[LineAnalysisService] Step 3.8: Line data for line ${lineNumber}:`, lineData);
    
    const result = this.formatOpcodesForLine(lineData);
    console.log(`[LineAnalysisService] Step 3.9: Formatted result:`, result);
    return result;
  }

  /**
   * Get exact line data by matching line number and determining the correct file
   */
  private getExactLineData(allLineData: LineOpcodesData[], lineNumber: number, sourceCode: string): LineOpcodesData[] {
    // Find data for the exact line number only
    const lineData = allLineData.filter(data => data.lineNumber === lineNumber);
    
    // Debug: Show what we found
    if (lineData.length > 0) {
      console.log(`[LineAnalysisService] Found ${lineData.length} expressions for line ${lineNumber}:`);
      lineData.forEach(data => {
        const fileInfo = data.fileName ? `[${data.fileName}] ` : '';
        console.log(`  ${fileInfo}${data.expression} (${data.opcodes} opcodes)`);
      });
    } else {
      console.log(`[LineAnalysisService] No opcode data found for line ${lineNumber} - this line has no opcodes in the circuit`);
    }
    
    return lineData;
  }

  /**
   * Format opcode data for display
   */
  private formatOpcodesForLine(lineData: LineOpcodesData[]): string[] {
    console.log(`[LineAnalysisService] Step 5.1: formatOpcodesForLine called with:`, lineData);
    
    if (lineData.length === 0) {
      console.log(`[LineAnalysisService] Step 5.2: No line data, returning "No opcodes"`);
      return ['No opcodes (line not in circuit)'];
    }
    
    const totalOpcodes = lineData.reduce((sum, data) => sum + data.opcodes, 0);
    console.log(`[LineAnalysisService] Step 5.3: Total opcodes calculated: ${totalOpcodes}`);
    
    const opcodes: string[] = [];
    
    // Add total opcodes
    opcodes.push(`${totalOpcodes} opcodes`);
    console.log(`[LineAnalysisService] Step 5.4: Added total: "${totalOpcodes} opcodes"`);
    
    // Add individual expressions with their opcode counts
    lineData.forEach((data, index) => {
      if (data.opcodes > 0) {
        // Clean up HTML entities and extra text
        const cleanExpression = this.cleanExpression(data.expression);
        const expressionText = `${cleanExpression} (${data.opcodes} opcodes)`;
        opcodes.push(expressionText);
        console.log(`[LineAnalysisService] Step 5.5: Added expression ${index + 1}: "${expressionText}"`);
      }
    });
    
    // Debug logging
    console.log(`[LineAnalysisService] Step 5.6: Final opcodes array:`, opcodes);
    console.log(`[LineAnalysisService] Line ${lineData[0]?.lineNumber}: ${totalOpcodes} total opcodes from ${lineData.length} expressions`);
    
    return opcodes;
  }

  /**
   * Clean expression text by removing HTML entities and extra markup
   */
  private cleanExpression(expression: string): string {
    return expression
      .replace(/&gt;/g, '>')
      .replace(/&lt;/g, '<')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/<[^>]*>/g, '') // Remove any remaining HTML tags
      .trim();
  }

  /**
   * Get mock constraints for a line (temporary until we implement real constraint parsing)
   */
  private getMockConstraintsForLine(lineNumber: number, lineText: string): ConstraintInfo[] {
    const constraints: ConstraintInfo[] = [];
    
    if (lineText.includes('assert')) {
      constraints.push({
        type: 'assert',
        expression: lineText.trim(),
        complexity: 0,
        cost: 0
      });
    }
    
    return constraints;
  }

  /**
   * Create cache key for source code
   */
  private createCacheKey(sourceCode: string, cargoToml?: string): string {
    const sourceHash = this.simpleHash(sourceCode);
    const cargoHash = cargoToml ? this.simpleHash(cargoToml) : 'default';
    return `${sourceHash}_${cargoHash}`;
  }

  /**
   * Simple hash function for cache keys
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Clear the analysis cache
   */
  clearCache(): void {
    this.opcodesCache.clear();
  }
}
