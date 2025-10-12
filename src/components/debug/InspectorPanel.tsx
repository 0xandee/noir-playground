/**
 * Unified Inspector Panel
 * Displays all debug information in a single view with collapsible sections
 * Mirrors the output of `nargo debug` command
 */

import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Layers, Variable, Binary, List, Cpu } from 'lucide-react';
import { useDebug } from '@/contexts/DebugContext';

interface InspectorPanelProps {
  className?: string;
}

export const InspectorPanel: React.FC<InspectorPanelProps> = ({ className = '' }) => {
  const { variables, witnesses, opcodes, session, isDebugging } = useDebug();

  // Collapsible section state
  const [expandedSections, setExpandedSections] = useState({
    variables: true,
    witnesses: true,
    opcodes: false,
    stacktrace: true,
    memory: false,
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

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
        icon={<Variable className="h-4 w-4" />}
        title="Variables"
        count={variables.length}
        expanded={expandedSections.variables}
        onToggle={() => toggleSection('variables')}
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
        icon={<Binary className="h-4 w-4" />}
        title="Witness Map"
        count={witnesses.length}
        expanded={expandedSections.witnesses}
        onToggle={() => toggleSection('witnesses')}
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

      {/* ACIR Opcodes Section */}
      <InspectorSection
        icon={<List className="h-4 w-4" />}
        title="ACIR Opcodes"
        count={opcodes.length}
        expanded={expandedSections.opcodes}
        onToggle={() => toggleSection('opcodes')}
      >
        {opcodes.length === 0 ? (
          <div className="px-4 py-2 text-xs text-muted-foreground italic">
            No opcodes available
          </div>
        ) : (
          <div className="px-4 py-2 space-y-1 font-mono text-xs">
            {opcodes.map((opcode, idx) => (
              <div key={idx} className="flex items-start gap-2 hover:bg-muted/30 px-2 py-1 rounded">
                <span className="text-cyan-400 min-w-[60px]">{opcode.index}</span>
                <span className="text-muted-foreground">::</span>
                <span className="text-orange-400">{opcode.type}</span>
                {opcode.description && (
                  <span className="text-muted-foreground flex-1">
                    {opcode.description}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </InspectorSection>

      {/* Stack Trace Section */}
      <InspectorSection
        icon={<Layers className="h-4 w-4" />}
        title="Stack Trace"
        count={session?.sourceLine ? 1 : 0}
        expanded={expandedSections.stacktrace}
        onToggle={() => toggleSection('stacktrace')}
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

      {/* Brillig VM Memory Section */}
      <InspectorSection
        icon={<Cpu className="h-4 w-4" />}
        title="Brillig VM Memory"
        count={0}
        expanded={expandedSections.memory}
        onToggle={() => toggleSection('memory')}
      >
        <div className="px-4 py-2 text-xs text-muted-foreground italic">
          Brillig VM memory not available
          <div className="mt-1 text-[10px]">
            Memory inspection will be available after stepping into Brillig blocks
          </div>
        </div>
      </InspectorSection>

      {/* Help Text */}
      <div className="mt-auto p-4 border-t border-border bg-muted/20">
        <div className="text-xs text-muted-foreground space-y-1">
          <p>
            <strong className="text-foreground">Inspector:</strong> Shows debug information at current execution point
          </p>
          <p className="text-[10px]">
            Use step controls to navigate through execution and watch values change in real-time
          </p>
        </div>
      </div>
    </div>
  );
};

/**
 * Collapsible section component
 */
interface InspectorSectionProps {
  icon: React.ReactNode;
  title: string;
  count: number;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

const InspectorSection: React.FC<InspectorSectionProps> = ({
  icon,
  title,
  count,
  expanded,
  onToggle,
  children,
}) => {
  return (
    <div className="border-b border-border">
      {/* Section Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-4 py-3 hover:bg-muted/30 transition-colors text-left"
      >
        <span className="text-primary">
          {expanded ? (
            <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" />
          )}
        </span>
        <span className="text-primary">{icon}</span>
        <span className="text-sm font-medium text-foreground">{title}</span>
        {count > 0 && (
          <span className="ml-auto text-xs text-muted-foreground">
            ({count})
          </span>
        )}
      </button>

      {/* Section Content */}
      {expanded && (
        <div className="bg-muted/10">
          {children}
        </div>
      )}
    </div>
  );
};
