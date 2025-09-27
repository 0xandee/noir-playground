import { ProgramCompilationArtifacts } from '@noir-lang/noir_wasm';
import {
  DagNode,
  DagEdge,
  CircuitDag,
  AcirOpType,
  DagNodeType,
  DagNodeData,
  DagEdgeData,
  AcirInstruction,
  BrilligInstruction,
  DagFilters,
  DagSearchResult
} from '../types/dagTypes';

export class AcirDagService {
  private nodeCounter = 0;
  private edgeCounter = 0;
  private witnessMap = new Map<number, DagNode>();

  /**
   * Parse ACIR bytecode from compilation artifacts and create a DAG
   */
  async parseCircuitDag(
    compilationArtifacts: ProgramCompilationArtifacts,
    sourceCode?: string
  ): Promise<CircuitDag> {
    this.resetCounters();

    try {
      // Extract the compiled program
      const program = (compilationArtifacts as any).program;
      if (!program) {
        throw new Error('No compiled program found in artifacts');
      }

      const bytecode = program.bytecode;
      if (!bytecode) {
        throw new Error('No bytecode found in compiled program');
      }

      // Parse the bytecode structure
      const acirStructure = this.parseAcirBytecode(bytecode);

      // Create source line mapping if available
      const sourceMapping = sourceCode ? this.createSourceMapping(sourceCode) : new Map();

      // Build DAG from ACIR instructions
      const { nodes, edges } = this.buildDagFromAcir(acirStructure, sourceMapping);

      // Calculate metadata
      const metadata = this.calculateMetadata(nodes, edges);

      return {
        nodes,
        edges,
        metadata
      };
    } catch (error) {
      console.error('Error parsing circuit DAG:', error);
      // Return empty DAG on error
      return this.createEmptyDag();
    }
  }

  /**
   * Parse ACIR bytecode into structured instructions
   * Note: This is a simplified parser - real ACIR parsing would need
   * to decode the binary format according to the ACIR specification
   */
  private parseAcirBytecode(bytecode: Uint8Array): AcirInstruction[] {
    const instructions: AcirInstruction[] = [];

    try {
      // For now, we'll create mock instructions based on bytecode length
      // In a real implementation, this would parse the actual ACIR format
      const instructionCount = Math.min(bytecode.length / 32, 100); // Limit for demo

      for (let i = 0; i < instructionCount; i++) {
        const opcode = this.extractOpcode(bytecode, i);
        const inputs = this.extractInputs(bytecode, i);
        const outputs = this.extractOutputs(bytecode, i);

        instructions.push({
          opcode,
          inputs,
          outputs,
          sourceLocation: this.extractSourceLocation(bytecode, i)
        });
      }
    } catch (error) {
      console.warn('Error parsing ACIR bytecode, using fallback:', error);
      // Fallback: create some demo instructions
      instructions.push(...this.createFallbackInstructions());
    }

    return instructions;
  }

  /**
   * Extract opcode from bytecode at position
   */
  private extractOpcode(bytecode: Uint8Array, position: number): string {
    const offset = position * 32;
    if (offset >= bytecode.length) return 'unknown';

    const opcodeValue = bytecode[offset];

    // Map opcode values to operation names (simplified)
    const opcodeMap: Record<number, string> = {
      0: 'arithmetic',
      1: 'blackbox',
      2: 'directive',
      3: 'memory_init',
      4: 'memory_op',
      5: 'brillig',
      6: 'assert_zero',
      7: 'function_call',
      8: 'return'
    };

    return opcodeMap[opcodeValue] || `opcode_${opcodeValue}`;
  }

  /**
   * Extract input witness numbers
   */
  private extractInputs(bytecode: Uint8Array, position: number): number[] {
    const offset = position * 32;
    const inputs: number[] = [];

    // Simplified extraction - in reality this would follow ACIR format
    for (let i = 1; i <= 4; i++) {
      if (offset + i < bytecode.length) {
        const witnessId = bytecode[offset + i];
        if (witnessId > 0) {
          inputs.push(witnessId);
        }
      }
    }

    return inputs;
  }

