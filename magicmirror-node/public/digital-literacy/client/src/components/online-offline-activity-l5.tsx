import { useState } from 'react';
import { motion } from 'framer-motion';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StudentProgress } from '@shared/schema';

interface OnlineOfflineActivityL5Props {
  studentName: string;
  progress: StudentProgress;
  activityType: string;
  onBack: () => void;
}

interface Activity {
  id: string;
  name: string;
  emoji: string;
  type: 'online' | 'offline';
  description: string;
  requirement: string;
}

const activities: Activity[] = [
  // Online Activities
  { id: '1', name: 'Nonton YouTube', emoji: '📺', type: 'online', description: 'Streaming video', requirement: 'Butuh internet untuk streaming' },
  { id: '2', name: 'Video Call', emoji: '📞', type: 'online', description: 'Panggilan video', requirement: 'Butuh internet untuk komunikasi' },
  { id: '3', name: 'Main Game Online', emoji: '🎮', type: 'online', description: 'Bermain dengan teman', requirement: 'Butuh internet untuk multiplayer' },
  { id: '4', name: 'Browsing Web', emoji: '🌐', type: 'online', description: 'Menjelajahi website', requirement: 'Butuh internet untuk akses web' },
  { id: '5', name: 'Download Aplikasi', emoji: '📱', type: 'online', description: 'Unduh app baru', requirement: 'Butuh internet untuk download' },
  { id: '6', name: 'Streaming Musik', emoji: '🎵', type: 'online', description: 'Dengar musik online', requirement: 'Butuh internet untuk streaming' },
  
  // Offline Activities  
  { id: '7', name: 'Main Puzzle', emoji: '🧩', type: 'offline', description: 'Game puzzle lokal', requirement: 'Sudah terinstall di perangkat' },
  { id: '8', name: 'Menggambar Digital', emoji: '🎨', type: 'offline', description: 'Pakai aplikasi drawing', requirement: 'Aplikasi sudah ada di tablet' },
  { id: '9', name: 'Baca E-book', emoji: '📖', type: 'offline', description: 'Buku digital', requirement: 'E-book sudah diunduh' },
  { id: '10', name: 'Kalkulator', emoji: '🔢', type: 'offline', description: 'Hitung matematika', requirement: 'Aplikasi built-in' },
  { id: '11', name: 'Foto dengan Kamera', emoji: '📷', type: 'offline', description: 'Ambil gambar', requirement: 'Kamera tidak butuh internet' },
  { id: '12', name: 'Main Game Offline', emoji: '🕹️', type: 'offline', description: 'Single player games', requirement: 'Game sudah terinstall' }
];

