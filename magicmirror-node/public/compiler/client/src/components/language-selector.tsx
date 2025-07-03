import { SUPPORTED_LANGUAGES } from '@/lib/languages';
import type { Language } from '@shared/schema';

interface LanguageSelectorProps {
  selectedLanguage: Language;
  onLanguageChange: (language: Language) => void;
}

export function LanguageSelector({ selectedLanguage, onLanguageChange }: LanguageSelectorProps) {
  return (
    <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center space-x-1 py-3 overflow-x-auto scrollbar-hide">
          {SUPPORTED_LANGUAGES.map((language) => (
            <button
              key={language.id}
              onClick={() => onLanguageChange(language)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg border transition-colors whitespace-nowrap ${
                selectedLanguage.id === language.id
                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 border-transparent'
              }`}
            >
              <img src={language.icon} alt={language.name} className="w-5 h-5" />
              <span className="text-sm font-medium">
                {selectedLanguage.id === language.id ? `Online ${language.displayName}` : language.displayName}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
