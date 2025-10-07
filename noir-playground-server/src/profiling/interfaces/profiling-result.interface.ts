export interface SvgResult {
  content: string; // SVG content
  filename: string; // Generated filename
  function?: string; // Function name if available
  type?: string; // Type: 'acir_opcodes', 'brillig_opcodes', 'gates'
}

export interface ProfilingResult {
  success: boolean;
  svgs?: SvgResult[];
  circuitMetrics?: CircuitMetrics;
  error?: string;
}

export interface CircuitMetrics {
  totalAcirOpcodes: number;
  totalBrilligOpcodes: number;
  totalGates: number;
  functions: CircuitFunctionMetrics[];
}

export interface CircuitFunctionMetrics {
  package: string;
  function: string;
  expressionWidth: string;
  acirOpcodes: number;
  brilligOpcodes: number;
}
