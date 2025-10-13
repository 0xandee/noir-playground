/**
 * Witness Inspector Panel Component
 * Displays witness values and code-to-constraint mapping
 */

import { useState, useEffect, useMemo } from 'react';
import { RefreshCw, Info, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { witnessInspectorService } from '@/services/WitnessInspectorService';
import { WitnessAnalysis, WitnessInfo, CompiledArtifact } from '@/types/witness';
import { noirServerCompiler } from '@/services/NoirServerCompiler';

interface WitnessInspectorPanelProps {
  sourceCode: string;
  cargoToml?: string;
  witness?: Uint8Array; // From execution result
  className?: string;
}

export const WitnessInspectorPanel: React.FC<WitnessInspectorPanelProps> = ({
  sourceCode,
  cargoToml,
  witness,
  className = '',
}) => {
  const [analysis, setAnalysis] = useState<WitnessAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [artifact, setArtifact] = useState<CompiledArtifact | null>(null);
  const [showPrivateWitnesses, setShowPrivateWitnesses] = useState(true);

  // Compile and analyze when source code changes
  const handleAnalyze = async () => {
    if (!sourceCode.trim()) {
      setError('No source code to analyze');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Compile the circuit to get artifact
      const result = await noirServerCompiler.compileProgram(
        sourceCode,
        cargoToml
      );

      if (!result.success || !result.program?.program) {
        throw new Error(result.error || 'Compilation failed');
      }

      const compiledArtifact = result.program.program as any;
      setArtifact(compiledArtifact);

      // Analyze the artifact
      const witnessAnalysis = witnessInspectorService.analyzeArtifact(
        compiledArtifact,
        sourceCode,
        witness
      );

      setAnalysis(witnessAnalysis);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  // Filter witnesses based on visibility toggle
  const displayedWitnesses = useMemo(() => {
    if (!analysis) return [];
    if (showPrivateWitnesses) return analysis.witnesses;
    return analysis.witnesses.filter((w) => w.visibility === 'public');
  }, [analysis, showPrivateWitnesses]);

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
              title="Analyze circuit"
            >
              <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <span className="text-xs text-muted-foreground select-none">
              {analysis ? `${analysis.totalWitnesses} witnesses` : 'Not analyzed'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPrivateWitnesses(!showPrivateWitnesses)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded"
              title={showPrivateWitnesses ? 'Hide private witnesses' : 'Show private witnesses'}
            >
              {showPrivateWitnesses ? (
                <Eye className="h-3 w-3" />
              ) : (
                <EyeOff className="h-3 w-3" />
              )}
              <span className="select-none">Private</span>
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded p-3 mb-4">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-red-400 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            </div>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-3">
              <RefreshCw className="h-6 w-6 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Analyzing circuit...</p>
            </div>
          </div>
        )}

        {!loading && !analysis && !error && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Info className="h-8 w-8 text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground mb-2">No analysis available</p>
            <p className="text-xs text-muted-foreground/70">
              Click the refresh button to analyze your circuit
            </p>
          </div>
        )}

        {!loading && analysis && (
          <div className="space-y-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-muted/30 border border-border rounded-lg p-3">
                <div className="text-xs text-muted-foreground mb-1 select-none">Total Witnesses</div>
                <div className="text-2xl font-semibold text-foreground">
                  {analysis.totalWitnesses}
                </div>
              </div>
              <div className="bg-muted/30 border border-border rounded-lg p-3">
                <div className="text-xs text-muted-foreground mb-1 select-none">Public Outputs</div>
                <div className="text-2xl font-semibold text-foreground">
                  {analysis.outputCount}
                </div>
              </div>
            </div>

            {/* Witness Table */}
            <div>
              <h3 className="text-sm font-medium text-foreground mb-3 select-none">
                Witness Variables
              </h3>
              <div className="border border-border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground select-none">
                        Index
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground select-none">
                        Name
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground select-none">
                        Type
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground select-none">
                        Value
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground select-none">
                        Category
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {displayedWitnesses.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-3 py-6 text-center text-xs text-muted-foreground">
                          No witnesses to display
                        </td>
                      </tr>
                    ) : (
                      displayedWitnesses.map((w) => (
                        <tr
                          key={w.index}
                          className="hover:bg-muted/30 transition-colors"
                        >
                          <td className="px-3 py-2 font-mono text-xs text-foreground">
                            _{w.index}
                          </td>
                          <td className="px-3 py-2 text-xs text-foreground">
                            {w.name}
                          </td>
                          <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                            {w.type}
                          </td>
                          <td className="px-3 py-2 font-mono text-xs text-foreground">
                            {w.value ? (
                              <span className="text-green-400">{w.value}</span>
                            ) : (
                              <span className="text-muted-foreground italic">-</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-xs">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                w.category === 'input'
                                  ? 'bg-blue-500/10 text-blue-400'
                                  : w.category === 'output'
                                  ? 'bg-green-500/10 text-green-400'
                                  : 'bg-gray-500/10 text-gray-400'
                              }`}
                            >
                              {w.category}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ABI Information */}
            {artifact && artifact.abi && (
              <div>
                <h3 className="text-sm font-medium text-foreground mb-3 select-none">
                  Circuit ABI
                </h3>
                <div className="bg-muted/30 border border-border rounded-lg p-3">
                  <div className="space-y-2">
                    <div>
                      <span className="text-xs text-muted-foreground select-none">
                        Parameters:{' '}
                      </span>
                      <span className="text-xs font-mono text-foreground">
                        {artifact.abi.parameters?.length || 0}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground select-none">
                        Return Type:{' '}
                      </span>
                      <span className="text-xs font-mono text-foreground">
                        {artifact.abi.return_type?.abi_type?.kind || 'void'}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground select-none">
                        Bytecode Size:{' '}
                      </span>
                      <span className="text-xs font-mono text-foreground">
                        {artifact.bytecode?.length || 0} bytes
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Help Text */}
            <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1 text-xs text-blue-400/90 space-y-1">
                  <p className="select-none">
                    <strong>Witness Inspector</strong> shows the circuit's witness structure
                    from the compiled ACIR.
                  </p>
                  <p className="select-none mt-2">
                    • <strong>Input witnesses:</strong> Circuit parameters (x, y, etc.)
                  </p>
                  <p className="select-none">
                    • <strong>Output witnesses:</strong> Public return values
                  </p>
                  <p className="select-none">
                    • <strong>Intermediate witnesses:</strong> Computed during execution
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
