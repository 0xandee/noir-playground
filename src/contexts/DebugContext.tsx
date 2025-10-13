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
  isSessionStarting: boolean; // Loading state for session initialization
  isSessionStopping: boolean; // Loading state for session termination
  isSessionRestarting: boolean; // Loading state for session restart

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
  restartDebugSession: (request: StartDebugSessionRequest) => Promise<boolean>;
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
  const [isSessionStarting, setIsSessionStarting] = useState(false);
  const [isSessionStopping, setIsSessionStopping] = useState(false);
  const [isSessionRestarting, setIsSessionRestarting] = useState(false);

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
      setIsSessionStarting(true); // Set loading state

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

      // Set debugging state after successful initialization
      setIsDebugging(true);

      // Fetch initial debug state
      await fetchDebugState(response.sessionId);

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error starting debug session';
      setError(errorMessage);
      setIsDebugging(false);
      console.error('[DebugContext] Start session error:', err);
      return false;
    } finally {
      setIsSessionStarting(false); // Clear loading state
    }
  }, []);

  /**
   * Stop the debug session and cleanup
   */
  const stopDebugSession = useCallback(async () => {
    try {
      setIsSessionStopping(true);

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
    } catch (err) {
      console.error('[DebugContext] Stop session error:', err);
      // Don't throw - allow cleanup to complete
    } finally {
      setIsSessionStopping(false);
    }
  }, []);

  /**
   * Restart debug session (stop and start fresh)
   */
  const restartDebugSession = useCallback(async (request: StartDebugSessionRequest): Promise<boolean> => {
    try {
      setIsSessionRestarting(true);
      setError(null);

      // Stop current session
      if (sessionIdRef.current) {
        await noirDebuggerService.terminateSession(sessionIdRef.current);
        sessionIdRef.current = null;
      }

      // Reset state
      setSession(null);
      setVariables([]);
      setWitnesses([]);
      setOpcodes([]);
      setCurrentLine(null);

      // Small delay to ensure clean shutdown
      await new Promise(resolve => setTimeout(resolve, 100));

      // Start new session
      const isAvailable = await noirDebuggerService.checkAvailability();
      if (!isAvailable) {
        throw new Error('Debug server is not available. Please ensure the server is running.');
      }

      const response = await noirDebuggerService.startSession(request);

      if (!response.success || !response.sessionId) {
        throw new Error(response.error || 'Failed to restart debug session');
      }

      // Store session ID
      sessionIdRef.current = response.sessionId;

      // Set initial session state
      if (response.initialState) {
        setSession(response.initialState);
        setCurrentLine(response.initialState.sourceLine || null);
      }

      setIsDebugging(true);

      // Fetch initial debug state
      await fetchDebugState(response.sessionId);

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error restarting debug session';
      setError(errorMessage);
      setIsDebugging(false);
      console.error('[DebugContext] Restart session error:', err);
      return false;
    } finally {
      setIsSessionRestarting(false);
    }
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

      // === DIAGNOSTIC LOGGING: Step command initiated ===
      console.log(`%c[CLIENT STEP] Command: '${command}'`, 'color: #4CAF50; font-weight: bold');
      console.log(`[CLIENT STEP] Current line before step:`, currentLine);
      console.log(`[CLIENT STEP] Session ID:`, sessionIdRef.current);

      const stepStartTime = Date.now();

      // Execute step command
      const response = await noirDebuggerService.executeStep(sessionIdRef.current, command);

      const stepDuration = Date.now() - stepStartTime;

      // === DIAGNOSTIC LOGGING: Response received ===
      console.log(`%c[CLIENT STEP] Response received in ${stepDuration}ms`, 'color: #2196F3; font-weight: bold');
      console.log('[CLIENT STEP] Response success:', response.success);
      console.log('[CLIENT STEP] Response state:', response.state);

      if (!response.success) {
        console.error(`[CLIENT STEP] Step failed:`, response.error);
        throw new Error(response.error || 'Step command failed');
      }

      // === DIAGNOSTIC LOGGING: Before state update ===
      const oldLine = currentLine;
      const newLine = response.state?.sourceLine || null;

      console.log('[CLIENT STEP] Line change:', oldLine, '→', newLine);

      // Update session state
      if (response.state) {
        console.log('[CLIENT STEP] Updating session state:', {
          sessionId: response.state.sessionId,
          stopped: response.state.stopped,
          reason: response.state.reason,
          sourceLine: response.state.sourceLine,
          sourceFile: response.state.sourceFile,
          frameId: response.state.frameId,
          threadId: response.state.threadId,
        });

        setSession(response.state);
        setCurrentLine(response.state.sourceLine || null);

        // Log if line didn't change (might indicate function inlining)
        if (oldLine === newLine) {
          console.warn('[CLIENT STEP] ⚠️ Line number unchanged after step - possible function inlining');
        }
      }

      // Fetch updated debug state
      console.log('[CLIENT STEP] Fetching updated debug state (variables, witnesses, opcodes)...');
      await fetchDebugState(sessionIdRef.current);

      console.log(`%c[CLIENT STEP] Step completed successfully`, 'color: #4CAF50; font-weight: bold');
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error executing step';
      setError(errorMessage);
      console.error('%c[CLIENT STEP] Execute step error:', 'color: #f44336; font-weight: bold', err);
      return false;
    } finally {
      setIsStepExecuting(false);
    }
  }, [currentLine]);

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
  const toggleBreakpoint = useCallback(async (line: number) => {
    // Store the updated breakpoints for server sync
    let updatedBreakpoints: Breakpoint[] = [];

    // Optimistically update UI using functional update to avoid stale closure
    setBreakpoints(prevBreakpoints => {
      const existing = prevBreakpoints.find(bp => bp.line === line);
      if (existing) {
        // Remove breakpoint
        updatedBreakpoints = prevBreakpoints.filter(bp => bp.line !== line);
      } else {
        // Add breakpoint (default to verified/red for better UX)
        updatedBreakpoints = [...prevBreakpoints, { line, verified: true }];
      }
      return updatedBreakpoints;
    });

    // Sync with server if debugging session is active
    if (sessionIdRef.current) {
      try {
        const response = await noirDebuggerService.setBreakpoints(
          sessionIdRef.current,
          updatedBreakpoints
        );

        if (response.success) {
          // Only update if we got breakpoints back from server
          if (response.breakpoints && response.breakpoints.length > 0) {
            // Update breakpoints with verification status from server
            setBreakpoints(response.breakpoints);

            // Log verification results
            const verified = response.breakpoints.filter(bp => bp.verified).length;
            const total = response.breakpoints.length;
            console.log(`[DebugContext] Breakpoints updated: ${verified}/${total} verified`);

            // Show warning for unverified breakpoints
            const unverified = response.breakpoints.filter(bp => !bp.verified);
            if (unverified.length > 0) {
              console.warn(
                `[DebugContext] Some breakpoints could not be verified:`,
                unverified.map(bp => `line ${bp.line}${bp.message ? `: ${bp.message}` : ''}`)
              );
            }
          } else if (response.breakpoints && response.breakpoints.length === 0) {
            // Server returned empty array - this means all breakpoints were cleared
            console.log('[DebugContext] All breakpoints cleared by server');
            setBreakpoints([]);
          } else {
            // Server returned success but no breakpoints array - keep local state
            console.warn('[DebugContext] Server returned success but no breakpoints array, keeping local state');
          }
        } else {
          console.error('[DebugContext] Failed to sync breakpoints:', response.error);
          setError(response.error || 'Failed to set breakpoints');
          // Revert to previous state on error using functional update
          setBreakpoints(prevBreakpoints => {
            // Revert by toggling back
            const existing = prevBreakpoints.find(bp => bp.line === line);
            if (existing) {
              return [...prevBreakpoints, { line, verified: true }];
            } else {
              return prevBreakpoints.filter(bp => bp.line !== line);
            }
          });
        }
      } catch (err) {
        console.error('[DebugContext] Error syncing breakpoints:', err);
        setError(err instanceof Error ? err.message : 'Error syncing breakpoints');
        // Revert to previous state on error using functional update
        setBreakpoints(prevBreakpoints => {
          // Revert by toggling back
          const existing = prevBreakpoints.find(bp => bp.line === line);
          if (existing) {
            return [...prevBreakpoints, { line, verified: true }];
          } else {
            return prevBreakpoints.filter(bp => bp.line !== line);
          }
        });
      }
    }
  }, []); // Remove breakpoints from dependencies - no longer needed!

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
    isSessionStarting,
    isSessionStopping,
    isSessionRestarting,
    variables,
    witnesses,
    opcodes,
    breakpoints,
    currentLine,
    error,

    // Actions
    startDebugSession,
    stopDebugSession,
    restartDebugSession,
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
