import React, { useState, useEffect, useCallback, useMemo } from 'react';
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
  Connection,
  NodeTypes,
  EdgeTypes,
  ReactFlowProvider,
  useReactFlow,
  Panel
} from 'reactflow';
import 'reactflow/dist/style.css';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  Search,
  Filter,
  Download,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Eye,
  EyeOff,
  RotateCcw
} from 'lucide-react';

import { AcirDagService } from '@/services/AcirDagService';
import {
  CircuitDag,
  DagNode,
  DagEdge,
  DagFilters,
  DagNodeType,
  AcirOpType,
  DagLayoutConfig
} from '@/types/dagTypes';
import { ProgramCompilationArtifacts } from '@noir-lang/noir_wasm';

// Custom node components
const DagNodeComponent: React.FC<{ data: any }> = ({ data }) => {
  const { label, operation, nodeType, complexity, style } = data;

  return (
    <div
      className="px-3 py-2 shadow-md rounded-md border-2 min-w-[120px] text-center"
      style={{
        backgroundColor: style?.backgroundColor || '#ffffff',
        borderColor: style?.borderColor || '#e5e7eb',
        color: style?.color || '#000000'
      }}
    >
      <div className="font-semibold text-sm">{label}</div>
      {operation && operation !== label && (
        <div className="text-xs opacity-80 mt-1 truncate" title={operation}>
          {operation}
        </div>
      )}
      {complexity && (
        <div className="text-xs mt-1">
          <Badge variant="secondary" className="text-[10px] px-1 py-0">
            {complexity.gates}g
          </Badge>
        </div>
      )}
    </div>
  );
};

const nodeTypes: NodeTypes = {
  default: DagNodeComponent,
  input: DagNodeComponent,
  output: DagNodeComponent
};

interface AcirDagViewerProps {
  compilationArtifacts?: ProgramCompilationArtifacts;
  sourceCode?: string;
  onNodeClick?: (nodeId: string, sourceLocation?: { line: number; column?: number }) => void;
  className?: string;
  isVisible?: boolean;
}

