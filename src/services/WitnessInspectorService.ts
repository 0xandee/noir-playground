/**
 * Service for analyzing compiled circuits and extracting witness information
 */

import {
  CompiledArtifact,
  WitnessInfo,
  WitnessAnalysis,
  AcirOpcodeInfo,
  LineConstraintMapping,
} from '@/types/witness';

export class WitnessInspectorService {
  /**
   * Analyze a compiled artifact to extract witness information
   */
  analyzeArtifact(
    artifact: CompiledArtifact,
    sourceCode: string,
    executedWitness?: Uint8Array
  ): WitnessAnalysis {
    // Extract witnesses from ABI
    const witnesses = this.extractWitnessesFromAbi(artifact);

    // Parse ACIR bytecode for opcode information
    const opcodes = this.parseAcirBytecode(artifact.bytecode);

    // Create line-to-constraint mapping
    const lineMapping = this.createLineMapping(sourceCode, opcodes, witnesses);

    // If we have execution results, populate witness values
    if (executedWitness) {
      this.populateWitnessValues(witnesses, executedWitness);
    }

    return {
      witnesses,
      opcodes,
      lineMapping,
      totalWitnesses: witnesses.length,
      totalConstraints: opcodes.length,
      inputCount: witnesses.filter((w) => w.category === 'input').length,
      outputCount: witnesses.filter((w) => w.category === 'output').length,
    };
  }

  /**
   * Extract witness information from ABI
   */
  private extractWitnessesFromAbi(artifact: CompiledArtifact): WitnessInfo[] {
    const witnesses: WitnessInfo[] = [];
    let witnessIndex = 0;

    // Defensive checks for artifact structure
    if (!artifact || !artifact.abi) {
      console.warn('WitnessInspector: Artifact or ABI is missing');
      return witnesses;
    }

    // Process input parameters (with safety check)
    if (artifact.abi.parameters && Array.isArray(artifact.abi.parameters)) {
      for (const param of artifact.abi.parameters) {
        witnesses.push({
          index: witnessIndex,
          name: param.name || `param_${witnessIndex}`,
          type: param.type?.kind || 'unknown',
          visibility: param.visibility || 'private',
          category: 'input',
          description: `Input parameter: ${param.name || `param_${witnessIndex}`}`,
        });
        witnessIndex++;
      }
    }

    // Process return type (if public)
    if (artifact.abi.return_type && artifact.abi.return_type.visibility === 'public') {
      witnesses.push({
        index: witnessIndex,
        name: 'return_value',
        type: artifact.abi.return_type.abi_type?.kind || 'unknown',
        visibility: 'public',
        category: 'output',
        description: 'Public return value',
      });
      witnessIndex++;
    }

    // Note: Intermediate witnesses are harder to extract without execution
    // We'll add placeholder entries that can be filled in during execution
    // or by parsing debug symbols if available

    return witnesses;
  }

  /**
   * Parse ACIR bytecode to extract opcode information
   * Note: This is a simplified parser - full parsing would require ACIR decoder
   */
  private parseAcirBytecode(bytecode: string): AcirOpcodeInfo[] {
    // Bytecode is base64 encoded ACIR
    // For now, return empty array - full implementation would decode ACIR
    // In practice, you'd want to use the profiler API or noir_wasm decoder

    // Placeholder implementation
    return [];
  }

  /**
   * Create mapping between source code lines and constraints
   */
  private createLineMapping(
    sourceCode: string,
    opcodes: AcirOpcodeInfo[],
    witnesses: WitnessInfo[]
  ): LineConstraintMapping[] {
    const lines = sourceCode.split('\n');
    const mapping: LineConstraintMapping[] = [];

    // Simple heuristic: map lines to constraints based on content
    lines.forEach((line, index) => {
      const lineNumber = index + 1;
      const trimmedLine = line.trim();

      // Skip empty lines and comments
      if (!trimmedLine || trimmedLine.startsWith('//')) {
        return;
      }

      // Estimate constraint count based on line content
      let constraintCount = 0;
      const witnessesCreated: number[] = [];
      const witnessesUsed: number[] = [];

      // Assertions create constraints
      if (trimmedLine.includes('assert')) {
        constraintCount += 1;
      }

      // Arithmetic operations
      if (trimmedLine.match(/[+\-*/]/)) {
        constraintCount += 1;
      }

      // Comparisons
      if (trimmedLine.match(/[<>!=]=?/)) {
        constraintCount += 1;
      }

      // Casts
      if (trimmedLine.includes(' as ')) {
        constraintCount += 1;
      }

      mapping.push({
        line: lineNumber,
        sourceCode: line,
        opcodes: [], // Would be populated from actual ACIR parsing
        witnessesCreated,
        witnessesUsed,
        constraintCount,
      });
    });

    return mapping;
  }

