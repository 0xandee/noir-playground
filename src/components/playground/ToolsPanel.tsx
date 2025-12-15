import React from "react";
import { RefreshCw, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { CombinedComplexityPanel } from "../complexity-analysis/CombinedComplexityPanel";
import { BenchmarkPanel } from "../benchmark/BenchmarkPanel";
import { DebugControlPanel, InspectorPanel } from "../debug";
import { ProfilerResult } from "@/services/NoirProfilerService";
import * as monaco from 'monaco-editor';

interface ToolsPanelProps {
  rightPanelView: 'inputs' | 'profiler' | 'benchmark' | 'inspector';
  setRightPanelView: (view: 'inputs' | 'profiler' | 'benchmark' | 'inspector') => void;
  rightPanelWidth: number;
  rightPanelRef: React.RefObject<HTMLDivElement>;
  inputs: Record<string, string>;
  parameterOrder: string[];
  inputValidationErrors: Record<string, string>;
  handleInputChange: (key: string, value: string) => void;
  inputTypes: Record<string, { type: string; isPublic: boolean; isArray?: boolean; arrayLength?: number }>;
  proofData: {
    proof?: Uint8Array;
    witness?: Uint8Array;
    publicInputs?: string[];
    executionTime?: number;
    returnValue?: string;
  } | null;
  handleCopyField: (content: string) => void;
  files: Record<string, string>;
  activeFile: string;
  monacoEditorRef: React.MutableRefObject<monaco.editor.IStandaloneCodeEditor | null>;
  enableHeatmap: boolean;
  setEnableHeatmap: (enabled: boolean) => void;
  complexityViewMode: 'metrics' | 'flamegraph' | 'insights';
  setComplexityViewMode: (mode: 'metrics' | 'flamegraph' | 'insights') => void;
  isComplexityProfiling: boolean;
  setIsComplexityProfiling: (isProfiling: boolean) => void;
  complexityProfilerResult: ProfilerResult | null;
  setComplexityProfilerResult: (result: ProfilerResult | null) => void;
  handleComplexityRefresh: () => void;
  addConsoleMessage: (type: 'error' | 'success' | 'info', message: string) => void;
  clearConsoleMessages: () => void;
  isRunning: boolean;
  isMobile?: boolean;
}

export const ToolsPanel: React.FC<ToolsPanelProps> = ({
  rightPanelView,
  setRightPanelView,
  rightPanelWidth,
  rightPanelRef,
  inputs,
  parameterOrder,
  inputValidationErrors,
  handleInputChange,
  inputTypes,
  proofData,
  handleCopyField,
  files,
  activeFile,
  monacoEditorRef,
  enableHeatmap,
  setEnableHeatmap,
  complexityViewMode,
  setComplexityViewMode,
  isComplexityProfiling,
  setIsComplexityProfiling,
  complexityProfilerResult,
  setComplexityProfilerResult,
  handleComplexityRefresh,
  addConsoleMessage,
  clearConsoleMessages,
  isRunning,
  isMobile = false
}) => {
  const rightPanelTabs = [
    { value: 'inputs' as const, label: 'Input/Output' },
    { value: 'inspector' as const, label: 'Debugger' },
    { value: 'profiler' as const, label: 'Profiler' },
    { value: 'benchmark' as const, label: 'Benchmark' }
  ];

  const formatParameterType = (paramName: string): string => {
    const typeInfo = inputTypes[paramName];
    if (!typeInfo) return "Field";
    const visibility = typeInfo.isPublic ? "pub " : "";
    return `${visibility}${typeInfo.type}`;
  };

  return (
    <section className="h-full flex flex-col" aria-label="Right Panel" ref={rightPanelRef}>
      <header className="flex items-center justify-between px-4 py-2 h-[49px] border-b border-border select-none" style={{ backgroundColor: 'rgb(30, 30, 30)' }}>
        <div className="flex items-stretch h-full overflow-x-auto rounded-sm tab-scrollbar" style={{ backgroundColor: '#191819' }}>
          {rightPanelTabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setRightPanelView(tab.value)}
              className={`px-4 h-full flex items-center justify-center whitespace-nowrap rounded-sm transition-all duration-200 ${rightPanelView === tab.value
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
                }`}
              style={{ fontSize: '13px' }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>
      <div className="overflow-y-auto flex-1 min-h-0" style={{ backgroundColor: '#100E0F' }}>
        {/* Inputs Panel */}
        <div className={rightPanelView === 'inputs' ? 'block' : 'hidden'}>
          <div className="p-4">
            {/* Inputs Section */}
            <div className="mb-6">
              <h3 className="font-semibold mb-4 text-foreground select-none" style={{ fontSize: '13px' }}>Inputs</h3>
              {parameterOrder.length === 0 ? (
                <div className="bg-muted/50 border border-border p-3 rounded font-mono text-muted-foreground" style={{ fontSize: '13px' }}>
                  No inputs
                </div>
              ) : (
                <div className="space-y-4">
                  {parameterOrder.map((key) => (
                    <div key={key}>
                      <label className="font-medium mb-2 block select-none text-muted-foreground" style={{ fontSize: '13px' }}>{key}: {formatParameterType(key)}</label>
                      <input
                        type="text"
                        inputMode={inputTypes[key].type.includes('Field') || inputTypes[key].type.includes('u') || inputTypes[key].type.includes('i') ? "decimal" : "text"}
                        value={inputs[key] || ''}
                        onChange={(e) => handleInputChange(key, e.target.value)}
                        className={`w-full px-3 py-3 bg-muted/50 rounded focus:outline-none ring-1 transition-colors font-mono ${inputValidationErrors[key]
                          ? 'border-red-500/50 focus:ring-red-500/50'
                          : 'border-border ring-border'
                          }`}
                        style={{ fontSize: '13px' }}
                        disabled={isRunning}
                      />
                      {inputValidationErrors[key] && (
                        <p className="text-red-400 mt-1 select-none" style={{ fontSize: '13px' }}>{inputValidationErrors[key]}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Visual Separator */}
            <div className="border-t border-border my-4"></div>

            {/* Outputs Section */}
            <div>
              <h3 className="font-semibold mb-4 text-foreground select-none" style={{ fontSize: '13px' }}>Outputs</h3>
              {proofData ? (
                <div className="space-y-4">
                  {proofData.publicInputs && proofData.publicInputs.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium select-none text-muted-foreground" style={{ fontSize: '13px' }}>Public Inputs</h3>
                        <button
                          onClick={() => handleCopyField(proofData.publicInputs!.join('\n'))}
                          className="text-muted-foreground hover:text-foreground transition-colors p-1"
                          title="Copy to clipboard"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="bg-muted/50 border border-border rounded">
                        <div className="p-3 font-mono space-y-1 overflow-x-auto output-scrollbar" style={{ fontSize: '13px' }}>
                          {proofData.publicInputs.map((input: string, i: number) => (
                            <div key={i}>{input}</div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {proofData.returnValue && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium select-none text-muted-foreground" style={{ fontSize: '13px' }}>Return Value</h3>
                        <button
                          onClick={() => handleCopyField(proofData.returnValue!)}
                          className="text-muted-foreground hover:text-foreground transition-colors p-1"
                          title="Copy to clipboard"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="bg-muted/50 border border-border rounded">
                        <div className="p-3 font-mono overflow-x-auto whitespace-nowrap output-scrollbar" style={{ fontSize: '13px' }}>
                          {proofData.returnValue}
                        </div>
                      </div>
                    </div>
                  )}

                  {proofData.witness && proofData.witness.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium select-none text-muted-foreground" style={{ fontSize: '13px' }}>Witness</h3>
                        <button
                          onClick={() => handleCopyField(Array.from(proofData.witness!).map((b: number) => b.toString(16).padStart(2, '0')).join(''))}
                          className="text-muted-foreground hover:text-foreground transition-colors p-1"
                          title="Copy to clipboard"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="bg-muted/50 border border-border rounded">
                        <div className="p-3 font-mono overflow-x-auto whitespace-nowrap output-scrollbar" style={{ fontSize: '13px' }}>
                          {Array.from(proofData.witness).map((b: number) => b.toString(16).padStart(2, '0')).join('')}
                        </div>
                      </div>
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium select-none text-muted-foreground" style={{ fontSize: '13px' }}>Proof</h3>
                      {proofData.proof && proofData.proof.length > 0 && (
                        <button
                          onClick={() => handleCopyField(Array.from(proofData.proof!).map((b: number) => b.toString(16).padStart(2, '0')).join(''))}
                          className="text-muted-foreground hover:text-foreground transition-colors p-1"
                          title="Copy to clipboard"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    <div className="bg-muted/50 border border-border rounded">
                      <div className="p-3 font-mono overflow-x-auto whitespace-nowrap output-scrollbar" style={{ fontSize: '13px' }}>
                        {proofData.proof && proofData.proof.length > 0
                          ? Array.from(proofData.proof).map((b: number) => b.toString(16).padStart(2, '0')).join('')
                          : 'No proof generated'}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium mb-2 select-none text-muted-foreground" style={{ fontSize: '13px' }}>Public Inputs</h3>
                    <div className="bg-muted/50 border border-border p-3 rounded font-mono text-muted-foreground" style={{ fontSize: '13px' }}>
                      No public inputs
                    </div>
                  </div>
                  <div>
                    <h3 className="font-medium mb-2 select-none text-muted-foreground" style={{ fontSize: '13px' }}>Return Value</h3>
                    <div className="bg-muted/50 border border-border p-3 rounded font-mono text-muted-foreground" style={{ fontSize: '13px' }}>
                      No return value
                    </div>
                  </div>
                  <div>
                    <h3 className="font-medium mb-2 select-none text-muted-foreground" style={{ fontSize: '13px' }}>Witness</h3>
                    <div className="bg-muted/50 border border-border p-3 rounded font-mono text-muted-foreground" style={{ fontSize: '13px' }}>
                      No witness data
                    </div>
                  </div>
                  <div>
                    <h3 className="font-medium mb-2 select-none text-muted-foreground" style={{ fontSize: '13px' }}>Proof</h3>
                    <div className="bg-muted/50 border border-border p-3 rounded font-mono text-muted-foreground" style={{ fontSize: '13px' }}>
                      No proof generated
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Profiler Panel */}
        <div className={rightPanelView === 'profiler' ? 'block' : 'hidden'}>
          <div className="flex flex-col">
            {/* Profiler Controls */}
            <div className="px-2 sm:px-4 py-3 border-b border-border bg-transparent">
              {/* Single row layout for normal width, 2-row for narrow */}
              <div className={`${rightPanelWidth > 320 && !isMobile ? 'flex' : 'hidden'} items-center justify-between`}>
                {/* Normal width: Single row layout */}
                <Button
                  onClick={handleComplexityRefresh}
                  disabled={isComplexityProfiling}
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 flex-shrink-0"
                >
                  <RefreshCw className={`h-3 w-3 ${isComplexityProfiling ? 'animate-spin' : ''}`} />
                </Button>

                <div className="flex items-stretch h-8 rounded-sm overflow-hidden" style={{ backgroundColor: '#191819' }}>
                  <button
                    onClick={() => setComplexityViewMode('metrics')}
                    className={`px-4 h-full flex items-center justify-center whitespace-nowrap rounded-sm transition-all duration-200 ${complexityViewMode === 'metrics'
                      ? 'text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                      }`}
                    style={{ fontSize: '13px', ...(complexityViewMode === 'metrics' ? { backgroundColor: '#1e1e1e' } : {}) }}
                  >
                    Metrics
                  </button>
                  <button
                    onClick={() => setComplexityViewMode('insights')}
                    className={`px-4 h-full flex items-center justify-center whitespace-nowrap rounded-sm transition-all duration-200 ${complexityViewMode === 'insights'
                      ? 'text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                      }`}
                    style={{ fontSize: '13px', ...(complexityViewMode === 'insights' ? { backgroundColor: '#1e1e1e' } : {}) }}
                  >
                    Insights
                  </button>
                  <button
                    onClick={() => setComplexityViewMode('flamegraph')}
                    className={`px-4 h-full flex items-center justify-center whitespace-nowrap rounded-sm transition-all duration-200 ${complexityViewMode === 'flamegraph'
                      ? 'text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                      }`}
                    style={{ fontSize: '13px', ...(complexityViewMode === 'flamegraph' ? { backgroundColor: '#1e1e1e' } : {}) }}
                  >
                    Flamegraph
                  </button>
                </div>

                <div className="flex items-center gap-2 select-none flex-shrink-0" style={{ fontSize: '13px' }}>
                  <Switch
                    checked={enableHeatmap}
                    onCheckedChange={setEnableHeatmap}
                    className="scale-75"
                  />
                  <span className="text-foreground">Heatmap</span>
                </div>
              </div>

              {/* Narrow width: Two row layout */}
              <div className={`${rightPanelWidth <= 320 || isMobile ? 'block' : 'hidden'} space-y-2`}>
                <div className="flex items-center justify-between">
                  <Button
                    onClick={handleComplexityRefresh}
                    disabled={isComplexityProfiling}
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2"
                  >
                    <RefreshCw className={`h-3 w-3 mr-1 ${isComplexityProfiling ? 'animate-spin' : ''}`} />
                    <span className="text-xs">Refresh</span>
                  </Button>

                  <div className="flex items-center gap-2 select-none" style={{ fontSize: '13px' }}>
                    <Switch
                      checked={enableHeatmap}
                      onCheckedChange={setEnableHeatmap}
                      className="scale-75"
                    />
                    <span className="text-foreground">Heatmap</span>
                  </div>
                </div>

                <div className="flex justify-center overflow-x-auto">
                  <div className="flex items-stretch h-8 rounded-sm overflow-hidden" style={{ backgroundColor: '#191819' }}>
                    <button
                      onClick={() => setComplexityViewMode('metrics')}
                      className={`px-4 h-full flex items-center justify-center whitespace-nowrap rounded-sm transition-all duration-200 ${complexityViewMode === 'metrics'
                        ? 'text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                        }`}
                      style={{ fontSize: '13px', ...(complexityViewMode === 'metrics' ? { backgroundColor: '#1e1e1e' } : {}) }}
                    >
                      Metrics
                    </button>
                    <button
                      onClick={() => setComplexityViewMode('insights')}
                      className={`px-4 h-full flex items-center justify-center whitespace-nowrap rounded-sm transition-all duration-200 ${complexityViewMode === 'insights'
                        ? 'text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                        }`}
                      style={{ fontSize: '13px', ...(complexityViewMode === 'insights' ? { backgroundColor: '#1e1e1e' } : {}) }}
                    >
                      Insights
                    </button>
                    <button
                      onClick={() => setComplexityViewMode('flamegraph')}
                      className={`px-4 h-full flex items-center justify-center whitespace-nowrap rounded-sm transition-all duration-200 ${complexityViewMode === 'flamegraph'
                        ? 'text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                        }`}
                      style={{ fontSize: '13px', ...(complexityViewMode === 'flamegraph' ? { backgroundColor: '#1e1e1e' } : {}) }}
                    >
                      Flamegraph
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Complexity Analysis Panel */}
            <div>
              <CombinedComplexityPanel
                sourceCode={files[activeFile] || ''}
                cargoToml={files['Nargo.toml'] || ''}
                className=""
                enableHeatmap={enableHeatmap}
                viewMode={complexityViewMode}
                onViewModeChange={setComplexityViewMode}
                isProfiling={isComplexityProfiling}
                onProfilingStart={() => setIsComplexityProfiling(true)}
                onProfilingComplete={(result) => {
                  setComplexityProfilerResult(result);
                  setIsComplexityProfiling(false);
                }}
                onProfilingError={() => setIsComplexityProfiling(false)}
                profilerResult={complexityProfilerResult}
                onLineClick={(lineNumber) => {
                  if (monacoEditorRef.current) {
                    monacoEditorRef.current.setPosition({ lineNumber, column: 1 });
                    monacoEditorRef.current.focus();
                  }
                }}
              />
            </div>
          </div>
        </div>

        {/* Benchmark Panel */}
        <div className={rightPanelView === 'benchmark' ? 'block' : 'hidden'}>
          <BenchmarkPanel
            sourceCode={files["main.nr"]}
            inputs={inputs}
            cargoToml={files["Nargo.toml"]}
            onConsoleMessage={addConsoleMessage}
            onClearConsole={clearConsoleMessages}
          />
        </div>

        {/* Inspector Panel */}
        <div className={rightPanelView === 'inspector' ? 'block h-full flex flex-col' : 'hidden'}>
          <DebugControlPanel
            sourceCode={files["main.nr"]}
            cargoToml={files["Nargo.toml"]}
            inputs={inputs}
          />
          <InspectorPanel className="flex-1" />
        </div>
      </div>
    </section>
  );
};

