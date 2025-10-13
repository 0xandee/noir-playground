import { useEffect, useRef, useState, forwardRef, useImperativeHandle, useCallback } from 'react';
import Editor, { Monaco } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import { LineAnalysisService, LineAnalysisResult } from '@/services/LineAnalysisService';
import { HeatmapDecorationService, DecorationOptions } from '@/services/HeatmapDecorationService';
import { NoirProfilerService } from '@/services/NoirProfilerService';
import { CircuitComplexityReport, MetricType, MetricsDelta, ExpressionMetrics, LineMetrics } from '@/types/circuitMetrics';
import { useDebug } from '@/contexts/DebugContext';

interface NoirEditorWithHoverProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  language?: string;
  cargoToml?: string;
  onLineAnalysis?: (analysis: LineAnalysisResult) => void;
  // New heatmap props
  enableHeatmap?: boolean;
  heatmapMetricType?: MetricType;
  heatmapThreshold?: number;
  showInlineMetrics?: boolean;
  showGutterHeat?: boolean;
  onComplexityReport?: (report: CircuitComplexityReport) => void;
}

const registerNoirLanguage = (monaco: Monaco) => {
  // Register Noir language
  monaco.languages.register({ id: 'noir' });

  // Define enhanced Noir syntax highlighting
  monaco.languages.setMonarchTokensProvider('noir', {
    tokenizer: {
      root: [
        // Comments
        [/\/\/.*$/, 'comment'],
        [/\/\*/, 'comment', '@comment'],

        // Keywords
        [/\b(fn|pub|priv|constrain|assert|let|mut|if|else|for|while|return|struct|impl|trait|use|mod|type|const|static|where|self|Self|true|false|global|unconstrained|contract|library|comptime|dep|crate|main)\b/, 'keyword'],

        // Types
        [/\b(Field|bool|u8|u16|u32|u64|u128|i8|i16|i32|i64|i128|str|String|Vec|Option|Result)\b/, 'type'],

        // Enhanced constraint highlighting
        [/\bassert\s*\(/, 'constraint.assert'],
        [/\bconstrain\s*\(/, 'constraint.constrain'],

        // Opcode-related highlighting
        [/\bas\s+\w+/, 'opcode.cast'],
        [/\bField\b/, 'type.field'],
        [/\bu\d+\b/, 'type.integer'],

        // Performance-critical operations
        [/\b\w+\s*\+\s*\w+/, 'operation.arithmetic'],
        [/\b\w+\s*\*\s*\w+/, 'operation.arithmetic'],
        [/\b\w+\s*>\s*\w+/, 'operation.comparison'],
        [/\b\w+\s*<\s*\w+/, 'operation.comparison'],
        [/\b\w+\s*==\s*\w+/, 'operation.comparison'],
        [/\b\w+\s*!=\s*\w+/, 'operation.comparison'],

        // Numbers
        [/\b\d+\b/, 'number'],
        [/\b0x[0-9a-fA-F]+\b/, 'number'],

        // Strings
        [/"([^"\\]|\\.)*$/, 'string.invalid'],
        [/"/, 'string', '@string'],

        // Identifiers
        [/[a-zA-Z_][a-zA-Z0-9_]*/, 'identifier'],

        // Operators
        [/[+\-*/%=!<>&|^~]/, 'operator'],

        // Delimiters
        [/[{}()[\];,.]/, 'delimiter'],
      ],

      comment: [
        [/\*\//, 'comment', '@pop'],
        [/./, 'comment']
      ],

      string: [
        [/[^\\"]+/, 'string'],
        [/\\./, 'string.escape.invalid'],
        [/"/, 'string', '@pop']
      ],

      // Enhanced constraint tokenization
      'constraint.assert': [
        [/\)/, 'constraint.assert', '@pop'],
        [/./, 'constraint.assert']
      ],
      'constraint.constrain': [
        [/\)/, 'constraint.constrain', '@pop'],
        [/./, 'constraint.constrain']
      ]
    }
  });

  // Define enhanced Noir theme
  monaco.editor.defineTheme('noir-enhanced', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '6A9955' },
      { token: 'keyword', foreground: '569CD6', fontStyle: 'bold' },
      { token: 'type', foreground: '4EC9B0' },
      { token: 'type.field', foreground: '4EC9B0', fontStyle: 'bold' },
      { token: 'type.integer', foreground: '4EC9B0' },
      { token: 'number', foreground: 'B5CEA8' },
      { token: 'string', foreground: 'CE9178' },
      { token: 'identifier', foreground: 'D4D4D4' },
      { token: 'operator', foreground: 'D4D4D4' },
      { token: 'delimiter', foreground: 'D4D4D4' },

      // Enhanced constraint highlighting
      { token: 'constraint.assert', foreground: 'FF6B6B', fontStyle: 'bold' },
      { token: 'constraint.constrain', foreground: '4ECDC4', fontStyle: 'bold' },
      { token: 'opcode.cast', foreground: 'FFE66D' },
      { token: 'operation.arithmetic', foreground: 'A8E6CF' },
      { token: 'operation.comparison', foreground: 'FFD93D' }
    ],
    colors: {
      'editor.background': '#100e0f',
      'editor.foreground': '#D4D4D4',
      'editorLineNumber.foreground': '#858585',
      'editorLineNumber.activeForeground': '#C6C6C6',
      'editor.selectionBackground': '#264F78',
      'editor.inactiveSelectionBackground': '#3A3D41',
      'editorCursor.foreground': '#AEAFAD',
      'editorWhitespace.foreground': '#404040'
    }
  });

  // Configure auto-closing pairs
  monaco.languages.setLanguageConfiguration('noir', {
    brackets: [
      ['{', '}'],
      ['[', ']'],
      ['(', ')']
    ],
    autoClosingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '(', close: ')' },
      { open: '"', close: '"' },
      { open: "'", close: "'" }
    ]
  });
};

