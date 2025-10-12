/**
 * Types for Witness Inspector functionality
 */

/**
 * ABI parameter information from compiled artifact
 */
export interface AbiParameter {
  name: string;
  type: {
    kind: string;
    sign?: string;
    width?: number;
  };
  visibility: 'public' | 'private';
}

/**
 * ABI return type information
 */
export interface AbiReturnType {
  abi_type: {
    kind: string;
    sign?: string;
    width?: number;
  };
  visibility: 'public' | 'private';
}

/**
 * Complete ABI structure from artifact
 */
export interface CircuitAbi {
  parameters: AbiParameter[];
  return_type: AbiReturnType | null;
  error_types?: Record<string, any>;
}

/**
 * Compiled artifact structure
 */
export interface CompiledArtifact {
  noir_version: string;
  hash: number;
  abi: CircuitAbi;
  bytecode: string; // base64 encoded ACIR
  debug_symbols?: any;
  file_map?: any;
  names?: string[];
}

/**
 * Witness entry with metadata
 */
export interface WitnessInfo {
  index: number; // Witness index (0, 1, 2, ...)
  name: string; // Variable name (x, y, sum, etc.)
  value?: string; // Actual value (if executed)
  type: string; // field, u32, bool, etc.
  visibility: 'public' | 'private';
  category: 'input' | 'intermediate' | 'output';
  sourceLine?: number; // Line where this witness is created
  description?: string; // Human-readable description
}

/**
 * ACIR opcode information (simplified)
 */
export interface AcirOpcodeInfo {
  index: string; // e.g., "0:0.16"
  type: string; // BinaryFieldOp, BinaryIntOp, Cast, etc.
  operation?: string; // Add, Mul, Equals, etc.
  inputs: string[]; // Input witness indices
  outputs: string[]; // Output witness indices
  sourceLine?: number; // Corresponding source code line
}

/**
 * Code-to-constraint mapping for a line
 */
export interface LineConstraintMapping {
  line: number;
  sourceCode: string;
  opcodes: AcirOpcodeInfo[];
  witnessesCreated: number[];
  witnessesUsed: number[];
  constraintCount: number;
}

/**
 * Complete witness analysis result
 */
export interface WitnessAnalysis {
  witnesses: WitnessInfo[];
  opcodes: AcirOpcodeInfo[];
  lineMapping: LineConstraintMapping[];
  totalWitnesses: number;
  totalConstraints: number;
  inputCount: number;
  outputCount: number;
}

/**
 * Witness inspection state
 */
export interface WitnessInspectionState {
  analysis: WitnessAnalysis | null;
  loading: boolean;
  error: string | null;
  selectedWitness: number | null;
  selectedLine: number | null;
}
