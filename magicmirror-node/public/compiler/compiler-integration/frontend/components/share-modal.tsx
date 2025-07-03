import { useState } from 'react';
import { X, Share2, Copy, Check, Facebook, Twitter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import type { Language } from '@shared/schema';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  code: string;
  language: Language;
}

interface ShareResponse {
  shareId: string;
  url: string;
}

export function ShareModal({ isOpen, onClose, code, language }: ShareModalProps) {
  const [shareUrl, setShareUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const shareMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/share', {
        language: language.name,
        code,
        filename: language.filename,
      });
      return response.json() as Promise<ShareResponse>;
    },
    onSuccess: (result) => {
      setShareUrl(result.url);
    },
  });

  const handleShare = () => {
    if (!shareUrl && !shareMutation.isPending) {
      shareMutation.mutate();
    }
  };

  const handleCopy = async () => {
    if (shareUrl) {
      try {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = shareUrl;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  };

  const handleSocialShare = (platform: 'twitter' | 'facebook') => {
    if (!shareUrl) return;

    const text = `Check out my ${language.displayName} code on Programiz!`;
    const encodedUrl = encodeURIComponent(shareUrl);
    const encodedText = encodeURIComponent(text);

    let url = '';
    if (platform === 'twitter') {
      url = `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`;
    } else if (platform === 'facebook') {
      url = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
    }

    window.open(url, '_blank', 'width=600,height=400');
  };

  const handleModalOpen = () => {
    if (isOpen && !shareUrl) {
      handleShare();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md" onOpenAutoFocus={handleModalOpen}>
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Share2 className="w-5 h-5" />
            <span>Share your code</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Share your {language.displayName} code with others using the link below
          </p>

          {shareMutation.isPending && (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">Generating link...</span>
            </div>
          )}

          {shareMutation.error && (
            <div className="text-red-600 dark:text-red-400 text-sm">
              Failed to generate share link. Please try again.
            </div>
          )}

          {shareUrl && (
            <>
              <div className="flex items-center space-x-2 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <Input
                  type="text"
                  value={shareUrl}
                  readOnly
                  className="flex-1 bg-transparent border-none text-sm text-gray-700 dark:text-gray-300 focus:ring-0"
                />
                <Button
                  onClick={handleCopy}
                  size="sm"
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 mr-1" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-1" />
                      Copy
                    </>
                  )}
                </Button>
              </div>

              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">or share using</p>
                <div className="flex space-x-2">
                  <Button
                    onClick={() => handleSocialShare('twitter')}
                    size="icon"
                    className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"
                  >
                    <Twitter className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={() => handleSocialShare('facebook')}
                    size="icon"
                    className="p-2 bg-blue-700 hover:bg-blue-800 text-white rounded transition-colors"
                  >
                    <Facebook className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {copied && (
                <div className="flex items-center space-x-2 text-green-600 dark:text-green-400 text-sm">
                  <Check className="w-4 h-4" />
                  <span>Copied to clipboard</span>
                </div>
              )}
            </>
          )}

          {!shareMutation.isPending && !shareUrl && !shareMutation.error && (
            <Button
              onClick={handleShare}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              Generate Share Link
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
