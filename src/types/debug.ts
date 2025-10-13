/**
 * TypeScript types for Noir Debugger Service
 * Maps to server-side debug API
 */

/**
 * Debug session state
 */
export interface DebugSession {
  sessionId: string;
  stopped: boolean;
  reason?: string;
  sourceLine?: number;
  sourceFile?: string;
  threadId?: number;
  frameId?: number;
}

/**
 * Request to start a debug session
 */
export interface StartDebugSessionRequest {
  sourceCode: string;
  cargoToml?: string;
  inputs: Record<string, any>;
}

/**
 * Response from starting a debug session
 */
export interface StartDebugSessionResponse {
  success: boolean;
  sessionId?: string;
  initialState?: DebugSession;
  error?: string;
}

/**
 * Step command types (DAP-standard names)
 */
export type StepCommand = 'next' | 'into' | 'out' | 'continue';

/**
 * Request to execute a step command
 */
export interface StepCommandRequest {
  sessionId: string;
  command: StepCommand;
}

/**
 * Response from step command
 */
export interface StepCommandResponse {
  success: boolean;
  state?: DebugSession;
  error?: string;
}

/**
 * Variable information from debug session
 */
export interface DebugVariable {
  name: string;
  value: string;
  type?: string;
  variablesReference?: number;
}

/**
 * Response from getting variables
 */
export interface VariablesResponse {
  success: boolean;
  variables?: DebugVariable[];
  error?: string;
}

/**
 * Witness entry from debug session
 */
export interface DebugWitnessEntry {
  index: string; // e.g., "_0", "_1"
  value: string;
}

/**
 * Response from getting witness map
 */
export interface WitnessMapResponse {
  success: boolean;
  witnesses?: DebugWitnessEntry[];
  error?: string;
}

/**
 * ACIR opcode information from debugger
 */
export interface DebugOpcodeInfo {
  index: string; // e.g., "0:0", "0:1"
  type: string;
  description: string;
}

/**
 * Response from getting opcodes
 */
export interface OpcodesResponse {
  success: boolean;
  opcodes?: DebugOpcodeInfo[];
  error?: string;
}

/**
 * Breakpoint information
 */
export interface Breakpoint {
  line: number;
  verified?: boolean;
  sourceFile?: string;
}

/**
 * Request to set breakpoints
 */
export interface SetBreakpointsRequest {
  sessionId: string;
  breakpoints: Breakpoint[];
}

/**
 * Complete debug state combining all information
 */
export interface DebugState {
  session: DebugSession | null;
  variables: DebugVariable[];
  witnesses: DebugWitnessEntry[];
  opcodes: DebugOpcodeInfo[];
  breakpoints: Breakpoint[];
  isDebugging: boolean;
  isStepExecuting: boolean;
}