export const NoirEditorWithHover = forwardRef<monaco.editor.IStandaloneCodeEditor | null, NoirEditorWithHoverProps>(({
  value,
  onChange,
  disabled = false,
  language = 'noir',
  cargoToml,
  onLineAnalysis,
  // New heatmap props with defaults
  enableHeatmap = false,
  heatmapMetricType = 'acir',
  heatmapThreshold = 0, // Show all lines with any opcodes
  showInlineMetrics = true,
  showGutterHeat = true,
  onComplexityReport
}, ref) => {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const lineAnalysisService = useRef<LineAnalysisService>(new LineAnalysisService());
  const [hoverContent, setHoverContent] = useState<LineAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const hoverProviderRegistered = useRef<boolean>(false);
  const decorationIds = useRef<string[]>([]);

  // Debug context for current line highlighting
  const { currentLine, isDebugging } = useDebug();
  const debugLineDecorationIds = useRef<string[]>([]);

  // New heatmap-related state and services
  const heatmapService = useRef<HeatmapDecorationService>(new HeatmapDecorationService());
  const profilerService = useRef<NoirProfilerService>(new NoirProfilerService());
  const [complexityReport, setComplexityReport] = useState<CircuitComplexityReport | null>(null);
  const [isGeneratingHeatmap, setIsGeneratingHeatmap] = useState(false);
  const updateHeatmapTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Refs to track current state for hover provider
  const enableHeatmapRef = useRef(enableHeatmap);
  const complexityReportRef = useRef(complexityReport);

  // Expose editor ref to parent
  useImperativeHandle(ref, () => editorRef.current);

  // Update refs when props/state change
  useEffect(() => {
    enableHeatmapRef.current = enableHeatmap;
  }, [enableHeatmap]);

  useEffect(() => {
    complexityReportRef.current = complexityReport;
  }, [complexityReport]);

  // Value prop logging removed




  // Function to generate and apply heatmap
  const generateHeatmap = useCallback(async (sourceCode: string): Promise<void> => {
    if (!enableHeatmap || !sourceCode.trim()) return;

    setIsGeneratingHeatmap(true);

    try {
      // Clear cache to force fresh generation (ensures deduplication fix is applied)
      profilerService.current.clearCache();

      // Always generate fresh complexity report to ensure accuracy after code changes
      const report = await profilerService.current.getComplexityReport(
        sourceCode,
        cargoToml,
        'main.nr'
      );

      if (report) {
        setComplexityReport(report);
        onComplexityReport?.(report);
      }

      if (report) {
        // Apply heatmap decorations
        try {
          const decorationOptions: DecorationOptions = {
            showGutterHeat,
            showInlineMetrics,
            showDeltaIndicators: false, // TODO: implement delta tracking
            metricType: heatmapMetricType,
            threshold: heatmapThreshold
          };


          heatmapService.current.applyHeatmapDecorations(report, decorationOptions, undefined, 'main.nr');
        } catch (decorationError) {
          console.warn('Failed to apply heatmap decorations:', decorationError);
          // Continue without heatmap decorations
        }
      }
    } catch (error) {
      // Failed to generate heatmap
    } finally {
      setIsGeneratingHeatmap(false);
    }
  }, [enableHeatmap, cargoToml, heatmapMetricType, heatmapThreshold, showGutterHeat, showInlineMetrics, onComplexityReport]);

  // Debounced heatmap update
  const scheduleHeatmapUpdate = useCallback((sourceCode: string): void => {
    if (updateHeatmapTimeoutRef.current) {
      clearTimeout(updateHeatmapTimeoutRef.current);
    }

    updateHeatmapTimeoutRef.current = setTimeout(() => {
      generateHeatmap(sourceCode);
    }, 1000); // 1 second debounce
  }, [generateHeatmap]);

  // Function to clear caches (for debugging)
  // Clear caches function removed - will be implemented later

  // Helper function to get constraint type icon
  const getConstraintIcon = (type: string): string => {
    switch (type) {
      case 'assert':
      case 'constrain':
        return '⚡';
      case 'comparison':
        return '⚖️';
      case 'arithmetic':
        return '🧮';
      case 'type_conversion':
        return '🔄';
      default:
        return '🛡️';
    }
  };

  // Helper function to get emoji for constraint type
  const getConstraintTypeEmoji = (type: string): string => {
    const emojiMap: Record<string, string> = {
      'assert': '⚠️',
      'constrain': '🔒',
      'comparison': '⚖️',
      'arithmetic': '🧮',
      'type_conversion': '🔄'
    };
    return emojiMap[type] || '🔧';
  };

  // Helper function to get human-readable name for constraint type
  const getConstraintTypeName = (type: string): string => {
    const nameMap: Record<string, string> = {
      'assert': 'Assertions',
      'constrain': 'Constraints',
      'comparison': 'Comparisons',
      'arithmetic': 'Arithmetic',
      'type_conversion': 'Type Conversions'
    };
    return nameMap[type] || 'Unknown';
  };

  // Function to create hover content - always use simplified format
  const createHoverContent = (lineNumber: number, lineText: string, analysis: LineAnalysisResult) => {
    const contents: monaco.IMarkdownString[] = [];

    if (analysis.error) {
      contents.push({
        value: `❌ **Error:** ${analysis.error}`,
        supportHtml: false
      });
    } else {
      // Get complexity report data if available (use current ref values)
      const currentComplexityReport = complexityReportRef.current;
      const currentEnableHeatmap = enableHeatmapRef.current;

      const lineMetrics = currentComplexityReport?.files[0]?.lines.find(l => l.lineNumber === lineNumber);
      const hotspotRank = currentComplexityReport?.hotspots.findIndex(h => h.lineNumber === lineNumber);

      // Always use simplified format if we have line metrics and expressions
      if (lineMetrics && lineMetrics.expressions && lineMetrics.expressions.length > 0) {
        // Create simplified markdown for expressions
        const tableMarkdown = createExpressionsSimplifiedMarkdown(lineMetrics, hotspotRank, currentEnableHeatmap);
        contents.push({
          value: tableMarkdown,
          supportHtml: false
        });
      }
    }

    return {
      range: new monaco.Range(lineNumber, 1, lineNumber, lineText.length),
      contents
    };
  };

  // Helper function to create simplified markdown for expressions (simplified approach)
  const createExpressionsSimplifiedMarkdown = (lineMetrics: LineMetrics, hotspotRank: number, enableHeatmap: boolean) => {
    const expressions = lineMetrics.expressions || [];

    // Sort expressions by total cost (ACIR + Brillig + Gates) highest first
    const sortedExpressions = [...expressions].sort((a, b) => {
      const totalA = a.acirOpcodes + a.brilligOpcodes + a.gates;
      const totalB = b.acirOpcodes + b.brilligOpcodes + b.gates;
      return totalB - totalA;
    });

    // Enhanced summary with total at top
    const lineTotalOpcodes = lineMetrics.acirOpcodes + lineMetrics.brilligOpcodes + lineMetrics.gates;
    const linePercentage = lineMetrics.percentage?.toFixed(2) || '0';

    // let markdown = `**Total: ${lineTotalOpcodes} opcodes (${linePercentage}%)**\n\n`;
    let markdown = `\n\n`;

    // // Only show hotspot ranking when heatmap is enabled
    // if (enableHeatmap && hotspotRank !== undefined && hotspotRank >= 0 && hotspotRank < 5) {
    //   markdown += `🎯 Hotspot #${hotspotRank + 1}\n\n`;
    // }

    // Create markdown table for expressions

    if (sortedExpressions.length > 0) {
      markdown += `| Expression | Opcodes | % |\n`;
      markdown += `|:-----------|:-------:|--:|\n`;

      sortedExpressions.forEach(expr => {
        const totalCost = expr.acirOpcodes + expr.brilligOpcodes + expr.gates;
        const percentage = (expr as ExpressionMetrics & { originalPercentage?: number }).originalPercentage || 0;
        const cleanExpression = (expr.expression || '').replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&');
        markdown += `| \`${cleanExpression}\` | \`${totalCost}\` | \`${percentage.toFixed(2)}%\` |\n`;
      });
    }

    return markdown;
  };

  // Function to add inline decoration showing opcode/constraint count
  const addInlineDecoration = (editor: monaco.editor.IStandaloneCodeEditor, lineNumber: number, analysis: LineAnalysisResult) => {
    if (!analysis.opcodes.length && !analysis.constraints.length) return;

    const model = editor.getModel();
    if (!model) return;

    // Clear existing decorations for this line
    const existingDecorations = decorationIds.current.filter(id => {
      const decoration = model.getDecorationRange(id);
      return decoration && decoration.startLineNumber === lineNumber;
    });

    if (existingDecorations.length > 0) {
      model.deltaDecorations(existingDecorations, []);
      decorationIds.current = decorationIds.current.filter(id => !existingDecorations.includes(id));
    }

    // Create inline decoration
    const lineLength = model.getLineLength(lineNumber);
    const decoration = {
      range: new monaco.Range(lineNumber, lineLength + 1, lineNumber, lineLength + 1),
      options: {
        after: {
          content: ` // ${analysis.opcodes.length} opcodes, ${analysis.constraints.length} constraints`,
          inlineClassName: 'acir-analysis-inline',
          inlineClassNameAffectsLetterSpacing: true
        }
      }
    };

    // Add the decoration
    const newDecorationIds = model.deltaDecorations([], [decoration]);
    decorationIds.current.push(...newDecorationIds);
  };

  const handleEditorDidMount = (editor: monaco.editor.IStandaloneCodeEditor, monaco: Monaco) => {
    editorRef.current = editor;
    registerNoirLanguage(monaco);

    // Initialize heatmap service
    heatmapService.current.initialize(editor);

    // Force set the enhanced theme
    monaco.editor.setTheme(language === 'noir' ? 'noir-enhanced' : 'vs-dark');

    // Add CSS for inline analysis decorations and Monaco hover fixes
    const style = document.createElement('style');
    style.textContent = `
      .acir-analysis-inline {
        color: #888 !important;
        font-style: italic !important;
        font-size: 0.9em !important;
      }

      /* Monaco hover widget full height fixes */
      .monaco-hover {
        max-height: 80vh !important;
        overflow: visible !important;
      }

      .monaco-hover .monaco-hover-content {
        max-height: 80vh !important;
        overflow-y: auto !important;
        overflow-x: hidden !important;
      }

      .monaco-hover .monaco-scrollable-element {
        max-height: none !important;
      }

      .monaco-hover .monaco-scrollable-element > .scrollbar {
        display: none !important;
      }

      /* Debug current line highlighting */
      .debug-current-line {
        background-color: rgba(255, 204, 0, 0.15) !important;
        border-left: 3px solid #ffcc00 !important;
      }

      .debug-current-line-glyph {
        background-color: #ffcc00 !important;
        width: 4px !important;
        margin-left: 3px !important;
      }
    `;
    document.head.appendChild(style);

    // Ensure the editor has the correct value
    if (value && editor.getValue() !== value) {
      editor.setValue(value);
    }

    // Generate initial heatmap if enabled
    if (enableHeatmap && value.trim()) {
      generateHeatmap(value);
    }

    // Register hover provider for line-by-line analysis (only once)
    if (!hoverProviderRegistered.current) {
      monaco.languages.registerHoverProvider('noir', {
        provideHover: async (model, position) => {
          // Only show hover tooltips when heatmap is enabled
          if (!enableHeatmapRef.current) {
            return null;
          }

          const lineNumber = position.lineNumber;
          const lineText = model.getLineContent(lineNumber);

          // Skip empty lines or comments
          if (!lineText.trim() || lineText.trim().startsWith('//') || lineText.trim().startsWith('/*')) {
            return null;
          }

          setIsAnalyzing(true);

          try {
            // Use model content instead of value prop to ensure we get the actual editor content
            const actualSourceCode = model.getValue();

            const analysis = await lineAnalysisService.current.analyzeLine({
              sourceCode: actualSourceCode,
              lineNumber,
              cargoToml
            });

            setHoverContent(analysis);

            // Add inline decoration to show opcode/constraint count
            addInlineDecoration(editor, lineNumber, analysis);

            return createHoverContent(lineNumber, lineText, analysis);

          } catch (error) {
            return {
              range: new monaco.Range(lineNumber, 1, lineNumber, lineText.length),
              contents: [{
                value: `❌ **Analysis Error:** ${error instanceof Error ? error.message : 'Unknown error'}`
              }]
            };
          } finally {
            setIsAnalyzing(false);
          }
        }
      });
      hoverProviderRegistered.current = true;
    }

    // Add click handler for line analysis
    editor.onMouseDown((e) => {
      if (e.target.position) {
        const lineNumber = e.target.position.lineNumber;
        const lineText = editor.getModel()?.getLineContent(lineNumber) || '';

        if (lineText.trim() && !lineText.trim().startsWith('//')) {
          // Trigger line analysis on click
          lineAnalysisService.current.analyzeLine({
            sourceCode: value,
            lineNumber,
            cargoToml
          }).then(analysis => {
            onLineAnalysis?.(analysis);
          }).catch(error => {
            // Click analysis failed
          });
        }
      }
    });
  };

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      onChange(value);

      // Clear cache for the old source code when code changes
      if (editorRef.current) {
        const model = editorRef.current.getModel();
        if (model) {
          const oldSourceCode = model.getValue();
          lineAnalysisService.current.clearCacheForSource(oldSourceCode, cargoToml);

          // Clear all decorations when code changes
          if (decorationIds.current.length > 0) {
            model.deltaDecorations(decorationIds.current, []);
            decorationIds.current = [];
          }

          // Clear heatmap decorations and complexity report, then schedule update
          if (enableHeatmap) {
            heatmapService.current.clearDecorations();
            setComplexityReport(null); // Clear stale complexity report
            scheduleHeatmapUpdate(value);
          }
        }
      }
    }
  };

  // Update editor value when prop changes
  useEffect(() => {
    if (editorRef.current && value !== undefined) {
      const currentValue = editorRef.current.getValue();
      if (currentValue !== value) {
        // Clear cache for the old source code when switching examples
        lineAnalysisService.current.clearCacheForSource(currentValue, cargoToml);

        // Clear complexity report and heatmap decorations when switching examples
        setComplexityReport(null);
        heatmapService.current.clearDecorations();

        // Cancel any pending heatmap generation
        if (updateHeatmapTimeoutRef.current) {
          clearTimeout(updateHeatmapTimeoutRef.current);
          updateHeatmapTimeoutRef.current = null;
        }
        setIsGeneratingHeatmap(false);

        editorRef.current.setValue(value);

        // Regenerate heatmap if enabled and we have content
        if (enableHeatmap && value.trim()) {
          generateHeatmap(value);
        }
      }
    }
  }, [value, cargoToml, enableHeatmap, generateHeatmap]);

  // Effect to handle heatmap configuration changes
  useEffect(() => {
    try {
      if (enableHeatmap && complexityReport && editorRef.current) {
        const decorationOptions: DecorationOptions = {
          showGutterHeat,
          showInlineMetrics,
          showDeltaIndicators: false,
          metricType: heatmapMetricType,
          threshold: heatmapThreshold
        };

        heatmapService.current.applyHeatmapDecorations(complexityReport, decorationOptions, undefined, 'main.nr');
      } else if (!enableHeatmap) {
        heatmapService.current.clearDecorations();
      }
    } catch (error) {
      console.warn('Failed to apply heatmap configuration changes:', error);
    }
  }, [enableHeatmap, heatmapMetricType, heatmapThreshold, showInlineMetrics, showGutterHeat, complexityReport]);

  // Effect to regenerate heatmap when cargoToml changes
  useEffect(() => {
    if (enableHeatmap && value.trim()) {
      scheduleHeatmapUpdate(value);
    }
  }, [cargoToml, enableHeatmap, value, scheduleHeatmapUpdate]);

  // Effect to highlight current debug line
  useEffect(() => {
    try {
      // Validation: Check if editor is mounted
      if (!editorRef.current) {
        console.debug('[DebugHighlight] Editor ref not available');
        return;
      }

      const model = editorRef.current.getModel();
      if (!model) {
        console.debug('[DebugHighlight] Editor model not available');
        return;
      }

      // Clear existing debug line decorations
      if (debugLineDecorationIds.current.length > 0) {
        console.debug('[DebugHighlight] Clearing previous decorations:', debugLineDecorationIds.current);
        try {
          model.deltaDecorations(debugLineDecorationIds.current, []);
          debugLineDecorationIds.current = [];
        } catch (clearError) {
          console.error('[DebugHighlight] Error clearing decorations:', clearError);
          // Reset the decoration IDs even if clearing failed
          debugLineDecorationIds.current = [];
        }
      }

      // Apply debug line decoration if debugging and currentLine is set
      if (isDebugging && currentLine !== null && currentLine > 0) {
        console.log('[DebugHighlight] Applying decoration to line:', currentLine, '(isDebugging:', isDebugging, ')');

        // Validate line number is within bounds
        const lineCount = model.getLineCount();
        if (currentLine > lineCount) {
          console.warn('[DebugHighlight] Current line', currentLine, 'exceeds line count', lineCount);
          return;
        }

        const decoration = {
          range: new monaco.Range(currentLine, 1, currentLine, 1),
          options: {
            isWholeLine: true,
            className: 'debug-current-line',
            glyphMarginClassName: 'debug-current-line-glyph',
            overviewRuler: {
              color: '#ffcc00',
              position: monaco.editor.OverviewRulerLane.Full
            }
          }
        };

        try {
          const newDecorationIds = model.deltaDecorations([], [decoration]);
          debugLineDecorationIds.current = newDecorationIds;
          console.log('[DebugHighlight] Decoration applied successfully:', newDecorationIds);

          // Scroll to the current line and center it
          editorRef.current.revealLineInCenter(currentLine, monaco.editor.ScrollType.Smooth);
        } catch (decorationError) {
          console.error('[DebugHighlight] Error applying decoration:', decorationError);
        }
      } else {
        console.debug('[DebugHighlight] Not applying decoration - isDebugging:', isDebugging, 'currentLine:', currentLine);
      }
    } catch (error) {
      console.error('[DebugHighlight] Unexpected error in debug line highlighting:', error);
    }
  }, [currentLine, isDebugging]);

  // Cleanup caches when component unmounts
  useEffect(() => {
    return () => {
      lineAnalysisService.current.clearCaches();
      heatmapService.current.destroy();
      if (updateHeatmapTimeoutRef.current) {
        clearTimeout(updateHeatmapTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="relative h-full">
      <Editor
        height="100%"
        language={language}
        theme={language === 'noir' ? 'noir-enhanced' : 'vs-dark'}
        value={value || ''}
        onChange={handleEditorChange}
        onMount={handleEditorDidMount}
        loading={<div className="flex items-center justify-center h-full">Loading editor...</div>}
        options={{
          readOnly: disabled,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          automaticLayout: true,
          fontSize: 13,
          fontFamily: 'Consolas, Monaco, "Courier New", monospace',
          lineHeight: 21,
          tabSize: 2,
          insertSpaces: true,
          wordWrap: 'on',
          bracketPairColorization: { enabled: true },
          folding: true,
          showFoldingControls: 'always',
          renderLineHighlight: 'line',
          selectionHighlight: true,
          smoothScrolling: true,
          cursorBlinking: 'blink',
          autoIndent: 'advanced',
          padding: { top: 12 },
          hover: {
            enabled: true,
            delay: 300
          },
          // Enable glyph margin for debug indicators (breakpoints, current line marker)
          glyphMargin: true,
          // Enable overview ruler lanes for debug position markers
          overviewRulerLanes: 3
        }}
      />

      {/* 
      {isAnalyzing && (
        <div className="absolute top-2 right-2 bg-primary/20 text-primary text-xs px-2 py-1 rounded">
          Analyzing...
        </div>
      )}

      {isGeneratingHeatmap && (
        <div className="absolute top-8 right-2 bg-orange-500/20 text-orange-500 text-xs px-2 py-1 rounded flex items-center gap-1">
          <div className="animate-spin rounded-full h-3 w-3 border border-orange-500 border-t-transparent"></div>
          Generating heatmap...
        </div>
      )}

      {enableHeatmap && complexityReport && !isGeneratingHeatmap && (
        <div className="absolute top-8 right-2 bg-green-500/20 text-green-500 text-xs px-2 py-1 rounded">
          Heatmap: {heatmapMetricType.toUpperCase()}
        </div>
      )} */}
    </div>
  );
});
