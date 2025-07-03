import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Header } from '@/components/header';
import { LanguageSelector } from '@/components/language-selector';
import { CodeEditor } from '@/components/code-editor';
import { OutputPanel } from '@/components/output-panel';
import { getDefaultLanguage, getLanguageById } from '@/lib/languages';
import type { Language, CodeSnippet } from '@shared/schema';

export default function Compiler() {
  const [location] = useLocation();
  const [selectedLanguage, setSelectedLanguage] = useState<Language>(() => {
    try {
      return getDefaultLanguage();
    } catch (error) {
      console.error('Error getting default language:', error);
      // Fallback language if something goes wrong
      return {
        id: "python",
        name: "python",
        displayName: "Python",
        icon: "🐍",
        judge0Id: 71,
        filename: "main.py",
        extension: "py",
        defaultCode: 'print("Hello World")'
      };
    }
  });
  
  const [code, setCode] = useState<string>(() => {
    try {
      return selectedLanguage.defaultCode;
    } catch (error) {
      console.error('Error setting initial code:', error);
      return 'print("Hello World")';
    }
  });
  
  const [isEditorExpanded, setIsEditorExpanded] = useState(false);

  // Check if this is a shared snippet
  const shareId = location.match(/^\/shared\/(.+)$/)?.[1];

  const { data: sharedSnippet, isLoading, error } = useQuery({
    queryKey: [`/api/shared/${shareId}`],
    enabled: !!shareId,
    retry: false
  });

  // Handle query error
  if (error) {
    console.error('Error loading shared snippet:', error);
  }

  useEffect(() => {
    if (sharedSnippet) {
      const snippet = sharedSnippet as CodeSnippet;
      const language = getLanguageById(snippet.language) || getDefaultLanguage();
      setSelectedLanguage(language);
      setCode(snippet.code);
    }
  }, [sharedSnippet]);

  const handleLanguageChange = (language: Language) => {
    setSelectedLanguage(language);
    setCode(language.defaultCode);
  };

  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
  };

  const handleToggleExpand = () => {
    setIsEditorExpanded(!isEditorExpanded);
  };

  if (shareId && isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="text-gray-600 dark:text-gray-400">Loading shared code...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <LanguageSelector 
        selectedLanguage={selectedLanguage} 
        onLanguageChange={handleLanguageChange} 
      />
      
      {/* Main Code Interface */}
      <div className="flex-1 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 h-[calc(100vh-140px)]">
            <CodeEditor
              language={selectedLanguage}
              code={code}
              onCodeChange={handleCodeChange}
              isExpanded={isEditorExpanded}
              onToggleExpand={handleToggleExpand}
            />
            
            <OutputPanel
              language={selectedLanguage}
              code={code}
              isExpanded={isEditorExpanded}
            />
          </div>
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