const AcirDagViewerContent: React.FC<AcirDagViewerProps> = ({
  compilationArtifacts,
  sourceCode,
  onNodeClick,
  className = '',
  isVisible = true
}) => {
  const [dag, setDag] = useState<CircuitDag | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Filter state
  const [filters, setFilters] = useState<DagFilters>({
    nodeTypes: new Set(['acir', 'brillig', 'blackbox', 'input', 'output']),
    opTypes: new Set(['arithmetic', 'blackbox', 'memory', 'brillig', 'directive', 'assertion', 'function_call', 'return', 'unknown']),
    complexityRange: { min: 0, max: 1000 },
    showOnlySourceMapped: false,
    searchQuery: ''
  });

  const dagService = useMemo(() => new AcirDagService(), []);
  const { fitView, zoomIn, zoomOut } = useReactFlow();

  // Parse DAG when compilation artifacts change
  useEffect(() => {
    if (!compilationArtifacts || !isVisible) return;

    const parseDag = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const circuitDag = await dagService.parseCircuitDag(compilationArtifacts, sourceCode);
        setDag(circuitDag);

        // Apply initial layout
        const layoutedNodes = applyLayout(circuitDag.nodes, circuitDag.edges);
        setNodes(layoutedNodes);
        setEdges(circuitDag.edges);

        // Fit view after nodes are set
        setTimeout(() => fitView(), 100);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to parse circuit DAG';
        setError(errorMsg);
        console.error('DAG parsing error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    parseDag();
  }, [compilationArtifacts, sourceCode, isVisible, dagService, fitView]);

  // Apply search and filters
  useEffect(() => {
    if (!dag) return;

    const updatedFilters = { ...filters, searchQuery };
    const filteredDag = dagService.filterDag(dag, updatedFilters);

    const layoutedNodes = applyLayout(filteredDag.nodes, filteredDag.edges);
    setNodes(layoutedNodes);
    setEdges(filteredDag.edges);
  }, [dag, filters, searchQuery, dagService]);

  // Simple dagre-like layout algorithm
  const applyLayout = (dagNodes: DagNode[], dagEdges: DagEdge[]): DagNode[] => {
    if (dagNodes.length === 0) return [];

    // Simple hierarchical layout
    const nodeSpacing = 200;
    const rankSpacing = 150;
    const ranks = new Map<string, number>();

    // Calculate ranks (simplified topological sort)
    const visited = new Set<string>();
    const calculateRank = (nodeId: string, currentRank = 0): number => {
      if (visited.has(nodeId)) return ranks.get(nodeId) || 0;

      visited.add(nodeId);
      const incomingEdges = dagEdges.filter(e => e.target === nodeId);

      if (incomingEdges.length === 0) {
        ranks.set(nodeId, 0);
        return 0;
      }

      const maxParentRank = Math.max(
        ...incomingEdges.map(e => calculateRank(e.source, currentRank + 1))
      );

      const rank = maxParentRank + 1;
      ranks.set(nodeId, rank);
      return rank;
    };

    dagNodes.forEach(node => calculateRank(node.id));

    // Group nodes by rank
    const rankGroups = new Map<number, DagNode[]>();
    dagNodes.forEach(node => {
      const rank = ranks.get(node.id) || 0;
      if (!rankGroups.has(rank)) rankGroups.set(rank, []);
      rankGroups.get(rank)!.push(node);
    });

    // Position nodes
    return dagNodes.map(node => {
      const rank = ranks.get(node.id) || 0;
      const nodesInRank = rankGroups.get(rank) || [];
      const indexInRank = nodesInRank.findIndex(n => n.id === node.id);
      const totalInRank = nodesInRank.length;

      const x = (indexInRank - (totalInRank - 1) / 2) * nodeSpacing;
      const y = rank * rankSpacing;

      return {
        ...node,
        position: { x, y }
      };
    });
  };

  const handleNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    const sourceLocation = node.data.sourceLocation;
    if (onNodeClick && sourceLocation) {
      onNodeClick(node.id, sourceLocation);
    }
  }, [onNodeClick]);

  const handleFilterChange = (key: keyof DagFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const toggleNodeType = (nodeType: DagNodeType) => {
    setFilters(prev => {
      const newNodeTypes = new Set(prev.nodeTypes);
      if (newNodeTypes.has(nodeType)) {
        newNodeTypes.delete(nodeType);
      } else {
        newNodeTypes.add(nodeType);
      }
      return { ...prev, nodeTypes: newNodeTypes };
    });
  };

  const resetFilters = () => {
    setFilters({
      nodeTypes: new Set(['acir', 'brillig', 'blackbox', 'input', 'output']),
      opTypes: new Set(['arithmetic', 'blackbox', 'memory', 'brillig', 'directive', 'assertion', 'function_call', 'return', 'unknown']),
      complexityRange: { min: 0, max: 1000 },
      showOnlySourceMapped: false,
      searchQuery: ''
    });
    setSearchQuery('');
  };

  if (!isVisible) return null;

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center h-96 ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
          <p className="text-sm text-gray-600">Parsing circuit DAG...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center h-96 ${className}`}>
        <Card className="w-96">
          <CardHeader>
            <CardTitle className="text-red-600">DAG Parsing Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">{error}</p>
            <p className="text-xs text-gray-500">
              Make sure the circuit compiles successfully before viewing the DAG.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!dag || dag.nodes.length === 0) {
    return (
      <div className={`flex items-center justify-center h-96 ${className}`}>
        <Card className="w-96">
          <CardHeader>
            <CardTitle className="text-gray-600">No Circuit DAG</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              Compile a Noir program to see its circuit DAG visualization.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={`relative h-full w-full ${className}`}>
      {/* Controls Panel */}
      <Panel position="top-left" className="bg-white rounded-lg shadow-lg border p-3 m-2">
        <div className="flex flex-col gap-2">
          {/* Search */}
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-gray-500" />
            <Input
              placeholder="Search nodes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-48 h-8 text-sm"
            />
          </div>

          {/* Quick Filters */}
          <div className="flex items-center gap-2">
            <Button
              variant={showFilters ? "default" : "outline"}
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="w-4 h-4 mr-1" />
              Filters
            </Button>
            <Button variant="outline" size="sm" onClick={resetFilters}>
              <RotateCcw className="w-4 h-4 mr-1" />
              Reset
            </Button>
          </div>

          {/* Node Type Toggles */}
          <div className="flex flex-wrap gap-1">
            {['acir', 'brillig', 'blackbox', 'input', 'output'].map((type) => (
              <Badge
                key={type}
                variant={filters.nodeTypes.has(type as DagNodeType) ? "default" : "outline"}
                className="cursor-pointer text-xs px-2 py-1"
                onClick={() => toggleNodeType(type as DagNodeType)}
              >
                {type}
              </Badge>
            ))}
          </div>
        </div>
      </Panel>

      {/* Statistics Panel */}
      <Panel position="top-right" className="bg-white rounded-lg shadow-lg border p-3 m-2">
        <div className="text-sm">
          <div className="font-semibold mb-2">Circuit Statistics</div>
          <div className="space-y-1 text-xs">
            <div>Nodes: {dag.metadata.totalNodes}</div>
            <div>Edges: {dag.metadata.totalEdges}</div>
            <div>ACIR: {dag.metadata.acirNodes}</div>
            <div>Brillig: {dag.metadata.brilligNodes}</div>
            <div>Gates: {dag.metadata.totalComplexity.gates}</div>
          </div>
        </div>
      </Panel>

      {/* React Flow */}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.1 }}
        className="bg-gray-50"
      >
        <Controls
          position="bottom-right"
          showInteractive={false}
        />
        <MiniMap
          position="bottom-left"
          nodeStrokeColor="#374151"
          nodeColor={(node) => node.data.style?.backgroundColor || '#e5e7eb'}
          nodeBorderRadius={4}
        />
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="#e5e7eb"
        />
      </ReactFlow>
    </div>
  );
};

export const AcirDagViewer: React.FC<AcirDagViewerProps> = (props) => {
  return (
    <ReactFlowProvider>
      <AcirDagViewerContent {...props} />
    </ReactFlowProvider>
  );
};