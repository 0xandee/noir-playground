import { useEffect, useRef, useState } from 'react';
import Editor, { Monaco } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import { LineAnalysisService, LineAnalysisResult } from '@/services/LineAnalysisService';

interface NoirEditorWithHoverProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  language?: string;
  cargoToml?: string;
  onLineAnalysis?: (analysis: LineAnalysisResult) => void;
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
      'editor.background': '#1E1E1E',
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

export const NoirEditorWithHover: React.FC<NoirEditorWithHoverProps> = ({ 
  value, 
  onChange, 
  disabled = false, 
  language = 'noir',
  cargoToml,
  onLineAnalysis
}) => {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const lineAnalysisService = useRef<LineAnalysisService>(new LineAnalysisService());
  const [hoverContent, setHoverContent] = useState<LineAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const hoverProviderRegistered = useRef<boolean>(false);
  const analysisCache = useRef<Map<string, LineAnalysisResult>>(new Map());
  const decorationIds = useRef<string[]>([]);

  // Debug: Log the value prop
  useEffect(() => {
    console.log('NoirEditorWithHover received value:', value?.length || 0, 'characters');
  }, [value]);

  // Function to create hover content - simplified to focus only on ACIR opcodes
  const createHoverContent = (lineNumber: number, lineText: string, analysis: LineAnalysisResult) => {
    console.log(`[HOVER] Step 6.1: createHoverContent called for line ${lineNumber}`);
    console.log(`[HOVER] Step 6.2: Analysis data:`, analysis);
    
    const contents: monaco.IMarkdownString[] = [];

    if (analysis.error) {
      console.log(`[HOVER] Step 6.3: Error case - ${analysis.error}`);
      contents.push({
        value: `❌ **Error:** ${analysis.error}`
      });
    } else {
      console.log(`[HOVER] Step 6.3: Success case - opcodes length: ${analysis.opcodes.length}`);
      // Only show ACIR opcodes - clean and focused
      if (analysis.opcodes.length > 0) {
        console.log(`[HOVER] Step 6.4: Adding opcodes:`, analysis.opcodes);
        contents.push({
          value: `**🔧 ACIR Opcodes:**`
        });
        contents.push({
          value: `\`${analysis.opcodes.join('`, `')}\``
        });
      } else {
        console.log(`[HOVER] Step 6.4: No opcodes, showing "No opcodes generated"`);
        contents.push({
          value: `**🔧 ACIR Opcodes:** No opcodes generated`
        });
      }
    }

    console.log(`[HOVER] Step 6.5: Final hover contents:`, contents);

    return {
      range: new monaco.Range(lineNumber, 1, lineNumber, lineText.length),
      contents
    };
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
        },
        hoverMessage: {
          value: `**ACIR Analysis:** ${analysis.opcodes.length} opcodes, ${analysis.constraints.length} constraints`
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
    
    // Force set the enhanced theme
    monaco.editor.setTheme(language === 'noir' ? 'noir-enhanced' : 'vs-dark');
    
    // Add CSS for inline analysis decorations
    const style = document.createElement('style');
    style.textContent = `
      .acir-analysis-inline {
        color: #888 !important;
        font-style: italic !important;
        font-size: 0.9em !important;
      }
    `;
    document.head.appendChild(style);
    
    // Debug: Log editor state
    console.log('Editor mounted, current value:', editor.getValue().length, 'characters');
    console.log('Expected value:', value?.length || 0, 'characters');
    
    // Ensure the editor has the correct value
    if (value && editor.getValue() !== value) {
      console.log('Setting editor value...');
      editor.setValue(value);
    }

    // Register hover provider for line-by-line analysis (only once)
    if (!hoverProviderRegistered.current) {
      monaco.languages.registerHoverProvider('noir', {
        provideHover: async (model, position) => {
          const lineNumber = position.lineNumber;
          const lineText = model.getLineContent(lineNumber);
          
          console.log(`[HOVER] Step 1: User hovered over line ${lineNumber}: "${lineText.trim()}"`);
          
          // Skip empty lines or comments
          if (!lineText.trim() || lineText.trim().startsWith('//') || lineText.trim().startsWith('/*')) {
            console.log(`[HOVER] Step 2: Skipping line ${lineNumber} (empty or comment)`);
            return null;
          }

          // Create cache key
          const cacheKey = `${lineNumber}_${lineText.trim()}`;
          console.log(`[HOVER] Step 3: Cache key: "${cacheKey}"`);
          
          // Check cache first
          if (analysisCache.current.has(cacheKey)) {
            console.log(`[HOVER] Step 4: Found cached analysis for line ${lineNumber}`);
            const cachedAnalysis = analysisCache.current.get(cacheKey)!;
            return createHoverContent(lineNumber, lineText, cachedAnalysis);
          }

          console.log(`[HOVER] Step 4: No cache found, starting analysis for line ${lineNumber}`);
          setIsAnalyzing(true);
          
          try {
            console.log(`[HOVER] Step 5: Calling LineAnalysisService.analyzeLine()`);
            const analysis = await lineAnalysisService.current.analyzeLine({
              sourceCode: value,
              lineNumber,
              cargoToml
            });

            console.log(`[HOVER] Step 6: Analysis completed:`, analysis);

            // Cache the result
            analysisCache.current.set(cacheKey, analysis);
            setHoverContent(analysis);

            // Add inline decoration to show opcode/constraint count
            addInlineDecoration(editor, lineNumber, analysis);

            return createHoverContent(lineNumber, lineText, analysis);

          } catch (error) {
            console.error('Hover analysis failed:', error);
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
            console.error('Click analysis failed:', error);
          });
        }
      }
    });
  };

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      onChange(value);
      // Clear cache when code changes
      lineAnalysisService.current.clearCache();
      analysisCache.current.clear();
      
      // Clear all decorations
      if (editorRef.current) {
        const model = editorRef.current.getModel();
        if (model && decorationIds.current.length > 0) {
          model.deltaDecorations(decorationIds.current, []);
          decorationIds.current = [];
        }
      }
    }
  };

  // Update editor value when prop changes
  useEffect(() => {
    if (editorRef.current && value !== undefined) {
      const currentValue = editorRef.current.getValue();
      if (currentValue !== value) {
        editorRef.current.setValue(value);
      }
    }
  }, [value]);

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
          fontSize: 14,
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
          }
        }}
      />
      
      {/* Analysis indicator */}
      {isAnalyzing && (
        <div className="absolute top-2 right-2 bg-primary/20 text-primary text-xs px-2 py-1 rounded">
          Analyzing...
        </div>
      )}
    </div>
  );
};
