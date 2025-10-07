import { compile_program, createFileManager, ProgramCompilationArtifacts } from '@noir-lang/noir_wasm';
import { dependencyResolverService } from './DependencyResolverService';

export interface WasmCompilationResult {
  success: boolean;
  error?: string;
  program?: ProgramCompilationArtifacts;
  warnings?: string[];
  compilationTime?: number;
  dependenciesResolved?: number;
}

export class NoirWasmCompiler {
  private fileManager: any;

  constructor() {
    // Create file manager for browser environment
    this.fileManager = createFileManager('.');
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

  async compileProgram(
    sourceCode: string,
    cargoToml?: string,
    onProgress?: (message: string) => void
  ): Promise<WasmCompilationResult> {
    const overallStartTime = performance.now();

    try {
      // Create default Nargo.toml if not provided
      const defaultCargoToml = cargoToml || NoirWasmCompiler.getDefaultCargoToml();

      // Write files using file manager
      const projectPath = '/noir_project';

      // Convert strings to streams for writeFile
      const sourceStream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(sourceCode));
          controller.close();
        }
      });

      // Write the source file first (use relative path for writeFile)
      await this.fileManager.writeFile(`noir_project/src/main.nr`, sourceStream);

      // Resolve and fetch git dependencies BEFORE writing Nargo.toml
      // This prevents noir_wasm from trying to fetch git dependencies itself
      onProgress?.('Resolving dependencies...');
      const depStartTime = performance.now();

      const dependencyResult = await dependencyResolverService.resolveDependencies(
        defaultCargoToml,
        this.fileManager,
        onProgress
      );

      if (!dependencyResult.success) {
        throw new Error(`Dependency resolution failed: ${dependencyResult.error}`);
      }

      if (dependencyResult.dependencies.length > 0) {
        onProgress?.(`All dependencies resolved. Compiling...`);
      }

      // Store original fetch to restore later
      const originalFetch = globalThis.fetch;

      try {
        // Bind fetch to window globally for noir_wasm internal calls
        // This prevents "Illegal invocation" errors from noir_wasm's internal fetch usage
        globalThis.fetch = window.fetch.bind(window);

        // Track compilation time separately
        const compileStartTime = performance.now();

        // Compile using noir_wasm with file manager
        const result = await compile_program(
          this.fileManager,
          projectPath,
          () => {}, // Debug callback
          () => {}  // Debug callback
        );

        const compilationTime = performance.now() - overallStartTime;

        return {
          success: true,
          program: result,
          warnings: [], // TODO: Extract warnings from compilation result
          compilationTime,
          dependenciesResolved: dependencyResult.totalResolved || dependencyResult.dependencies.length
        };
      } finally {
        // Always restore original fetch
        globalThis.fetch = originalFetch;
      }

    } catch (error) {
      const compilationTime = performance.now() - overallStartTime;

      return {
        success: false,
        error: error instanceof Error ? error.message : 'WASM compilation failed',
        compilationTime
      };
    }
  }

  async compileContract(sourceCode: string): Promise<WasmCompilationResult> {
    const contractToml = NoirWasmCompiler.getDefaultCargoToml();

    return this.compileProgram(sourceCode, contractToml);
  }

  // Reset file manager
  reset(): void {
    this.fileManager = createFileManager('.');
  }
}

export const noirWasmCompiler = new NoirWasmCompiler();