import React, { useState, useMemo } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import {
  ExpressionAnalysis,
  EvaluationStatus,
  EvaluationResult,
} from '@/types/expression';
import {
  analyzeExpression,
  isPartialExpression,
} from '@/utils/expressionUtils';

interface ExpressionInputProps {
  /** Parameter name */
  name: string;
  /** Current input value */
  value: string;
  /** Parameter type (e.g., "Field", "[Field; 3]") */
  type: string;
  /** Whether the parameter is public */
  isPublic: boolean;
  /** Whether the input is an array type */
  isArray?: boolean;
  /** Array length if applicable */
  arrayLength?: number;
  /** Callback when value changes */
  onChange: (value: string) => void;
  /** Evaluated value (after server evaluation) */
  evaluatedValue?: string | number;
  /** Current evaluation status */
  evaluationStatus: EvaluationStatus;
  /** Error from evaluation or validation */
  error?: string;
  /** Whether input is disabled */
  disabled?: boolean;
  /** All input parameter names (for autocomplete hints) */
  allInputNames?: string[];
}

/**
 * Enhanced input component that supports Noir expressions
 *
 * Features:
 * - Detects expressions vs raw values
 * - Displays evaluation status (loading, complete, error)
 * - Shows evaluated value when available
 */
export const ExpressionInput: React.FC<ExpressionInputProps> = ({
  name,
  value,
  type,
  isPublic,
  isArray,
  arrayLength,
  onChange,
  evaluatedValue,
  evaluationStatus,
  error,
  disabled,
  allInputNames = [],
}) => {
  // Analyze the expression whenever value changes
  const analysis = useMemo(() => analyzeExpression(value), [value]);

  // Format the type display string
  const formatType = () => {
    const visibility = isPublic ? 'pub ' : '';
    return `${visibility}${type}`;
  };

  // Get status icon based on evaluation status
  const getStatusIcon = () => {
    // Only show status for expressions, not raw values
    if (!analysis.isExpression) return null;

    switch (evaluationStatus) {
      case 'evaluating':
        return (
          <Loader2
            className="h-4 w-4 animate-spin text-muted-foreground"
            aria-label="Evaluating expression"
          />
        );
      case 'error':
        return (
          <AlertCircle
            className="h-4 w-4 text-red-500"
            aria-label="Evaluation error"
          />
        );
      default:
        return null;
    }
  };

  // Determine input ring/border color - simplified, no purple
  const getInputClasses = () => {
    const baseClasses =
      'w-full px-3 py-3 bg-muted/50 rounded focus:outline-none ring-1 transition-colors font-mono';

    if (error) {
      return `${baseClasses} ring-red-500/50 focus:ring-red-500/50`;
    }

    return `${baseClasses} ring-border focus:ring-border`;
  };

  // Format evaluated value for display
  const formatEvaluatedValue = (val: string | number): string => {
    const strVal = String(val);
    if (strVal.length > 24) {
      return `${strVal.slice(0, 12)}...${strVal.slice(-8)}`;
    }
    return strVal;
  };

  return (
    <div className="space-y-1">
      {/* Label row with type and status */}
      <div className="flex items-center justify-between">
        <label
          className="font-medium text-muted-foreground select-none"
          style={{ fontSize: '13px' }}
          htmlFor={`input-${name}`}
        >
          {name}: {formatType()}
        </label>
        <div className="flex items-center gap-2">
          {getStatusIcon()}
        </div>
      </div>

      {/* Input field */}
      <div className="relative">
        <input
          id={`input-${name}`}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={getInputClasses()}
          style={{ fontSize: '13px' }}
          disabled={disabled}
          placeholder={
            isArray
              ? `[${Array(arrayLength || 3).fill('0').join(', ')}]`
              : '0'
          }
          aria-describedby={error ? `error-${name}` : undefined}
        />
      </div>

      {/* Evaluated value display - same color as input text */}
      {evaluationStatus === 'complete' &&
        evaluatedValue !== undefined &&
        analysis.isExpression && (
          <div
            className="text-xs font-mono pl-1 flex items-center gap-1"
            style={{ fontSize: '13px', color: 'inherit' }}
          >
            <span className="text-muted-foreground">=</span>
            <span className="text-muted-foreground">
              {formatEvaluatedValue(evaluatedValue)}
            </span>
          </div>
        )}

      {/* Error display */}
      {error && (
        <p
          id={`error-${name}`}
          className="text-red-400 text-xs pl-1"
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  );
};

export default ExpressionInput;
