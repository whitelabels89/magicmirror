import { useState } from 'react';
import { Share2, Play, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ShareModal } from './share-modal';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import type { Language } from '@shared/schema';

interface OutputPanelProps {
  language: Language;
  code: string;
  isExpanded?: boolean;
}

interface ExecutionResult {
  id: number;
  output: string;
  error: string | null;
  status: 'success' | 'error';
  executionTime: string;
}

export function OutputPanel({ language, code, isExpanded = false }: OutputPanelProps) {
  const [output, setOutput] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);

  const executeMutation = useMutation({
    mutationFn: async ({ language, code, languageId }: { language: string; code: string; languageId: number }) => {
      if (language === 'html') {
        // Special handling for HTML/CSS - render in iframe
        return {
          output: code,
          error: null,
          status: 'success' as const,
          executionTime: '0',
        };
      }

      const response = await apiRequest('POST', '/api/execute', {
        language,
        code,
        languageId,
      });
      return response.json() as Promise<ExecutionResult>;
    },
    onSuccess: (result) => {
      if (language.name === 'html') {
        setOutput(result.output);
        setError(null);
      } else {
        setOutput(result.output);
        setError(result.error);
      }
    },
    onError: (error) => {
      setError(error instanceof Error ? error.message : 'Execution failed');
      setOutput('');
    },
  });

  const handleRun = () => {
    if (!code.trim()) {
      setError('Please enter some code to run');
      return;
    }

    setOutput('');
    setError(null);
    
    executeMutation.mutate({
      language: language.name,
      code,
      languageId: language.judge0Id,
    });
  };

  const handleClear = () => {
    setOutput('');
    setError(null);
  };

  const renderOutput = () => {
    if (language.name === 'html' && output) {
      return (
        <iframe
          srcDoc={output}
          className="w-full h-full border-0 bg-white"
          title="HTML Output"
          sandbox="allow-scripts"
        />
      );
    }

    return (
      <div className="font-mono text-sm whitespace-pre-wrap">
        {executeMutation.isPending && (
          <div className="flex items-center space-x-2 text-blue-600 dark:text-blue-400 mb-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Running code...</span>
          </div>
        )}
        
        {error && (
          <div className="text-red-600 dark:text-red-400 mb-2">
            <strong>Error:</strong> {error}
          </div>
        )}
        
        {output && (
          <div className="text-gray-800 dark:text-gray-200">
            {output}
          </div>
        )}
        
        {!output && !error && !executeMutation.isPending && (
          <div className="text-gray-500 dark:text-gray-400 italic">
            Click "Run" to execute your code
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col" style={{ height: '500px' }}>
        {/* Output Header */}
        <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-2">
          <div className="flex items-center space-x-4">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Output</h3>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              onClick={() => setShowShareModal(true)}
              className="flex items-center space-x-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors btn-hover-lift"
            >
              <Share2 className="w-4 h-4" />
              <span>Share</span>
            </Button>
            
            <Button
              onClick={handleRun}
              disabled={executeMutation.isPending}
              className="flex items-center space-x-2 px-4 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors btn-hover-lift disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {executeMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              <span>Run</span>
            </Button>
          </div>
        </div>
        
        {/* Output Content */}
        <div className="flex-1 p-4 bg-gray-50 dark:bg-gray-900 overflow-auto min-h-[450px]">
          {renderOutput()}
          
          {(output || error) && (
            <Button
              variant="ghost"
              onClick={handleClear}
              className="mt-4 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            >
              Clear
            </Button>
          )}
        </div>
      </div>

      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        code={code}
        language={language}
      />
    </>
  );
}
