import type { Node, Edge } from 'reactflow';

export type AcirOpType =
  | 'arithmetic'
  | 'blackbox'
  | 'memory'
  | 'brillig'
  | 'directive'
  | 'assertion'
  | 'function_call'
  | 'return'
  | 'unknown';

export type DagNodeType = 'acir' | 'brillig' | 'blackbox' | 'input' | 'output';

export interface DagNodeData {
  id: string;
  label: string;
  operation: string;
  opType: AcirOpType;
  nodeType: DagNodeType;

  // Complexity metrics
  complexity?: {
    gates: number;
    opcodes: number;
    cost: number;
  };

  // Source code mapping
  sourceLocation?: {
    line: number;
    column?: number;
    file?: string;
  };

  // ACIR-specific data
  acirData?: {
    witnessInputs: number[];
    witnessOutputs: number[];
    publicInputs?: number[];
    expression?: string;
  };

  // Brillig-specific data
  brilligData?: {
    instruction: string;
    registers?: number[];
    memoryAccess?: {
      address: number;
      size: number;
    };
  };

  // Styling
  style?: {
    color?: string;
    backgroundColor?: string;
    borderColor?: string;
    size?: 'small' | 'medium' | 'large';
  };
}

export interface DagEdgeData {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;

  // Edge type and data flow info
  edgeType: 'data' | 'control' | 'memory';
  label?: string;

  // Witness/variable information
  witness?: {
    witnessId: number;
    value?: string | number;
    isPublic?: boolean;
  };

  // Styling
  style?: {
    stroke?: string;
    strokeWidth?: number;
    strokeDasharray?: string;
  };
}

// React Flow node types with our custom data
export type DagNode = Node<DagNodeData>;
export type DagEdge = Edge<DagEdgeData>;

// Circuit DAG structure
export interface CircuitDag {
  nodes: DagNode[];
  edges: DagEdge[];
  metadata: {
    totalNodes: number;
    totalEdges: number;
    acirNodes: number;
    brilligNodes: number;
    blackboxNodes: number;
    totalComplexity: {
      gates: number;
      opcodes: number;
      cost: number;
    };
  };
}

// ACIR parsing structures
export interface AcirInstruction {
  opcode: string;
  inputs?: number[];
  outputs?: number[];
  expression?: string;
  sourceLocation?: {
    line: number;
    column?: number;
  };
}

export interface BrilligInstruction {
  instruction: string;
  registers?: number[];
  memoryAccess?: {
    address: number;
    size: number;
  };
  sourceLocation?: {
    line: number;
    column?: number;
  };
}

// Filter and search types
export interface DagFilters {
  nodeTypes: Set<DagNodeType>;
  opTypes: Set<AcirOpType>;
  complexityRange: {
    min: number;
    max: number;
  };
  showOnlySourceMapped: boolean;
  functionFilter?: string;
  searchQuery?: string;
}

export interface DagSearchResult {
  node: DagNode;
  matchType: 'name' | 'operation' | 'witness' | 'source';
  score: number;
}

// Layout configuration
export interface DagLayoutConfig {
  algorithm: 'dagre' | 'elk' | 'force' | 'hierarchical';
  direction: 'TB' | 'BT' | 'LR' | 'RL';
  nodeSpacing: number;
  rankSpacing: number;
  autoFit: boolean;
}

// Export formats
export interface DagExportOptions {
  format: 'svg' | 'png' | 'json' | 'dot' | 'pdf';
  includeMetadata: boolean;
  includeComplexity: boolean;
  resolution?: number; // For image exports
}

// Analysis results
export interface DagAnalysis {
  criticalPath: DagNode[];
  bottlenecks: DagNode[];
  complexityHotspots: DagNode[];
  dataFlowPaths: {
    input: DagNode;
    output: DagNode;
    path: DagNode[];
    complexity: number;
  }[];
  statistics: {
    averageComplexity: number;
    maxComplexity: number;
    totalWitnesses: number;
    publicInputCount: number;
    functionCount: number;
  };
}