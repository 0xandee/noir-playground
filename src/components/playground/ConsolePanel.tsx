import React from "react";
import { Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { CollapsiblePanel } from "@/components/ui/collapsible-panel";
import { ExecutionStep } from "@/services/NoirService";

interface ConsolePanelProps {
  isExpanded: boolean;
  onToggle: () => void;
  proveAndVerify: boolean;
  setProveAndVerify: (value: boolean) => void;
  isRunning: boolean;
  handleRun: () => void;
  consoleRef: React.RefObject<HTMLDivElement>;
  executionSteps: ExecutionStep[];
  consoleMessages: Array<{
    id: string;
    type: 'error' | 'success' | 'info';
    message: string;
    timestamp: string;
  }>;
  isMobile?: boolean;
}

export const ConsolePanel: React.FC<ConsolePanelProps> = ({
  isExpanded,
  onToggle,
  proveAndVerify,
  setProveAndVerify,
  isRunning,
  handleRun,
  consoleRef,
  executionSteps,
  consoleMessages,
  isMobile = false
}) => {

  const renderConsoleContent = () => {
    const formatStepMessage = (message: string) => {
      return message;
    };

    const allMessages = [
      ...executionSteps.map(step => ({
        id: `step-${step.message}`,
        type: step.status === "success" ? "success" : step.status === "error" ? "error" : "info",
        message: formatStepMessage(step.details ? `${step.message}: ${step.details}` : step.message),
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
          <span className="text-foreground select-text">Ready to execute...</span>
        </div>
      );
    }

    return allMessages.map((msg, i) => (
      <div key={msg.id || i} className="flex items-center gap-2">
        <span className={`select-text ${msg.type === "success" ? "text-green-400" :
          msg.type === "error" ? "text-red-400" :
            msg.type === "info" ? "text-foreground" :
              "text-foreground"
          }`}>
          {msg.message}
        </span>
      </div>
    ));
  };

  const headerActions = (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2 select-none" style={{ fontSize: isMobile ? '12px' : '14px' }}>
        <Switch
          checked={proveAndVerify}
          onCheckedChange={setProveAndVerify}
          className="scale-75"
        />
        <span className="text-foreground">{isMobile ? "Verify" : "Prove & Verify"}</span>
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
  );

  const content = (
    <div className="h-full flex flex-col" style={{ backgroundColor: '#100E0F' }}>
      <div ref={consoleRef} className="p-4 flex-1 overflow-y-auto font-mono space-y-1" style={{ fontSize: '13px' }} role="log" aria-live="polite">
        {renderConsoleContent()}
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between px-4 py-2 min-h-[49px] border-b border-border" style={{ backgroundColor: 'rgb(30, 30, 30)' }}>
          <div className="flex items-center gap-2">
            <span className="font-medium select-none" style={{ fontSize: '13px' }}>Console</span>
          </div>
          {headerActions}
        </div>
        <div className="flex-1 min-h-0">
          {content}
        </div>
      </div>
    );
  }

  return (
    <CollapsiblePanel
      id="console-panel"
      title="Console"
      icon={<Terminal className="h-4 w-4 text-primary" />}
      isExpanded={isExpanded}
      onToggle={onToggle}
      defaultSize={30}
      minSize={30}
      direction="vertical"
      headerActions={headerActions}
    >
      {content}
    </CollapsiblePanel>
  );
};
