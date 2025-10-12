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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDebug } from '@/contexts/DebugContext';

interface DebugControlPanelProps {
  sourceCode: string;
  cargoToml?: string;
  inputs: Record<string, any>;
  className?: string;
}

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
    currentLine,
    error,
    startDebugSession,
    stopDebugSession,
    executeStep,
    clearError,
  } = useDebug();

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

  const handleStep = async (command: 'next' | 'stepIn' | 'stepOut' | 'continue') => {
    const success = await executeStep(command);

    if (!success) {
      console.error(`Failed to execute ${command} command`);
    }
  };

  const isStepDisabled = !isDebugging || isStepExecuting || !session;

  return (
    <div className={`flex flex-col ${className}`}>
      {/* Debug Controls */}
      <div className="flex items-center gap-2 p-3 border-b border-border bg-muted/30">
        {/* Start/Stop Button */}
        {!isDebugging ? (
          <Button
            onClick={handleStartDebug}
            variant="default"
            size="sm"
            className="h-8 px-3 gap-1.5"
            title="Start debugging"
          >
            <Play className="h-3.5 w-3.5" />
            <span className="text-xs font-medium">Start Debug</span>
          </Button>
        ) : (
          <Button
            onClick={handleStopDebug}
            variant="destructive"
            size="sm"
            className="h-8 px-3 gap-1.5"
            title="Stop debugging"
          >
            <Square className="h-3.5 w-3.5" />
            <span className="text-xs font-medium">Stop</span>
          </Button>
        )}

        {/* Separator */}
        {isDebugging && (
          <div className="h-6 w-px bg-border mx-1" />
        )}

        {/* Step Controls */}
        {isDebugging && (
          <>
            <Button
              onClick={() => handleStep('next')}
              disabled={isStepDisabled}
              variant="ghost"
              size="sm"
              className="h-8 px-3 gap-1.5"
              title="Step Next (execute next line)"
            >
              {isStepExecuting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <ArrowRight className="h-3.5 w-3.5" />
              )}
              <span className="text-xs">Next</span>
            </Button>

            <Button
              onClick={() => handleStep('stepIn')}
              disabled={isStepDisabled}
              variant="ghost"
              size="sm"
              className="h-8 px-3 gap-1.5"
              title="Step Into (enter function)"
            >
              <ArrowDown className="h-3.5 w-3.5" />
              <span className="text-xs">Into</span>
            </Button>

            <Button
              onClick={() => handleStep('stepOut')}
              disabled={isStepDisabled}
              variant="ghost"
              size="sm"
              className="h-8 px-3 gap-1.5"
              title="Step Out (exit function)"
            >
              <ArrowUp className="h-3.5 w-3.5" />
              <span className="text-xs">Out</span>
            </Button>

            <Button
              onClick={() => handleStep('continue')}
              disabled={isStepDisabled}
              variant="ghost"
              size="sm"
              className="h-8 px-3 gap-1.5"
              title="Continue (run to next breakpoint)"
            >
              <FastForward className="h-3.5 w-3.5" />
              <span className="text-xs">Continue</span>
            </Button>
          </>
        )}

        {/* Status Indicator */}
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          {isDebugging && (
            <div className="flex items-center gap-1.5 text-xs">
              <div className={`h-2 w-2 rounded-full ${
                session?.stopped ? 'bg-yellow-500' : 'bg-green-500'
              }`} />
              <span className="text-muted-foreground">
                {session?.stopped ? 'Paused' : 'Running'}
              </span>
              {currentLine !== null && (
                <span className="text-foreground">
                  at line <span className="font-mono font-medium">{currentLine}</span>
                </span>
              )}
            </div>
          )}
        </div>
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

      {/* Session Info */}
      {isDebugging && session && (
        <div className="p-3 bg-muted/20 border-b border-border">
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-muted-foreground">Session:</span>{' '}
              <span className="font-mono text-foreground">{session.sessionId?.substring(0, 8)}...</span>
            </div>
            {session.reason && (
              <div>
                <span className="text-muted-foreground">Status:</span>{' '}
                <span className="text-foreground">{session.reason}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
