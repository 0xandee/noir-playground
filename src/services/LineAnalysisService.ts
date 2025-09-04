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
  // Caching removed - will be implemented later

  constructor() {
    this.svgParser = new SvgOpcodesParser();
    this.profilerService = new NoirProfilerService();
  }

  /**
   * Analyze a specific line of Noir code - Real SVG opcode parsing
   */
  async analyzeLine(request: LineAnalysisRequest): Promise<LineAnalysisResult> {
    const { sourceCode, lineNumber, cargoToml } = request;
    
    // Get the line text
    const lines = sourceCode.split('\n');
    const lineText = lines[lineNumber - 1] || '';
    
    // Skip empty lines and comments
    if (!lineText.trim() || lineText.trim().startsWith('//')) {
      return {
        lineNumber,
        lineText,
        opcodes: [],
        constraints: []
      };
    }
    
    try {
      // Get real opcode data from SVG parsing
      const realOpcodes = await this.getRealOpcodesForLine(sourceCode, lineNumber, cargoToml);
      
      // For now, use simple mock constraints (we'll implement real constraints later)
      const mockConstraints = this.getMockConstraintsForLine(lineNumber, lineText);
      
      return {
        lineNumber,
        lineText,
        opcodes: realOpcodes,
        constraints: mockConstraints
      };
    } catch (error) {
      console.error('Real opcode analysis failed, falling back to mock data:', error);
      
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
    // Get SVG data from profiler service (no caching)
    const profilerResult = await this.profilerService.profileCircuit({
      sourceCode,
      cargoToml
    });
    
    if (!profilerResult.acirSVG) {
      throw new Error('No SVG data available from profiler');
    }
    
    // Parse SVG to get line-specific opcode data
    const allLineData = this.svgParser.parseLineOpcodes(profilerResult.acirSVG);
    
    // Get data for the specific line with exact matching
    const lineData = this.getExactLineData(allLineData, lineNumber, sourceCode);
    
    return this.formatOpcodesForLine(lineData);
  }

  /**
   * Get exact line data by matching line number and determining the correct file
   */
  private getExactLineData(allLineData: LineOpcodesData[], lineNumber: number, sourceCode: string): LineOpcodesData[] {
    // Find data for the exact line number only
    const lineData = allLineData.filter(data => data.lineNumber === lineNumber);
    
    return lineData;
  }

  /**
   * Format opcode data for display
   */
  private formatOpcodesForLine(lineData: LineOpcodesData[]): string[] {
    if (lineData.length === 0) {
      return ['No opcodes (line not in circuit)'];
    }
    
    const totalOpcodes = lineData.reduce((sum, data) => sum + data.opcodes, 0);
    const opcodes: string[] = [];
    
    // Add total opcodes
    opcodes.push(`${totalOpcodes} opcodes`);
    
    // Add individual expressions with their opcode counts
    lineData.forEach((data) => {
      if (data.opcodes > 0) {
        // Clean up HTML entities and extra text
        const cleanExpression = this.cleanExpression(data.expression);
        const expressionText = `${cleanExpression} (${data.opcodes} opcodes)`;
        opcodes.push(expressionText);
      }
    });
    
    return opcodes;
  }

  // Caching methods removed - will be implemented later

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

  // Caching methods removed - will be implemented later
}
