import { useEffect, useRef } from 'react';
import Editor, { Monaco } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';

interface NoirEditorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  language?: string;
}

const registerNoirLanguage = (monaco: Monaco) => {
  // Register Noir language
  monaco.languages.register({ id: 'noir' });

  // Define Noir syntax highlighting
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
      ]
    }
  });

  // Define Noir theme
  monaco.editor.defineTheme('noir-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '6A9955' },
      { token: 'keyword', foreground: '569CD6' },
      { token: 'type', foreground: '4EC9B0' },
      { token: 'number', foreground: 'B5CEA8' },
      { token: 'string', foreground: 'CE9178' },
      { token: 'operator', foreground: 'D4D4D4' },
      { token: 'identifier', foreground: '9CDCFE' },
    ],
    colors: {
      'editor.background': '#1E1E1E',
      'editor.foreground': '#D4D4D4',
      'editorLineNumber.foreground': '#858585',
      'editor.selectionBackground': '#264F78',
      'editor.inactiveSelectionBackground': '#3A3D41',
    }
  });

  // Set language configuration
  monaco.languages.setLanguageConfiguration('noir', {
    comments: {
      lineComment: '//',
      blockComment: ['/*', '*/']
    },
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
    ],
    surroundingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '(', close: ')' },
      { open: '"', close: '"' },
      { open: "'", close: "'" }
    ]
  });
};

export const NoirEditor: React.FC<NoirEditorProps> = ({ value, onChange, disabled = false, language = 'noir' }) => {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);

  const handleEditorDidMount = (editor: monaco.editor.IStandaloneCodeEditor, monaco: Monaco) => {
    editorRef.current = editor;
    registerNoirLanguage(monaco);
    
    // Force set the theme after registration
    monaco.editor.setTheme(language === 'noir' ? 'noir-dark' : 'vs-dark');
  };

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      onChange(value);
    }
  };

  return (
    <Editor
      height="100%"
      language={language}
      theme={language === 'noir' ? 'noir-dark' : 'vs-dark'}
      value={value}
      onChange={handleEditorChange}
      onMount={handleEditorDidMount}
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
      }}
    />
  );
};