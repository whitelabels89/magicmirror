// Main components export
export { CodeEditor } from './components/code-editor';
export { OutputPanel } from './components/output-panel';
export { LanguageSelector } from './components/language-selector';
export { Header } from './components/header';
export { ShareModal } from './components/share-modal';

// Utility exports
export { getDefaultLanguage, getLanguageById, SUPPORTED_LANGUAGES } from './lib/languages';
export { setupMonaco, createEditor } from './lib/monaco-loader';
export { cn } from './lib/utils';

// Hook exports
export { useTheme } from './hooks/use-theme';

// Type exports
export type { Language } from '../shared/schema';