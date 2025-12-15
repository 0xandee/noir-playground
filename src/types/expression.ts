/**
 * Expression Input Types
 *
 * These types support evaluating Noir expressions in input fields,
 * enabling users to write expressions like Poseidon2::hash([$x, $y], 2)
 * instead of raw numeric values.
 */

/**
 * Supported hash function types that can be used in expressions
 */
export type HashFunction =
  | 'poseidon2'
  | 'keccak256'
  | 'sha256'
  | 'pedersen'
  | 'blake2s'
  | 'blake3';

/**
 * Expression type classification
 */
export type ExpressionType =
  | 'raw'        // Raw numeric value (e.g., "123", "0x7b")
  | 'hash'       // Hash function call (e.g., "Poseidon2::hash([...], 2)")
  | 'arithmetic' // Arithmetic expression (e.g., "$x + $y * 2")
  | 'reference'  // Simple variable reference (e.g., "$x")
  | 'mixed';     // Combination of the above

/**
 * Result of analyzing an input value to determine if it's an expression
 */
export interface ExpressionAnalysis {
  /** Whether the value is an expression (vs raw value) */
  isExpression: boolean;
  /** Classification of the expression type */
  expressionType: ExpressionType;
  /** Input variables referenced via $varName syntax */
  dependencies: string[];
  /** If it's a hash expression, which hash function */
  hashFunction?: HashFunction;
  /** If it's a raw value, the parsed value */
  rawValue?: string | number;
}

/**
 * Result of evaluating an expression via the server
 */
export interface EvaluationResult {
  /** Whether evaluation succeeded */
  success: boolean;
  /** The evaluated result (field element as string or number) */
  value?: string | number;
  /** Error message if evaluation failed */
  error?: string;
  /** Time taken to evaluate in milliseconds */
  evaluationTime?: number;
}

/**
 * Status of expression evaluation for UI display
 */
export type EvaluationStatus =
  | 'idle'       // Not yet evaluated
  | 'evaluating' // Currently being evaluated
  | 'complete'   // Successfully evaluated
  | 'error';     // Evaluation failed

/**
 * Context needed for evaluating expressions
 */
export interface EvaluationContext {
  /** All input values (some may be expressions, some raw) */
  inputs: Record<string, string>;
  /** Type information for each input parameter */
  inputTypes: Record<string, {
    type: string;
    isPublic: boolean;
    isArray?: boolean;
    arrayLength?: number;
  }>;
  /** Nargo.toml content for dependencies */
  cargoToml?: string;
}

/**
 * Request body for the /api/eval server endpoint
 */
export interface EvalExpressionRequest {
  /** The expression to evaluate */
  expression: string;
  /** Context for variable resolution */
  context: {
    /** Resolved input values (already-evaluated dependencies) */
    inputs: Record<string, string | number>;
    /** Nargo.toml for external dependencies like poseidon */
    cargoToml?: string;
  };
  /** Optional evaluation settings */
  options?: {
    /** Maximum evaluation time in ms (default: 10000) */
    timeout?: number;
  };
}

/**
 * Response from the /api/eval server endpoint
 */
export interface EvalExpressionResponse {
  /** Whether evaluation succeeded */
  success: boolean;
  /** Evaluated result as string (hex or decimal) */
  result?: string;
  /** Type of the result */
  resultType?: 'Field' | 'u8' | 'u32' | 'u64' | 'bool' | 'array';
  /** Error message if failed */
  error?: string;
  /** Evaluation time in milliseconds */
  evaluationTime?: number;
}

/**
 * Error types for expression evaluation
 */
export enum ExpressionErrorType {
  /** Invalid expression syntax */
  SYNTAX_ERROR = 'SYNTAX_ERROR',
  /** Circular reference detected (A depends on B, B depends on A) */
  CIRCULAR_DEPENDENCY = 'CIRCULAR_DEP',
  /** Referenced input variable doesn't exist */
  MISSING_DEPENDENCY = 'MISSING_DEP',
  /** Server evaluation failed (Noir compilation/execution error) */
  EVALUATION_FAILED = 'EVAL_FAILED',
  /** Evaluation server not available */
  SERVER_UNAVAILABLE = 'SERVER_DOWN',
  /** Evaluation took too long */
  TIMEOUT = 'TIMEOUT',
  /** Result type doesn't match expected input type */
  TYPE_MISMATCH = 'TYPE_MISMATCH',
}

/**
 * Structured error for expression evaluation
 */
export interface ExpressionError {
  /** Error classification */
  type: ExpressionErrorType;
  /** Human-readable error message */
  message: string;
  /** Which input triggered the error */
  inputName?: string;
  /** Additional error details (e.g., Noir compiler output) */
  details?: string;
}

/**
 * Human-readable error messages for each error type
 */
export const ERROR_MESSAGES: Record<ExpressionErrorType, string> = {
  [ExpressionErrorType.SYNTAX_ERROR]: 'Invalid expression syntax. Check your expression format.',
  [ExpressionErrorType.CIRCULAR_DEPENDENCY]: 'Circular dependency detected. Input references itself directly or indirectly.',
  [ExpressionErrorType.MISSING_DEPENDENCY]: 'Referenced input variable does not exist.',
  [ExpressionErrorType.EVALUATION_FAILED]: 'Expression evaluation failed. Check Noir syntax.',
  [ExpressionErrorType.SERVER_UNAVAILABLE]: 'Expression evaluator is not available. Use raw values instead.',
  [ExpressionErrorType.TIMEOUT]: 'Expression took too long to evaluate (>10s).',
  [ExpressionErrorType.TYPE_MISMATCH]: 'Result type does not match expected input type.',
};
