import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Star, Target } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { StudentProgress } from "@shared/schema";
import { motion } from "framer-motion";

interface PracticeActivityL4Props {
  studentName: string;
  progress: StudentProgress;
}

export default function PracticeActivityL4({ studentName, progress }: PracticeActivityL4Props) {
  const [currentChallenge, setCurrentChallenge] = useState(0);
  const [completedChallenges, setCompletedChallenges] = useState<boolean[]>(new Array(4).fill(false));
  const [isCompleted, setIsCompleted] = useState(false);
  const [currentScore, setCurrentScore] = useState(0);
  const queryClient = useQueryClient();

  const updateProgressMutation = useMutation({
    mutationFn: async (data: { 
      completedActivities?: string[];
      badges?: string[];
      score?: number;
    }) => {
      return apiRequest("PUT", `/api/progress-l4/${studentName}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/progress-l4', studentName] });
      queryClient.invalidateQueries({ queryKey: ['/api/leaderboard'] });
    },
  });

  const handsonChallenges = [
    {
      id: 1,
      title: "Challenge 1: App Hunt",
      description: "Temukan dan buka 3 aplikasi belajar berbeda",
      emoji: "🔍",
      instructions: [
        "Buka tablet/HP",
        "Cari aplikasi dengan ikon huruf atau angka", 
        "Tap untuk membuka aplikasi",
        "Coba 3 aplikasi berbeda"
      ],
      interactiveDemo: {
        type: "tap-sequence",
        sequence: ["📱", "🔤", "🔢", "🎨"],
        target: 3
      },
      points: 30,
      color: "bg-blue-50"
    },
    {
      id: 2,
      title: "Challenge 2: Learning Master", 
      description: "Selesaikan 5 level di aplikasi belajar favorit",
      emoji: "🎯",
      instructions: [
        "Pilih aplikasi belajar favorit",
        "Mulai dari level paling mudah",
        "Selesaikan 5 level berturut-turut",
        "Catat skormu!"
      ],
      interactiveDemo: {
        type: "level-completion",
        levels: [1, 2, 3, 4, 5],
        target: 5
      },
      points: 40,
      color: "bg-green-50"
    },
    {
      id: 3,
      title: "Challenge 3: Sharing Time",
      description: "Ajarkan seseorang cara menggunakan aplikasi belajar",
      emoji: "🤝",
      instructions: [
        "Panggil teman atau keluarga",
        "Tunjukkan cara membuka aplikasi",
        "Ajarkan cara bermain 1 game",
        "Berikan tips yang berguna"
      ],
      interactiveDemo: {
        type: "teaching-steps",
        steps: ["Open", "Show", "Play", "Tips"],
        target: 4
      },
      points: 35,
      color: "bg-purple-50"
    },
    {
      id: 4,
      title: "Challenge 4: Healthy Habits",
      description: "Praktikkan kebiasaan sehat saat menggunakan aplikasi",
      emoji: "💪",
      instructions: [
        "Atur timer 15 menit",
        "Duduk dengan posisi tegak",
        "Istirahat mata setiap 5 menit", 
        "Berhenti saat timer berbunyi"
      ],
      interactiveDemo: {
        type: "health-tracker",
        habits: ["Timer", "Posture", "Eye-rest", "Stop"],
        target: 4
      },
      points: 25,
      color: "bg-yellow-50"
    }
  ];

  const [interactiveState, setInteractiveState] = useState({
    tappedApps: 0,
    completedLevels: 0,
    teachingSteps: 0,
    healthChecks: 0
  });

  const handleInteraction = (type: string) => {
    const challenge = handsonChallenges[currentChallenge];
    let newState = { ...interactiveState };
    let completed = false;

    switch (challenge.interactiveDemo.type) {
      case "tap-sequence":
        newState.tappedApps = Math.min(newState.tappedApps + 1, challenge.interactiveDemo.target);
        completed = newState.tappedApps >= challenge.interactiveDemo.target;
        break;
      case "level-completion":
        newState.completedLevels = Math.min(newState.completedLevels + 1, challenge.interactiveDemo.target);
        completed = newState.completedLevels >= challenge.interactiveDemo.target;
        break;
      case "teaching-steps":
        newState.teachingSteps = Math.min(newState.teachingSteps + 1, challenge.interactiveDemo.target);
        completed = newState.teachingSteps >= challenge.interactiveDemo.target;
        break;
      case "health-tracker":
        newState.healthChecks = Math.min(newState.healthChecks + 1, challenge.interactiveDemo.target);
        completed = newState.healthChecks >= challenge.interactiveDemo.target;
        break;
    }

    setInteractiveState(newState);

    if (completed) {
      handleChallengeComplete();
    }
  };

  const handleChallengeComplete = () => {
    const newCompleted = [...completedChallenges];
    newCompleted[currentChallenge] = true;
    setCompletedChallenges(newCompleted);

    const challengeScore = handsonChallenges[currentChallenge].points;
    setCurrentScore(currentScore + challengeScore);

    if (currentChallenge < handsonChallenges.length - 1) {
      setTimeout(() => {
        setCurrentChallenge(currentChallenge + 1);
        setInteractiveState({ tappedApps: 0, completedLevels: 0, teachingSteps: 0, healthChecks: 0 });
      }, 2000);
    } else {
      setIsCompleted(true);
      
      const newActivities = progress.completedActivities.includes('practice-l4') 
        ? progress.completedActivities 
        : [...progress.completedActivities, 'practice-l4'];
      
      const newBadges = !progress.badges.includes('Hands-on Learner')
        ? [...progress.badges, 'Hands-on Learner']
        : progress.badges;

      updateProgressMutation.mutate({
        completedActivities: newActivities,
        badges: newBadges,
        score: progress.score + currentScore
      });
    }
  };

  const renderInteractiveDemo = () => {
    const challenge = handsonChallenges[currentChallenge];
    
    switch (challenge.interactiveDemo.type) {
      case "tap-sequence":
        return (
          <div className="grid grid-cols-4 gap-3">
            {challenge.interactiveDemo.sequence?.map((emoji, index) => (
              <motion.button
                key={index}
                className={`h-16 text-3xl rounded-lg border-2 ${
                  index < interactiveState.tappedApps 
                    ? 'bg-green-100 border-green-500' 
                    : 'bg-gray-100 border-gray-300 hover:bg-blue-50'
                }`}
                onClick={() => index === interactiveState.tappedApps && handleInteraction('tap')}
                disabled={index !== interactiveState.tappedApps}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {emoji}
              </motion.button>
            )) || []}
          </div>
        );
      
      case "level-completion":
        return (
          <div className="space-y-3">
            <div className="flex gap-2 justify-center">
              {challenge.interactiveDemo.levels?.map((level, index) => (
                <div
                  key={level}
                  className={`w-12 h-12 rounded-full flex items-center justify-center font-bold ${
                    index < interactiveState.completedLevels
                      ? 'bg-green-500 text-white'
                      : index === interactiveState.completedLevels
                        ? 'bg-blue-500 text-white animate-pulse'
                        : 'bg-gray-200'
                  }`}
                >
                  {level}
                </div>
              )) || []}
            </div>
            <Button 
              onClick={() => handleInteraction('level')}
              disabled={interactiveState.completedLevels >= challenge.interactiveDemo.target}
              className="w-full"
            >
              Complete Level {interactiveState.completedLevels + 1}
            </Button>
          </div>
        );
      
      case "teaching-steps":
        return (
          <div className="grid grid-cols-2 gap-3">
            {challenge.interactiveDemo.steps?.map((step, index) => (
              <Button
                key={step}
                variant={index < interactiveState.teachingSteps ? "default" : "outline"}
                onClick={() => index === interactiveState.teachingSteps && handleInteraction('teach')}
                disabled={index !== interactiveState.teachingSteps}
                className="h-16"
              >
                {index < interactiveState.teachingSteps ? '✅' : index + 1} {step}
              </Button>
            )) || []}
          </div>
        );
      
      case "health-tracker":
        return (
          <div className="grid grid-cols-2 gap-3">
            {challenge.interactiveDemo.habits?.map((habit, index) => (
              <Button
                key={habit}
                variant={index < interactiveState.healthChecks ? "default" : "outline"}
                onClick={() => index === interactiveState.healthChecks && handleInteraction('health')}
                disabled={index !== interactiveState.healthChecks}
                className="h-16"
              >
                {index < interactiveState.healthChecks ? '💚' : '⏰'} {habit}
              </Button>
            )) || []}
          </div>
        );
      
      default:
        return null;
    }
  };

  const totalCompleted = completedChallenges.filter(Boolean).length;
  const progressPercentage = (totalCompleted / handsonChallenges.length) * 100;

  if (isCompleted) {
    return (
      <div className="space-y-6 text-center">
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="text-6xl mb-4"
        >
          🏆
        </motion.div>
        <h3 className="text-2xl font-bold text-green-600">
          Semua Challenge Selesai!
        </h3>
        <p className="text-gray-700">
          Kamu berhasil menyelesaikan semua tantangan hands-on!
        </p>
        <div className="bg-green-50 p-4 rounded-lg">
          <p className="text-green-800 font-semibold">
            Total Score: {currentScore} poin 🎯
          </p>
          <p className="text-green-800 font-semibold">
            Badge "Hands-on Learner" diperoleh! 🏆
          </p>
        </div>
      </div>
    );
  }

  const challenge = handsonChallenges[currentChallenge];

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-2xl font-bold text-orange-600 mb-4">
          🎯 Hands-On Practice Challenges
        </h3>
        <div className="flex items-center justify-between mb-4">
          <Badge variant="outline">
            Challenge {currentChallenge + 1} dari {handsonChallenges.length}
          </Badge>
          <Badge className="bg-green-100 text-green-800">
            Score: {currentScore}
          </Badge>
        </div>
        <Progress value={progressPercentage} className="w-full" />
      </div>

      <Card className={`border-2 border-orange-200 ${challenge.color}`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <span className="text-4xl">{challenge.emoji}</span>
            <div>
              <h4 className="text-xl">{challenge.title}</h4>
              <p className="text-gray-600 text-sm">{challenge.description}</p>
            </div>
            <Badge className="ml-auto bg-orange-100 text-orange-800">
              +{challenge.points} poin
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h5 className="font-semibold mb-2">📋 Langkah-langkah:</h5>
              <ol className="list-decimal list-inside space-y-1">
                {challenge.instructions.map((instruction, index) => (
                  <li key={index} className="text-gray-700">{instruction}</li>
                ))}
              </ol>
            </div>

            <div className="bg-white p-6 rounded-lg border-2 border-dashed border-orange-300">
              <div className="text-center mb-4">
                <h5 className="font-semibold mb-2">🎮 Interactive Demo:</h5>
              </div>
              {renderInteractiveDemo()}
            </div>

            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4" />
                <span className="text-sm text-gray-600">
                  Progress: {Object.values(interactiveState).reduce((a, b) => a + b, 0)} / 
                  {challenge.interactiveDemo.target}
                </span>
              </div>
              <div className="text-sm text-gray-500 flex items-center gap-2">
                <Star className="w-4 h-4" />
                Complete all challenges for "Hands-on Learner" badge
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-4 gap-2">
        {handsonChallenges.map((chall, index) => (
          <div key={chall.id} className="text-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-1 ${
              completedChallenges[index] 
                ? 'bg-green-500 text-white' 
                : index === currentChallenge 
                  ? 'bg-orange-500 text-white' 
                  : 'bg-gray-200'
            }`}>
              {completedChallenges[index] ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <span className="text-xs font-bold">{index + 1}</span>
              )}
            </div>
            <p className="text-xs text-gray-600">{chall.emoji}</p>
          </div>
        ))}
      </div>
    </div>
  );
}