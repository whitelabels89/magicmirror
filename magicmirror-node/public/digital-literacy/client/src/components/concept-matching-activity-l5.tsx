import { useState } from 'react';
import { motion } from 'framer-motion';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { StudentProgress } from '@shared/schema';

interface ConceptMatchingActivityL5Props {
  studentName: string;
  progress: StudentProgress;
  onBack: () => void;
}

interface MatchingItem {
  id: string;
  content: string;
  emoji: string;
  type: 'online' | 'offline';
  category: 'activity' | 'feature';
  description: string;
}

const matchingItems: MatchingItem[] = [
  // Activities
  { id: '1', content: 'Nonton YouTube', emoji: '📺', type: 'online', category: 'activity', description: 'Streaming video butuh internet' },
  { id: '2', content: 'Main Puzzle', emoji: '🧩', type: 'offline', category: 'activity', description: 'Game sudah terinstall' },
  { id: '3', content: 'Video Call', emoji: '📞', type: 'online', category: 'activity', description: 'Komunikasi real-time' },
  { id: '4', content: 'Menggambar', emoji: '🎨', type: 'offline', category: 'activity', description: 'Aplikasi drawing lokal' },
  { id: '5', content: 'Download Game', emoji: '⬇️', type: 'online', category: 'activity', description: 'Unduh dari internet' },
  { id: '6', content: 'Baca E-book', emoji: '📖', type: 'offline', category: 'activity', description: 'File sudah tersimpan' },
  
  // Features/Characteristics
  { id: '7', content: 'Butuh WiFi', emoji: '📶', type: 'online', category: 'feature', description: 'Memerlukan koneksi internet' },
  { id: '8', content: 'Pakai Kuota', emoji: '📊', type: 'online', category: 'feature', description: 'Menggunakan data internet' },
  { id: '9', content: 'Tidak Pakai Kuota', emoji: '🚫', type: 'offline', category: 'feature', description: 'Gratis dari kuota' },
  { id: '10', content: 'Bisa Kapan Saja', emoji: '⏰', type: 'offline', category: 'feature', description: 'Tidak tergantung waktu' },
  { id: '11', content: 'Main Bareng Teman', emoji: '👫', type: 'online', category: 'feature', description: 'Multiplayer via internet' },
  { id: '12', content: 'Main Sendiri', emoji: '👤', type: 'offline', category: 'feature', description: 'Single player mode' }
];

