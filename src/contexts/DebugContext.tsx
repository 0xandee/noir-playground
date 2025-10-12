/**
 * React Context for Noir Debugger global state
 * Manages debug session, variables, witnesses, and stepping
 */

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { noirDebuggerService } from '@/services/NoirDebuggerService';
import type {
  DebugSession,
  DebugVariable,
  DebugWitnessEntry,
  DebugOpcodeInfo,
  Breakpoint,
  StepCommand,
  StartDebugSessionRequest,
} from '@/types/debug';

/**
 * Debug context state
 */
interface DebugContextState {
  // Session state
  session: DebugSession | null;
  isDebugging: boolean;
  isStepExecuting: boolean;

  // Debug data
  variables: DebugVariable[];
  witnesses: DebugWitnessEntry[];
  opcodes: DebugOpcodeInfo[];
  breakpoints: Breakpoint[];

  // UI state
  currentLine: number | null;
  error: string | null;

  // Actions
  startDebugSession: (request: StartDebugSessionRequest) => Promise<boolean>;
  stopDebugSession: () => Promise<void>;
  executeStep: (command: StepCommand) => Promise<boolean>;
  toggleBreakpoint: (line: number) => void;
  clearError: () => void;
}

const DebugContext = createContext<DebugContextState | undefined>(undefined);

/**
 * Debug context provider
 */
export const DebugProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Session state
  const [session, setSession] = useState<DebugSession | null>(null);
  const [isDebugging, setIsDebugging] = useState(false);
  const [isStepExecuting, setIsStepExecuting] = useState(false);

  // Debug data
  const [variables, setVariables] = useState<DebugVariable[]>([]);
  const [witnesses, setWitnesses] = useState<DebugWitnessEntry[]>([]);
  const [opcodes, setOpcodes] = useState<DebugOpcodeInfo[]>([]);
  const [breakpoints, setBreakpoints] = useState<Breakpoint[]>([]);

  // UI state
  const [currentLine, setCurrentLine] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Store session ID for cleanup
  const sessionIdRef = useRef<string | null>(null);

  /**
   * Start a new debug session
   */
  const startDebugSession = useCallback(async (request: StartDebugSessionRequest): Promise<boolean> => {
    try {
      setError(null);
      setIsDebugging(true);

      // Check if debug server is available
      const isAvailable = await noirDebuggerService.checkAvailability();
      if (!isAvailable) {
        throw new Error('Debug server is not available. Please ensure the server is running.');
      }

      // Start debug session
      const response = await noirDebuggerService.startSession(request);

      if (!response.success || !response.sessionId) {
        throw new Error(response.error || 'Failed to start debug session');
      }

      // Store session ID
      sessionIdRef.current = response.sessionId;

      // Set initial session state
      if (response.initialState) {
        setSession(response.initialState);
        setCurrentLine(response.initialState.sourceLine || null);
      }

      // Fetch initial debug state
      await fetchDebugState(response.sessionId);

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error starting debug session';
      setError(errorMessage);
      setIsDebugging(false);
      console.error('[DebugContext] Start session error:', err);
      return false;
    }
  }, []);

  /**
   * Stop the debug session and cleanup
   */
  const stopDebugSession = useCallback(async () => {
    if (sessionIdRef.current) {
      await noirDebuggerService.terminateSession(sessionIdRef.current);
      sessionIdRef.current = null;
    }

    // Reset all state
    setSession(null);
    setIsDebugging(false);
    setIsStepExecuting(false);
    setVariables([]);
    setWitnesses([]);
    setOpcodes([]);
    setCurrentLine(null);
    setError(null);
  }, []);

  /**
   * Execute a step command
   */
  const executeStep = useCallback(async (command: StepCommand): Promise<boolean> => {
    if (!sessionIdRef.current) {
      setError('No active debug session');
      return false;
    }

    try {
      setIsStepExecuting(true);
      setError(null);

      // Execute step command
      const response = await noirDebuggerService.executeStep(sessionIdRef.current, command);

      if (!response.success) {
        throw new Error(response.error || 'Step command failed');
      }

      // Update session state
      if (response.state) {
        setSession(response.state);
        setCurrentLine(response.state.sourceLine || null);
      }

      // Fetch updated debug state
      await fetchDebugState(sessionIdRef.current);

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error executing step';
      setError(errorMessage);
      console.error('[DebugContext] Execute step error:', err);
      return false;
    } finally {
      setIsStepExecuting(false);
    }
  }, []);

  /**
   * Fetch current debug state (variables, witnesses, opcodes)
   */
  const fetchDebugState = async (sessionId: string) => {
    try {
      const stateResponse = await noirDebuggerService.getDebugState(sessionId);

      if (stateResponse.success && stateResponse.state) {
        setVariables(stateResponse.state.variables);
        setWitnesses(stateResponse.state.witnesses);
        setOpcodes(stateResponse.state.opcodes);
      }
    } catch (err) {
      console.error('[DebugContext] Fetch debug state error:', err);
      // Don't set error state here - this is background fetch
    }
  };

  /**
   * Toggle breakpoint at a line
   */
  const toggleBreakpoint = useCallback((line: number) => {
    setBreakpoints(prev => {
      const existing = prev.find(bp => bp.line === line);

      if (existing) {
        // Remove breakpoint
        return prev.filter(bp => bp.line !== line);
      } else {
        // Add breakpoint
        return [...prev, { line, verified: false }];
      }
    });

    // TODO: Sync breakpoints with server when setBreakpoints API is available
    if (sessionIdRef.current) {
      noirDebuggerService.setBreakpoints(sessionIdRef.current, breakpoints);
    }
  }, [breakpoints]);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value: DebugContextState = {
    // State
    session,
    isDebugging,
    isStepExecuting,
    variables,
    witnesses,
    opcodes,
    breakpoints,
    currentLine,
    error,

    // Actions
    startDebugSession,
    stopDebugSession,
    executeStep,
    toggleBreakpoint,
    clearError,
  };

  return <DebugContext.Provider value={value}>{children}</DebugContext.Provider>;
};

/**
 * Hook to use debug context
 */
export const useDebug = (): DebugContextState => {
  const context = useContext(DebugContext);

  if (context === undefined) {
    throw new Error('useDebug must be used within a DebugProvider');
  }

  return context;
};
