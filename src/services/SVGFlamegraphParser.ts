import { ParsedFunctionData, LineComplexity } from '@/components/ComplexityAnalysisPanel';

export interface ParsedFlamegraphData {
  functions: ParsedFunctionData[];
  totalConstraints: number;
  totalFunctions: number;
  averageConstraintsPerFunction: number;
  complexityDistribution: {
    low: number;      // 0-50 constraints
    medium: number;   // 51-100 constraints
    high: number;     // 100+ constraints
  };
  svgContent?: string; // Store original SVG for display
}

export interface ParsedBrilligData {
  integerQuotient: number;
  fieldInversion: number;
  totalBrilligOpcode: number;
  operations: {
    type: string;
    count: number;
    complexity: number;
  }[];
  quotientSVG?: string; // Store original SVG for display
  invertSVG?: string;   // Store original SVG for display
}

export interface CompleteProfilerData {
  acir: ParsedFlamegraphData;
  brillig: ParsedBrilligData;
  mainGatesSVG?: string;
  overallMetrics: {
    totalACIRConstraints: number;
    totalBrilligOpcode: number;
    combinedComplexity: number;
    performanceRating: 'excellent' | 'good' | 'needs-optimization';
  };
  recommendations: string[];
}

export class SVGFlamegraphParser {
  /**
   * Parse ACIR opcodes SVG from noir-profiler
   */
  parseACIRSVG(svgContent: string): ParsedFlamegraphData {
    try {
      const parser = new DOMParser();
      const svgDoc = parser.parseFromString(svgContent, 'image/svg+xml');
      
      // Check for parsing errors
      const parserError = svgDoc.querySelector('parsererror');
      if (parserError) {
        throw new Error('SVG parsing failed');
      }

      // Extract all rect elements with title attributes
      const rects = svgDoc.querySelectorAll('rect[title]');
      const functions: ParsedFunctionData[] = [];
      let totalConstraints = 0;

      rects.forEach((rect) => {
        const title = rect.getAttribute('title');
        if (!title) return;

        // Parse title format: "main:1-5: 156 constraints"
        const match = title.match(/(\w+):(\d+-\d+):\s*(\d+)\s*constraints/);
        if (match) {
          const [, functionName, lineRange, constraintsStr] = match;
          const constraints = parseInt(constraintsStr, 10);
          
          if (!isNaN(constraints)) {
            const functionData: ParsedFunctionData = {
              functionName,
              lineRange,
              constraintCount: constraints,
              color: rect.getAttribute('fill') || '#000000',
              width: parseFloat(rect.getAttribute('width') || '0'),
              depth: parseFloat(rect.getAttribute('y') || '0') / 50, // Approximate depth based on Y position
              x: parseFloat(rect.getAttribute('x') || '0'),
              y: parseFloat(rect.getAttribute('y') || '0')
            };
            
            functions.push(functionData);
            totalConstraints += constraints;
          }
        }
      });

      // Sort functions by constraint count (descending)
      functions.sort((a, b) => b.constraintCount - a.constraintCount);

      // Calculate complexity distribution
      const complexityDistribution = this.calculateComplexityDistribution(functions);

      return {
        functions,
        totalConstraints,
        totalFunctions: functions.length,
        averageConstraintsPerFunction: functions.length > 0 ? Math.round(totalConstraints / functions.length) : 0,
        complexityDistribution
      };
    } catch (error) {
      console.error('Error parsing ACIR SVG:', error);
      throw new Error(`Failed to parse ACIR SVG: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Parse Brillig opcodes SVG from noir-profiler
   */
  parseBrilligSVG(svgContent: string): ParsedBrilligData {
    try {
      const parser = new DOMParser();
      const svgDoc = parser.parseFromString(svgContent, 'image/svg+xml');
      
      // Check for parsing errors
      const parserError = svgDoc.querySelector('parsererror');
      if (parserError) {
        throw new Error('SVG parsing failed');
      }

      // Extract operations from rect elements
      const rects = svgDoc.querySelectorAll('rect[title]');
      const operations: { type: string; count: number; complexity: number }[] = [];
      let totalBrilligOpcode = 0;

      rects.forEach((rect) => {
        const title = rect.getAttribute('title');
        if (!title) return;

        // Parse title format: "operation_name: count"
        const match = title.match(/([^:]+):\s*(\d+)/);
        if (match) {
          const [, operationType, countStr] = match;
          const count = parseInt(countStr, 10);
          
          if (!isNaN(count)) {
            operations.push({
              type: operationType.trim(),
              count,
              complexity: this.calculateBrilligComplexity(operationType, count)
            });
            
            totalBrilligOpcode += count;
          }
        }
      });

      // Calculate specific operation types
      const integerQuotient = operations.find(op => 
        op.type.toLowerCase().includes('quotient') || 
        op.type.toLowerCase().includes('division')
      )?.count || 0;
      
      const fieldInversion = operations.find(op => 
        op.type.toLowerCase().includes('invert') || 
        op.type.toLowerCase().includes('inversion')
      )?.count || 0;

      return {
        integerQuotient,
        fieldInversion,
        totalBrilligOpcode,
        operations: operations.sort((a, b) => b.count - a.count)
      };
    } catch (error) {
      console.error('Error parsing Brillig SVG:', error);
      throw new Error(`Failed to parse Brillig SVG: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract line-by-line complexity from parsed function data
   */
  extractLineComplexity(
    parsedData: ParsedFlamegraphData, 
    sourceCode: string
  ): LineComplexity[] {
    const lines = sourceCode.split('\n');
    const lineComplexity: LineComplexity[] = [];

    lines.forEach((line, index) => {
      const lineNumber = index + 1;
      const functionData = this.findFunctionForLine(lineNumber, parsedData.functions);
      
      if (functionData) {
        // Calculate constraints for this specific line
        const lineConstraints = this.calculateLineConstraints(lineNumber, functionData, parsedData.functions);
        
        lineComplexity.push({
          lineNumber,
          lineContent: line.trim(),
          constraints: lineConstraints,
          complexity: this.calculateComplexityScore(lineConstraints),
          functionName: functionData.functionName,
          color: this.getComplexityColor(lineConstraints)
        });
      } else {
        // Line not associated with any function
        lineComplexity.push({
          lineNumber,
          lineContent: line.trim(),
          constraints: 0,
          complexity: 1,
          functionName: 'unknown',
          color: 'green'
        });
      }
    });

    return lineComplexity;
  }

  /**
   * Combine ACIR and Brillig data for complete analysis
   */
  parseCompleteProfilerData(
    acirSVG: string,
    brilligSVG: string,
    sourceCode: string
  ): CompleteProfilerData {
    const acirData = this.parseACIRSVG(acirSVG);
    const brilligData = this.parseBrilligSVG(brilligSVG);
    
    const overallMetrics = {
      totalACIRConstraints: acirData.totalConstraints,
      totalBrilligOpcode: brilligData.totalBrilligOpcode,
      combinedComplexity: acirData.totalConstraints + brilligData.totalBrilligOpcode,
      performanceRating: this.calculateOverallPerformance(acirData, brilligData)
    };

    const recommendations = this.generateOptimizationRecommendations(acirData, brilligData);

    return {
      acir: acirData,
      brillig: brilligData,
      overallMetrics,
      recommendations
    };
  }

  /**
   * Find which function a line belongs to
   */
  private findFunctionForLine(lineNumber: number, functions: ParsedFunctionData[]): ParsedFunctionData | null {
    return functions.find(func => {
      const [start, end] = func.lineRange.split('-').map(Number);
      return lineNumber >= start && lineNumber <= end;
    }) || null;
  }

  /**
   * Calculate constraints for a specific line
   */
  private calculateLineConstraints(
    lineNumber: number, 
    functionData: ParsedFunctionData, 
    allFunctions: ParsedFunctionData[]
  ): number {
    const [start, end] = functionData.lineRange.split('-').map(Number);
    const totalLines = end - start + 1;
    
    // Distribute constraints evenly across lines, with some variation
    const baseConstraints = Math.floor(functionData.constraintCount / totalLines);
    const remainder = functionData.constraintCount % totalLines;
    
    // Add remainder to the first line
    if (lineNumber === start && remainder > 0) {
      return baseConstraints + remainder;
    }
    
    return baseConstraints;
  }

  /**
   * Calculate complexity score (1-10 scale)
   */
  private calculateComplexityScore(constraints: number): number {
    if (constraints === 0) return 1;
    if (constraints < 10) return 2;
    if (constraints < 25) return 3;
    if (constraints < 50) return 4;
    if (constraints < 75) return 5;
    if (constraints < 100) return 6;
    if (constraints < 150) return 7;
    if (constraints < 200) return 8;
    if (constraints < 300) return 9;
    return 10;
  }

  /**
   * Get complexity color based on constraint count
   */
  private getComplexityColor(constraints: number): 'red' | 'yellow' | 'green' {
    if (constraints >= 100) return 'red';
    if (constraints >= 50) return 'yellow';
    return 'green';
  }

  /**
   * Calculate complexity distribution
   */
  private calculateComplexityDistribution(functions: ParsedFunctionData[]) {
    let low = 0, medium = 0, high = 0;
    
    functions.forEach(func => {
      if (func.constraintCount <= 50) low++;
      else if (func.constraintCount <= 100) medium++;
      else high++;
    });
    
    return { low, medium, high };
  }

  /**
   * Calculate Brillig operation complexity
   */
  private calculateBrilligComplexity(operationType: string, count: number): number {
    const baseComplexity = {
      'quotient': 3,
      'division': 3,
      'invert': 2,
      'inversion': 2,
      'multiplication': 1,
      'addition': 1,
      'subtraction': 1
    };
    
    const base = baseComplexity[operationType.toLowerCase() as keyof typeof baseComplexity] || 1;
    return Math.min(base * Math.log2(count + 1), 10);
  }

  /**
   * Calculate overall performance rating
   */
  private calculateOverallPerformance(
    acirData: ParsedFlamegraphData, 
    brilligData: ParsedBrilligData
  ): 'excellent' | 'good' | 'needs-optimization' {
    const totalConstraints = acirData.totalConstraints + brilligData.totalBrilligOpcode;
    const avgConstraints = totalConstraints / Math.max(acirData.totalFunctions, 1);
    
    if (avgConstraints < 50) return 'excellent';
    if (avgConstraints < 100) return 'good';
    return 'needs-optimization';
  }

  /**
   * Generate optimization recommendations
   */
  private generateOptimizationRecommendations(
    acirData: ParsedFlamegraphData, 
    brilligData: ParsedBrilligData
  ): string[] {
    const recommendations: string[] = [];
    
    // ACIR-based recommendations
    if (acirData.complexityDistribution.high > 0) {
      recommendations.push(`Optimize ${acirData.complexityDistribution.high} high-complexity functions`);
    }
    
    if (acirData.averageConstraintsPerFunction > 100) {
      recommendations.push('Consider breaking down large functions into smaller ones');
    }
    
    // Brillig-based recommendations
    if (brilligData.integerQuotient > 50) {
      recommendations.push('Reduce integer division operations - consider using bit shifts or lookup tables');
    }
    
    if (brilligData.fieldInversion > 30) {
      recommendations.push('Minimize field inversions - batch operations when possible');
    }
    
    // General recommendations
    if (acirData.totalConstraints > 500) {
      recommendations.push('Consider using unconstrained functions for heavy computations');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('Your circuit is well-optimized!');
    }
    
    return recommendations;
  }
}
