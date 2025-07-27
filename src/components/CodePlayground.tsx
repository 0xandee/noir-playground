import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Copy,
  Download,
  Code,
  FileText,
  Settings,
  Terminal,
  Cpu,
} from "lucide-react";
import { noirService, ExecutionStep } from "@/services/NoirService";
import { NoirEditor } from "./NoirEditor";
import { noirExamples, NoirExample } from "@/data/noirExamples";

const CodePlayground = () => {
  const [activeFile, setActiveFile] = useState("main.nr");
  const [files, setFiles] = useState({
    "main.nr": `pub fn main(x: Field, y: pub Field) -> pub Field {
    // Verify that x and y are both non-zero
    assert(x != 0);
    assert(y != 0);
    
    // Compute the sum and verify it's greater than both inputs
    let sum = x + y;
    assert(sum as u64 > x as u64);
    assert(sum as u64 > y as u64);
    
    // Return the sum as proof output
    sum
}`,
    "Nargo.toml": `[package]
name = "playground"
type = "bin"
authors = [""]
compiler_version = ">=0.31.0"

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
  } | null>(null);
  const [inputs, setInputs] = useState<Record<string, string>>({ x: "10", y: "25" });
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
  const [selectedExample, setSelectedExample] = useState<string>("current-example");
  const stepQueueRef = useRef<ExecutionStep[]>([]);
  const stepTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const consoleRef = useRef<HTMLDivElement>(null);

  const addConsoleMessage = (type: 'error' | 'success' | 'info', message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const id = Date.now().toString();
    setConsoleMessages(prev => [...prev, { id, type, message, timestamp }]);
  };

  // Auto-scroll console to bottom when new messages arrive
  useEffect(() => {
    if (consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [executionSteps, consoleMessages]);

  const loadExample = (exampleId: string) => {
    const example = noirExamples.find(ex => ex.id === exampleId);
    if (!example) return;

    // Update the main.nr file with the example code
    setFiles(prev => ({
      ...prev,
      "main.nr": example.code,
      ...(example.toml && { "Nargo.toml": example.toml })
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

  const handleCopy = (content: string, type: string) => {
    navigator.clipboard.writeText(content);
    addConsoleMessage('info', `${type} copied to clipboard`);
  };

  const handleDownloadProof = () => {
    if (!proofData) return;

    const blob = new Blob([JSON.stringify(proofData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'noir-proof.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
  const processInputsForNoir = (inputs: Record<string, string>): Record<string, any> => {
    const processedInputs: Record<string, any> = {};

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
    if (filename.endsWith('.toml')) return 'toml';
    return 'plaintext';
  };

  const getFileIcon = (filename: string) => {
    if (filename.endsWith('.nr')) return <Code className="h-4 w-4 text-primary" />;
    if (filename.endsWith('.toml')) return <Settings className="h-4 w-4 text-orange-500" />;
    return <FileText className="h-4 w-4 text-muted-foreground" />;
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

    // Only update if the structure changed, preserve existing values
    const currentKeys = Object.keys(inputs);
    const newKeys = Object.keys(extracted.inputs);

    if (JSON.stringify(currentKeys.sort()) !== JSON.stringify(newKeys.sort())) {
      const preservedInputs: Record<string, string> = {};
      newKeys.forEach(key => {
        preservedInputs[key] = inputs[key] || extracted.inputs[key];
      });
      setInputs(preservedInputs);
      setInputTypes(extracted.types);
      setParameterOrder(extracted.order);
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
          <span className="text-foreground">Ready to execute...</span>
        </div>
      );
    }

    return allMessages.map((msg, i) => (
      <div key={msg.id || i} className="flex items-center gap-2">
        <span className={
          msg.type === "success" ? "text-green-400" :
            msg.type === "error" ? "text-red-400" :
              msg.type === "info" ? "text-foreground" :
                "text-foreground"
        }>
          {msg.message}
        </span>
      </div>
    ));
  };

  return (
    <main className="h-screen bg-background flex flex-col">
      <header className="sr-only">
        <h1>Noir Playground - Zero-Knowledge Proof Development Environment</h1>
      </header>

      {/* Main Content */}
      <section className="flex flex-1" aria-label="Development Environment">
        {/* Desktop Layout - Resizable Panels */}
        <ResizablePanelGroup direction="horizontal" className="h-full">
          {/* Left Panel - Code Editor and Console */}
          <ResizablePanel defaultSize={50} minSize={30}>
            <ResizablePanelGroup direction="vertical" className="h-full">
              {/* Code Editor Panel */}
              <ResizablePanel defaultSize={60} minSize={40}>
                <section className="h-full flex flex-col" aria-label="Code Editor">
                  {/* Code Editor Header with File Tabs */}
                  <header className="border-b border-border bg-muted/30">
                    {/* File Tabs */}
                    <div className="flex items-center justify-between px-4 py-2">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <Select value={selectedExample} onValueChange={loadExample}>
                            <SelectTrigger className="w-36 h-8 text-xs focus:ring-0 focus:ring-offset-0">
                              <SelectValue placeholder="Examples" />
                            </SelectTrigger>
                            <SelectContent>
                              {noirExamples.map((example) => (
                                <SelectItem key={example.id} value={example.id}>
                                  {example.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        {Object.keys(files).map((filename) => (
                          <button
                            key={filename}
                            onClick={() => setActiveFile(filename)}
                            className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-t-md select-none transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50 ${activeFile === filename
                              ? 'bg-background text-foreground'
                              : 'bg-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50'
                              }`}
                          >
                            {filename}
                          </button>
                        ))}

                      </div>
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 text-sm select-none">
                          <input
                            type="checkbox"
                            checked={proveAndVerify}
                            onChange={(e) => setProveAndVerify(e.target.checked)}
                            className="rounded"
                          />
                          Prove & Verify
                        </label>
                        <Button
                          onClick={handleRun}
                          disabled={isRunning}
                          variant="default"
                          size="sm"
                        >
                          Run
                        </Button>
                      </div>
                    </div>
                  </header>

                  {/* Code Editor */}
                  <div className="flex-1">
                    <NoirEditor
                      value={files[activeFile]}
                      onChange={(content) => {
                        if (activeFile === 'main.nr') {
                          handleMainFileChange(content);
                        } else {
                          handleFileChange(activeFile, content);
                        }
                      }}
                      disabled={isRunning}
                      language={getFileLanguage(activeFile)}
                    />
                  </div>
                </section>
              </ResizablePanel>

              {/* Resizable Handle between Editor and Console */}
              <ResizableHandle
                className="bg-transparent border-transparent hover:bg-border/30 data-[resize-handle-active]:bg-primary/10 transition-all duration-200 after:opacity-50"
              />

              {/* Console Panel */}
              <ResizablePanel defaultSize={40} minSize={15}>
                <section className="h-full flex flex-col border-t border-border bg-muted/20" aria-label="Console Output">
                  <header className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/30 select-none">
                    <div className="flex items-center gap-2">
                      <Terminal className="h-4 w-4 text-primary" />
                      <h2 className="text-sm font-medium">Console</h2>
                    </div>
                    <div className="h-9 w-0" />
                  </header>
                  <div ref={consoleRef} className="p-4 flex-1 overflow-y-auto font-mono text-xs space-y-1" role="log" aria-live="polite">
                    {renderConsoleContent()}
                  </div>
                </section>
              </ResizablePanel>
            </ResizablePanelGroup>
          </ResizablePanel>

          {/* Resizable Handle between Editor Area and Right Panel */}
          <ResizableHandle
            className="bg-transparent border-transparent hover:bg-border/30 data-[resize-handle-active]:bg-primary/10 transition-all duration-200 after:opacity-50"
          />

          {/* Right Panel - Execution Details */}
          <ResizablePanel defaultSize={50} minSize={30}>
            <ResizablePanelGroup direction="vertical" className="h-full">
              {/* Circuit Inputs Panel */}
              <ResizablePanel defaultSize={50} minSize={20}>
                <section className="h-full flex flex-col" aria-label="Circuit Inputs">
                  <header className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/30 select-none">
                    <div className="flex items-center gap-2">
                      <Cpu className="h-4 w-4 text-primary" />
                      <h2 className="text-sm font-medium">Circuit Inputs</h2>
                    </div>
                    <div className="h-9 w-0" />
                  </header>
                  <div className="p-4 overflow-y-auto flex-1">
                    <div className="space-y-4">
                      {parameterOrder.map((key) => (
                        <div key={key}>
                          <label className="text-sm font-medium mb-2 block">{key}: {formatParameterType(key)}</label>
                          <input
                            type="text"
                            value={inputs[key] || ''}
                            onChange={(e) => handleInputChange(key, e.target.value)}
                            className={`w-full px-3 py-2 bg-muted/50 border rounded text-sm focus:outline-none focus:ring-1 transition-colors ${inputValidationErrors[key]
                              ? 'border-red-500/50 focus:ring-red-500/50'
                              : 'border-border focus:ring-primary/50'
                              }`}
                            disabled={isRunning}
                          />
                          {inputValidationErrors[key] && (
                            <p className="text-xs text-red-400 mt-1">{inputValidationErrors[key]}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              </ResizablePanel>

              {/* Resizable Handle */}
              <ResizableHandle
                className="bg-transparent border-transparent hover:bg-border/30 data-[resize-handle-active]:bg-primary/10 transition-all duration-200 after:opacity-50"
              />

              {/* Proof Output Panel */}
              <ResizablePanel defaultSize={50} minSize={20}>
                <section className="h-full flex flex-col" aria-label="Proof Output">
                  <header className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/30 select-none">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" />
                      <h2 className="text-sm font-medium">Output</h2>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => proofData && handleCopy(JSON.stringify(proofData, null, 2), "Full Proof")}
                        disabled={!proofData}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleDownloadProof}
                        disabled={!proofData}
                      >
                        <Download className="h-3 w-3" />
                      </Button>
                    </div>
                  </header>
                  <div className="p-4 overflow-y-auto flex-1">
                    {proofData ? (
                      <div className="space-y-3">
                        {proofData.publicInputs && proofData.publicInputs.length > 0 && (
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <h3 className="text-sm font-medium">Public Inputs</h3>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 py-1"
                                onClick={() => handleCopy(JSON.stringify(proofData.publicInputs), "Public Inputs")}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                            <div className="bg-muted/50 p-3 rounded text-xs font-mono space-y-1 overflow-x-auto">
                              {proofData.publicInputs.map((input: string, i: number) => (
                                <div key={i}>{input}</div>
                              ))}
                            </div>
                          </div>
                        )}

                        {proofData.witness && proofData.witness.length > 0 && (
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <h3 className="text-sm font-medium">Witness</h3>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 py-1"
                                onClick={() => {
                                  const witnessHex = Array.from(proofData.witness!).map((b: number) => b.toString(16).padStart(2, '0')).join('');
                                  handleCopy(witnessHex, "Witness");
                                }}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                            <div className="bg-muted/50 p-3 rounded text-xs font-mono overflow-x-auto whitespace-nowrap">
                              {Array.from(proofData.witness).map((b: number) => b.toString(16).padStart(2, '0')).join('')}
                            </div>
                          </div>
                        )}

                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm font-medium">Proof</h3>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 py-1"
                              onClick={() => {
                                const proofHex = proofData.proof && proofData.proof.length > 0
                                  ? Array.from(proofData.proof).map((b: number) => b.toString(16).padStart(2, '0')).join('')
                                  : '';
                                handleCopy(proofHex, "Proof");
                              }}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                          <div className="bg-muted/50 p-3 rounded text-xs font-mono overflow-x-auto whitespace-nowrap">
                            {proofData.proof && proofData.proof.length > 0
                              ? Array.from(proofData.proof).map((b: number) => b.toString(16).padStart(2, '0')).join('')
                              : 'No proof generated'}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm font-medium">Public Inputs</h3>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 py-1"
                              disabled={true}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                          <div className="bg-muted/50 p-3 rounded text-xs font-mono text-muted-foreground">
                            No public inputs
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm font-medium">Witness</h3>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 py-1"
                              disabled={true}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                          <div className="bg-muted/50 p-3 rounded text-xs font-mono text-muted-foreground">
                            No witness data
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm font-medium">Proof</h3>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 py-1"
                              disabled={true}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                          <div className="bg-muted/50 p-3 rounded text-xs font-mono text-muted-foreground">
                            No proof generated
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </section>
              </ResizablePanel>
            </ResizablePanelGroup>
          </ResizablePanel>
        </ResizablePanelGroup>
      </section>

      {/* Footer */}
      <footer className="bg-muted/90 border-t border-border px-4 py-2 text-xs text-muted-foreground flex justify-between items-center shrink-0">
        <span>Noir v1.0.0-beta.9 | Barretenberg v0.84.0</span>
        <span>
          Made by{" "}
          <a href="https://x.com/andeebtceth" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
            Andee
          </a> {" "}
          with ☕️
          . Contribute on{" "}
          <a href="https://github.com/0xandee/noir-playground" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
            GitHub
          </a>
        </span>
      </footer>
    </main>
  );
};

export default CodePlayground;
