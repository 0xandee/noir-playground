import { compile_program, createFileManager, ProgramCompilationArtifacts } from '@noir-lang/noir_wasm';

export interface WasmCompilationResult {
  success: boolean;
  error?: string;
  program?: ProgramCompilationArtifacts;
  warnings?: string[];
  compilationTime?: number;
}

export class NoirWasmCompiler {
  private fileManager: any;

  constructor() {
    // Create file manager for browser environment
    this.fileManager = createFileManager('.');
  }

  async compileProgram(sourceCode: string, cargoToml?: string): Promise<WasmCompilationResult> {
    const startTime = performance.now();
    
    try {
      // Create default Nargo.toml if not provided
      const defaultCargoToml = cargoToml || `[package]
name = "playground"
type = "bin"
authors = [""]
compiler_version = ">=0.31.0"

[dependencies]`;

      // Write files using file manager
      const projectPath = '/noir_project';
      
      // Convert strings to streams for writeFile
      const sourceStream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(sourceCode));
          controller.close();
        }
      });
      
      const cargoStream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(defaultCargoToml));
          controller.close();
        }
      });
      
      // Write the source file (use relative path for writeFile)
      await this.fileManager.writeFile(`noir_project/src/main.nr`, sourceStream);
      
      // Write the Nargo.toml file (use relative path for writeFile)
      await this.fileManager.writeFile(`noir_project/Nargo.toml`, cargoStream);
      
      console.log('[NoirWasmCompiler] Files written to file manager');

      // Compile using noir_wasm with file manager
      const result = await compile_program(
        this.fileManager,
        projectPath,
        (message: string) => console.log('[Noir Compiler]', message),
        (message: string) => console.debug('[Noir Debug]', message)
      );

      const compilationTime = performance.now() - startTime;

      return {
        success: true,
        program: result,
        warnings: [], // TODO: Extract warnings from compilation result
        compilationTime
      };

    } catch (error) {
      const compilationTime = performance.now() - startTime;
      console.error('[NoirWasmCompiler] Compilation error:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'WASM compilation failed',
        compilationTime
      };
    }
  }

  async compileContract(sourceCode: string): Promise<WasmCompilationResult> {
    const contractToml = `[package]
name = "playground_contract"
type = "contract"
authors = [""]
compiler_version = ">=0.31.0"

[dependencies]`;

    return this.compileProgram(sourceCode, contractToml);
  }

  // Reset file manager
  reset(): void {
    this.fileManager = createFileManager('.');
  }
}

export const noirWasmCompiler = new NoirWasmCompiler();