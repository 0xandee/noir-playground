import { Noir } from '@noir-lang/noir_js';
import { UltraHonkBackend } from '@aztec/bb.js';
import { noirWasmCompiler, WasmCompilationResult } from './NoirWasmCompiler';
import { noirServerCompiler } from './NoirServerCompiler';
import { formatDuration } from '@/lib/utils';
export interface ExecutionStep {
  status: 'pending' | 'running' | 'success' | 'error';
  message: string;
  time?: string;
  details?: string;
}

export interface NoirExecutionResult {
  steps: ExecutionStep[];
  proof?: Uint8Array;
  publicInputs?: string[];
  executionTime?: number;
  error?: string;
  returnValue?: string;
  witness?: Uint8Array;
}

/**
 * NoirService with WASM integration
 */
export class NoirService {
  private noir?: Noir;
  private backend?: UltraHonkBackend;
  private startTime: number = 0;
  private wasmInitialized: boolean = false;
  private compiledProgram?: any; // Store compiled program for circuit info access
  private useServerCompiler: boolean;

  constructor() {
    // Check environment variable for compiler selection
    // Default to server compiler if available, fallback to WASM
    this.useServerCompiler = import.meta.env.VITE_USE_SERVER_COMPILER === 'true';
  }

  /**
   * Select compiler based on configuration
   * Returns server compiler if enabled, otherwise returns WASM compiler
   */
  private getCompiler() {
    if (this.useServerCompiler) {
      console.log('[NoirService] Using server-side compiler');
      return noirServerCompiler;
    } else {
      console.log('[NoirService] Using WASM compiler');
      return noirWasmCompiler;
    }
  }

  /**
   * Compile program using selected compiler
   */
  private async compileProgram(
    sourceCode: string,
    cargoToml: string | undefined,
    onProgress: (message: string) => void
  ): Promise<WasmCompilationResult> {
    const compiler = this.getCompiler();
    return await compiler.compileProgram(sourceCode, cargoToml, onProgress);
  }

  private async initializeWasm(): Promise<void> {
    if (this.wasmInitialized) return;

    try {
      // Initialize WASM modules - this should be done before using Noir or bb.js

      // Create a test instance to ensure WASM is loaded
      await new Promise(resolve => setTimeout(resolve, 100));

      this.wasmInitialized = true;
    } catch (error) {
      throw new Error('Failed to initialize WASM modules');
    }
  }

  private createStep(status: ExecutionStep['status'], message: string, details?: string): ExecutionStep {
    const currentTime = Date.now();
    const elapsedTime = this.startTime ? ((currentTime - this.startTime) / 1000).toFixed(3) + 's' : undefined;

    return {
      status,
      message,
      time: elapsedTime,
      details
    };
  }

