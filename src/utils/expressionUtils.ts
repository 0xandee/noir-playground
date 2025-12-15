/**
 * Expression Utilities
 *
 * Functions for analyzing and processing Noir expressions in input fields.
 * Detects whether an input value is a raw value or an expression that needs
 * server-side evaluation.
 */

import {
  ExpressionAnalysis,
  ExpressionType,
  HashFunction,
  ExpressionErrorType,
  ExpressionError,
  ERROR_MESSAGES,
} from '@/types/expression';

/**
 * Regex patterns for detecting hash function calls
 */
const HASH_PATTERNS: Record<HashFunction, RegExp> = {
  poseidon2: /Poseidon2::hash\s*\(/i,
  keccak256: /keccak256\s*\(/i,
  sha256: /sha256\s*\(/i,
  pedersen: /pedersen_hash\s*\(/i,
  blake2s: /blake2s\s*\(/i,
  blake3: /blake3\s*\(/i,
};

/**
 * Pattern for detecting variable references ($varName)
 */
const VARIABLE_REF_PATTERN = /\$([a-zA-Z_][a-zA-Z0-9_]*)/g;

/**
 * Pattern for detecting raw numeric values (decimal or hex)
 */
const RAW_NUMERIC_PATTERN = /^-?\d+$|^0x[a-fA-F0-9]+$/;

/**
 * Pattern for detecting arithmetic operators
 */
const ARITHMETIC_OPERATORS_PATTERN = /[+\-*/%]/;

/**
 * Analyze an input value to determine if it's an expression
 *
 * @param value - The input value string to analyze
 * @returns ExpressionAnalysis with type classification and dependencies
 *
 * @example
 * ```ts
 * analyzeExpression("123") // { isExpression: false, expressionType: 'raw', ... }
 * analyzeExpression("Poseidon2::hash([$x, $y], 2)") // { isExpression: true, expressionType: 'hash', dependencies: ['x', 'y'], ... }
 * analyzeExpression("$x + $y") // { isExpression: true, expressionType: 'arithmetic', dependencies: ['x', 'y'], ... }
 * ```
 */
export function analyzeExpression(value: string): ExpressionAnalysis {
  const trimmed = value.trim();

  // Empty value - treat as raw
  if (!trimmed) {
    return {
      isExpression: false,
      expressionType: 'raw',
      dependencies: [],
      rawValue: '',
    };
  }

  // Check if it's a raw numeric value (decimal or hex)
  if (RAW_NUMERIC_PATTERN.test(trimmed)) {
    return {
      isExpression: false,
      expressionType: 'raw',
      dependencies: [],
      rawValue: trimmed,
    };
  }

  // Check if it's a JSON array (for array inputs like [1, 2, 3])
  if (trimmed.startsWith('[') && !trimmed.includes('$')) {
    try {
      JSON.parse(trimmed);
      return {
        isExpression: false,
        expressionType: 'raw',
        dependencies: [],
        rawValue: trimmed,
      };
    } catch {
      // Not valid JSON, might be an expression with array syntax
    }
  }

  // Extract all variable references
  const dependencies = extractDependencies(trimmed);

  // Check for hash function calls
  for (const [hashName, pattern] of Object.entries(HASH_PATTERNS)) {
    if (pattern.test(trimmed)) {
      return {
        isExpression: true,
        expressionType: 'hash',
        dependencies,
        hashFunction: hashName as HashFunction,
      };
    }
  }

  // Check for simple variable reference ($varName by itself)
  const simpleRefMatch = trimmed.match(/^\$([a-zA-Z_][a-zA-Z0-9_]*)$/);
  if (simpleRefMatch) {
    return {
      isExpression: true,
      expressionType: 'reference',
      dependencies: [simpleRefMatch[1]],
    };
  }

  // Check if there are variable references with arithmetic
  if (dependencies.length > 0) {
    // Has references and arithmetic operators = arithmetic expression
    if (ARITHMETIC_OPERATORS_PATTERN.test(trimmed)) {
      return {
        isExpression: true,
        expressionType: 'arithmetic',
        dependencies,
      };
    }
    // Has references but no arithmetic = mixed expression
    return {
      isExpression: true,
      expressionType: 'mixed',
      dependencies,
    };
  }

  // Check for arithmetic operators without variable references
  // (e.g., "5 + 3" - technically an expression but could be computed locally)
  if (ARITHMETIC_OPERATORS_PATTERN.test(trimmed) && !/^-?\d+$/.test(trimmed)) {
    return {
      isExpression: true,
      expressionType: 'arithmetic',
      dependencies: [],
    };
  }

  // Default: treat as raw value (might be a boolean like "true" or other literal)
  return {
    isExpression: false,
    expressionType: 'raw',
    dependencies: [],
    rawValue: trimmed,
  };
}

/**
 * Extract variable dependencies from an expression
 *
 * Finds all $varName patterns in the expression and returns the variable names.
 *
 * @param expression - The expression string to search
 * @returns Array of variable names (without the $ prefix)
 *
 * @example
 * ```ts
 * extractDependencies("Poseidon2::hash([$x, $y], 2)") // ['x', 'y']
 * extractDependencies("$a + $b * $c") // ['a', 'b', 'c']
 * ```
 */
export function extractDependencies(expression: string): string[] {
  const matches = [...expression.matchAll(VARIABLE_REF_PATTERN)];
  // Use Set to deduplicate (in case $x appears multiple times)
  const uniqueDeps = new Set(matches.map((m) => m[1]));
  return Array.from(uniqueDeps);
}

/**
 * Topologically sort inputs based on their dependencies
 *
 * Ensures inputs are evaluated in the correct order where dependencies
 * come before the inputs that reference them.
 *
 * @param analyses - Map of input name to its expression analysis
 * @returns Array of input names in evaluation order
 * @throws ExpressionError if circular dependency detected
 *
 * @example
 * ```ts
 * // A: 10 (no deps), B: $A + 5 (deps: A), C: hash([$A, $B]) (deps: A, B)
 * topologicalSort({
 *   A: { dependencies: [] },
 *   B: { dependencies: ['A'] },
 *   C: { dependencies: ['A', 'B'] }
 * }) // Returns: ['A', 'B', 'C']
 * ```
 */
export function topologicalSort(
  analyses: Record<string, ExpressionAnalysis>
): string[] {
  const visited = new Set<string>();
  const visiting = new Set<string>(); // For cycle detection
  const result: string[] = [];

  const visit = (name: string, path: string[] = []) => {
    if (visited.has(name)) return;

    if (visiting.has(name)) {
      // Circular dependency detected
      const cycle = [...path, name].join(' -> ');
      const error: ExpressionError = {
        type: ExpressionErrorType.CIRCULAR_DEPENDENCY,
        message: ERROR_MESSAGES[ExpressionErrorType.CIRCULAR_DEPENDENCY],
        inputName: name,
        details: `Cycle: ${cycle}`,
      };
      throw error;
    }

    visiting.add(name);

    const analysis = analyses[name];
    if (analysis) {
      for (const dep of analysis.dependencies) {
        // Only visit dependencies that exist in our analyses
        if (analyses[dep]) {
          visit(dep, [...path, name]);
        }
      }
    }

    visiting.delete(name);
    visited.add(name);
    result.push(name);
  };

  // Visit all inputs
  for (const name of Object.keys(analyses)) {
    visit(name);
  }

  return result;
}

/**
 * Validate that all dependencies exist in the input set
 *
 * @param inputName - Name of the input being validated
 * @param dependencies - List of dependencies for this input
 * @param allInputNames - All available input names
 * @returns ExpressionError if any dependency is missing, null otherwise
 */
export function validateDependencies(
  inputName: string,
  dependencies: string[],
  allInputNames: string[]
): ExpressionError | null {
  const inputSet = new Set(allInputNames);

  for (const dep of dependencies) {
    if (!inputSet.has(dep)) {
      return {
        type: ExpressionErrorType.MISSING_DEPENDENCY,
        message: `Input '${inputName}' references '$${dep}', but no input named '${dep}' exists.`,
        inputName,
        details: `Available inputs: ${allInputNames.join(', ')}`,
      };
    }
  }

  return null;
}

/**
 * Transform expression to replace $varName with actual variable names for Noir
 *
 * The server will use this when generating the wrapper program.
 *
 * @param expression - Expression with $varName references
 * @returns Expression with dollar signs removed
 *
 * @example
 * ```ts
 * transformExpressionForNoir("Poseidon2::hash([$x, $y], 2)")
 * // Returns: "Poseidon2::hash([x, y], 2)"
 * ```
 */
export function transformExpressionForNoir(expression: string): string {
  return expression.replace(VARIABLE_REF_PATTERN, '$1');
}

/**
 * Check if an expression needs hash library imports
 *
 * @param analysis - The expression analysis
 * @returns List of required imports for the wrapper program
 */
export function getRequiredImports(analysis: ExpressionAnalysis): string[] {
  const imports: string[] = [];

  if (analysis.hashFunction) {
    switch (analysis.hashFunction) {
      case 'poseidon2':
        imports.push('use std::hash::poseidon2::Poseidon2;');
        break;
      case 'keccak256':
        imports.push('use std::hash::keccak256;');
        break;
      case 'sha256':
        imports.push('use std::hash::sha256;');
        break;
      case 'pedersen':
        imports.push('use std::hash::pedersen_hash;');
        break;
      case 'blake2s':
        imports.push('use std::hash::blake2s;');
        break;
      case 'blake3':
        imports.push('use std::hash::blake3;');
        break;
    }
  }

  return imports;
}

/**
 * Format an expression analysis result for display
 *
 * @param analysis - The expression analysis
 * @returns Human-readable description
 */
export function formatAnalysisDescription(analysis: ExpressionAnalysis): string {
  if (!analysis.isExpression) {
    return 'Raw value';
  }

  switch (analysis.expressionType) {
    case 'hash':
      return `${analysis.hashFunction} hash function`;
    case 'arithmetic':
      return 'Arithmetic expression';
    case 'reference':
      return `Reference to $${analysis.dependencies[0]}`;
    case 'mixed':
      return 'Mixed expression';
    default:
      return 'Expression';
  }
}

/**
 * Check if the value looks like it might be an incomplete expression
 * (for real-time validation hints)
 */
export function isPartialExpression(value: string): boolean {
  const trimmed = value.trim();

  // Starts with $ but not complete variable name
  if (/^\$[a-zA-Z_]?$/.test(trimmed)) return true;

  // Has opening function call but not closed
  if (/\w+::\w+\s*\([^)]*$/.test(trimmed)) return true;

  // Has unclosed brackets
  const openBrackets = (trimmed.match(/\[/g) || []).length;
  const closeBrackets = (trimmed.match(/\]/g) || []).length;
  if (openBrackets > closeBrackets) return true;

  const openParens = (trimmed.match(/\(/g) || []).length;
  const closeParens = (trimmed.match(/\)/g) || []).length;
  if (openParens > closeParens) return true;

  return false;
}
