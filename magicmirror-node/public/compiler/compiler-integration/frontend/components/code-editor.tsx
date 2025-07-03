import { useEffect, useRef, useState } from 'react';
import { Expand, Minimize } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createEditor, setupMonaco, monaco } from '@/lib/monaco-loader';
import { useThemeContext } from './theme-provider';
import type { Language } from '@shared/schema';

interface CodeEditorProps {
  language: Language;
  code: string;
  onCodeChange: (code: string) => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

export function CodeEditor({ 
  language, 
  code, 
  onCodeChange, 
  isExpanded = false, 
  onToggleExpand 
}: CodeEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const monacoEditor = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const { theme } = useThemeContext();
  const [isMonacoLoaded, setIsMonacoLoaded] = useState(false);

  useEffect(() => {
    const initializeEditor = async () => {
      if (editorRef.current && !monacoEditor.current) {
        try {
          setupMonaco();
          
          monacoEditor.current = createEditor(
            editorRef.current,
            language.name,
            code,
            theme === 'dark' ? 'programiz-dark' : 'programiz-light'
          );

          monacoEditor.current.onDidChangeModelContent(() => {
            const newValue = monacoEditor.current?.getValue() || '';
            onCodeChange(newValue);
          });

          setIsMonacoLoaded(true);
        } catch (error) {
          console.error('Failed to initialize Monaco editor:', error);
          setIsMonacoLoaded(false);
        }
      }
    };

    initializeEditor();

    return () => {
      if (monacoEditor.current) {
        try {
          monacoEditor.current.dispose();
          monacoEditor.current = null;
        } catch (error) {
          console.warn('Error disposing Monaco editor:', error);
        }
      }
    };
  }, []);

  useEffect(() => {
    if (monacoEditor.current && isMonacoLoaded) {
      const model = monacoEditor.current.getModel();
      if (model) {
        monaco.editor.setModelLanguage(model, language.name === 'cpp' ? 'cpp' : language.name);
      }
    }
  }, [language.name, isMonacoLoaded]);

  useEffect(() => {
    if (monacoEditor.current && isMonacoLoaded) {
      monacoEditor.current.updateOptions({
        theme: theme === 'dark' ? 'programiz-dark' : 'programiz-light'
      });
    }
  }, [theme, isMonacoLoaded]);

  useEffect(() => {
    if (monacoEditor.current && isMonacoLoaded) {
      const currentValue = monacoEditor.current.getValue();
      if (currentValue !== code) {
        monacoEditor.current.setValue(code);
      }
    }
  }, [code, isMonacoLoaded]);

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col" style={{ height: '500px' }}>
      {/* File Tabs */}
      <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-2">
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-3 py-1 rounded-lg text-sm">
            <img src={language.icon} alt={language.name} className="w-4 h-4" />
            <span>{language.filename}</span>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {onToggleExpand && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleExpand}
              className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
              title={isExpanded ? "Minimize" : "Expand"}
            >
              {isExpanded ? (
                <Minimize className="w-4 h-4" />
              ) : (
                <Expand className="w-4 h-4" />
              )}
            </Button>
          )}
        </div>
      </div>
      
      {/* Code Editor Area */}
      <div className="flex-1 relative bg-white dark:bg-gray-900 min-h-[450px]">
        <div ref={editorRef} className="w-full h-full" style={{ minHeight: '450px' }} />
      </div>
    </div>
  );
}