  /**
   * Populate witness values from execution result
   * Witness data from noir.execute() is a Uint8Array containing serialized field elements
   */
  private populateWitnessValues(
    witnesses: WitnessInfo[],
    witnessData: Uint8Array
  ): void {
    try {
      // The witness is a gzipped msgpack-encoded map of witness index -> field element
      // For now, we'll attempt to deserialize it by reading the binary format

      // noir_js returns witness as Uint8Array where each field element is 32 bytes
      // The witness map format is: index (4 bytes) + value (32 bytes) repeated

      const witnessMap = this.deserializeWitness(witnessData);

      // Map witness indices to values
      witnesses.forEach((w) => {
        const value = witnessMap.get(w.index);
        if (value !== undefined) {
          w.value = value;
        }
      });
    } catch (error) {
      console.warn('Failed to deserialize witness data:', error);
      // Don't fail silently - still show structure even if we can't get values
    }
  }

  /**
   * Deserialize witness data from Uint8Array to Map<index, value>
   * The witness format from noir.execute() is implementation-specific
   */
  private deserializeWitness(witnessData: Uint8Array): Map<number, string> {
    const witnessMap = new Map<number, string>();

    try {
      // Simple approach: Try to parse as a sequence of (index, value) pairs
      // Each witness entry might be stored as: index (varint) + value (32-byte field element)

      // For MVP, we'll use a heuristic: assume witness indices are sequential starting from 0
      // and the data contains raw field elements (32 bytes each)

      const bytesPerField = 32; // Field elements in Noir are 254-bit (32 bytes when serialized)

      // Check if data length is a multiple of field size
      if (witnessData.length % bytesPerField === 0) {
        const numWitnesses = witnessData.length / bytesPerField;

        for (let i = 0; i < numWitnesses; i++) {
          const offset = i * bytesPerField;
          const fieldBytes = witnessData.slice(offset, offset + bytesPerField);

          // Convert bytes to BigInt (little-endian)
          const value = this.bytesToBigInt(fieldBytes);
          witnessMap.set(i, value.toString());
        }
      } else {
        // Data might be compressed or in a different format
        // Try to extract what we can
        console.warn('Witness data format not recognized, length:', witnessData.length);
      }
    } catch (error) {
      console.error('Error deserializing witness:', error);
    }

    return witnessMap;
  }

  /**
   * Convert byte array to BigInt (little-endian)
   */
  private bytesToBigInt(bytes: Uint8Array): bigint {
    let result = 0n;
    for (let i = 0; i < bytes.length; i++) {
      result += BigInt(bytes[i]) << (BigInt(i) * 8n);
    }
    return result;
  }

  /**
   * Format witness value for display
   */
  formatWitnessValue(value: string | undefined, type: string): string {
    if (!value) return '-';

    // Format based on type
    switch (type) {
      case 'field':
        // Try to parse as number for display
        try {
          const num = BigInt(value);
          return num.toString();
        } catch {
          return value;
        }
      case 'bool':
        return value === '1' || value === 'true' ? 'true' : 'false';
      default:
        return value;
    }
  }

  /**
   * Get constraint complexity score for a line (0-1 scale)
   */
  getComplexityScore(constraintCount: number, maxConstraints: number): number {
    if (maxConstraints === 0) return 0;
    return Math.min(constraintCount / maxConstraints, 1);
  }

  /**
   * Get color for complexity heatmap
   */
  getComplexityColor(score: number): string {
    // Green -> Yellow -> Red gradient
    if (score < 0.3) return 'rgb(34, 197, 94)'; // green-500
    if (score < 0.7) return 'rgb(234, 179, 8)'; // yellow-500
    return 'rgb(239, 68, 68)'; // red-500
  }
}

export const witnessInspectorService = new WitnessInspectorService();
