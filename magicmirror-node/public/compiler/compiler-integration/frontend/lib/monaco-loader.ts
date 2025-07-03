import * as monaco from 'monaco-editor';
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker';
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker';
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';

// Configure Monaco Editor worker paths with error handling
if (typeof self !== 'undefined') {
  self.MonacoEnvironment = {
    getWorker(_, label) {
      try {
        if (label === 'json') {
          return new jsonWorker();
        }
        if (label === 'css' || label === 'scss' || label === 'less') {
          return new cssWorker();
        }
        if (label === 'html' || label === 'handlebars' || label === 'razor') {
          return new htmlWorker();
        }
        if (label === 'typescript' || label === 'javascript') {
          return new tsWorker();
        }
        return new editorWorker();
      } catch (error) {
        console.warn('Failed to create worker for', label, error);
        return new editorWorker();
      }
    }
  };
}

// Configure Monaco Editor
export const setupMonaco = () => {
  // Set up themes
  monaco.editor.defineTheme('programiz-light', {
    base: 'vs',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '22c55e', fontStyle: 'italic' },
      { token: 'string', foreground: 'ea580c' },
      { token: 'keyword', foreground: '3b82f6' },
      { token: 'number', foreground: 'dc2626' },
      { token: 'operator', foreground: '6b7280' },
    ],
    colors: {
      'editor.background': '#ffffff',
      'editor.foreground': '#374151',
      'editorLineNumber.foreground': '#6b7280',
      'editorLineNumber.activeForeground': '#374151',
      'editor.lineHighlightBackground': '#f9fafb',
      'editor.selectionBackground': '#dbeafe',
      'editorCursor.foreground': '#374151',
    }
  });

  monaco.editor.defineTheme('programiz-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '4ade80', fontStyle: 'italic' },
      { token: 'string', foreground: 'fb923c' },
      { token: 'keyword', foreground: '60a5fa' },
      { token: 'number', foreground: 'f87171' },
      { token: 'operator', foreground: '9ca3af' },
    ],
    colors: {
      'editor.background': '#111827',
      'editor.foreground': '#f9fafb',
      'editorLineNumber.foreground': '#6b7280',
      'editorLineNumber.activeForeground': '#f9fafb',
      'editor.lineHighlightBackground': '#1f2937',
      'editor.selectionBackground': '#1e40af',
      'editorCursor.foreground': '#f9fafb',
    }
  });

  // Configure languages
  monaco.languages.typescript.javascriptDefaults.setEagerModelSync(true);
  monaco.languages.typescript.typescriptDefaults.setEagerModelSync(true);
};

export const createEditor = (
  container: HTMLElement,
  language: string,
  value: string,
  theme: 'programiz-light' | 'programiz-dark' = 'programiz-light'
) => {
  return monaco.editor.create(container, {
    value,
    language: getMonacoLanguage(language),
    theme,
    fontSize: 14,
    fontFamily: 'Fira Code, Consolas, Monaco, monospace',
    lineNumbers: 'on',
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    automaticLayout: true,
    wordWrap: 'on',
    tabSize: 4,
    insertSpaces: true,
    scrollbar: {
      vertical: 'auto',
      horizontal: 'auto',
    },
  });
};

const getMonacoLanguage = (language: string): string => {
  const languageMap: Record<string, string> = {
    python: 'python',
    javascript: 'javascript',
    java: 'java',
    cpp: 'cpp',
    c: 'c',
    go: 'go',
    rust: 'rust',
    html: 'html',
  };
  
  return languageMap[language] || 'plaintext';
};

export { monaco };
