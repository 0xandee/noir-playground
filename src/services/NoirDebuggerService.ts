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
  DebugSession,
} from '@/types/debug';

/**
 * Request body for setBreakpoints API call
 */
interface SetBreakpointsRequest {
  sessionId: string;
  breakpoints: Array<{
    line: number;
    column?: number;
  }>;
  sourceFile?: string;
}

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
        // Don't throw error for cleanup operations
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Set breakpoints for the debug session
   * Following DAP protocol: client sends ALL breakpoints for a source file
   */
  async setBreakpoints(
    sessionId: string,
    breakpoints: Breakpoint[],
    sourceFile?: string
  ): Promise<{
    success: boolean;
    breakpoints?: Breakpoint[];
    error?: string;
  }> {
    try {
      const requestBody: SetBreakpointsRequest = {
        sessionId,
        breakpoints: breakpoints.map(bp => ({
          line: bp.line,
          // Don't send 'verified' - that's returned by the server, not sent to it
        })),
        sourceFile: sourceFile || 'main.nr',
      };

      const response = await fetch(`${this.apiBaseUrl}/api/debug/breakpoints`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Set breakpoints failed: ${response.status} - ${errorText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to set breakpoints');
      }

      return {
        success: true,
        breakpoints: result.breakpoints || [],
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error setting breakpoints',
      };
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
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error getting debug state',
      };
    }
  }
}

// Export singleton instance
export const noirDebuggerService = new NoirDebuggerService();
