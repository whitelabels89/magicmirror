import React, { useState } from 'react';
import { CodeEditor } from './frontend/components/code-editor';
import { OutputPanel } from './frontend/components/output-panel';
import { LanguageSelector } from './frontend/components/language-selector';
import { Header } from './frontend/components/header';
import { getDefaultLanguage } from './frontend/lib/languages';
import type { Language } from './shared/schema';

// Main App component for production
export default function App() {
  const [selectedLanguage, setSelectedLanguage] = useState<Language>(getDefaultLanguage());
  const [code, setCode] = useState<string>(selectedLanguage.defaultCode);
  const [isEditorExpanded, setIsEditorExpanded] = useState(false);

  const handleLanguageChange = (language: Language) => {
    setSelectedLanguage(language);
    setCode(language.defaultCode);
  };

  return (
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
  );
}