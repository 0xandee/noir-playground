import { WasmCompilationResult } from './NoirWasmCompiler';

export interface ServerCompilationResponse {
  success: boolean;
  artifact?: any;
  warnings?: string[];
  error?: string;
  compilationTime?: number;
}

/**
 * Server-side Noir compiler service
 * Uses HTTP API to compile Noir code on the server with native nargo CLI
 */
export class NoirServerCompiler {
  private serverBaseUrl: string;
  private compileEndpoint: string;

  constructor() {
    // Use environment variable for server base URL, fallback to localhost:4000
    this.serverBaseUrl = import.meta.env.VITE_PROFILER_SERVER_URL || 'http://localhost:4000';
    this.compileEndpoint = '/api/compile';
  }

  /**
   * Get the default Nargo.toml template
   */
  static getDefaultCargoToml(): string {
    return `[package]
name = "playground"
type = "bin"
authors = [""]
compiler_version = ">=1.0.0"

[dependencies]`;
  }

  /**
   * Compile a Noir program using server-side nargo CLI
   */
  async compileProgram(
    sourceCode: string,
    cargoToml?: string,
    onProgress?: (message: string) => void
  ): Promise<WasmCompilationResult> {
    const overallStartTime = performance.now();

    try {
      // onProgress?.('Sending code to server for compilation...');

      // Prepare request body
      const requestBody = {
        sourceCode,
        cargoToml: cargoToml || NoirServerCompiler.getDefaultCargoToml()
      };

      // Make HTTP request to server
      const response = await window.fetch(`${this.serverBaseUrl}${this.compileEndpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server responded with status ${response.status}: ${errorText}`);
      }

      const serverResponse: ServerCompilationResponse = await response.json();

      const compilationTime = performance.now() - overallStartTime;

      if (!serverResponse.success) {
        onProgress?.(`Compilation failed: ${serverResponse.error}`);
        return {
          success: false,
          error: serverResponse.error || 'Server compilation failed',
          compilationTime
        };
      }

      onProgress?.('Compilation successful!');

      // Convert server response to WasmCompilationResult format
      return {
        success: true,
        program: {
          program: serverResponse.artifact
        },
        warnings: serverResponse.warnings || [],
        compilationTime,
        dependenciesResolved: 0 // Dependencies handled by server natively
      };

    } catch (error) {
      const compilationTime = performance.now() - overallStartTime;

      const errorMessage = error instanceof Error
        ? error.message
        : 'Unknown error during server compilation';

      onProgress?.(`Server compilation error: ${errorMessage}`);

      return {
        success: false,
        error: errorMessage,
        compilationTime
      };
    }
  }

  /**
   * Compile a contract (same as compileProgram for now)
   */
  async compileContract(sourceCode: string): Promise<WasmCompilationResult> {
    const contractToml = NoirServerCompiler.getDefaultCargoToml();
    return this.compileProgram(sourceCode, contractToml);
  }

  /**
   * Reset is a no-op for server compiler (server handles cleanup)
   */
  reset(): void {
    // No-op: server manages its own state
  }

  /**
   * Check if server compiler is available
   */
  async checkAvailability(): Promise<boolean> {
    try {
      const response = await window.fetch(`${this.serverBaseUrl}/api/compile/check-nargo`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        }
      });

      if (!response.ok) {
        return false;
      }

      const result = await response.json();
      return result.available === true;
    } catch (error) {
      console.warn('Server compiler availability check failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const noirServerCompiler = new NoirServerCompiler();