  /**
   * Extract output witness numbers
   */
  private extractOutputs(bytecode: Uint8Array, position: number): number[] {
    const offset = position * 32;
    const outputs: number[] = [];

    // Simplified extraction
    for (let i = 5; i <= 8; i++) {
      if (offset + i < bytecode.length) {
        const witnessId = bytecode[offset + i];
        if (witnessId > 0) {
          outputs.push(witnessId);
        }
      }
    }

    return outputs;
  }

  /**
   * Extract source location information
   */
  private extractSourceLocation(bytecode: Uint8Array, position: number): { line: number; column?: number } | undefined {
    // For now, distribute operations across source lines
    // Real implementation would extract actual source mapping
    const lineNumber = (position % 20) + 1;
    return { line: lineNumber, column: 0 };
  }

  /**
   * Create fallback instructions for demo purposes
   */
  private createFallbackInstructions(): AcirInstruction[] {
    return [
      {
        opcode: 'arithmetic',
        inputs: [1, 2],
        outputs: [3],
        expression: 'witness_3 = witness_1 + witness_2',
        sourceLocation: { line: 5 }
      },
      {
        opcode: 'arithmetic',
        inputs: [3, 4],
        outputs: [5],
        expression: 'witness_5 = witness_3 * witness_4',
        sourceLocation: { line: 6 }
      },
      {
        opcode: 'assert_zero',
        inputs: [5, 6],
        outputs: [],
        expression: 'assert(witness_5 - witness_6 == 0)',
        sourceLocation: { line: 7 }
      },
      {
        opcode: 'blackbox',
        inputs: [7, 8],
        outputs: [9, 10],
        expression: 'sha256(witness_7, witness_8) -> (witness_9, witness_10)',
        sourceLocation: { line: 8 }
      }
    ];
  }

  /**
   * Create source mapping from source code
   */
  private createSourceMapping(sourceCode: string): Map<number, string> {
    const mapping = new Map<number, string>();
    const lines = sourceCode.split('\n');

    lines.forEach((line, index) => {
      mapping.set(index + 1, line.trim());
    });

    return mapping;
  }

  /**
   * Build DAG nodes and edges from ACIR instructions
   */
  private buildDagFromAcir(
    instructions: AcirInstruction[],
    sourceMapping: Map<number, string>
  ): { nodes: DagNode[]; edges: DagEdge[] } {
    const nodes: DagNode[] = [];
    const edges: DagEdge[] = [];

    // Create input/output nodes
    const inputNode = this.createInputNode();
    const outputNode = this.createOutputNode();
    nodes.push(inputNode, outputNode);

    // Process each instruction
    instructions.forEach(instruction => {
      const node = this.createNodeFromInstruction(instruction, sourceMapping);
      nodes.push(node);

      // Create edges for data dependencies
      instruction.inputs?.forEach(witnessId => {
        const sourceNode = this.witnessMap.get(witnessId);
        if (sourceNode) {
          edges.push(this.createDataEdge(sourceNode.id, node.id, witnessId));
        } else {
          // Connect to input node if no source found
          edges.push(this.createDataEdge(inputNode.id, node.id, witnessId));
        }
      });

      // Update witness mapping for outputs
      instruction.outputs?.forEach(witnessId => {
        this.witnessMap.set(witnessId, node);
      });
    });

    // Connect final outputs to output node
    Array.from(this.witnessMap.values()).forEach(node => {
      if (node.data.acirData?.witnessOutputs?.length) {
        edges.push(this.createDataEdge(node.id, outputNode.id));
      }
    });

    return { nodes, edges };
  }

  /**
   * Create a DAG node from an ACIR instruction
   */
  private createNodeFromInstruction(
    instruction: AcirInstruction,
    sourceMapping: Map<number, string>
  ): DagNode {
    const nodeId = `node_${++this.nodeCounter}`;
    const opType = this.mapOpcodeToType(instruction.opcode);
    const nodeType = this.mapOpcodeToNodeType(instruction.opcode);

    const data: DagNodeData = {
      id: nodeId,
      label: instruction.opcode,
      operation: instruction.expression || instruction.opcode,
      opType,
      nodeType,
      sourceLocation: instruction.sourceLocation,
      acirData: {
        witnessInputs: instruction.inputs || [],
        witnessOutputs: instruction.outputs || [],
        expression: instruction.expression
      },
      complexity: this.calculateNodeComplexity(instruction),
      style: this.getNodeStyle(nodeType, opType)
    };

    return {
      id: nodeId,
      type: 'default',
      position: { x: 0, y: 0 }, // Will be set by layout algorithm
      data
    };
  }

