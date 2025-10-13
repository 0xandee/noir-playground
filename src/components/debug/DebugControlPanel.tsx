/**
 * Debug Control Panel
 * Provides UI controls for debugging (start/stop, step commands, status)
 */

import React from 'react';
import {
  Play,
  Square,
  ArrowRight,
  ArrowDown,
  ArrowUp,
  FastForward,
  Loader2,
  RotateCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDebug } from '@/contexts/DebugContext';

interface DebugControlPanelProps {
  sourceCode: string;
  cargoToml?: string;
  inputs: Record<string, any>;
  className?: string;
}

/**
 * Check if execution has completed (reached end of program)
 */
const isExecutionCompleted = (reason?: string): boolean => {
  if (!reason) return false;
  const completionReasons = ['exited', 'terminated', 'completed', 'finished'];
  return completionReasons.some(r => reason.toLowerCase().includes(r));
};

export const DebugControlPanel: React.FC<DebugControlPanelProps> = ({
  sourceCode,
  cargoToml,
  inputs,
  className = '',
}) => {
  const {
    session,
    isDebugging,
    isStepExecuting,
    isSessionStarting,
    isSessionStopping,
    isSessionRestarting,
    currentLine,
    error,
    startDebugSession,
    stopDebugSession,
    restartDebugSession,
    executeStep,
    clearError,
  } = useDebug();

  // Check if execution has completed
  const executionCompleted = isDebugging && session && isExecutionCompleted(session.reason);

  const handleStartDebug = async () => {
    const success = await startDebugSession({
      sourceCode,
      cargoToml,
      inputs,
    });

    if (!success) {
      // Error is already set in context
      console.error('Failed to start debug session');
    }
  };

  const handleStopDebug = async () => {
    await stopDebugSession();
  };

  const handleRestartDebug = async () => {
    const success = await restartDebugSession({
      sourceCode,
      cargoToml,
      inputs,
    });

    if (!success) {
      console.error('Failed to restart debug session');
    }
  };

  const handleStep = async (command: 'next' | 'into' | 'out' | 'continue') => {
    const success = await executeStep(command);

    if (!success) {
      console.error(`Failed to execute ${command} command`);
    }
  };

  // Disable step controls if not debugging, executing, no session, or execution completed
  const isStepDisabled = !isDebugging || isStepExecuting || !session || executionCompleted;

  return (
    <div className={`flex flex-col ${className}`}>
      {/* Debug Controls */}
      <div className="flex flex-wrap items-center gap-2 p-3 border-b border-border bg-muted/30">
        {/* Start Button */}
        {!isDebugging ? (
          <Button
            onClick={handleStartDebug}
            disabled={isSessionStarting}
            variant="default"
            size="sm"
            className="h-8 px-2 md:px-3 gap-1.5"
            title="Start debugging"
          >
            {isSessionStarting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Play className="h-3.5 w-3.5" />
            )}
            <span className="hidden md:inline text-xs font-medium">
              {isSessionStarting ? 'Starting...' : 'Start Debug'}
            </span>
          </Button>
        ) : (
          <>
            {/* Step Controls */}
            <Button
              onClick={() => handleStep('next')}
              disabled={isStepDisabled}
              variant="ghost"
              size="sm"
              className="h-8 px-2 md:px-3 gap-1.5"
              title="Step Next (execute next line)"
            >
              {isStepExecuting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <ArrowRight className="h-3.5 w-3.5" />
              )}
              <span className="hidden md:inline text-xs">Next</span>
            </Button>

            <Button
              onClick={() => handleStep('into')}
              disabled={isStepDisabled}
              variant="ghost"
              size="sm"
              className="h-8 px-2 md:px-3 gap-1.5"
              title="Step Into (enter function)"
            >
              <ArrowDown className="h-3.5 w-3.5" />
              <span className="hidden md:inline text-xs">Into</span>
            </Button>

            <Button
              onClick={() => handleStep('out')}
              disabled={isStepDisabled}
              variant="ghost"
              size="sm"
              className="h-8 px-2 md:px-3 gap-1.5"
              title="Step Out (exit function)"
            >
              <ArrowUp className="h-3.5 w-3.5" />
              <span className="hidden md:inline text-xs">Out</span>
            </Button>

            <Button
              onClick={() => handleStep('continue')}
              disabled={isStepDisabled}
              variant="ghost"
              size="sm"
              className="h-8 px-2 md:px-3 gap-1.5"
              title="Continue (run to next breakpoint)"
            >
              <FastForward className="h-3.5 w-3.5" />
              <span className="hidden md:inline text-xs">Continue</span>
            </Button>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Session Controls */}
            <Button
              onClick={handleRestartDebug}
              disabled={isSessionRestarting || isStepExecuting}
              variant="ghost"
              size="sm"
              className="h-8 px-2 md:px-3 gap-1.5 text-green-500 hover:text-green-400 hover:bg-green-500/10"
              title="Restart debugging (stop and start fresh)"
            >
              {isSessionRestarting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RotateCcw className="h-3.5 w-3.5" />
              )}
              <span className="hidden md:inline text-xs font-medium">
                {isSessionRestarting ? 'Restarting...' : 'Restart'}
              </span>
            </Button>

            <Button
              onClick={handleStopDebug}
              disabled={isSessionStopping || isStepExecuting}
              variant="ghost"
              size="sm"
              className="h-8 px-2 md:px-3 gap-1.5 text-red-500 hover:text-red-400 hover:bg-red-500/10"
              title="Stop debugging"
            >
              {isSessionStopping ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Square className="h-3.5 w-3.5" />
              )}
              <span className="hidden md:inline text-xs font-medium">
                {isSessionStopping ? 'Stopping...' : 'Stop'}
              </span>
            </Button>
          </>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-3 bg-red-500/10 border-b border-red-500/20">
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs text-red-400 flex-1">{error}</p>
            <button
              onClick={clearError}
              className="text-red-400 hover:text-red-300 text-xs"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
