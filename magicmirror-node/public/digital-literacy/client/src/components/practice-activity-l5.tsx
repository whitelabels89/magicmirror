import { useState } from 'react';
import { motion } from 'framer-motion';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StudentProgress } from '@shared/schema';

interface PracticeActivityL5Props {
  studentName: string;
  progress: StudentProgress;
  onBack: () => void;
}

interface PracticeChallenge {
  id: string;
  title: string;
  description: string;
  type: 'identification' | 'scenario' | 'reflection' | 'creative';
  emoji: string;
  instructions: string[];
  expectedOutcome: string;
}

const practicalChallenges: PracticeChallenge[] = [
  {
    id: '1',
    title: 'Identifikasi Aplikasi',
    description: 'Kelompokkan aplikasi di perangkatmu',
    type: 'identification',
    emoji: '🔍',
    instructions: [
      'Buka tablet atau smartphone milikmu',
      'Lihat semua aplikasi yang terinstall',
      'Kelompokkan mana yang online dan offline',
      'Buat daftar masing-masing 5 aplikasi'
    ],
    expectedOutcome: 'Memahami aplikasi mana saja yang butuh internet dan yang tidak'
  },
  {
    id: '2',
    title: 'Eksperimen Internet',
    description: 'Coba gunakan aplikasi tanpa internet',
    type: 'scenario',
    emoji: '🧪',
    instructions: [
      'Matikan WiFi dan data seluler',
      'Coba buka berbagai aplikasi',
      'Catat mana yang masih bisa digunakan',
      'Nyalakan kembali internetnya',
      'Bandingkan perbedaan fungsinya'
    ],
    expectedOutcome: 'Merasakan langsung perbedaan online vs offline'
  },
  {
    id: '3',
    title: 'Cerita Pengalaman',
    description: 'Bagikan pengalaman online dan offline',
    type: 'reflection',
    emoji: '📖',
    instructions: [
      'Ceritakan pengalaman seru main online',
      'Ceritakan pengalaman seru main offline',
      'Bandingkan kedua pengalaman tersebut',
      'Tuliskan atau gambar ceritamu'
    ],
    expectedOutcome: 'Refleksi personal tentang preferensi dan pengalaman'
  },
  {
    id: '4',
    title: 'Rencana Seimbang',
    description: 'Buat jadwal aktivitas online dan offline',
    type: 'creative',
    emoji: '📅',
    instructions: [
      'Buat jadwal aktivitas harian',
      'Tentukan waktu untuk aktivitas online',
      'Tentukan waktu untuk aktivitas offline',
      'Pastikan ada keseimbangan yang sehat',
      'Diskusikan dengan orang tua'
    ],
    expectedOutcome: 'Perencanaan penggunaan teknologi yang bijak'
  }
];

