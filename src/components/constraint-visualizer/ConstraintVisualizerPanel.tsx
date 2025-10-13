/**
 * Constraint Visualizer Panel
 * Shows code-to-constraint mapping with split-screen layout
 */

import { useState, useEffect, useRef } from 'react';
import { RefreshCw, Info, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { constraintMappingService } from '@/services/ConstraintMappingService';
import { NoirProfilerService } from '@/services/NoirProfilerService';
import type { LineConstraintMapping, AcirOpcodeInfo } from '@/types/witness';

interface ConstraintVisualizerPanelProps {
  sourceCode: string;
  cargoToml?: string;
  className?: string;
}

export const ConstraintVisualizerPanel: React.FC<ConstraintVisualizerPanelProps> = ({
  sourceCode,
  cargoToml,
  className = '',
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lineMapping, setLineMapping] = useState<LineConstraintMapping[]>([]);
  const [selectedLine, setSelectedLine] = useState<number | null>(null);

  // Profiler service instance
  const profilerServiceRef = useRef<NoirProfilerService | null>(null);
  if (!profilerServiceRef.current) {
    profilerServiceRef.current = new NoirProfilerService();
  }

  const handleAnalyze = async () => {
    if (!sourceCode.trim()) {
      setError('No source code to analyze');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Profile the circuit to get line-by-line data
      const profilerResult = await profilerServiceRef.current!.profileCircuit({
        sourceCode: sourceCode.trim(),
        cargoToml: cargoToml || undefined
      });

      // Check for errors in the result
      if (profilerResult.error) {
        throw new Error(profilerResult.error);
      }

      // Parse profiler output to extract line mappings
      const mappings = constraintMappingService.parseProfilerData(
        profilerResult,
        sourceCode
      );

      setLineMapping(mappings);

      // Auto-select first line with constraints
      const firstLine = mappings.find(m => m.constraintCount > 0);
      if (firstLine) {
        setSelectedLine(firstLine.line);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLineClick = (lineNumber: number) => {
    setSelectedLine(lineNumber);
  };

  const selectedMapping = lineMapping.find(m => m.line === selectedLine);
  const sourceLines = sourceCode.split('\n');

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header with Controls */}
      <div className="px-4 py-3 border-b border-border bg-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              onClick={handleAnalyze}
              disabled={loading}
              variant="ghost"
              size="sm"
              className="h-7 px-2"
              title="Analyze constraints"
            >
              <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <span className="text-xs text-muted-foreground select-none">
              {lineMapping.length > 0
                ? `${lineMapping.filter(m => m.constraintCount > 0).length} lines with constraints`
                : 'Not analyzed'}
            </span>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden flex">
        {error && (
          <div className="flex-1 p-4">
            <div className="bg-red-500/10 border border-red-500/20 rounded p-3">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-red-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {loading && (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <RefreshCw className="h-6 w-6 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Analyzing constraints...</p>
            </div>
          </div>
        )}

        {!loading && !error && lineMapping.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
            <Info className="h-8 w-8 text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground mb-2">No analysis available</p>
            <p className="text-xs text-muted-foreground/70">
              Click the refresh button to analyze code-to-constraint mapping
            </p>
          </div>
        )}

        {!loading && !error && lineMapping.length > 0 && (
          <div className="flex-1 flex">
            {/* Left: Source Code with Line Numbers */}
            <div className="flex-1 border-r border-border overflow-y-auto bg-muted/10">
              <div className="p-2">
                <h3 className="text-xs font-medium text-muted-foreground mb-2 px-2 select-none">
                  Source Code
                </h3>
                <div className="space-y-0">
                  {sourceLines.map((line, idx) => {
                    const lineNum = idx + 1;
                    const mapping = lineMapping.find(m => m.line === lineNum);
                    const isSelected = lineNum === selectedLine;
                    const hasConstraints = mapping && mapping.constraintCount > 0;

                    return (
                      <div
                        key={lineNum}
                        onClick={() => hasConstraints && handleLineClick(lineNum)}
                        className={`flex items-start font-mono text-xs border-l-2 transition-colors ${
                          isSelected
                            ? 'bg-primary/20 border-primary'
                            : hasConstraints
                            ? 'hover:bg-muted/50 border-transparent cursor-pointer'
                            : 'border-transparent'
                        }`}
                      >
                        <span className={`px-2 py-1 w-12 text-right select-none ${
                          hasConstraints ? 'text-foreground' : 'text-muted-foreground'
                        }`}>
                          {lineNum}
                        </span>
                        <div className="flex-1 px-2 py-1 overflow-x-auto">
                          <code className={hasConstraints ? 'text-foreground' : 'text-muted-foreground'}>
                            {line || ' '}
                          </code>
                        </div>
                        {hasConstraints && (
                          <div className="px-2 py-1">
                            <span className="text-xs text-primary">
                              {mapping.constraintCount}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right: Constraint Details */}
            <div className="w-1/2 overflow-y-auto bg-background p-4">
              <h3 className="text-xs font-medium text-muted-foreground mb-3 select-none">
                ACIR Constraints
              </h3>

              {!selectedMapping ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <ChevronRight className="h-8 w-8 text-muted-foreground/50 mb-3" />
                  <p className="text-sm text-muted-foreground mb-2">No line selected</p>
                  <p className="text-xs text-muted-foreground/70">
                    Click a line in the source code to see its constraints
                  </p>
                </div>
              ) : selectedMapping.constraintCount === 0 ? (
                <div className="bg-muted/30 border border-border rounded p-3">
                  <p className="text-xs text-muted-foreground">
                    This line does not generate any constraints
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Line Info */}
                  <div className="bg-muted/30 border border-border rounded p-3">
                    <div className="flex items-start gap-2 mb-2">
                      <span className="text-xs text-muted-foreground select-none">Line {selectedMapping.line}:</span>
                      <code className="text-xs font-mono text-foreground flex-1">
                        {selectedMapping.sourceCode.trim()}
                      </code>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Generates <span className="text-foreground font-medium">{selectedMapping.constraintCount}</span> constraint(s)
                    </div>
                  </div>

                  {/* Witness Information */}
                  {(selectedMapping.witnessesCreated.length > 0 || selectedMapping.witnessesUsed.length > 0) && (
                    <div className="space-y-2">
                      {selectedMapping.witnessesCreated.length > 0 && (
                        <div className="bg-green-500/10 border border-green-500/20 rounded p-2">
                          <div className="text-xs font-medium text-green-400 mb-1 select-none">
                            Creates Witnesses:
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {selectedMapping.witnessesCreated.map(w => (
                              <span key={w} className="px-2 py-0.5 bg-green-500/20 rounded font-mono text-xs text-green-400">
                                _{w}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {selectedMapping.witnessesUsed.length > 0 && (
                        <div className="bg-blue-500/10 border border-blue-500/20 rounded p-2">
                          <div className="text-xs font-medium text-blue-400 mb-1 select-none">
                            Uses Witnesses:
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {selectedMapping.witnessesUsed.map(w => (
                              <span key={w} className="px-2 py-0.5 bg-blue-500/20 rounded font-mono text-xs text-blue-400">
                                _{w}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ACIR Opcodes */}
                  {selectedMapping.opcodes.length > 0 && (
                    <div>
                      <h4 className="text-xs font-medium text-foreground mb-2 select-none">
                        ACIR Opcodes:
                      </h4>
                      <div className="space-y-2">
                        {selectedMapping.opcodes.map((opcode, idx) => (
                          <div key={idx} className="bg-muted/30 border border-border rounded p-2">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-mono text-primary">{opcode.index}</span>
                              <span className="text-xs font-medium text-foreground">{opcode.type}</span>
                              {opcode.operation && (
                                <span className="text-xs text-muted-foreground">({opcode.operation})</span>
                              )}
                            </div>
                            {opcode.inputs.length > 0 && (
                              <div className="text-xs text-muted-foreground">
                                Inputs: {opcode.inputs.join(', ')}
                              </div>
                            )}
                            {opcode.outputs.length > 0 && (
                              <div className="text-xs text-muted-foreground">
                                Outputs: {opcode.outputs.join(', ')}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
