/**
 * Expression Evaluator Service
 *
 * Client-side service for evaluating Noir expressions via the server.
 * Handles dependency resolution, caching, and server communication.
 */

import {
  EvaluationResult,
  EvaluationContext,
  EvaluationStatus,
  EvalExpressionRequest,
  EvalExpressionResponse,
  ExpressionAnalysis,
  ExpressionError,
  ExpressionErrorType,
  ERROR_MESSAGES,
} from '@/types/expression';

import {
  analyzeExpression,
  topologicalSort,
  validateDependencies,
  transformExpressionForNoir,
  getRequiredImports,
} from '@/utils/expressionUtils';

/**
 * Progress callback for evaluation status updates
 */
export type EvaluationProgressCallback = (
  inputName: string,
  status: EvaluationStatus,
  result?: EvaluationResult
) => void;

/**
 * Service for evaluating Noir expressions
 */
export class ExpressionEvaluatorService {
  private apiBaseUrl: string;
  private cache: Map<string, EvaluationResult>;
  private timeout: number;

  constructor() {
    // Use the same server as profiler/debugger/compiler
    this.apiBaseUrl =
      import.meta.env.VITE_PROFILER_SERVER_URL || 'http://localhost:4000';
    this.cache = new Map();
    this.timeout = 10000; // 10 second timeout
  }

  /**
   * Evaluate all inputs, resolving expressions in dependency order
   *
   * @param inputs - Raw input values from the form
   * @param context - Additional context (types, Nargo.toml)
   * @param onProgress - Optional callback for progress updates
   * @returns Map of input names to evaluation results
   */
  async evaluateInputs(
    inputs: Record<string, string>,
    context: EvaluationContext,
    onProgress?: EvaluationProgressCallback
  ): Promise<Record<string, EvaluationResult>> {
    const results: Record<string, EvaluationResult> = {};
    const analyses: Record<string, ExpressionAnalysis> = {};

    // Analyze all inputs
    for (const [name, value] of Object.entries(inputs)) {
      analyses[name] = analyzeExpression(value);
    }

    // Validate dependencies exist
    const allInputNames = Object.keys(inputs);
    for (const [name, analysis] of Object.entries(analyses)) {
      const validationError = validateDependencies(
        name,
        analysis.dependencies,
        allInputNames
      );
      if (validationError) {
        results[name] = {
          success: false,
          error: validationError.message,
        };
        onProgress?.(name, 'error', results[name]);
        // Continue to check other inputs
      }
    }

    // Build dependency graph and get evaluation order
    let evaluationOrder: string[];
    try {
      evaluationOrder = topologicalSort(analyses);
    } catch (err) {
      // Circular dependency detected
      const error = err as ExpressionError;
      // Mark all inputs involved in the cycle as errors
      for (const name of Object.keys(inputs)) {
        if (!results[name]) {
          results[name] = {
            success: false,
            error: error.message,
          };
          onProgress?.(name, 'error', results[name]);
        }
      }
      return results;
    }

    // Evaluate inputs in order
    const resolvedValues: Record<string, string | number> = {};

    for (const name of evaluationOrder) {
      // Skip if already has an error from validation
      if (results[name]?.error) {
        continue;
      }

      const analysis = analyses[name];
      const value = inputs[name];

      if (!analysis.isExpression) {
        // Raw value - no evaluation needed
        const rawValue = this.parseRawValue(value, context.inputTypes[name]);
        results[name] = { success: true, value: rawValue };
        resolvedValues[name] = rawValue;
        onProgress?.(name, 'complete', results[name]);
      } else {
        // Expression - needs server evaluation
        onProgress?.(name, 'evaluating');

        const result = await this.evaluateExpression(
          value,
          analysis,
          resolvedValues,
          context.cargoToml
        );

        results[name] = result;

        if (result.success && result.value !== undefined) {
          resolvedValues[name] = result.value;
          onProgress?.(name, 'complete', result);
        } else {
          onProgress?.(name, 'error', result);
        }
      }
    }

    return results;
  }

  /**
   * Evaluate a single expression via the server
   */
  async evaluateExpression(
    expression: string,
    analysis: ExpressionAnalysis,
    resolvedInputs: Record<string, string | number>,
    cargoToml?: string
  ): Promise<EvaluationResult> {
    // Check cache first
    const cacheKey = this.generateCacheKey(expression, resolvedInputs);
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return { ...cached, evaluationTime: 0 }; // Instant from cache
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      // Build request
      const request: EvalExpressionRequest = {
        expression,
        context: {
          inputs: resolvedInputs,
          cargoToml,
        },
        options: {
          timeout: this.timeout,
        },
      };

      const response = await fetch(`${this.apiBaseUrl}/api/eval`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(request),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server error ${response.status}: ${errorText}`);
      }

      const data: EvalExpressionResponse = await response.json();

      const result: EvaluationResult = {
        success: data.success,
        value: data.result,
        error: data.error,
        evaluationTime: data.evaluationTime,
      };

      // Cache successful results
      if (result.success) {
        this.cache.set(cacheKey, result);
      }

      return result;
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          return {
            success: false,
            error: ERROR_MESSAGES[ExpressionErrorType.TIMEOUT],
          };
        }
        return {
          success: false,
          error: error.message,
        };
      }
      return {
        success: false,
        error: 'Unknown evaluation error',
      };
    }
  }

  /**
   * Parse a raw (non-expression) value based on its expected type
   */
  private parseRawValue(
    value: string,
    typeInfo?: { type: string; isArray?: boolean }
  ): string | number {
    const trimmed = value.trim();

    // Handle empty values
    if (!trimmed) {
      return 0;
    }

    // Handle arrays - keep as string for later processing
    if (typeInfo?.isArray || trimmed.startsWith('[')) {
      return trimmed;
    }

    // Handle hex values
    if (trimmed.startsWith('0x')) {
      return trimmed; // Keep hex as string
    }

    // Handle booleans
    if (trimmed === 'true' || trimmed === '1') {
      return 1;
    }
    if (trimmed === 'false' || trimmed === '0') {
      return 0;
    }

    // Handle numbers
    const num = Number(trimmed);
    if (!isNaN(num)) {
      return num;
    }

    // Default: return as string
    return trimmed;
  }

  /**
   * Generate a cache key for an expression + its resolved inputs
   */
  private generateCacheKey(
    expression: string,
    inputs: Record<string, string | number>
  ): string {
    // Only include inputs that are actually referenced in the expression
    const relevantInputs: Record<string, string | number> = {};
    const analysis = analyzeExpression(expression);

    for (const dep of analysis.dependencies) {
      if (inputs[dep] !== undefined) {
        relevantInputs[dep] = inputs[dep];
      }
    }

    return JSON.stringify({ expression, inputs: relevantInputs });
  }

  /**
   * Clear the evaluation cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }

  /**
   * Check if the evaluation server is available
   */
  async checkAvailability(): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/eval/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(3000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Get all inputs that have expressions (vs raw values)
   */
  getExpressionInputs(inputs: Record<string, string>): string[] {
    return Object.entries(inputs)
      .filter(([_, value]) => analyzeExpression(value).isExpression)
      .map(([name, _]) => name);
  }

  /**
   * Check if any inputs contain expressions
   */
  hasExpressions(inputs: Record<string, string>): boolean {
    return this.getExpressionInputs(inputs).length > 0;
  }
}

// Export singleton instance
export const expressionEvaluatorService = new ExpressionEvaluatorService();