export default function PracticeActivityL5({ 
  studentName, 
  progress, 
  onBack 
}: PracticeActivityL5Props) {
  const [currentChallenge, setCurrentChallenge] = useState(0);
  const [completedChallenges, setCompletedChallenges] = useState<string[]>([]);
  const [challengeResponses, setChallengeResponses] = useState<{[key: string]: string}>({});
  const [currentResponse, setCurrentResponse] = useState('');
  const [showSummary, setShowSummary] = useState(false);
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

  const handleCompleteChallenge = () => {
    const challenge = practicalChallenges[currentChallenge];
    const newCompletedChallenges = [...completedChallenges, challenge.id];
    const newResponses = {
      ...challengeResponses,
      [challenge.id]: currentResponse
    };

    setCompletedChallenges(newCompletedChallenges);
    setChallengeResponses(newResponses);
    setCurrentResponse('');

    if (newCompletedChallenges.length === practicalChallenges.length) {
      setShowSummary(true);
      completePractice(newCompletedChallenges.length);
    } else {
      setCurrentChallenge(currentChallenge + 1);
    }
  };

  const completePractice = (challengeCount: number) => {
    // Update progress
    const activityName = 'practice-l5';
    const newActivities = progress.completedActivities.includes(activityName) 
      ? progress.completedActivities 
      : [...progress.completedActivities, activityName];
    
    const newBadges = [...progress.badges];
    if (challengeCount >= 4 && !newBadges.includes('Practice Master')) {
      newBadges.push('Practice Master');
    }
    if (challengeCount >= 2 && !newBadges.includes('Hands-on Learner')) {
      newBadges.push('Hands-on Learner');
    }
    if (!newBadges.includes('Digital Wisdom')) {
      newBadges.push('Digital Wisdom');
    }

    updateProgressMutation.mutate({
      completedActivities: newActivities,
      badges: newBadges,
      score: progress.score + (challengeCount * 10)
    });
  };

  const resetPractice = () => {
    setCurrentChallenge(0);
    setCompletedChallenges([]);
    setChallengeResponses({});
    setCurrentResponse('');
    setShowSummary(false);
  };

  if (showSummary) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <Button onClick={onBack} variant="outline" className="mb-4">
            ← Kembali
          </Button>
          <h3 className="text-2xl font-bold text-indigo-600 mb-4">
            🎉 Praktik Selesai!
          </h3>
        </div>

        <Card className="p-6">
          <div className="text-center space-y-4">
            <div className="text-6xl">🏆</div>
            <h4 className="text-xl font-bold">Selamat!</h4>
            <p className="text-gray-600">
              Kamu telah menyelesaikan {completedChallenges.length} tantangan praktis 
              tentang online vs offline!
            </p>
            
            <div className="bg-indigo-50 p-4 rounded-lg">
              <h5 className="font-bold text-indigo-600 mb-2">🎯 Pencapaian</h5>
              <ul className="text-sm text-gray-700 space-y-1 text-left">
                <li>✓ Menyelesaikan identifikasi aplikasi</li>
                <li>✓ Melakukan eksperimen langsung</li>
                <li>✓ Berbagi pengalaman personal</li>
                <li>✓ Membuat rencana penggunaan yang bijak</li>
                <li>✓ Memperoleh pemahaman praktis</li>
              </ul>
            </div>

            {/* Show responses summary */}
            <div className="text-left space-y-3">
              <h5 className="font-bold text-gray-700">📝 Ringkasan Jawaban:</h5>
              {practicalChallenges.map((challenge) => {
                const response = challengeResponses[challenge.id];
                if (response) {
                  return (
                    <Card key={challenge.id} className="p-3 bg-gray-50">
                      <h6 className="font-medium text-sm">{challenge.title}</h6>
                      <p className="text-xs text-gray-600 mt-1">{response}</p>
                    </Card>
                  );
                }
                return null;
              })}
            </div>

            <div className="flex gap-4 justify-center mt-6">
              <Button onClick={resetPractice} variant="outline">
                🔄 Praktik Lagi
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

  const challenge = practicalChallenges[currentChallenge];

  return (
    <div className="space-y-6">
      <div className="text-center">
        <Button onClick={onBack} variant="outline" className="mb-4">
          ← Kembali
        </Button>
        <h3 className="text-2xl font-bold text-indigo-600 mb-2">
          🎯 Latihan Praktis
        </h3>
        <p className="text-gray-600 mb-4">
          Praktikkan pemahaman online vs offline dalam kehidupan nyata!
        </p>
        <div className="text-sm text-gray-500">
          Tantangan {currentChallenge + 1} dari {practicalChallenges.length}
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-indigo-500 h-2 rounded-full transition-all duration-300"
          style={{ width: `${((currentChallenge + 1) / practicalChallenges.length) * 100}%` }}
        ></div>
      </div>

      <Tabs defaultValue="instructions" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="instructions">Instruksi</TabsTrigger>
          <TabsTrigger value="action">Aksi</TabsTrigger>
          <TabsTrigger value="reflection">Refleksi</TabsTrigger>
        </TabsList>

        <TabsContent value="instructions">
          <Card className="p-6">
            <CardHeader className="text-center">
              <div className="text-6xl mb-4">{challenge.emoji}</div>
              <CardTitle className="text-xl">{challenge.title}</CardTitle>
              <p className="text-gray-600">{challenge.description}</p>
              <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                challenge.type === 'identification' ? 'bg-blue-100 text-blue-800' :
                challenge.type === 'scenario' ? 'bg-green-100 text-green-800' :
                challenge.type === 'reflection' ? 'bg-purple-100 text-purple-800' :
                'bg-orange-100 text-orange-800'
              }`}>
                {challenge.type === 'identification' ? '🔍 Identifikasi' :
                 challenge.type === 'scenario' ? '🧪 Eksperimen' :
                 challenge.type === 'reflection' ? '💭 Refleksi' :
                 '🎨 Kreatif'}
              </div>
            </CardHeader>
            
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-bold text-gray-700 mb-2">📋 Langkah-langkah:</h4>
                  <ol className="space-y-2">
                    {challenge.instructions.map((instruction, index) => (
                      <li key={index} className="flex items-start space-x-2">
                        <span className="bg-indigo-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
                          {index + 1}
                        </span>
                        <span className="text-gray-700">{instruction}</span>
                      </li>
                    ))}
                  </ol>
                </div>
                
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <h5 className="font-bold text-yellow-700 mb-2">🎯 Hasil yang Diharapkan:</h5>
                  <p className="text-yellow-800">{challenge.expectedOutcome}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="action">
          <Card className="p-6">
            <CardHeader>
              <CardTitle>🚀 Lakukan Praktik</CardTitle>
              <p className="text-gray-600">
                Ikuti instruksi dan lakukan praktik secara langsung!
              </p>
            </CardHeader>
            
            <CardContent>
              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-bold text-blue-700 mb-2">
                    {challenge.emoji} {challenge.title}
                  </h4>
                  <p className="text-blue-800 text-sm">
                    Silakan lakukan praktik sesuai instruksi yang diberikan. 
                    Ambil waktu yang diperlukan untuk memahami dan mengalami langsung 
                    perbedaan online vs offline.
                  </p>
                </div>
                
                <div className="bg-green-50 p-4 rounded-lg">
                  <h5 className="font-bold text-green-700 mb-2">💡 Tips:</h5>
                  <ul className="text-green-800 text-sm space-y-1">
                    <li>• Lakukan dengan tenang dan fokus</li>
                    <li>• Jangan ragu bertanya pada orang dewasa</li>
                    <li>• Catat hal-hal menarik yang kamu temukan</li>
                    <li>• Ingat tujuan pembelajaran kita</li>
                  </ul>
                </div>
                
                <div className="text-center py-8">
                  <div className="text-4xl mb-4">⏱️</div>
                  <p className="text-gray-600">
                    Ambil waktu yang kamu butuhkan untuk melakukan praktik ini.
                    Ketika sudah selesai, lanjut ke tab "Refleksi" untuk berbagi pengalaman!
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reflection">
          <Card className="p-6">
            <CardHeader>
              <CardTitle>💭 Bagikan Pengalaman</CardTitle>
              <p className="text-gray-600">
                Ceritakan apa yang kamu alami dan pelajari!
              </p>
            </CardHeader>
            
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ceritakan pengalamanmu melakukan praktik "{challenge.title}":
                  </label>
                  <textarea
                    value={currentResponse}
                    onChange={(e) => setCurrentResponse(e.target.value)}
                    placeholder="Tulis pengalaman, temuan, atau hal menarik yang kamu alami..."
                    className="w-full h-32 p-3 border rounded-lg resize-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Minimal 20 karakter untuk melanjutkan
                  </p>
                </div>
                
                <div className="bg-purple-50 p-4 rounded-lg">
                  <h5 className="font-bold text-purple-700 mb-2">🤔 Pertanyaan Panduan:</h5>
                  <ul className="text-purple-800 text-sm space-y-1">
                    <li>• Apa yang paling menarik dari praktik ini?</li>
                    <li>• Apakah ada hal yang mengejutkan?</li>
                    <li>• Bagaimana perasaanmu setelah melakukannya?</li>
                    <li>• Apa yang akan kamu terapkan setelah ini?</li>
                  </ul>
                </div>
                
                <div className="text-center">
                  <Button 
                    onClick={handleCompleteChallenge}
                    disabled={currentResponse.length < 20}
                    className="bg-indigo-500 text-white px-8 py-3"
                  >
                    {currentResponse.length < 20 
                      ? `Tulis lebih lengkap (${currentResponse.length}/20)` 
                      : currentChallenge < practicalChallenges.length - 1
                        ? 'Lanjut ke Tantangan Berikutnya'
                        : 'Selesaikan Praktik'
                    }
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Completed challenges indicator */}
      {completedChallenges.length > 0 && (
        <Card className="p-4 bg-green-50">
          <h4 className="font-semibold text-green-700 mb-2">✅ Tantangan Selesai:</h4>
          <div className="flex flex-wrap gap-2">
            {practicalChallenges.map((ch) => (
              <span
                key={ch.id}
                className={`px-3 py-1 rounded-full text-sm ${
                  completedChallenges.includes(ch.id)
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {ch.emoji} {ch.title}
              </span>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}