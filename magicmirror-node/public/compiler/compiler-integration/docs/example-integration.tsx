import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CodeEditor } from '../frontend/components/code-editor';
import { OutputPanel } from '../frontend/components/output-panel';
import { LanguageSelector } from '../frontend/components/language-selector';
import { Header } from '../frontend/components/header';
import { getDefaultLanguage } from '../frontend/lib/languages';
import type { Language } from '../shared/schema';

// Create query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

// Theme provider (simplified version)
const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  
  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', theme === 'light');
  };

  return (
    <div className={theme}>
      <button onClick={toggleTheme} className="fixed top-4 right-4 p-2 border rounded">
        {theme === 'light' ? '🌙' : '☀️'}
      </button>
      {children}
    </div>
  );
};

// Main compiler component
export function OnlineCompiler() {
  const [selectedLanguage, setSelectedLanguage] = useState<Language>(getDefaultLanguage());
  const [code, setCode] = useState<string>(selectedLanguage.defaultCode);
  const [isEditorExpanded, setIsEditorExpanded] = useState(false);

  const handleLanguageChange = (language: Language) => {
    setSelectedLanguage(language);
    setCode(language.defaultCode);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
          <Header />
          
          <div className="max-w-7xl mx-auto px-4 py-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Panel - Language Selector & Code Editor */}
              <div className={`${isEditorExpanded ? 'lg:col-span-12' : 'lg:col-span-7'} space-y-6`}>
                <LanguageSelector
                  selectedLanguage={selectedLanguage}
                  onLanguageChange={handleLanguageChange}
                />
                
                <CodeEditor
                  language={selectedLanguage}
                  code={code}
                  onCodeChange={setCode}
                  isExpanded={isEditorExpanded}
                  onToggleExpand={() => setIsEditorExpanded(!isEditorExpanded)}
                />
              </div>

              {/* Right Panel - Output */}
              {!isEditorExpanded && (
                <div className="lg:col-span-5">
                  <OutputPanel
                    language={selectedLanguage}
                    code={code}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

// Example integration in existing app
export function ExistingAppWithCompiler() {
  const [showCompiler, setShowCompiler] = useState(false);

  return (
    <div>
      {/* Your existing app content */}
      <nav>
        <button onClick={() => setShowCompiler(!showCompiler)}>
          {showCompiler ? 'Hide' : 'Show'} Compiler
        </button>
      </nav>

      {/* Conditional compiler rendering */}
      {showCompiler && (
        <div className="compiler-section">
          <OnlineCompiler />
        </div>
      )}

      {/* Rest of your app */}
    </div>
  );
}

// Example as modal/popup
export function CompilerModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 rounded-lg w-full max-w-6xl h-5/6 overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-semibold">Online Compiler</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            ✕
          </button>
        </div>
        <div className="h-full">
          <OnlineCompiler />
        </div>
      </div>
    </div>
  );
}