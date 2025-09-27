import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { CollapsiblePanel } from "@/components/ui/collapsible-panel";
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Download,
  Settings,
  Terminal,
  Cpu,
  Share,
  Flame,
  Target,
  Table,
  Activity,
  RefreshCw,
  CornerDownRight,
  Play,
  Link2,
} from "lucide-react";
import { BsTwitterX, BsGithub } from "react-icons/bs";
import { noirService, ExecutionStep } from "@/services/NoirService";
import { NoirEditor } from "./NoirEditor";
import { NoirEditorWithHover } from "./NoirEditorWithHover";
import { noirExamples, NoirExample } from "@/data/noirExamples";
import { ShareDialog } from "./ShareDialog";
import { CombinedComplexityPanel } from "./complexity-analysis/CombinedComplexityPanel";
import { CircuitComplexityReport, MetricType } from "@/types/circuitMetrics";
import { usePanelState } from "@/hooks/usePanelState";
import { ProfilerResult, NoirProfilerService } from "@/services/NoirProfilerService";
import * as monaco from 'monaco-editor';

interface CodePlaygroundProps {
  initialCode?: string;
  initialInputs?: Record<string, string>;
  initialProofData?: {
    proof?: Uint8Array;
    witness?: Uint8Array;
    publicInputs?: string[];
    executionTime?: number;
    returnValue?: string;
  };
  snippetTitle?: string;
  snippetId?: string;
}

