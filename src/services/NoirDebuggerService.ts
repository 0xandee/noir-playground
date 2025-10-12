/**
 * Service for interacting with the Noir debugger API
 * Provides methods for DAP (Debug Adapter Protocol) operations
 */

import type {
  StartDebugSessionRequest,
  StartDebugSessionResponse,
  StepCommand,
  StepCommandRequest,
  StepCommandResponse,
  VariablesResponse,
  WitnessMapResponse,
  OpcodesResponse,
  Breakpoint,
  SetBreakpointsRequest,
  DebugSession,
} from '@/types/debug';

export class NoirDebuggerService {
  private apiBaseUrl: string;

  constructor() {
    // Use environment variable for server base URL, fallback to localhost:4000
    this.apiBaseUrl = import.meta.env.VITE_DEBUG_SERVER_URL ||
                      import.meta.env.VITE_PROFILER_SERVER_URL ||
                      'http://localhost:4000';
  }

  /**
   * Start a new debug session
   */
  async startSession(request: StartDebugSessionRequest): Promise<StartDebugSessionResponse> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/debug/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Debug session start failed: ${response.status} - ${errorText}`);
      }

      const result: StartDebugSessionResponse = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to start debug session');
      }

      return result;
    } catch (error) {
      console.error('[NoirDebuggerService] Start session error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error starting debug session',
      };
    }
  }

  /**
   * Execute a step command (next, stepIn, stepOut, continue)
   */
  async executeStep(sessionId: string, command: StepCommand): Promise<StepCommandResponse> {
    try {
      const requestBody: StepCommandRequest = {
        sessionId,
        command,
      };

      const response = await fetch(`${this.apiBaseUrl}/api/debug/step`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Step command failed: ${response.status} - ${errorText}`);
      }

      const result: StepCommandResponse = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Step command failed');
      }

      return result;
    } catch (error) {
      console.error('[NoirDebuggerService] Execute step error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error executing step',
      };
    }
  }

  /**
   * Get variables for the current stack frame
   */
  async getVariables(sessionId: string): Promise<VariablesResponse> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/debug/variables/${sessionId}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Get variables failed: ${response.status} - ${errorText}`);
      }

      const result: VariablesResponse = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to get variables');
      }

      return result;
    } catch (error) {
      console.error('[NoirDebuggerService] Get variables error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error getting variables',
      };
    }
  }

  /**
   * Get witness map for the current state
   */
  async getWitnessMap(sessionId: string): Promise<WitnessMapResponse> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/debug/witness/${sessionId}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Get witness map failed: ${response.status} - ${errorText}`);
      }

      const result: WitnessMapResponse = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to get witness map');
      }

      return result;
    } catch (error) {
      console.error('[NoirDebuggerService] Get witness map error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error getting witness map',
      };
    }
  }

  /**
   * Get ACIR opcodes for the circuit
   */
  async getOpcodes(sessionId: string): Promise<OpcodesResponse> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/debug/opcodes/${sessionId}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Get opcodes failed: ${response.status} - ${errorText}`);
      }

      const result: OpcodesResponse = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to get opcodes');
      }

      return result;
    } catch (error) {
      console.error('[NoirDebuggerService] Get opcodes error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error getting opcodes',
      };
    }
  }

  /**
   * Terminate a debug session
   */
  async terminateSession(sessionId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/debug/${sessionId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        console.warn(`[NoirDebuggerService] Terminate session warning: ${response.status}`);
        // Don't throw error for cleanup operations
        return false;
      }

      return true;
    } catch (error) {
      console.error('[NoirDebuggerService] Terminate session error:', error);
      return false;
    }
  }

  /**
   * Set breakpoints for the debug session
   * Note: This is a placeholder - breakpoint support needs to be added to the server API
   */
  async setBreakpoints(sessionId: string, breakpoints: Breakpoint[]): Promise<boolean> {
    try {
      // TODO: Implement server endpoint for setting breakpoints
      // For now, this is a no-op
      console.log('[NoirDebuggerService] setBreakpoints not yet implemented on server');
      return true;
    } catch (error) {
      console.error('[NoirDebuggerService] Set breakpoints error:', error);
      return false;
    }
  }

  /**
   * Check if debug server is available
   */
  async checkAvailability(): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/debug/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(3000), // 3 second timeout
      });

      return response.ok;
    } catch (error) {
      console.warn('[NoirDebuggerService] Debug server not available:', error);
      return false;
    }
  }

  /**
   * Get combined debug state (variables + witnesses + opcodes)
   * Convenience method that makes multiple API calls
   */
  async getDebugState(sessionId: string): Promise<{
    success: boolean;
    state?: {
      variables: any[];
      witnesses: any[];
      opcodes: any[];
    };
    error?: string;
  }> {
    try {
      // Fetch all data in parallel
      const [variablesRes, witnessRes, opcodesRes] = await Promise.all([
        this.getVariables(sessionId),
        this.getWitnessMap(sessionId),
        this.getOpcodes(sessionId),
      ]);

      // Check if any request failed
      if (!variablesRes.success || !witnessRes.success || !opcodesRes.success) {
        const errors = [
          variablesRes.error,
          witnessRes.error,
          opcodesRes.error,
        ].filter(Boolean);
        throw new Error(errors.join('; '));
      }

      return {
        success: true,
        state: {
          variables: variablesRes.variables || [],
          witnesses: witnessRes.witnesses || [],
          opcodes: opcodesRes.opcodes || [],
        },
      };
    } catch (error) {
      console.error('[NoirDebuggerService] Get debug state error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error getting debug state',
      };
    }
  }
}

// Export singleton instance
export const noirDebuggerService = new NoirDebuggerService();