export default function ConceptMatchingActivityL5({ 
  studentName, 
  progress, 
  onBack 
}: ConceptMatchingActivityL5Props) {
  const [matches, setMatches] = useState<{[key: string]: 'online' | 'offline' | null}>({});
  const [showResults, setShowResults] = useState(false);
  const [score, setScore] = useState(0);
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const updateProgressMutation = useMutation({
    mutationFn: async (data: { 
      completedActivities?: string[];
      badges?: string[];
      score?: number;
    }) => {
      return apiRequest("PUT", `/api/progress-l5/${studentName}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/progress-l5', studentName] });
      queryClient.invalidateQueries({ queryKey: ['/api/leaderboard'] });
    },
  });

  const handleDragStart = (itemId: string) => {
    setDraggedItem(itemId);
  };

  const handleDrop = (dropZone: 'online' | 'offline') => {
    if (draggedItem) {
      setMatches({
        ...matches,
        [draggedItem]: dropZone
      });
      setDraggedItem(null);
    }
  };

  const handleDirectMatch = (itemId: string, type: 'online' | 'offline') => {
    setMatches({
      ...matches,
      [itemId]: type
    });
  };

  const handleSubmit = () => {
    let correctCount = 0;
    let totalItems = matchingItems.length;

    matchingItems.forEach(item => {
      if (matches[item.id] === item.type) {
        correctCount++;
      }
    });

    const newScore = Math.round((correctCount / totalItems) * 100);
    setScore(newScore);
    setShowResults(true);

    // Update progress
    const activityName = 'concept-matching-l5';
    const newActivities = progress.completedActivities.includes(activityName) 
      ? progress.completedActivities 
      : [...progress.completedActivities, activityName];
    
    const newBadges = [...progress.badges];
    if (newScore >= 90 && !newBadges.includes('Matching Master')) {
      newBadges.push('Matching Master');
    }
    if (newScore === 100 && !newBadges.includes('Perfect Matcher')) {
      newBadges.push('Perfect Matcher');
    }

    updateProgressMutation.mutate({
      completedActivities: newActivities,
      badges: newBadges,
      score: progress.score + Math.floor(newScore / 5)
    });
  };

  const resetActivity = () => {
    setMatches({});
    setShowResults(false);
    setScore(0);
  };

  const getMatchedItems = (type: 'online' | 'offline') => {
    return Object.entries(matches)
      .filter(([_, matchType]) => matchType === type)
      .map(([itemId]) => matchingItems.find(item => item.id === itemId))
      .filter(item => item !== undefined);
  };

  const unmatchedItems = matchingItems.filter(item => !matches[item.id]);

  if (showResults) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <Button onClick={onBack} variant="outline" className="mb-4">
            ← Kembali
          </Button>
          <h3 className="text-2xl font-bold text-purple-600 mb-4">
            🎯 Hasil Pencocokan
          </h3>
        </div>

        <Card className="p-6">
          <div className="text-center space-y-4">
            <div className="text-6xl">{score >= 90 ? '🏆' : score >= 70 ? '🎯' : '📝'}</div>
            <h4 className="text-xl font-bold">Score: {score}/100</h4>
            <p className="text-gray-600">
              Kamu berhasil mencocokkan {Object.keys(matches).length} dari {matchingItems.length} item!
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <div className="bg-green-50 p-4 rounded-lg">
                <h5 className="font-bold text-green-600 mb-3">Jawaban Benar ✓</h5>
                <div className="space-y-2">
                  {matchingItems.map(item => {
                    const isCorrect = matches[item.id] === item.type;
                    if (isCorrect) {
                      return (
                        <div key={item.id} className="flex items-center space-x-2 text-sm">
                          <span>{item.emoji}</span>
                          <span>{item.content}</span>
                          <span className={`px-2 py-1 rounded text-xs ${
                            item.type === 'online' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {item.type === 'online' ? 'Online' : 'Offline'}
                          </span>
                        </div>
                      );
                    }
                    return null;
                  })}
                </div>
              </div>
              
              <div className="bg-red-50 p-4 rounded-lg">
                <h5 className="font-bold text-red-600 mb-3">Perlu Diperbaiki ✗</h5>
                <div className="space-y-2">
                  {matchingItems.map(item => {
                    const isWrong = matches[item.id] && matches[item.id] !== item.type;
                    if (isWrong) {
                      return (
                        <div key={item.id} className="text-sm">
                          <div className="flex items-center space-x-2">
                            <span>{item.emoji}</span>
                            <span>{item.content}</span>
                          </div>
                          <div className="text-xs text-gray-500 ml-6">
                            Seharusnya: {item.type === 'online' ? 'Online' : 'Offline'}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })}
                </div>
              </div>
            </div>

            <div className="flex gap-4 justify-center mt-6">
              <Button onClick={resetActivity} variant="outline">
                🔄 Coba Lagi
              </Button>
              <Button onClick={onBack}>
                ✅ Selesai
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <Button onClick={onBack} variant="outline" className="mb-4">
          ← Kembali
        </Button>
        <h3 className="text-2xl font-bold text-purple-600 mb-2">
          ⚖️ Cocokkan Konsep Online vs Offline
        </h3>
        <p className="text-gray-600 mb-4">
          Drag dan drop setiap item ke kategori yang tepat!
        </p>
      </div>

      {/* Drop Zones */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div 
          className="border-2 border-dashed border-blue-300 bg-blue-50 p-6 rounded-lg min-h-32"
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => handleDrop('online')}
        >
          <h4 className="text-xl font-bold text-blue-600 text-center mb-4">
            🌐 Online (Butuh Internet)
          </h4>
          <div className="space-y-2">
            {getMatchedItems('online').map((item) => (
              <div key={item!.id} className="bg-white p-2 rounded shadow-sm flex items-center space-x-2">
                <span>{item!.emoji}</span>
                <span className="text-sm">{item!.content}</span>
              </div>
            ))}
          </div>
        </div>
        
        <div 
          className="border-2 border-dashed border-gray-400 bg-gray-50 p-6 rounded-lg min-h-32"
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => handleDrop('offline')}
        >
          <h4 className="text-xl font-bold text-gray-600 text-center mb-4">
            📴 Offline (Tidak Butuh Internet)
          </h4>
          <div className="space-y-2">
            {getMatchedItems('offline').map((item) => (
              <div key={item!.id} className="bg-white p-2 rounded shadow-sm flex items-center space-x-2">
                <span>{item!.emoji}</span>
                <span className="text-sm">{item!.content}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Items to Match */}
      <div className="bg-yellow-50 p-6 rounded-lg">
        <h4 className="text-lg font-bold text-center mb-4">📦 Item yang Belum Dicocokkan</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {unmatchedItems.map((item) => (
            <motion.div
              key={item.id}
              draggable
              onDragStart={() => handleDragStart(item.id)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-white p-3 rounded-lg shadow-md cursor-move border hover:border-purple-300 transition-colors"
            >
              <div className="text-center">
                <div className="text-2xl mb-1">{item.emoji}</div>
                <div className="text-sm font-medium">{item.content}</div>
                <div className="text-xs text-gray-500 mt-1">{item.description}</div>
                
                {/* Mobile buttons for touch devices */}
                <div className="flex gap-1 mt-2 md:hidden">
                  <button
                    onClick={() => handleDirectMatch(item.id, 'online')}
                    className="flex-1 bg-blue-100 text-blue-700 text-xs py-1 px-2 rounded"
                  >
                    Online
                  </button>
                  <button
                    onClick={() => handleDirectMatch(item.id, 'offline')}
                    className="flex-1 bg-gray-100 text-gray-700 text-xs py-1 px-2 rounded"
                  >
                    Offline
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
        
        {unmatchedItems.length === 0 && (
          <div className="text-center py-8">
            <div className="text-4xl mb-2">🎉</div>
            <p className="text-gray-600">Semua item sudah dicocokkan!</p>
          </div>
        )}
      </div>

      {Object.keys(matches).length > 0 && (
        <div className="text-center">
          <div className="mb-4 text-sm text-gray-600">
            Progress: {Object.keys(matches).length}/{matchingItems.length} item
          </div>
          <Button 
            onClick={handleSubmit}
            className="bg-purple-500 text-white px-8 py-3 text-lg"
            disabled={Object.keys(matches).length < matchingItems.length}
          >
            {Object.keys(matches).length < matchingItems.length 
              ? `Cocokkan Semua Item (${Object.keys(matches).length}/${matchingItems.length})`
              : 'Periksa Jawaban'
            }
          </Button>
        </div>
      )}
    </div>
  );
}