  /**
   * Create input node
   */
  private createInputNode(): DagNode {
    const nodeId = 'input';
    return {
      id: nodeId,
      type: 'input',
      position: { x: 0, y: 0 },
      data: {
        id: nodeId,
        label: 'Inputs',
        operation: 'circuit_inputs',
        opType: 'directive',
        nodeType: 'input',
        style: { backgroundColor: '#10b981', color: '#ffffff' }
      }
    };
  }

  /**
   * Create output node
   */
  private createOutputNode(): DagNode {
    const nodeId = 'output';
    return {
      id: nodeId,
      type: 'output',
      position: { x: 0, y: 0 },
      data: {
        id: nodeId,
        label: 'Outputs',
        operation: 'circuit_outputs',
        opType: 'directive',
        nodeType: 'output',
        style: { backgroundColor: '#ef4444', color: '#ffffff' }
      }
    };
  }

  /**
   * Create data flow edge
   */
  private createDataEdge(
    sourceId: string,
    targetId: string,
    witnessId?: number
  ): DagEdge {
    const edgeId = `edge_${++this.edgeCounter}`;

    const data: DagEdgeData = {
      id: edgeId,
      source: sourceId,
      target: targetId,
      sourceHandle: 'output',
      targetHandle: 'input',
      edgeType: 'data',
      witness: witnessId ? { witnessId } : undefined,
      label: witnessId ? `w${witnessId}` : undefined
    };

    return {
      id: edgeId,
      source: sourceId,
      target: targetId,
      sourceHandle: 'output',
      targetHandle: 'input',
      data
    };
  }

  /**
   * Map opcode to operation type
   */
  private mapOpcodeToType(opcode: string): AcirOpType {
    const mapping: Record<string, AcirOpType> = {
      'arithmetic': 'arithmetic',
      'blackbox': 'blackbox',
      'brillig': 'brillig',
      'directive': 'directive',
      'assert_zero': 'assertion',
      'memory_init': 'memory',
      'memory_op': 'memory',
      'function_call': 'function_call',
      'return': 'return'
    };

    return mapping[opcode] || 'unknown';
  }

  /**
   * Map opcode to node type
   */
  private mapOpcodeToNodeType(opcode: string): DagNodeType {
    if (opcode === 'brillig') return 'brillig';
    if (opcode === 'blackbox') return 'blackbox';
    return 'acir';
  }

  /**
   * Calculate node complexity metrics
   */
  private calculateNodeComplexity(instruction: AcirInstruction): { gates: number; opcodes: number; cost: number } {
    const opType = this.mapOpcodeToType(instruction.opcode);

    // Simplified complexity calculation
    const complexityMap: Record<AcirOpType, { gates: number; opcodes: number }> = {
      'arithmetic': { gates: 1, opcodes: 1 },
      'blackbox': { gates: 1000, opcodes: 1 },
      'memory': { gates: 2, opcodes: 1 },
      'brillig': { gates: 5, opcodes: 1 },
      'directive': { gates: 0, opcodes: 1 },
      'assertion': { gates: 1, opcodes: 1 },
      'function_call': { gates: 10, opcodes: 1 },
      'return': { gates: 0, opcodes: 1 },
      'unknown': { gates: 1, opcodes: 1 }
    };

    const complexity = complexityMap[opType] || { gates: 1, opcodes: 1 };
    return {
      ...complexity,
      cost: complexity.gates + complexity.opcodes
    };
  }

  /**
   * Get node styling based on type
   */
  private getNodeStyle(nodeType: DagNodeType, opType: AcirOpType) {
    const styleMap: Record<DagNodeType, any> = {
      'acir': { backgroundColor: '#3b82f6', color: '#ffffff' },
      'brillig': { backgroundColor: '#10b981', color: '#ffffff' },
      'blackbox': { backgroundColor: '#8b5cf6', color: '#ffffff' },
      'input': { backgroundColor: '#10b981', color: '#ffffff' },
      'output': { backgroundColor: '#ef4444', color: '#ffffff' }
    };

    return styleMap[nodeType] || { backgroundColor: '#6b7280', color: '#ffffff' };
  }