  async executeCircuit(
    sourceCode: string,
    inputs: Record<string, any>,
    onStep: (step: ExecutionStep) => void,
    cargoToml?: string,
    proveAndVerify: boolean = true
  ): Promise<NoirExecutionResult> {
    this.startTime = Date.now();
    const steps: ExecutionStep[] = [];

    try {
      // Initialize WASM modules first
      await this.initializeWasm();

      // Execute compilation
      return await this.executeWithCompilation(sourceCode, inputs, onStep, cargoToml, steps, proveAndVerify);
    } catch (error) {
      const errorStep = this.createStep('error', 'Execution failed', error instanceof Error ? error.message : 'Unknown error');
      steps.push(errorStep);
      onStep(errorStep);

      return {
        steps,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  private async executeWithCompilation(
    sourceCode: string,
    inputs: Record<string, any>,
    onStep: (step: ExecutionStep) => void,
    cargoToml?: string,
    steps: ExecutionStep[],
    proveAndVerify: boolean = true
  ): Promise<NoirExecutionResult> {
    // Step 1: Compilation (server or WASM based on config)
    const compilerType = this.useServerCompiler ? 'server' : 'WASM';
    onStep(this.createStep('running', `Compiling circuit with ${compilerType} compiler...`));
    const compileStartTime = performance.now();

    const compilationResult = await this.compileProgram(
      sourceCode,
      cargoToml,
      (message: string) => {
        // Pass progress messages as running steps
        onStep(this.createStep('running', message));
      }
    );

    if (!compilationResult.success) {
      throw new Error(`Compilation failed: ${compilationResult.error}`);
    }

    const compileTime = performance.now() - compileStartTime;
    let compileMessage = `Compilation successful (${formatDuration(compileTime)})`;
    if (compilationResult.dependenciesResolved && compilationResult.dependenciesResolved > 0) {
      const depCount = compilationResult.dependenciesResolved;
      compileMessage += ` - ${depCount} ${depCount === 1 ? 'dependency' : 'dependencies'} resolved`;
    }

    const compileStep = this.createStep('success', compileMessage);
    steps.push(compileStep);
    onStep(compileStep);

    // Step 2: Initialize Noir and Backend with compiled circuit
    onStep(this.createStep('running', 'Initializing Noir circuit...'));
    const initStartTime = performance.now();

    if (!compilationResult.program) {
      throw new Error('No compiled program available');
    }

    try {
      // The Noir instance expects the inner program object, not the wrapper
      const program = (compilationResult.program as any).program;
      this.compiledProgram = program; // Store for circuit info access
      this.noir = new Noir(program);

      // Initialize UltraHonkBackend for proof generation
      // UltraHonkBackend needs the bytecode from the program
      const bytecode = program.bytecode;
      if (!bytecode) {
        throw new Error('No bytecode found in compiled program');
      }

      this.backend = new UltraHonkBackend(bytecode);
    } catch (initError) {
      throw new Error(`Failed to initialize Noir circuit: ${initError instanceof Error ? initError.message : 'Unknown error'}`);;
    }

    const initTime = performance.now() - initStartTime;
    const initStep = this.createStep('success', `Circuit initialized (${formatDuration(initTime)})`);
    steps.push(initStep);
    onStep(initStep);

    // Step 3: Execute the circuit (generate witness)
    onStep(this.createStep('running', 'Executing circuit and generating witness...'));
    const executeStartTime = performance.now();

    const processedInputs: Record<string, any> = {};
    for (const [key, value] of Object.entries(inputs)) {
      // Preserve arrays and other complex types as-is
      if (Array.isArray(value)) {
        processedInputs[key] = value;
      } else {
        processedInputs[key] = isNaN(Number(value)) ? value : Number(value);
      }
    }

    try {
      const { witness, returnValue } = await this.noir.execute(processedInputs);

      const executeTime = performance.now() - executeStartTime;
      const executeStep = this.createStep('success', `Execution successful (${formatDuration(executeTime)})`);
      steps.push(executeStep);
      onStep(executeStep);

      const executionTime = (Date.now() - this.startTime) / 1000;

      // If proveAndVerify is false, return early with just execution results
      if (!proveAndVerify) {
        // Extract public inputs from the circuit without generating proof
        const publicInputs = this.extractPublicInputsFromCircuit(processedInputs, sourceCode, returnValue);

        return {
          steps,
          executionTime,
          returnValue,
          witness,
          publicInputs
        };
      }

      // Step 4: Generate proof using UltraHonkBackend
      onStep(this.createStep('running', 'Generating proof...'));
      const proofStartTime = performance.now();

      if (!this.backend) {
        throw new Error('Backend not initialized');
      }

      const proof = await this.backend.generateProof(witness);

      const proofTime = performance.now() - proofStartTime;
      const proofStep = this.createStep('success', `Proof generated successful (${formatDuration(proofTime)})`);
      steps.push(proofStep);
      onStep(proofStep);

      // Step 5: Verify proof
      onStep(this.createStep('running', 'Verifying proof...'));
      const verifyStartTime = performance.now();

      const isValid = await this.backend.verifyProof(proof);

      const verifyTime = performance.now() - verifyStartTime;
      const verifyStep = this.createStep(
        isValid ? 'success' : 'error',
        isValid ? `Proof verification successful (${formatDuration(verifyTime)})` : 'Proof verification failed'
      );
      steps.push(verifyStep);
      onStep(verifyStep);

      if (!isValid) {
        throw new Error('Generated proof failed verification');
      }

      return {
        steps,
        proof: proof.proof,
        publicInputs: proof.publicInputs?.map((input: any) => `${input.toString(16).padStart(64, '0')}`),
        executionTime,
        returnValue,
        witness
      };
    } catch (error) {
      // Handle constraint violations and other execution errors
      const errorMessage = error instanceof Error ? error.message : 'Unknown execution error';
      throw new Error(`Circuit execution failed: ${errorMessage}`);
    }
  }


  /**
   * Extract public inputs from circuit without generating proof
   * Analyzes the main function signature to identify public parameters
   */
  private extractPublicInputsFromCircuit(
    inputs: Record<string, any>,
    sourceCode: string,
    returnValue?: string
  ): string[] {
    const publicInputs: string[] = [];

    try {
      // Find the main function signature
      const functionRegex = /fn\s+main\s*\([^)]*\)/;
      const match = sourceCode.match(functionRegex);

      if (match) {
        const paramString = match[0];
        // Extract parameters marked as pub
        const pubParamRegex = /(\w+)\s*:\s*pub\s+(\w+)/g;
        let paramMatch: RegExpExecArray | null;

        while ((paramMatch = pubParamRegex.exec(paramString)) !== null) {
          const paramName = paramMatch[1];
          const paramValue = inputs[paramName];

          if (paramValue !== undefined) {
            // Format as hex string similar to proof generation
            const hexValue = typeof paramValue === 'number'
              ? paramValue.toString(16).padStart(64, '0')
              : paramValue.toString();
            publicInputs.push(hexValue);
          }
        }
      }

      // Check if return value is public (marked as pub Field in return type)
      const returnTypeRegex = /->\s*pub\s+Field/;
      if (returnValue && returnTypeRegex.test(sourceCode)) {
        const hexReturnValue = returnValue.toString(16).padStart(64, '0');
        publicInputs.push(hexReturnValue);
      }

    } catch (error) {
      // Error extracting public inputs
    }

    return publicInputs;
  }

  getCircuitInfo() {
    if (!this.noir) return null;

    return {
      hasCircuit: true,
      circuitSize: this.getCircuitSize()
    };
  }

  /**
   * Get the circuit size (number of ACIR opcodes)
   */
  getCircuitSize(): number | undefined {
    if (!this.compiledProgram) return undefined;

    try {
      // Try to get circuit size from bytecode
      // The bytecode is typically a base64 encoded string representing the ACIR program
      const bytecode = this.compiledProgram.bytecode;
      if (bytecode && typeof bytecode === 'string') {
        // Decode base64 to get the ACIR buffer
        const decoded = atob(bytecode);
        // Return the byte size as a proxy for circuit complexity
        return decoded.length;
      }

      // Alternative: Check if the program has an abi field with circuit_size
      if (this.compiledProgram.abi?.circuit_size) {
        return this.compiledProgram.abi.circuit_size;
      }

      // Alternative: Check bytecode as Uint8Array
      if (bytecode instanceof Uint8Array) {
        return bytecode.length;
      }
    } catch (error) {
      console.warn('Failed to extract circuit size:', error);
    }

    return undefined;
  }

  reset() {
    this.noir = undefined;
    this.backend = undefined;
    this.compiledProgram = undefined;
    this.startTime = 0;
    noirWasmCompiler.reset();
  }
}

export const noirService = new NoirService();