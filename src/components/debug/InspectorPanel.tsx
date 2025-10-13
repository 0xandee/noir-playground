/**
 * Unified Inspector Panel
 * Displays all debug information in a single view
 * Mirrors the output of `nargo debug` command
 */

import React from 'react';
import { Layers } from 'lucide-react';
import { useDebug } from '@/contexts/DebugContext';

interface InspectorPanelProps {
  className?: string;
}

export const InspectorPanel: React.FC<InspectorPanelProps> = ({ className = '' }) => {
  const { variables, witnesses, session, isDebugging } = useDebug();

  if (!isDebugging) {
    return (
      <div className={`flex items-center justify-center h-full ${className}`}>
        <div className="text-center p-8">
          <Layers className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Start debugging to view inspector data</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full overflow-y-auto ${className}`}>
      {/* Variables Section */}
      <InspectorSection
        title="Variables"
        count={variables.length}
      >
        {variables.length === 0 ? (
          <div className="px-4 py-2 text-xs text-muted-foreground italic">
            No variables available
          </div>
        ) : (
          <div className="px-4 py-2 space-y-1 font-mono text-xs">
            {variables.map((variable, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <span className="text-blue-400">{variable.name}</span>
                <span className="text-muted-foreground">=</span>
                <span className="text-green-400">{variable.value}</span>
                {variable.type && (
                  <span className="text-muted-foreground text-[10px]">
                    : {variable.type}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </InspectorSection>

      {/* Witness Map Section */}
      <InspectorSection
        title="Witness Map"
        count={witnesses.length}
      >
        {witnesses.length === 0 ? (
          <div className="px-4 py-2 text-xs text-muted-foreground italic">
            No witnesses available
          </div>
        ) : (
          <div className="px-4 py-2 space-y-1 font-mono text-xs">
            {witnesses.map((witness, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <span className="text-purple-400">{witness.index}</span>
                <span className="text-muted-foreground">=</span>
                <span className="text-yellow-400">{witness.value}</span>
              </div>
            ))}
          </div>
        )}
      </InspectorSection>

      {/* Stack Trace Section */}
      <InspectorSection
        title="Stack Trace"
        count={session?.sourceLine ? 1 : 0}
      >
        {!session?.sourceLine ? (
          <div className="px-4 py-2 text-xs text-muted-foreground italic">
            No stack trace available
          </div>
        ) : (
          <div className="px-4 py-2 font-mono text-xs">
            <div className="flex items-start gap-2">
              <span className="text-amber-400">Frame #0</span>
              <span className="text-muted-foreground">,</span>
              <span className="text-foreground">
                line {session.sourceLine}
              </span>
              {session.sourceFile && (
                <>
                  <span className="text-muted-foreground">in</span>
                  <span className="text-blue-400">{session.sourceFile}</span>
                </>
              )}
            </div>
            {session.reason && (
              <div className="mt-1 text-muted-foreground">
                Reason: {session.reason}
              </div>
            )}
          </div>
        )}
      </InspectorSection>
    </div>
  );
};

/**
 * Simple section component
 */
interface InspectorSectionProps {
  title: string;
  count: number;
  children: React.ReactNode;
}

const InspectorSection: React.FC<InspectorSectionProps> = ({
  title,
  count,
  children,
}) => {
  return (
    <div className="border-b border-border">
      {/* Section Header */}
      <div className="flex items-center gap-2 px-4 py-3 bg-muted/20">
        <span className="text-sm font-medium text-foreground">{title}</span>
        {count > 0 && (
          <span className="ml-auto text-xs text-muted-foreground">
            ({count})
          </span>
        )}
      </div>

      {/* Section Content */}
      <div className="bg-muted/10">
        {children}
      </div>
    </div>
  );
};