  /**
   * Calculate DAG metadata
   */
  private calculateMetadata(nodes: DagNode[], edges: DagEdge[]) {
    const acirNodes = nodes.filter(n => n.data.nodeType === 'acir').length;
    const brilligNodes = nodes.filter(n => n.data.nodeType === 'brillig').length;
    const blackboxNodes = nodes.filter(n => n.data.nodeType === 'blackbox').length;

    const totalComplexity = nodes.reduce(
      (acc, node) => ({
        gates: acc.gates + (node.data.complexity?.gates || 0),
        opcodes: acc.opcodes + (node.data.complexity?.opcodes || 0),
        cost: acc.cost + (node.data.complexity?.cost || 0)
      }),
      { gates: 0, opcodes: 0, cost: 0 }
    );

    return {
      totalNodes: nodes.length,
      totalEdges: edges.length,
      acirNodes,
      brilligNodes,
      blackboxNodes,
      totalComplexity
    };
  }

  /**
   * Filter DAG based on criteria
   */
  filterDag(dag: CircuitDag, filters: DagFilters): CircuitDag {
    const filteredNodes = dag.nodes.filter(node => {
      // Filter by node type
      if (!filters.nodeTypes.has(node.data.nodeType)) return false;

      // Filter by operation type
      if (!filters.opTypes.has(node.data.opType)) return false;

      // Filter by complexity range
      const complexity = node.data.complexity?.cost || 0;
      if (complexity < filters.complexityRange.min || complexity > filters.complexityRange.max) {
        return false;
      }

      // Filter by source mapping
      if (filters.showOnlySourceMapped && !node.data.sourceLocation) return false;

      // Filter by search query
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        const matchesName = node.data.label.toLowerCase().includes(query);
        const matchesOperation = node.data.operation.toLowerCase().includes(query);
        if (!matchesName && !matchesOperation) return false;
      }

      return true;
    });

    const nodeIds = new Set(filteredNodes.map(n => n.id));
    const filteredEdges = dag.edges.filter(edge =>
      nodeIds.has(edge.source) && nodeIds.has(edge.target)
    );

    return {
      nodes: filteredNodes,
      edges: filteredEdges,
      metadata: this.calculateMetadata(filteredNodes, filteredEdges)
    };
  }

  /**
   * Search DAG nodes
   */
  searchDag(dag: CircuitDag, query: string): DagSearchResult[] {
    const results: DagSearchResult[] = [];
    const lowerQuery = query.toLowerCase();

    dag.nodes.forEach(node => {
      let score = 0;
      let matchType: DagSearchResult['matchType'] = 'name';

      // Check name match
      if (node.data.label.toLowerCase().includes(lowerQuery)) {
        score += 10;
        matchType = 'name';
      }

      // Check operation match
      if (node.data.operation.toLowerCase().includes(lowerQuery)) {
        score += 8;
        matchType = 'operation';
      }

      // Check witness match
      if (node.data.acirData?.witnessInputs?.some(w => w.toString().includes(query)) ||
          node.data.acirData?.witnessOutputs?.some(w => w.toString().includes(query))) {
        score += 6;
        matchType = 'witness';
      }

      // Check source location match
      if (node.data.sourceLocation && node.data.sourceLocation.line.toString().includes(query)) {
        score += 4;
        matchType = 'source';
      }

      if (score > 0) {
        results.push({ node, matchType, score });
      }
    });

    return results.sort((a, b) => b.score - a.score);
  }

  /**
   * Create empty DAG
   */
  private createEmptyDag(): CircuitDag {
    return {
      nodes: [],
      edges: [],
      metadata: {
        totalNodes: 0,
        totalEdges: 0,
        acirNodes: 0,
        brilligNodes: 0,
        blackboxNodes: 0,
        totalComplexity: { gates: 0, opcodes: 0, cost: 0 }
      }
    };
  }

  /**
   * Reset internal counters
   */
  private resetCounters(): void {
    this.nodeCounter = 0;
    this.edgeCounter = 0;
    this.witnessMap.clear();
  }
}