import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Eye, Play, Pause, RotateCcw, CheckCircle2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { StudentProgress } from "@shared/schema";

interface EyeExerciseActivityProps {
  studentName: string;
  progress: StudentProgress;
}

export default function EyeExerciseActivity({ studentName, progress }: EyeExerciseActivityProps) {
  const [currentExercise, setCurrentExercise] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [completedExercises, setCompletedExercises] = useState<boolean[]>([]);
  const [isCompleted, setIsCompleted] = useState(false);
  const queryClient = useQueryClient();

  const updateProgressMutation = useMutation({
    mutationFn: async (data: { 
      completedActivities?: string[];
      badges?: string[];
    }) => {
      return apiRequest("PUT", `/api/progress-l3/${studentName}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/progress-l3', studentName] });
      queryClient.invalidateQueries({ queryKey: ['/api/leaderboard'] });
    },
  });

  const exercises = [
    {
      name: "Lihat Jauh",
      icon: "🔍",
      description: "Lihat objek yang jauh (minimal 6 meter) selama 20 detik",
      duration: 20,
      instruction: "Cari objek yang jauh seperti pohon, gedung, atau awan. Fokuskan mata pada objek tersebut.",
      tips: "Ini membantu merilekskan otot mata yang tegang dari menatap layar dekat"
    },
    {
      name: "Tutup Mata",
      icon: "😌",
      description: "Tutup mata dengan lembut selama 10 detik",
      duration: 10,
      instruction: "Tutup mata perlahan dan rasakan kegelapan yang menenangkan. Jangan mengepalkan mata terlalu kuat.",
      tips: "Memberikan istirahat total pada mata dan membantu produksi air mata alami"
    },
    {
      name: "Berkedip Cepat",
      icon: "👁️",
      description: "Berkedip dengan cepat selama 15 detik",
      duration: 15,
      instruction: "Berkedip dengan cepat dan ringan. Jangan terlalu kuat, seperti kupu-kupu yang mengepak sayap.",
      tips: "Membantu melembabkan mata dan mengurangi mata kering"
    },
    {
      name: "Pandangan Melingkar",
      icon: "🔄",
      description: "Gerakkan mata membentuk lingkaran selama 15 detik",
      duration: 15,
      instruction: "Gerakkan mata perlahan membentuk lingkaran. 5 kali searah jarum jam, 5 kali berlawanan arah.",
      tips: "Melatih otot mata dan meningkatkan fleksibilitas gerakan mata"
    },
    {
      name: "Fokus Dekat-Jauh",
      icon: "📏",
      description: "Bergantian fokus pada objek dekat dan jauh selama 20 detik",
      duration: 20,
      instruction: "Fokus pada jari yang berjarak 30 cm selama 3 detik, lalu fokus pada objek jauh selama 3 detik. Ulangi bergantian.",
      tips: "Melatih kemampuan mata untuk beradaptasi dengan jarak yang berbeda"
    }
  ];

  const currentExerciseData = exercises[currentExercise];

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);
    } else if (timeLeft === 0 && isActive) {
      handleExerciseComplete();
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  const startExercise = () => {
    setIsActive(true);
    setTimeLeft(currentExerciseData.duration);
  };

  const pauseExercise = () => {
    setIsActive(false);
  };

  const resetExercise = () => {
    setIsActive(false);
    setTimeLeft(currentExerciseData.duration);
  };

  const handleExerciseComplete = () => {
    setIsActive(false);
    const newCompleted = [...completedExercises];
    newCompleted[currentExercise] = true;
    setCompletedExercises(newCompleted);
    
    if (currentExercise < exercises.length - 1) {
      // Move to next exercise after a short delay
      setTimeout(() => {
        setCurrentExercise(currentExercise + 1);
        setTimeLeft(exercises[currentExercise + 1].duration);
      }, 2000);
    } else {
      // All exercises completed
      completeActivity();
    }
  };

  const completeActivity = () => {
    setIsCompleted(true);
    
    const newCompletedActivities = [...(progress.completedActivities || [])];
    const activityId = "l3-eye-exercise";
    
    if (!newCompletedActivities.includes(activityId)) {
      newCompletedActivities.push(activityId);
    }

    const newBadges = [...(progress.badges || [])];
    if (!newBadges.includes("Eye Care Expert")) {
      newBadges.push("Eye Care Expert");
    }

    updateProgressMutation.mutate({
      completedActivities: newCompletedActivities,
      badges: newBadges
    });
  };

  const goToExercise = (index: number) => {
    setCurrentExercise(index);
    setIsActive(false);
    setTimeLeft(exercises[index].duration);
  };

  if (isCompleted) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Eye className="h-16 w-16 text-green-500" />
          </div>
          <CardTitle className="text-2xl">Senam Mata Selesai!</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center">
            <p className="text-lg text-gray-600">
              Hebat! Kamu sudah menyelesaikan semua latihan mata yang penting untuk kesehatan mata.
            </p>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">🎉 Manfaat yang Kamu Dapatkan:</h3>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• Mata lebih rileks dan tidak tegang</li>
              <li>• Mengurangi risiko mata kering</li>
              <li>• Meningkatkan fleksibilitas otot mata</li>
              <li>• Membantu mencegah kelelahan mata</li>
              <li>• Meningkatkan fokus dan konsentrasi</li>
            </ul>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">💡 Tips Harian:</h3>
            <p className="text-sm text-gray-700">
              Lakukan senam mata ini setiap kali selesai menggunakan gadget selama 30 menit. 
              Ingat aturan 20-20-20: Setiap 20 menit, lihat objek sejauh 20 meter selama 20 detik.
            </p>
          </div>
          
          <Button 
            className="w-full" 
            onClick={() => {
              setIsCompleted(false);
              setCurrentExercise(0);
              setCompletedExercises([]);
              setTimeLeft(exercises[0].duration);
            }}
          >
            Ulangi Senam Mata
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
            <Eye className="h-5 w-5" />
            Senam Mata Sehat
          </CardTitle>
          <Badge variant="outline">
            {currentExercise + 1} / {exercises.length}
          </Badge>
        </div>
        <Progress 
          value={((currentExercise + (completedExercises[currentExercise] ? 1 : 0)) / exercises.length) * 100} 
          className="mt-2" 
        />
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div className="text-center">
          <div className="text-4xl mb-2">{currentExerciseData.icon}</div>
          <h3 className="text-xl font-semibold mb-2">{currentExerciseData.name}</h3>
          <p className="text-gray-600">{currentExerciseData.description}</p>
        </div>

        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="font-semibold mb-2">Cara Melakukan:</h4>
          <p className="text-sm text-gray-700 mb-2">{currentExerciseData.instruction}</p>
          <div className="bg-blue-100 p-2 rounded text-xs text-blue-800">
            💡 {currentExerciseData.tips}
          </div>
        </div>

        <div className="text-center">
          <div className="text-6xl font-bold text-blue-600 mb-4">
            {timeLeft}s
          </div>
          
          {/* Visual Exercise Aid */}
          {currentExerciseData.name === "Berkedip Cepat" && isActive && (
            <div className="flex justify-center space-x-4 mb-4">
              <div className={`w-4 h-4 rounded-full ${timeLeft % 2 === 0 ? 'bg-blue-500' : 'bg-gray-300'} transition-colors duration-200`} />
              <div className={`w-4 h-4 rounded-full ${timeLeft % 2 === 1 ? 'bg-blue-500' : 'bg-gray-300'} transition-colors duration-200`} />
            </div>
          )}
          
          {currentExerciseData.name === "Lihat Jauh" && isActive && (
            <div className="mb-4 p-4 border-2 border-dashed border-blue-300 rounded-lg">
              <div className="text-4xl animate-pulse">🔍</div>
              <p className="text-sm text-gray-600 mt-2">Fokus pada objek yang jauh</p>
            </div>
          )}
          
          {currentExerciseData.name === "Tutup Mata" && isActive && (
            <div className="mb-4 p-4 bg-gray-100 rounded-lg">
              <div className="text-4xl animate-pulse">😌</div>
              <p className="text-sm text-gray-600 mt-2">Tutup mata dengan lembut</p>
            </div>
          )}
          
          {currentExerciseData.name === "Putar Mata" && isActive && (
            <div className="mb-4 p-4 border-2 border-dashed border-green-300 rounded-lg">
              <div className="text-4xl animate-spin">👀</div>
              <p className="text-sm text-gray-600 mt-2">Putar mata perlahan</p>
            </div>
          )}
          
          {currentExerciseData.name === "Fokus Dekat-Jauh" && isActive && (
            <div className="mb-4 p-4 border-2 border-dashed border-purple-300 rounded-lg">
              <div className="flex justify-center space-x-8">
                <div className={`text-2xl ${timeLeft % 4 < 2 ? 'text-purple-600 font-bold' : 'text-gray-400'} transition-all duration-500`}>📱</div>
                <div className={`text-2xl ${timeLeft % 4 >= 2 ? 'text-purple-600 font-bold' : 'text-gray-400'} transition-all duration-500`}>🌳</div>
              </div>
              <p className="text-sm text-gray-600 mt-2">Fokus bergantian dekat-jauh</p>
            </div>
          )}
          
          <div className="flex justify-center space-x-2">
            {!isActive && timeLeft > 0 && (
              <Button onClick={startExercise} size="lg">
                <Play className="h-5 w-5 mr-2" />
                Mulai
              </Button>
            )}
            {isActive && (
              <Button onClick={pauseExercise} size="lg" variant="outline">
                <Pause className="h-5 w-5 mr-2" />
                Pause
              </Button>
            )}
            <Button onClick={resetExercise} size="lg" variant="outline">
              <RotateCcw className="h-5 w-5 mr-2" />
              Reset
            </Button>
          </div>
        </div>

        {completedExercises[currentExercise] && (
          <div className="bg-green-50 p-4 rounded-lg text-center">
            <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
            <p className="text-green-800 font-medium">Latihan selesai! Mata sudah lebih rileks.</p>
          </div>
        )}

        {/* Exercise Navigation */}
        <div className="space-y-2">
          <h4 className="font-semibold text-sm">Daftar Latihan:</h4>
          <div className="flex flex-wrap gap-2">
            {exercises.map((exercise, index) => (
              <Button
                key={index}
                variant={index === currentExercise ? "default" : "outline"}
                size="sm"
                onClick={() => goToExercise(index)}
                className="text-xs"
              >
                {exercise.icon} {exercise.name}
                {completedExercises[index] && (
                  <CheckCircle2 className="h-3 w-3 ml-1 text-green-500" />
                )}
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}