/**
 * Service for mapping source code lines to ACIR constraints
 * Parses profiler output to build code-to-constraint relationships
 */

import type { LineConstraintMapping, AcirOpcodeInfo } from '@/types/witness';
import type { ProfilerResult } from './NoirProfilerService';

export class ConstraintMappingService {
  /**
   * Parse profiler data to extract line-to-constraint mappings
   */
  parseProfilerData(
    profilerResult: ProfilerResult,
    sourceCode: string
  ): LineConstraintMapping[] {
    const lines = sourceCode.split('\n');
    const mappings: LineConstraintMapping[] = [];

    // Extract line metrics from profiler result
    const lineMetrics = this.extractLineMetrics(profilerResult);

    lines.forEach((line, index) => {
      const lineNumber = index + 1;
      const trimmedLine = line.trim();

      // Get metrics for this line from profiler
      const metrics = lineMetrics.get(lineNumber) || {
        acirOpcodes: 0,
        brilligOpcodes: 0,
        gates: 0
      };

      // Build constraint mapping
      const mapping: LineConstraintMapping = {
        line: lineNumber,
        sourceCode: line,
        opcodes: [], // Would be populated from detailed ACIR analysis
        witnessesCreated: [],
        witnessesUsed: [],
        constraintCount: metrics.acirOpcodes + metrics.brilligOpcodes
      };

      // Heuristically determine witnesses (simplified)
      // In a full implementation, this would come from ACIR analysis
      if (trimmedLine.includes('let') && trimmedLine.includes('=')) {
        // Variable assignment might create a witness
        mapping.witnessesCreated.push(lineNumber); // Placeholder
      }

      // Add operation-specific opcodes (simplified)
      if (mapping.constraintCount > 0) {
        mapping.opcodes = this.inferOpcodes(trimmedLine, metrics);
      }

      mappings.push(mapping);
    });

    return mappings;
  }

  /**
   * Extract line-level metrics from profiler result
   */
  private extractLineMetrics(
    profilerResult: ProfilerResult
  ): Map<number, { acirOpcodes: number; brilligOpcodes: number; gates: number }> {
    const metrics = new Map<number, any>();

    try {
      // The profiler returns SVG output with embedded metrics
      // Parse the SVG to extract line-by-line data

      // Parse the ACIR SVG flamegraph to extract line-level data
      if (profilerResult.acirSVG) {
        this.parseSvgOutput(profilerResult.acirSVG, metrics);
      }
    } catch (error) {
      console.warn('Failed to extract line metrics from profiler:', error);
    }

    return metrics;
  }

  /**
   * Parse SVG flamegraph output to extract line-level metrics
   */
  private parseSvgOutput(
    svgOutput: string,
    metrics: Map<number, any>
  ): void {
    try {
      // SVG flamegraph contains <title> tags with function/line info
      // Format: "function_name:line_number samples: N"

      const titleRegex = /<title>([^<]+)<\/title>/g;
      let match: RegExpExecArray | null;

      while ((match = titleRegex.exec(svgOutput)) !== null) {
        const titleText = match[1];

        // Extract line number and sample count
        const lineMatch = titleText.match(/:(\d+)/);
        const sampleMatch = titleText.match(/samples:\s*(\d+)/);

        if (lineMatch && sampleMatch) {
          const lineNum = parseInt(lineMatch[1], 10);
          const sampleCount = parseInt(sampleMatch[1], 10);

          // Samples correlate to constraint complexity
          if (!metrics.has(lineNum)) {
            metrics.set(lineNum, {
              acirOpcodes: 0,
              brilligOpcodes: 0,
              gates: 0
            });
          }

          const lineMetric = metrics.get(lineNum);
          lineMetric.acirOpcodes += sampleCount;
        }
      }
    } catch (error) {
      console.warn('Failed to parse SVG output:', error);
    }
  }

  /**
   * Infer ACIR opcodes from source line content (heuristic)
   */
  private inferOpcodes(
    line: string,
    metrics: { acirOpcodes: number; brilligOpcodes: number; gates: number }
  ): AcirOpcodeInfo[] {
    const opcodes: AcirOpcodeInfo[] = [];

    // Simple heuristics based on line content
    if (line.includes('+') || line.includes('-')) {
      opcodes.push({
        index: '0:0',
        type: 'BinaryFieldOp',
        operation: line.includes('+') ? 'Add' : 'Sub',
        inputs: ['_0', '_1'],
        outputs: ['_2']
      });
    }

    if (line.includes('*')) {
      opcodes.push({
        index: '0:1',
        type: 'BinaryFieldOp',
        operation: 'Mul',
        inputs: ['_0', '_1'],
        outputs: ['_2']
      });
    }

    if (line.includes('assert')) {
      opcodes.push({
        index: '0:2',
        type: 'AssertZero',
        operation: 'Assert',
        inputs: ['_0'],
        outputs: []
      });
    }

    if (line.includes('>') || line.includes('<')) {
      opcodes.push({
        index: '0:3',
        type: 'BinaryIntOp',
        operation: line.includes('>') ? 'GreaterThan' : 'LessThan',
        inputs: ['_0', '_1'],
        outputs: ['_2']
      });
    }

    if (line.includes(' as ')) {
      opcodes.push({
        index: '0:4',
        type: 'Cast',
        operation: 'Cast',
        inputs: ['_0'],
        outputs: ['_1']
      });
    }

    return opcodes;
  }

  /**
   * Get complexity score for a line (0-1 scale)
   */
  getComplexityScore(mapping: LineConstraintMapping, maxConstraints: number): number {
    if (maxConstraints === 0) return 0;
    return Math.min(mapping.constraintCount / maxConstraints, 1);
  }

  /**
   * Get color for complexity visualization
   */
  getComplexityColor(score: number): string {
    // Green -> Yellow -> Red gradient
    if (score < 0.3) return 'rgb(34, 197, 94)'; // green-500
    if (score < 0.7) return 'rgb(234, 179, 8)'; // yellow-500
    return 'rgb(239, 68, 68)'; // red-500
  }
}

export const constraintMappingService = new ConstraintMappingService();
