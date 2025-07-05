import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, Clock, Eye, User, Trophy } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { StudentProgress } from "@shared/schema";

interface PracticeActivityL3Props {
  studentName: string;
  progress: StudentProgress;
}

export default function PracticeActivityL3({ studentName, progress }: PracticeActivityL3Props) {
  const [currentChallenge, setCurrentChallenge] = useState(0);
  const [completedChallenges, setCompletedChallenges] = useState<boolean[]>([]);
  const [responses, setResponses] = useState<string[]>([]);
  const [currentResponse, setCurrentResponse] = useState("");
  const [isCompleted, setIsCompleted] = useState(false);
  const queryClient = useQueryClient();

  const updateProgressMutation = useMutation({
    mutationFn: async (data: { 
      completedActivities?: string[];
      badges?: string[];
      score?: number;
    }) => {
      return apiRequest("PUT", `/api/progress-l3/${studentName}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/progress-l3', studentName] });
      queryClient.invalidateQueries({ queryKey: ['/api/leaderboard'] });
    },
  });

  const challenges = [
    {
      title: "Praktek Postur Sehat",
      icon: <User className="h-5 w-5" />,
      description: "Peragakan posisi duduk yang benar saat main gadget selama 3 menit",
      type: "practice" as const,
      duration: 180,
      instruction: "Duduk dengan punggung lurus, kaki menyentuh lantai, dan layar sejajar mata. Tahan posisi ini selama 3 menit.",
      question: "Bagaimana perasaanmu setelah duduk dengan postur yang benar? Apakah ada perbedaan dengan posisi duduk biasanya?"
    },
    {
      title: "Senam Mata Mandiri",
      icon: <Eye className="h-5 w-5" />,
      description: "Lakukan senam mata lengkap tanpa panduan",
      type: "exercise" as const,
      instruction: "Lakukan 5 gerakan senam mata yang telah dipelajari: lihat jauh, tutup mata, berkedip, gerakan melingkar, dan fokus dekat-jauh.",
      question: "Setelah melakukan senam mata, apakah matamu terasa lebih rileks? Gerakan mana yang paling kamu sukai?"
    },
    {
      title: "Timer Challenge",
      icon: <Clock className="h-5 w-5" />,
      description: "Gunakan timer untuk bermain gadget selama 20 menit, lalu istirahat 10 menit",
      type: "timer" as const,
      duration: 1200, // 20 minutes
      instruction: "Atur timer untuk 20 menit bermain gadget, lalu istirahat 10 menit. Rasakan perbedaannya!",
      question: "Bagaimana pengalaman menggunakan timer? Apakah 20 menit terasa cukup untuk bermain gadget?"
    },
    {
      title: "Poster Kebiasaan Sehat",
      icon: <Trophy className="h-5 w-5" />,
      description: "Buat rencana kebiasaan sehat penggunaan gadget",
      type: "creative" as const,
      instruction: "Buat daftar 5 kebiasaan sehat yang akan kamu lakukan setiap hari saat menggunakan gadget.",
      question: "Tuliskan 5 kebiasaan sehat yang akan kamu lakukan mulai hari ini. Contoh: Setiap 30 menit istirahat 5 menit, dll."
    }
  ];

  const currentChallengeData = challenges[currentChallenge];

  const handleCompleteChallenge = () => {
    const newCompleted = [...completedChallenges];
    newCompleted[currentChallenge] = true;
    setCompletedChallenges(newCompleted);
    
    const newResponses = [...responses];
    newResponses[currentChallenge] = currentResponse;
    setResponses(newResponses);
    
    if (currentChallenge < challenges.length - 1) {
      setCurrentChallenge(currentChallenge + 1);
      setCurrentResponse("");
    } else {
      completeActivity();
    }
  };

  const completeActivity = () => {
    setIsCompleted(true);
    
    const newCompletedActivities = [...(progress.completedActivities || [])];
    const activityId = "l3-practice-complete";
    
    if (!newCompletedActivities.includes(activityId)) {
      newCompletedActivities.push(activityId);
    }

    const newBadges = [...(progress.badges || [])];
    const possibleBadges = [
      "L3 Master",
      "Healthy Habits Pro",
      "Screen Time Champion",
      "Digital Wellness Expert"
    ];
    
    possibleBadges.forEach(badge => {
      if (!newBadges.includes(badge)) {
        newBadges.push(badge);
      }
    });

    // Calculate bonus score
    const bonusScore = 50;
    const newScore = Math.max(progress.score || 0, (progress.score || 0) + bonusScore);

    updateProgressMutation.mutate({
      completedActivities: newCompletedActivities,
      badges: newBadges,
      score: newScore
    });
  };

  const canProceed = () => {
    if (currentChallengeData.type === 'creative') {
      return currentResponse.trim().length > 20;
    }
    return currentResponse.trim().length > 10;
  };

  if (isCompleted) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Trophy className="h-16 w-16 text-yellow-500" />
          </div>
          <CardTitle className="text-2xl">Selamat! Level 3 Selesai!</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center">
            <p className="text-lg text-gray-600 mb-4">
              Kamu telah menguasai semua kebiasaan sehat dalam menggunakan gadget!
            </p>
            <div className="bg-gradient-to-r from-green-50 to-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">🎉 Pencapaian Kamu:</h3>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>✅ Menguasai postur duduk yang benar</li>
                <li>✅ Mahir melakukan senam mata</li>
                <li>✅ Dapat mengatur waktu layar dengan baik</li>
                <li>✅ Membuat komitmen hidup sehat digital</li>
              </ul>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold">Ringkasan Jawaban:</h3>
            {responses.map((response, index) => (
              <div key={index} className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm font-medium text-gray-700 mb-1">
                  {challenges[index].title}:
                </p>
                <p className="text-sm">{response}</p>
              </div>
            ))}
          </div>

          <div className="bg-yellow-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">🌟 Pesan untuk Masa Depan:</h3>
            <p className="text-sm text-gray-700">
              Sekarang kamu adalah Digital Wellness Expert! Jangan lupa untuk selalu menerapkan 
              kebiasaan sehat yang sudah dipelajari dalam kehidupan sehari-hari. Gadget adalah 
              alat yang hebat jika digunakan dengan bijak dan sehat!
            </p>
          </div>
          
          <Button 
            className="w-full" 
            onClick={() => {
              setIsCompleted(false);
              setCurrentChallenge(0);
              setCompletedChallenges([]);
              setResponses([]);
              setCurrentResponse("");
            }}
          >
            Ulangi Latihan
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg flex items-center gap-2">
            {currentChallengeData.icon}
            {currentChallengeData.title}
          </CardTitle>
          <Badge variant="outline">
            {currentChallenge + 1} / {challenges.length}
          </Badge>
        </div>
        <Progress 
          value={((currentChallenge + (completedChallenges[currentChallenge] ? 1 : 0)) / challenges.length) * 100} 
          className="mt-2" 
        />
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="font-semibold mb-2">Tantangan:</h3>
          <p className="text-gray-700 mb-3">{currentChallengeData.description}</p>
          <div className="bg-white p-3 rounded text-sm">
            <strong>Instruksi:</strong> {currentChallengeData.instruction}
          </div>
        </div>

        {currentChallengeData.duration && (
          <div className="bg-yellow-50 p-4 rounded-lg text-center">
            <Clock className="h-8 w-8 mx-auto mb-2 text-yellow-600" />
            <p className="text-yellow-800 font-medium">
              Durasi: {Math.floor(currentChallengeData.duration / 60)} menit {currentChallengeData.duration % 60} detik
            </p>
            <p className="text-sm text-yellow-700 mt-1">
              Lakukan aktivitas ini sesuai durasi yang ditentukan
            </p>
          </div>
        )}

        <div className="space-y-3">
          <h3 className="font-semibold">Refleksi:</h3>
          <p className="text-gray-700">{currentChallengeData.question}</p>
          <Textarea
            placeholder="Tuliskan pengalaman dan perasaanmu..."
            value={currentResponse}
            onChange={(e) => setCurrentResponse(e.target.value)}
            className="min-h-[100px]"
          />
          <p className="text-sm text-gray-500">
            {currentChallengeData.type === 'creative' ? 'Minimal 20 karakter' : 'Minimal 10 karakter'}
          </p>
        </div>

        <div className="flex justify-between pt-4">
          <Button
            variant="outline"
            onClick={() => {
              if (currentChallenge > 0) {
                setCurrentChallenge(currentChallenge - 1);
                setCurrentResponse(responses[currentChallenge - 1] || "");
              }
            }}
            disabled={currentChallenge === 0}
          >
            Sebelumnya
          </Button>
          
          <Button
            onClick={handleCompleteChallenge}
            disabled={!canProceed()}
            className="min-w-[100px]"
          >
            {currentChallenge === challenges.length - 1 ? (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Selesai
              </>
            ) : (
              "Berikutnya"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}