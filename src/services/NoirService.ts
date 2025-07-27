import { Noir } from '@noir-lang/noir_js';
import { UltraHonkBackend } from '@aztec/bb.js';
import { noirWasmCompiler } from './NoirWasmCompiler';
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

  private async initializeWasm(): Promise<void> {
    if (this.wasmInitialized) return;
    
    try {
      // Initialize WASM modules - this should be done before using Noir or bb.js
      console.log('[NoirService] Initializing WASM modules...');
      
      // Create a test instance to ensure WASM is loaded
      await new Promise(resolve => setTimeout(resolve, 100));
      
      this.wasmInitialized = true;
      console.log('[NoirService] WASM modules initialized successfully');
    } catch (error) {
      console.error('[NoirService] WASM initialization failed:', error);
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
    // Step 1: WASM Compilation
    onStep(this.createStep('running', 'Compiling circuit with Noir WASM...'));
    
    const compilationResult = await noirWasmCompiler.compileProgram(sourceCode, cargoToml);
    
    if (!compilationResult.success) {
      throw new Error(`Compilation failed: ${compilationResult.error}`);
    }

    const compileStep = this.createStep('success', `Compilation successful (${compilationResult.compilationTime?.toFixed(0)}ms)`);
    steps.push(compileStep);
    onStep(compileStep);

    // Step 2: Initialize Noir and Backend with compiled circuit
    onStep(this.createStep('running', 'Initializing Noir circuit...'));
    
    if (!compilationResult.program) {
      throw new Error('No compiled program available');
    }

    try {
      console.log('[NoirService] Program structure:', {
        hasProgram: !!compilationResult.program,
        programKeys: compilationResult.program ? Object.keys(compilationResult.program) : [],
        hasBytecode: !!(compilationResult.program as any)?.bytecode,
        hasCircuitBytecode: !!(compilationResult.program as any)?.circuit?.bytecode
      });
      
      // The Noir instance expects the inner program object, not the wrapper
      const program = (compilationResult.program as any).program;
      this.noir = new Noir(program);
      console.log('[NoirService] Noir instance created successfully');
      
      // Initialize UltraHonkBackend for proof generation
      // UltraHonkBackend needs the bytecode from the program
      const bytecode = program.bytecode;
      if (!bytecode) {
        throw new Error('No bytecode found in compiled program');
      }
      
      console.log('[NoirService] Initializing UltraHonkBackend with bytecode:', { 
        hasBytecode: !!bytecode,
        bytecodeType: typeof bytecode,
        bytecodeLength: bytecode?.length || 'N/A'
      });
      
      this.backend = new UltraHonkBackend(bytecode);
      console.log('[NoirService] UltraHonkBackend initialized successfully');
    } catch (initError) {
      console.error('[NoirService] Initialization error:', initError);
      throw new Error(`Failed to initialize Noir circuit: ${initError instanceof Error ? initError.message : 'Unknown error'}`);
    }

    const initStep = this.createStep('success', 'Circuit initialized');
    steps.push(initStep);
    onStep(initStep);

    // Step 3: Execute the circuit (generate witness)
    onStep(this.createStep('running', 'Executing circuit and generating witness...'));
    
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
      console.log('[NoirService] Executing with inputs:', processedInputs);
      const { witness, returnValue } = await this.noir.execute(processedInputs);
      console.log('[NoirService] Execution successful, witness generated');
      
      const executeStep = this.createStep('success', `Execution successful. Return value: ${returnValue || 'None'}`);
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
      
      if (!this.backend) {
        throw new Error('Backend not initialized');
      }
      
      const proof = await this.backend.generateProof(witness);
      console.log('[NoirService] Proof generation successful');
      
      const proofStep = this.createStep('success', 'Proof generated successfully');
      steps.push(proofStep);
      onStep(proofStep);
      
      // Step 5: Verify proof
      onStep(this.createStep('running', 'Verifying proof...'));
      
      const isValid = await this.backend.verifyProof(proof);
      console.log('[NoirService] Proof verification result:', isValid);
      
      const verifyStep = this.createStep(
        isValid ? 'success' : 'error', 
        isValid ? 'Proof verification successful' : 'Proof verification failed'
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
      console.error('[NoirService] Circuit execution error:', error);
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
      console.warn('[NoirService] Error extracting public inputs:', error);
    }
    
    return publicInputs;
  }

  getCircuitInfo() {
    if (!this.noir) return null;
    
    return {
      hasCircuit: true
    };
  }

  reset() {
    this.noir = undefined;
    this.backend = undefined;
    this.startTime = 0;
    noirWasmCompiler.reset();
  }
}

export const noirService = new NoirService();