const CodePlayground = (props: CodePlaygroundProps = {}) => {
  const { initialCode, initialInputs, initialProofData, snippetTitle, snippetId } = props;
  const [activeFile, setActiveFile] = useState("main.nr");
  const [files, setFiles] = useState({
    "main.nr": initialCode || `pub fn main(x: Field, y: pub Field) -> pub Field {
    // Verify that x and y are both non-zero
    assert(x != 0);
    assert(y != 0);
    
    // Compute the sum and verify it's greater than both inputs
    let sum = x + y;
    assert(sum as u64 > x as u64);
    assert(sum as u64 > y as u64);
    
    // Return the sum as proof output
    sum
}`
  });
  const [isRunning, setIsRunning] = useState(false);
  const [proveAndVerify, setProveAndVerify] = useState(true);
  const [executionSteps, setExecutionSteps] = useState<ExecutionStep[]>([]);
  const [proofData, setProofData] = useState<{
    proof?: Uint8Array;
    publicInputs?: string[];
    executionTime?: number;
    returnValue?: string;
    witness?: Uint8Array;
  } | null>(initialProofData || null);
  const [inputs, setInputs] = useState<Record<string, string>>(initialInputs || { x: "10", y: "25" });
  const [inputTypes, setInputTypes] = useState<Record<string, { type: string; isPublic: boolean; isArray?: boolean; arrayLength?: number }>>({
    x: { type: "Field", isPublic: false },
    y: { type: "Field", isPublic: true }
  });
  const [parameterOrder, setParameterOrder] = useState<string[]>(["x", "y"]);
  const [consoleMessages, setConsoleMessages] = useState<Array<{
    id: string;
    type: 'error' | 'success' | 'info';
    message: string;
    timestamp: string;
  }>>([]);
  const [inputValidationErrors, setInputValidationErrors] = useState<Record<string, string>>({});
  const [selectedExample, setSelectedExample] = useState<string>("playground");
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [rightPanelView, setRightPanelView] = useState<'inputs' | 'profiler'>('inputs');
  const [rightPanelWidth, setRightPanelWidth] = useState<number>(400); // Track right panel width
  const rightPanelRef = useRef<HTMLDivElement>(null);

  const rightPanelTabs = [
    { value: 'inputs' as const, label: 'Input/Output' },
    { value: 'profiler' as const, label: 'Profiler' }
  ];
  const stepQueueRef = useRef<ExecutionStep[]>([]);
  const stepTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const consoleRef = useRef<HTMLDivElement>(null);
  const monacoEditorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);

  // Heatmap-related state
  const [enableHeatmap, setEnableHeatmap] = useState<boolean>(false);
  const [heatmapMetricType, setHeatmapMetricType] = useState<MetricType>('acir');
  const [complexityReport, setComplexityReport] = useState<CircuitComplexityReport | null>(null);
  const [selectedHotspotLine, setSelectedHotspotLine] = useState<number | undefined>(undefined);

  // Panel collapse state
  const { panelState, togglePanel } = usePanelState();

  // Complexity panel state
  const [complexityViewMode, setComplexityViewMode] = useState<'metrics' | 'flamegraph'>('metrics');
  const [complexityProfilerResult, setComplexityProfilerResult] = useState<ProfilerResult | null>(null);
  const [isComplexityProfiling, setIsComplexityProfiling] = useState(false);

  // Profiler service instance
  const profilerServiceRef = useRef<NoirProfilerService | null>(null);
  if (!profilerServiceRef.current) {
    profilerServiceRef.current = new NoirProfilerService();
  }

  // Extract input types when initial code is provided
  useEffect(() => {
    if (initialCode) {
      const extracted = extractInputsFromCode(initialCode);
      setInputTypes(extracted.types);
      setParameterOrder(extracted.order);
    }
  }, [initialCode]);

  // Update URL when snippet ID is provided
  useEffect(() => {
    if (snippetId && window.location.pathname !== `/share/${snippetId}`) {
      window.history.replaceState(null, '', `/share/${snippetId}`);
    }
  }, [snippetId]);

  const addConsoleMessage = useCallback((type: 'error' | 'success' | 'info', message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const id = Date.now().toString();
    setConsoleMessages(prev => [...prev, { id, type, message, timestamp }]);
  }, []);

  const handleComplexityRefresh = useCallback(async () => {
    if (!files["main.nr"].trim() || isComplexityProfiling) {
      return;
    }

    setIsComplexityProfiling(true);
    try {
      const result = await profilerServiceRef.current!.profileCircuit({
        sourceCode: files["main.nr"].trim(),
        cargoToml: files["Nargo.toml"] || undefined
      });
      setComplexityProfilerResult(result);
    } catch (err) {
      addConsoleMessage('error', `Profiling failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsComplexityProfiling(false);
    }
  }, [files, isComplexityProfiling, addConsoleMessage]);

  // Trigger profiling when heatmap is enabled
  const prevEnableHeatmapRef = useRef(enableHeatmap);
  useEffect(() => {
    const wasHeatmapEnabled = prevEnableHeatmapRef.current;
    prevEnableHeatmapRef.current = enableHeatmap;

    // Only trigger profiling if heatmap was just turned on (false -> true) and we have code
    if (!wasHeatmapEnabled && enableHeatmap && files["main.nr"].trim() && !isComplexityProfiling) {
      handleComplexityRefresh();
    }
  }, [enableHeatmap, files, isComplexityProfiling, handleComplexityRefresh]);

  // Auto-profile when switching to Profiler tab
  const prevRightPanelViewRef = useRef(rightPanelView);
  useEffect(() => {
    const wasPrevProfilerTab = prevRightPanelViewRef.current === 'profiler';
    prevRightPanelViewRef.current = rightPanelView;

    // Trigger profiling when switching to profiler tab if:
    // 1. We just switched to profiler tab (not profiler -> profiler)
    // 2. We have code to analyze
    // 3. We don't have existing results and are not currently profiling
    if (!wasPrevProfilerTab &&
      rightPanelView === 'profiler' &&
      files["main.nr"].trim() &&
      !complexityProfilerResult &&
      !isComplexityProfiling) {
      handleComplexityRefresh();
    }
  }, [rightPanelView, files, complexityProfilerResult, isComplexityProfiling, handleComplexityRefresh]);

  // Auto-scroll console to bottom when new messages arrive
  useEffect(() => {
    if (consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [executionSteps, consoleMessages]);

  // Handle Monaco editor resize when panels expand/collapse
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (monacoEditorRef.current) {
        monacoEditorRef.current.layout();
      }
    }, 300); // Add slight delay to allow panel animations to complete

    return () => clearTimeout(timeoutId);
  }, [panelState]);

  // Track right panel width with ResizeObserver
  useEffect(() => {
    if (!rightPanelRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setRightPanelWidth(entry.contentRect.width);
      }
    });

    resizeObserver.observe(rightPanelRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  const loadExample = (exampleId: string) => {
    const example = noirExamples.find(ex => ex.id === exampleId);
    if (!example) return;

    // Update the main.nr file with the example code
    setFiles(prev => ({
      ...prev,
      "main.nr": example.code
    }));

    // Extract inputs from the code and set default values
    const extracted = extractInputsFromCode(example.code);
    setInputs(example.inputs);
    setInputTypes(extracted.types);
    setParameterOrder(extracted.order);

    // Reset execution state
    setExecutionSteps([]);
    setProofData(null);
    setConsoleMessages([]);
    setSelectedExample(exampleId);

    // Add success message
    addConsoleMessage('info', `Loaded example: ${example.name}`);
  };

  const processStepQueue = () => {
    if (stepQueueRef.current.length === 0) {
      stepTimeoutRef.current = null;
      return;
    }

    const nextStep = stepQueueRef.current.shift();
    if (nextStep) {
      setExecutionSteps(prev => [...prev, nextStep]);

      // Process next step after a small delay
      if (stepQueueRef.current.length > 0) {
        stepTimeoutRef.current = setTimeout(processStepQueue, 50);
      } else {
        stepTimeoutRef.current = null;
      }
    }
  };

  const addStepWithDelay = (step: ExecutionStep) => {
    stepQueueRef.current.push(step);

    // If no processing is happening, start processing
    if (!stepTimeoutRef.current) {
      stepTimeoutRef.current = setTimeout(processStepQueue, 50);
    }
  };

  const handleRun = async () => {
    setIsRunning(true);
    setExecutionSteps([]);
    setProofData(null);
    setConsoleMessages([]);

    // Clear any existing queue and timeout
    stepQueueRef.current = [];
    if (stepTimeoutRef.current) {
      clearTimeout(stepTimeoutRef.current);
      stepTimeoutRef.current = null;
    }

    try {
      // Process inputs to handle arrays properly
      const processedInputs = processInputsForNoir(inputs);

      const result = await noirService.executeCircuit(
        files["main.nr"],
        processedInputs,
        addStepWithDelay,
        undefined,
        proveAndVerify
      );

      // NoirService handles error display through steps, just set proof data if successful
      if (!result.error) {
        setProofData(result);
      }
    } catch (error) {
      addConsoleMessage('error', `Execution Error: ${error instanceof Error ? error.message : "Unknown error occurred"}`);
    } finally {
      setIsRunning(false);
    }
  };



  const handleShareClick = () => {
    setShareDialogOpen(true);
  };



  const handleInputChange = (key: string, value: string) => {
    setInputs(prev => ({ ...prev, [key]: value }));

    // Clear validation error when user starts typing
    if (inputValidationErrors[key]) {
      setInputValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[key];
        return newErrors;
      });
    }

    // Validate array inputs in real-time
    const typeInfo = inputTypes[key];
    if (typeInfo?.isArray && value.trim()) {
      try {
        const parsed = JSON.parse(value);
        if (!Array.isArray(parsed)) {
          setInputValidationErrors(prev => ({ ...prev, [key]: 'Expected an array' }));
        } else if (typeInfo.arrayLength && parsed.length !== typeInfo.arrayLength) {
          setInputValidationErrors(prev => ({ ...prev, [key]: `Expected ${typeInfo.arrayLength} elements, got ${parsed.length}` }));
        }
      } catch {
        setInputValidationErrors(prev => ({ ...prev, [key]: 'Invalid JSON format' }));
      }
    }
  };

  const formatParameterType = (paramName: string): string => {
    const typeInfo = inputTypes[paramName];
    if (!typeInfo) return "Field";

    const visibility = typeInfo.isPublic ? "pub " : "";
    return `${visibility}${typeInfo.type}`;
  };

  // Convert array inputs to proper format for Noir
  const processInputsForNoir = (inputs: Record<string, string>): Record<string, string | number | string[]> => {
    const processedInputs: Record<string, string | number | string[]> = {};

    for (const [key, value] of Object.entries(inputs)) {
      const typeInfo = inputTypes[key];

      if (typeInfo?.isArray) {
        try {
          // Parse JSON array string
          const arrayValues = JSON.parse(value);
          if (Array.isArray(arrayValues)) {
            // Validate array length
            if (typeInfo.arrayLength && arrayValues.length !== typeInfo.arrayLength) {
              throw new Error(`Array ${key} should have ${typeInfo.arrayLength} elements, but got ${arrayValues.length}`);
            }

            // Convert array elements to proper types and pass as JavaScript array
            const typedArray = arrayValues.map(arrayValue => {
              // For boolean types, convert to actual boolean
              if (typeInfo.type.includes('bool')) {
                return arrayValue === 1 || arrayValue === '1' || arrayValue === 'true' || arrayValue === true;
              }
              // For numeric types, convert to number
              return isNaN(Number(arrayValue)) ? arrayValue : Number(arrayValue);
            });

            processedInputs[key] = typedArray;
          } else {
            throw new Error(`Expected array for ${key}`);
          }
        } catch (error) {
          if (error instanceof SyntaxError) {
            throw new Error(`Invalid array format for ${key}: ${value}. Expected JSON array like [1, 2, 3]`);
          }
          throw error;
        }
      } else {
        // Regular input processing
        processedInputs[key] = isNaN(Number(value)) ? value : Number(value);
      }
    }

    return processedInputs;
  };

  const handleFileChange = (filename: string, content: string) => {
    setFiles(prev => ({ ...prev, [filename]: content }));
  };

  const getFileLanguage = (filename: string) => {
    if (filename.endsWith('.nr')) return 'noir';
    return 'plaintext';
  };


  // Extract inputs from the main function signature
  const extractInputsFromCode = (code: string): {
    inputs: Record<string, string>;
    types: Record<string, { type: string; isPublic: boolean; isArray?: boolean; arrayLength?: number }>;
    order: string[]
  } => {
    const functionRegex = /fn\s+main\s*\([^)]*\)/;
    const match = code.match(functionRegex);
    if (!match) return {
      inputs: { x: "10", y: "25" },
      types: { x: { type: "Field", isPublic: false }, y: { type: "Field", isPublic: true } },
      order: ["x", "y"]
    };

    const paramString = match[0];
    const paramRegex = /(\w+)\s*:\s*(pub\s+)?(\[?\w+(?:\s*;\s*\d+)?\]?)/g;
    const extractedInputs: Record<string, string> = {};
    const extractedTypes: Record<string, { type: string; isPublic: boolean; isArray?: boolean; arrayLength?: number }> = {};
    const extractedOrder: string[] = [];

    let paramMatch: RegExpExecArray | null;
    while ((paramMatch = paramRegex.exec(paramString)) !== null) {
      const paramName = paramMatch[1];
      const isPublic = Boolean(paramMatch[2]);
      const paramType = paramMatch[3];

      // Check if it's an array type
      const arrayMatch = paramType.match(/^\[(\w+);\s*(\d+)\]$/);
      const isArray = Boolean(arrayMatch);
      const arrayLength = arrayMatch ? parseInt(arrayMatch[2], 10) : undefined;
      const baseType = arrayMatch ? arrayMatch[1] : paramType;

      // Set default values based on type
      let defaultValue = '10';
      if (isArray) {
        // Create default array based on length and type
        const defaultElement = baseType === 'bool' ? 1 : 10;
        const defaultArray = Array.from({ length: arrayLength! }, (_, i) => defaultElement);
        defaultValue = `[${defaultArray.join(',')}]`;
      } else if (baseType === 'bool') {
        defaultValue = '1';
      } else if (baseType !== 'Field') {
        defaultValue = '25';
      }

      extractedInputs[paramName] = defaultValue;
      extractedTypes[paramName] = {
        type: paramType,
        isPublic,
        isArray,
        arrayLength
      };
      extractedOrder.push(paramName);
    }

    const hasInputs = Object.keys(extractedInputs).length > 0;
    return {
      inputs: hasInputs ? extractedInputs : { x: "10", y: "25" },
      types: hasInputs ? extractedTypes : { x: { type: "Field", isPublic: false }, y: { type: "Field", isPublic: true } },
      order: hasInputs ? extractedOrder : ["x", "y"]
    };
  };

  // Update inputs when main.nr changes
  const handleMainFileChange = (content: string) => {
    handleFileChange('main.nr', content);
    const extracted = extractInputsFromCode(content);

    // Always update types and parameter order to stay in sync with code
    setInputTypes(extracted.types);
    setParameterOrder(extracted.order);

    // Only update input values if the parameter structure (keys) changed
    const currentKeys = Object.keys(inputs);
    const newKeys = Object.keys(extracted.inputs);

    if (JSON.stringify(currentKeys.sort()) !== JSON.stringify(newKeys.sort())) {
      const preservedInputs: Record<string, string> = {};
      newKeys.forEach(key => {
        preservedInputs[key] = inputs[key] || extracted.inputs[key];
      });
      setInputs(preservedInputs);
    }
  };

  const renderConsoleContent = () => {
    const formatStepMessage = (message: string, status: string) => {
      let formattedMessage = message;

      // Remove timing information like (574ms) or (1.2s)
      formattedMessage = formattedMessage.replace(/\s*\(\d+(\.\d+)?(ms|s)\)/g, '');

      if (status === "success" && formattedMessage.toLowerCase().includes("successful")) {
        // Add exclamation mark after "successful" variants, replacing any trailing period
        formattedMessage = formattedMessage.replace(/successful(ly)?\.?/gi, "successful$1!");
      }
      return formattedMessage;
    };

    const allMessages = [
      ...executionSteps.map(step => ({
        id: `step-${step.message}`,
        type: step.status === "success" ? "success" : step.status === "error" ? "error" : "info",
        message: formatStepMessage(step.details ? `${step.message}: ${step.details}` : step.message, step.status),
        timestamp: '',
        isStep: true
      })),
      ...consoleMessages.map(msg => ({
        ...msg,
        isStep: false
      }))
    ];

    if (allMessages.length === 0) {
      return (
        <div className="flex items-center gap-2">
          <span className="text-foreground select-none">Ready to execute...</span>
        </div>
      );
    }

    return allMessages.map((msg, i) => (
      <div key={msg.id || i} className="flex items-center gap-2">
        <span className={`select-none ${msg.type === "success" ? "text-green-400" :
          msg.type === "error" ? "text-red-400" :
            msg.type === "info" ? "text-foreground" :
              "text-foreground"
          }`}>
          {msg.message}
        </span>
      </div>
    ));
  };

  return (
    <TooltipProvider>
      <main className="h-screen bg-background flex flex-col">
        <header className="sr-only">
          <h1>Noir Playground - Zero-Knowledge Proof Development Environment</h1>
        </header>


        {/* Main Content */}
        <section className="flex flex-1" aria-label="Development Environment">
          {/* Desktop Layout - Resizable Panels */}
          <ResizablePanelGroup direction="horizontal" className="h-full">
            {/* Left Panel - Code Editor and Console */}
            <ResizablePanel defaultSize={59} minSize={30}>
              <ResizablePanelGroup direction="vertical" className="h-full">
                {/* Code Editor Panel */}
                <ResizablePanel defaultSize={70} minSize={50}>
                  <section className="h-full flex flex-col" aria-label="Code Editor">
                    {/* Code Editor Header with File Tabs */}
                    <header className="" style={{ backgroundColor: 'rgb(30, 30, 30)' }}>
                      {/* File Tabs */}
                      <div className="flex items-center justify-between px-4 py-2 h-[49px] border-b border-border">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center">
                            {snippetTitle ? (
                              // Show snippet title instead of examples dropdown
                              <div className="flex items-center gap-2 px-2" style={{ fontSize: '13px' }}>
                                <span className="text-muted-foreground select-none">Shared Snippet:</span>
                                <span className="font-medium text-foreground select-none">{snippetTitle}</span>
                              </div>
                            ) : (
                              // Show examples dropdown in normal mode
                              <Select value={selectedExample} onValueChange={loadExample}>
                                <SelectTrigger className="min-w-24 w-auto h-8 focus:ring-0 focus:ring-offset-0 bg-transparent border border-border gap-2" style={{ fontSize: '13px' }}>
                                  <SelectValue placeholder="Examples" />
                                </SelectTrigger>
                                <SelectContent>
                                  {noirExamples.map((example, index) => (
                                    <div key={example.id}>
                                      <SelectItem value={example.id}>
                                        {example.name}
                                      </SelectItem>
                                    </div>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          </div>
                          {Object.keys(files).filter(filename => filename !== 'main.nr').map((filename) => (
                            <button
                              key={filename}
                              onClick={() => setActiveFile(filename)}
                              className={`flex items-center gap-2 px-3 py-2 font-medium rounded-t-md select-none transition-colors focus:outline-none focus:ring-0 focus:ring-offset-0 ${activeFile === filename
                                ? 'bg-background text-foreground'
                                : 'bg-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50'
                                }`}
                              style={{ fontSize: '13px' }}
                            >
                              {filename}
                            </button>
                          ))}
                        </div>
                        <div className="flex items-center">
                          <Button
                            onClick={handleShareClick}
                            variant="ghost"
                            size="sm"
                            title="Share"
                            className="flex items-center gap-1 h-7 px-2"
                          >
                            <Link2 className="h-4 w-4" />
                            <span className="select-none" style={{ fontSize: '13px' }}>Share</span>
                          </Button>
                        </div>
                      </div>
                    </header>

                    {/* Code Editor */}
                    <div className="flex-1">
                      {activeFile === 'main.nr' ? (
                        <NoirEditorWithHover
                          ref={monacoEditorRef}
                          value={files[activeFile] || `pub fn main(x: Field, y: pub Field) -> pub Field {
    // Verify that x and y are both non-zero
    assert(x != 0);
    assert(y != 0);
    
    // Compute the sum and verify it's greater than both inputs
    let sum = x + y;
    assert(sum as u64 > x as u64);
    assert(sum as u64 > y as u64);
    
    // Return the sum as proof output
    sum
}`}
                          onChange={(content) => {
                            handleMainFileChange(content);
                          }}
                          disabled={isRunning}
                          language={getFileLanguage(activeFile)}
                          cargoToml={files["Nargo.toml"]}
                          enableHeatmap={enableHeatmap}
                          heatmapMetricType={heatmapMetricType}
                          onComplexityReport={setComplexityReport}
                        />
                      ) : (
                        <NoirEditor
                          ref={monacoEditorRef}
                          value={files[activeFile] || ''}
                          onChange={(content) => {
                            handleFileChange(activeFile, content);
                          }}
                          disabled={isRunning}
                          language={getFileLanguage(activeFile)}
                        />
                      )}
                    </div>
                  </section>
                </ResizablePanel>

                {/* Resizable Handle between Editor and Console */}
                <ResizableHandle
                  className="bg-border hover:bg-border/50 data-[resize-handle-active]:bg-primary/20 transition-all duration-200 after:opacity-50"
                />

                {/* Console Panel */}
                <CollapsiblePanel
                  id="console-panel"
                  title="Console"
                  icon={<Terminal className="h-4 w-4 text-primary" />}
                  isExpanded={panelState.console}
                  onToggle={() => togglePanel('console')}
                  defaultSize={30}
                  minSize={30}
                  direction="vertical"
                  headerActions={
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2 select-none" style={{ fontSize: '14px' }}>
                        <Switch
                          checked={proveAndVerify}
                          onCheckedChange={setProveAndVerify}
                          className="scale-75"
                        />
                        <span className="text-foreground">Prove & Verify</span>
                      </div>
                      <Button
                        onClick={handleRun}
                        disabled={isRunning}
                        variant="default"
                        size="sm"
                        className="h-8 px-6"
                      >
                        Run
                      </Button>
                    </div>
                  }
                >
                  <div className="h-full flex flex-col" style={{ backgroundColor: '#161616' }}>
                    <div ref={consoleRef} className="p-4 flex-1 overflow-y-auto font-mono space-y-1" style={{ fontSize: '13px' }} role="log" aria-live="polite">
                      {renderConsoleContent()}
                    </div>
                  </div>
                </CollapsiblePanel>
              </ResizablePanelGroup>
            </ResizablePanel>

            {/* Resizable Handle between Editor Area and Right Panel */}
            <ResizableHandle
              className="bg-border hover:bg-border/50 data-[resize-handle-active]:bg-primary/20 transition-all duration-200 after:opacity-50"
            />

            {/* Right Panel - Inputs/Outputs and Complexity Analysis */}
            <ResizablePanel defaultSize={41} minSize={20}>
              <section className="h-full flex flex-col" aria-label="Right Panel" ref={rightPanelRef}>
                <header className="flex items-center justify-between px-4 py-2 h-[49px] border-b border-border select-none" style={{ backgroundColor: 'rgb(30, 30, 30)' }}>
                  <div className="flex items-stretch h-full overflow-x-auto rounded-sm scrollbar-thin scrollbar-track-transparent scrollbar-thumb-muted-foreground/20 hover:scrollbar-thumb-muted-foreground/40" style={{ backgroundColor: '#191819' }}>
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
                <div className="overflow-y-auto flex-1" style={{ backgroundColor: '#100E0F' }}>
                  {rightPanelView === 'inputs' ? (
                    <div className="p-4">
                      {/* Inputs Section */}
                      <div className="mb-6">
                        <h3 className="font-semibold mb-4 text-foreground select-none" style={{ fontSize: '13px' }}>Inputs</h3>
                        <div className="space-y-4">
                          {parameterOrder.map((key) => (
                            <div key={key}>
                              <label className="font-medium mb-2 block select-none text-muted-foreground" style={{ fontSize: '13px' }}>{key}: {formatParameterType(key)}</label>
                              <input
                                type="text"
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
                                <h3 className="font-medium mb-2 select-none text-muted-foreground" style={{ fontSize: '13px' }}>Public Inputs</h3>
                                <div className="bg-muted/50 border border-border rounded">
                                  <div className="p-3 font-mono space-y-1 overflow-x-auto" style={{ fontSize: '13px' }}>
                                    {proofData.publicInputs.map((input: string, i: number) => (
                                      <div key={i}>{input}</div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            )}

                            {proofData.witness && proofData.witness.length > 0 && (
                              <div>
                                <h3 className="font-medium mb-2 select-none text-muted-foreground" style={{ fontSize: '13px' }}>Witness</h3>
                                <div className="bg-muted/50 border border-border rounded">
                                  <div className="p-3 font-mono overflow-x-auto whitespace-nowrap" style={{ fontSize: '13px' }}>
                                    {Array.from(proofData.witness).map((b: number) => b.toString(16).padStart(2, '0')).join('')}
                                  </div>
                                </div>
                              </div>
                            )}

                            <div>
                              <h3 className="font-medium mb-2 select-none text-muted-foreground" style={{ fontSize: '13px' }}>Proof</h3>
                              <div className="bg-muted/50 border border-border rounded">
                                <div className="p-3 font-mono overflow-x-auto whitespace-nowrap" style={{ fontSize: '13px' }}>
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
                  ) : rightPanelView === 'profiler' ? (
                    <div className="h-full flex flex-col">
                      {/* Profiler Controls */}
                      <div className="px-2 sm:px-4 py-3 border-b border-border bg-transparent">
                        {/* Single row layout for normal width, 2-row for narrow */}
                        <div className={`${rightPanelWidth > 320 ? 'flex' : 'hidden'} items-center justify-between`}>
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
                        <div className={`${rightPanelWidth <= 320 ? 'block' : 'hidden'} space-y-2`}>
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

                          <div className="flex justify-center">
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
                      <div className="flex-1">
                        <CombinedComplexityPanel
                          sourceCode={files[activeFile] || ''}
                          cargoToml={files['Nargo.toml'] || ''}
                          className="h-full"
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
                  ) : null}
                </div>
              </section>
            </ResizablePanel>
          </ResizablePanelGroup>
        </section>

        {/* Footer */}
        <footer className="bg-muted/90 border-t border-border px-4 py-2 text-muted-foreground flex justify-between items-center shrink-0" style={{ fontSize: '13px' }}>
          <span>Noir v1.0.0-beta.9 | Barretenberg v0.84.0</span>
          <div className="flex items-center space-x-4">
            <a href="https://x.com/andeebtceth" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
              <BsTwitterX className="h-4 w-4" />
            </a>
            <a href="https://github.com/0xandee/noir-playground" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
              <BsGithub className="h-4 w-4" />
            </a>
          </div>
        </footer>

        <ShareDialog
          open={shareDialogOpen}
          onOpenChange={setShareDialogOpen}
          code={files["main.nr"]}
          inputs={inputs}
          // No TOML file needed
          proofData={proofData}
        />
      </main>
    </TooltipProvider>
  );
};

export default CodePlayground;