export default function OnlineOfflineActivityL5({ 
  studentName, 
  progress, 
  activityType, 
  onBack 
}: OnlineOfflineActivityL5Props) {
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [score, setScore] = useState(0);
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

  const getActivityTitle = () => {
    switch (activityType) {
      case 'concept-intro':
        return 'Konsep Dasar: Online vs Offline';
      case 'online-activities':
        return 'Identifikasi Kegiatan Online';
      case 'offline-activities':
        return 'Identifikasi Kegiatan Offline';
      default:
        return 'Eksplorasi Online vs Offline';
    }
  };

  const getFilteredActivities = () => {
    switch (activityType) {
      case 'online-activities':
        return activities.filter(a => a.type === 'online');
      case 'offline-activities':
        return activities.filter(a => a.type === 'offline');
      default:
        return activities;
    }
  };

  const getTargetType = () => {
    switch (activityType) {
      case 'online-activities':
        return 'online';
      case 'offline-activities':
        return 'offline';
      default:
        return null;
    }
  };

  const handleActivityClick = (activityId: string) => {
    if (selectedActivities.includes(activityId)) {
      setSelectedActivities(selectedActivities.filter(id => id !== activityId));
    } else {
      setSelectedActivities([...selectedActivities, activityId]);
    }
  };

  const handleSubmit = () => {
    const targetType = getTargetType();
    const filteredActivities = getFilteredActivities();
    
    let correctCount = 0;
    let totalActivities = filteredActivities.length;

    if (targetType) {
      // For specific type activities, count correct selections
      selectedActivities.forEach(id => {
        const activity = activities.find(a => a.id === id);
        if (activity && activity.type === targetType) {
          correctCount++;
        }
      });
    } else {
      // For general concept activity, count any correct selections
      selectedActivities.forEach(id => {
        const activity = activities.find(a => a.id === id);
        if (activity) {
          correctCount++;
        }
      });
      totalActivities = selectedActivities.length;
    }

    const newScore = Math.round((correctCount / Math.max(totalActivities, 1)) * 100);
    setScore(newScore);
    setShowResults(true);

    // Update progress
    const activityName = `online-offline-${activityType}`;
    const newActivities = progress.completedActivities.includes(activityName) 
      ? progress.completedActivities 
      : [...progress.completedActivities, activityName];
    
    const newBadges = [...progress.badges];
    if (newScore >= 80 && !newBadges.includes('Konsep Master')) {
      newBadges.push('Konsep Master');
    }
    if (selectedActivities.length >= 6 && !newBadges.includes('Explorer')) {
      newBadges.push('Explorer');
    }

    updateProgressMutation.mutate({
      completedActivities: newActivities,
      badges: newBadges,
      score: progress.score + Math.floor(newScore / 10)
    });
  };

  const resetActivity = () => {
    setSelectedActivities([]);
    setShowResults(false);
    setScore(0);
  };

  const filteredActivities = getFilteredActivities();
  const targetType = getTargetType();

  if (showResults) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <Button onClick={onBack} variant="outline" className="mb-4">
            ← Kembali
          </Button>
          <h3 className="text-2xl font-bold text-green-600 mb-4">
            🎉 Hasil Aktivitas
          </h3>
        </div>

        <Card className="p-6">
          <div className="text-center space-y-4">
            <div className="text-6xl">{score >= 80 ? '🏆' : score >= 60 ? '🎯' : '📝'}</div>
            <h4 className="text-xl font-bold">Score: {score}/100</h4>
            <p className="text-gray-600">
              Kamu memilih {selectedActivities.length} aktivitas!
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              <div className="bg-green-50 p-4 rounded-lg">
                <h5 className="font-bold text-green-600 mb-2">Pilihan Benar ✓</h5>
                <div className="space-y-2">
                  {selectedActivities.map(id => {
                    const activity = activities.find(a => a.id === id);
                    const isCorrect = !targetType || (activity && activity.type === targetType);
                    if (isCorrect && activity) {
                      return (
                        <div key={id} className="flex items-center space-x-2">
                          <span>{activity.emoji}</span>
                          <span className="text-sm">{activity.name}</span>
                        </div>
                      );
                    }
                    return null;
                  })}
                </div>
              </div>
              
              {targetType && (
                <div className="bg-red-50 p-4 rounded-lg">
                  <h5 className="font-bold text-red-600 mb-2">Perlu Diperbaiki ✗</h5>
                  <div className="space-y-2">
                    {selectedActivities.map(id => {
                      const activity = activities.find(a => a.id === id);
                      const isWrong = activity && activity.type !== targetType;
                      if (isWrong) {
                        return (
                          <div key={id} className="flex items-center space-x-2">
                            <span>{activity.emoji}</span>
                            <span className="text-sm">{activity.name}</span>
                          </div>
                        );
                      }
                      return null;
                    })}
                  </div>
                </div>
              )}
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
        <h3 className="text-2xl font-bold text-orange-600 mb-2">
          {getActivityTitle()}
        </h3>
        <p className="text-gray-600 mb-4">
          {targetType 
            ? `Pilih aktivitas yang ${targetType === 'online' ? 'butuh internet' : 'tidak butuh internet'}!`
            : 'Pilih aktivitas dan pelajari mana yang online atau offline!'
          }
        </p>
        <div className="text-sm text-gray-500">
          Dipilih: {selectedActivities.length} aktivitas
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredActivities.map((activity) => {
          const isSelected = selectedActivities.includes(activity.id);
          const borderColor = activity.type === 'online' ? 'border-blue-300' : 'border-gray-300';
          const bgColor = activity.type === 'online' ? 'bg-blue-50' : 'bg-gray-50';
          
          return (
            <motion.div key={activity.id} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Card 
                className={`cursor-pointer transition-all ${
                  isSelected 
                    ? 'ring-2 ring-orange-500 bg-orange-50' 
                    : `${bgColor} hover:shadow-md`
                } border-2 ${borderColor}`}
                onClick={() => handleActivityClick(activity.id)}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-2xl">{activity.emoji}</span>
                      <span className="text-lg">{activity.name}</span>
                    </div>
                    {isSelected && <div className="text-green-500">✓</div>}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-2">{activity.description}</p>
                  <div className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                    activity.type === 'online' 
                      ? 'bg-blue-100 text-blue-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {activity.type === 'online' ? '🌐 Online' : '📴 Offline'}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">{activity.requirement}</p>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {selectedActivities.length > 0 && (
        <div className="text-center">
          <Button 
            onClick={handleSubmit}
            className="bg-orange-500 text-white px-8 py-3 text-lg"
          >
            Periksa Jawaban ({selectedActivities.length} dipilih)
          </Button>
        </div>
      )}
    </div>
  );
}