import { useState, useRef, useEffect, useCallback } from "react";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BsTwitterX, BsGithub } from "react-icons/bs";
import { noirService, ExecutionStep } from "@/services/NoirService";
import { ShareDialog } from "./ShareDialog";
import { CircuitComplexityReport, MetricType } from "@/types/circuitMetrics";
import { usePanelState } from "@/hooks/usePanelState";
import { ProfilerResult, NoirProfilerService } from "@/services/NoirProfilerService";
import * as monaco from 'monaco-editor';
import { useIsMobile } from "@/hooks/use-mobile";

import { EditorPanel } from "./playground/EditorPanel";
import { ConsolePanel } from "./playground/ConsolePanel";
import { ToolsPanel } from "./playground/ToolsPanel";
import { MobilePlaygroundLayout } from "./playground/MobilePlaygroundLayout";

interface CodePlaygroundProps {
  initialCode?: string;
  initialInputs?: Record<string, string>;
  initialCargoToml?: string;
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
  const { initialCode, initialInputs, initialCargoToml, initialProofData, snippetTitle, snippetId } = props;
  const isMobile = useIsMobile();
  
  const [activeFile, setActiveFile] = useState("main.nr");
  const [files, setFiles] = useState({
    "main.nr": initialCode || `pub fn main(
    x: Field,
    y: pub Field
) -> pub Field {
    // Main function - demonstrates function calls for step debugging
    let sum = add(x, y);
    let product = multiply(x, y);
    let result = compute_final(sum, product);
    result
}

fn add(a: Field, b: Field) -> Field {
    // Helper function: Addition
    let result = a + b;
    result
}

fn multiply(a: Field, b: Field) -> Field {
    // Helper function: Multiplication
    let result = a * b;
    result
}

fn compute_final(sum: Field, product: Field) -> Field {
    // Helper function: Final computation
    let adjusted = sum + product;
    let final_value = adjusted * 2;
    assert(final_value != 0);
    final_value
}`,
    "Nargo.toml": initialCargoToml || `[package]
name = "debug_test"
type = "bin"
authors = [""]
compiler_version = ">=1.0.0"

[dependencies]`
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
  const [inputs, setInputs] = useState<Record<string, string>>(initialInputs || { x: "10", y: "5" });
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
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [rightPanelView, setRightPanelView] = useState<'inputs' | 'profiler' | 'benchmark' | 'inspector'>('inputs');
  const [rightPanelWidth, setRightPanelWidth] = useState<number>(400); // Track right panel width
  const rightPanelRef = useRef<HTMLDivElement>(null);

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
  const [complexityViewMode, setComplexityViewMode] = useState<'metrics' | 'flamegraph' | 'insights'>('metrics');
  const [complexityProfilerResult, setComplexityProfilerResult] = useState<ProfilerResult | null>(null);
  const [isComplexityProfiling, setIsComplexityProfiling] = useState(false);

  // Profiler service instance
  const profilerServiceRef = useRef<NoirProfilerService | null>(null);
  if (!profilerServiceRef.current) {
    profilerServiceRef.current = new NoirProfilerService();
  }

  // Extract inputs from the main function signature
  const extractInputsFromCode = (code: string): {
    inputs: Record<string, string>;
    types: Record<string, { type: string; isPublic: boolean; isArray?: boolean; arrayLength?: number }>;
    order: string[]
  } => {
    // Strip single-line comments to prevent ')' in comments from breaking the regex
    const codeWithoutComments = code.replace(/\/\/.*$/gm, '');
    const functionRegex = /fn\s+main\s*\([^)]*\)/;
    const match = codeWithoutComments.match(functionRegex);
    if (!match) return {
      inputs: {},
      types: {},
      order: []
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
      inputs: hasInputs ? extractedInputs : {},
      types: hasInputs ? extractedTypes : {},
      order: hasInputs ? extractedOrder : []
    };
  };

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
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setConsoleMessages(prev => [...prev, { id, type, message, timestamp }]);
  }, []);

  const clearConsoleMessages = useCallback(() => {
    setConsoleMessages([]);
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
        files["Nargo.toml"],
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

  const handleCopyField = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
    } catch (err) {
    }
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

  const handleFileChange = (filename: string, content: string) => {
    setFiles(prev => ({ ...prev, [filename]: content }));
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

  // Props for child components
  const editorProps = {
    files,
    activeFile,
    setActiveFile,
    handleFileChange,
    handleMainFileChange,
    handleShareClick,
    isRunning,
    monacoEditorRef,
    enableHeatmap,
    heatmapMetricType,
    setComplexityReport,
    isMobile
  };

  const consoleProps = {
    isExpanded: panelState.console,
    onToggle: () => togglePanel('console'),
    proveAndVerify,
    setProveAndVerify,
    isRunning,
    handleRun,
    consoleRef,
    executionSteps,
    consoleMessages,
    isMobile
  };

  const toolsProps = {
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
    isMobile
  };

  return (
    <TooltipProvider>
      <main className="h-screen bg-background flex flex-col">
        <header className="sr-only">
          <h1>Noir Playground - Zero-Knowledge Proof Development Environment</h1>
        </header>

        {/* Main Content */}
        <section className="flex flex-1 overflow-hidden" aria-label="Development Environment">
          {isMobile ? (
             <MobilePlaygroundLayout
               editorProps={editorProps}
               consoleProps={consoleProps}
               toolsProps={toolsProps}
             />
          ) : (
            /* Desktop Layout - Resizable Panels */
            <ResizablePanelGroup direction="horizontal" className="h-full">
              {/* Left Panel - Code Editor and Console */}
              <ResizablePanel defaultSize={59} minSize={30}>
                <ResizablePanelGroup direction="vertical" className="h-full">
                  {/* Code Editor Panel */}
                  <ResizablePanel defaultSize={70} minSize={50}>
                    <EditorPanel {...editorProps} />
                  </ResizablePanel>

                  {/* Resizable Handle between Editor and Console */}
                  <ResizableHandle
                    className="bg-border hover:bg-border/50 data-[resize-handle-active]:bg-primary/20 transition-all duration-200 after:opacity-50"
                  />

                  {/* Console Panel */}
                  <ConsolePanel {...consoleProps} />
                </ResizablePanelGroup>
              </ResizablePanel>

              {/* Resizable Handle between Editor Area and Right Panel */}
              <ResizableHandle
                className="bg-border hover:bg-border/50 data-[resize-handle-active]:bg-primary/20 transition-all duration-200 after:opacity-50"
              />

              {/* Right Panel - Inputs/Outputs and Complexity Analysis */}
              <ResizablePanel defaultSize={41} minSize={20}>
                <ToolsPanel {...toolsProps} />
              </ResizablePanel>
            </ResizablePanelGroup>
          )}
        </section>

        {/* Footer */}
        <footer className="bg-muted/90 border-t border-border px-4 py-2 text-muted-foreground flex justify-between items-center shrink-0" style={{ fontSize: '13px' }}>
          <span>Noir v1.0.0-beta.11 | Barretenberg v1.0.0</span>
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
          cargoToml={files["Nargo.toml"]}
          proofData={proofData}
        />
      </main>
    </TooltipProvider>
  );
};

export default CodePlayground;
