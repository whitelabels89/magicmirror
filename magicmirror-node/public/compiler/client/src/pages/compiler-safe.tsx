import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Header } from '@/components/header';
import { LanguageSelector } from '@/components/language-selector';
import { CodeEditor } from '@/components/code-editor';
import { OutputPanel } from '@/components/output-panel';
import { getDefaultLanguage, getLanguageById } from '@/lib/languages';
import type { Language } from '@shared/schema';

// Safe default language fallback
const SAFE_DEFAULT_LANGUAGE: Language = {
  id: "python",
  name: "python",
  displayName: "Python",
  icon: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iIzMwNzZhYSI+PHBhdGggZD0iTTEyIDJjLS44IDAtMS41LjctMS41IDEuNXY1aDNWN2gtMS41YzAtLjMuMy0uNS41LS41czEuNS0uNSAxLjUtLjVINiA5djNIMThjLjguMCAxLjUtLjcgMS41LTEuNVYzLjVjMC0uOC0uNy0xLjUtMS41LTEuNWgtNnptLTUgMTJjLS44IDAtMS41LjctMS41IDEuNXY1YzAgLjguNyAxLjUgMS41IDEuNWg2YzAtLjggMC0xLjUgMC0xLjVzMC0uNS41LS41IDEuNS41IDEuNS41aDEuNWMuOCAwIDEuNS0uNyAxLjUtMS41di01YzAtLjgtLjctMS41LTEuNS0xLjVINy41em0tMyAxaDNjLjMgMCAuNS4yLjUuNXMtLjIuNS0uNS41aC0zVjE1em0xMiAxYy4zIDAgLjUuMi41LjVzLS4yLjUtLjUuNWgtMVYxNWgxeiIvPjwvc3ZnPg==",
  judge0Id: 71,
  filename: "main.py",
  extension: "py",
  defaultCode: `# Online Python compiler (interpreter) to run Python online.
# Write Python 3 code in this online editor and run it.

print("Welcome to Queen's Academy iCoding!")`
};

export default function Compiler() {
  const [location] = useLocation();
  const [selectedLanguage, setSelectedLanguage] = useState<Language>(SAFE_DEFAULT_LANGUAGE);
  const [code, setCode] = useState<string>(SAFE_DEFAULT_LANGUAGE.defaultCode);
  const [isEditorExpanded, setIsEditorExpanded] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize safely
  useEffect(() => {
    try {
      const defaultLang = getDefaultLanguage();
      setSelectedLanguage(defaultLang);
      setCode(defaultLang.defaultCode);
    } catch (error) {
      console.warn('Using fallback language due to initialization error:', error);
      // Already using safe defaults
    }
    setIsInitialized(true);
  }, []);

  const handleLanguageChange = (language: Language) => {
    try {
      setSelectedLanguage(language);
      setCode(language.defaultCode);
    } catch (error) {
      console.error('Error changing language:', error);
    }
  };

  const handleCodeChange = (newCode: string) => {
    try {
      setCode(newCode);
    } catch (error) {
      console.error('Error updating code:', error);
    }
  };

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading compiler...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <Header />
      
      <div className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
          {/* Left Panel - Language Selector & Code Editor */}
          <div className={`${isEditorExpanded ? 'lg:col-span-12' : 'lg:col-span-7'} space-y-6`}>
            <LanguageSelector
              selectedLanguage={selectedLanguage}
              onLanguageChange={handleLanguageChange}
            />
            
            <CodeEditor
              language={selectedLanguage}
              code={code}
              onCodeChange={handleCodeChange}
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

      {/* Footer */}
      <footer className="bg-gray-800 dark:bg-gray-900 text-white py-6 mt-8">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="mb-4 md:mb-0">
              <h3 className="text-lg font-bold">Queen's Academy iCoding</h3>
              <p className="text-gray-300 text-sm">Online Code Compiler & Editor</p>
            </div>
            <div className="text-sm text-gray-400">
              © 2025 Queen's Academy. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}