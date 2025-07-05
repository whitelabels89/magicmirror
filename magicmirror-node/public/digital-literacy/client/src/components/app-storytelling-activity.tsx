import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StudentProgress } from "@shared/schema";
import { motion } from "framer-motion";
import { apiRequest } from "@/lib/queryClient";

interface AppStorytellingActivityProps {
  studentName: string;
  progress: StudentProgress;
}

interface StoryChoice {
  id: string;
  text: string;
  emoji: string;
  consequence: string;
  isGood: boolean;
}

interface StoryScene {
  id: string;
  title: string;
  description: string;
  character: string;
  choices: StoryChoice[];
  image: string;
}

const storyScenes: StoryScene[] = [
  {
    id: "scene1",
    title: "Andi dan Aplikasi Belajar",
    description: "Andi baru saja mendapat tablet baru dari ayahnya. Dia ingin mencoba aplikasi belajar untuk pertama kalinya. Apa yang harus Andi lakukan?",
    character: "👦",
    image: "📱",
    choices: [
      {
        id: "choice1a",
        text: "Langsung download aplikasi tanpa tanya orang tua",
        emoji: "⚡",
        consequence: "Andi download aplikasi yang tidak cocok untuknya dan bingung cara menggunakannya.",
        isGood: false
      },
      {
        id: "choice1b",
        text: "Tanya mama dulu aplikasi mana yang bagus",
        emoji: "🤝",
        consequence: "Mama membantu Andi memilih aplikasi belajar huruf yang seru dan aman!",
        isGood: true
      },
      {
        id: "choice1c",
        text: "Coba semua aplikasi yang ada di toko",
        emoji: "🔍",
        consequence: "Andi jadi bingung karena terlalu banyak pilihan dan tidak tahu mana yang terbaik.",
        isGood: false
      }
    ]
  },
  {
    id: "scene2",
    title: "Sari Belajar Angka",
    description: "Sari sedang bermain aplikasi belajar angka. Dia sudah bermain 30 menit dan mama mengingatkan waktunya istirahat. Apa yang sebaiknya Sari lakukan?",
    character: "👧",
    image: "🔢",
    choices: [
      {
        id: "choice2a",
        text: "Terus bermain karena seru sekali",
        emoji: "🎮",
        consequence: "Mata Sari jadi lelah dan sakit karena terlalu lama menatap layar.",
        isGood: false
      },
      {
        id: "choice2b",
        text: "Berhenti sejenak dan istirahat mata",
        emoji: "😌",
        consequence: "Sari istirahat dulu, minum air, dan siap melanjutkan dengan mata yang segar!",
        isGood: true
      },
      {
        id: "choice2c",
        text: "Pindah ke aplikasi lain supaya tidak bosan",
        emoji: "🔄",
        consequence: "Sari tetap menatap layar terus dan tidak memberi istirahat pada matanya.",
        isGood: false
      }
    ]
  },
  {
    id: "scene3",
    title: "Budi dan Aplikasi Warna",
    description: "Budi menemukan aplikasi mengenal warna yang sangat menarik. Dia ingin berbagi keseruan ini dengan adiknya. Bagaimana cara terbaik?",
    character: "👦",
    image: "🎨",
    choices: [
      {
        id: "choice3a",
        text: "Bermain sendiri saja supaya tidak berebut",
        emoji: "🙄",
        consequence: "Adik Budi sedih karena tidak diajak bermain dan belajar bersama.",
        isGood: false
      },
      {
        id: "choice3b",
        text: "Ajak adik bermain dan belajar bersama",
        emoji: "🤝",
        consequence: "Budi dan adiknya belajar sambil bermain! Mereka berdua jadi lebih pintar dan akrab.",
        isGood: true
      },
      {
        id: "choice3c",
        text: "Kasih tau adik nanti kalau sudah selesai",
        emoji: "⏰",
        consequence: "Adik jadi bosan menunggu dan tidak tertarik lagi saat gilirannya.",
        isGood: false
      }
    ]
  }
];

export default function AppStorytellingActivity({ studentName, progress }: AppStorytellingActivityProps) {
  const [currentScene, setCurrentScene] = useState(0);
  const [selectedChoice, setSelectedChoice] = useState<StoryChoice | null>(null);
  const [showConsequence, setShowConsequence] = useState(false);
  const [goodChoices, setGoodChoices] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
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

  const handleChoiceSelect = (choice: StoryChoice) => {
    setSelectedChoice(choice);
    setShowConsequence(true);
    
    if (choice.isGood) {
      setGoodChoices(goodChoices + 1);
    }
  };

  const handleNextScene = () => {
    if (currentScene < storyScenes.length - 1) {
      setCurrentScene(currentScene + 1);
      setSelectedChoice(null);
      setShowConsequence(false);
    } else {
      setIsComplete(true);
      
      // Update progress
      const newActivities = progress.completedActivities.includes('app-storytelling') 
        ? progress.completedActivities 
        : [...progress.completedActivities, 'app-storytelling'];
      
      const newBadges = goodChoices >= 2 && !progress.badges.includes('App Storyteller')
        ? [...progress.badges, 'App Storyteller']
        : progress.badges;

      updateProgressMutation.mutate({
        completedActivities: newActivities,
        badges: newBadges,
        score: progress.score + (goodChoices * 15)
      });
    }
  };

  const handleRestart = () => {
    setCurrentScene(0);
    setSelectedChoice(null);
    setShowConsequence(false);
    setGoodChoices(0);
    setIsComplete(false);
  };

  if (isComplete) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h3 className="text-2xl font-bold text-purple-600 mb-4">
            🎉 Cerita Selesai!
          </h3>
          <div className="text-6xl mb-4">
            {goodChoices === 3 ? "⭐" : goodChoices >= 2 ? "👍" : "💪"}
          </div>
          <p className="text-xl mb-4">
            Kamu membuat {goodChoices} dari 3 pilihan yang baik!
          </p>
          <div className="bg-green-50 p-4 rounded-lg mb-4">
            <p className="text-gray-700">
              {goodChoices === 3 && "Luar biasa! Kamu selalu memilih yang terbaik dalam menggunakan aplikasi belajar!"}
              {goodChoices === 2 && "Bagus sekali! Kamu sudah paham cara menggunakan aplikasi belajar dengan baik!"}
              {goodChoices === 1 && "Lumayan! Masih ada yang bisa diperbaiki dalam cara menggunakan aplikasi belajar."}
              {goodChoices === 0 && "Yuk belajar lagi! Penting untuk memilih cara yang baik dalam menggunakan aplikasi belajar."}
            </p>
          </div>
        </div>
        
        <div className="flex gap-4 justify-center">
          <Button onClick={handleRestart} variant="outline">
            Cerita Lagi
          </Button>
          <Button onClick={() => window.location.reload()}>
            Lanjut Aktivitas
          </Button>
        </div>
      </div>
    );
  }

  const scene = storyScenes[currentScene];

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-2xl font-bold text-purple-600 mb-4">
          📚 Cerita Aplikasi Belajar
        </h3>
        <Badge variant="outline" className="mb-4">
          Cerita {currentScene + 1} dari {storyScenes.length}
        </Badge>
      </div>

      <Card className="bg-gradient-to-r from-purple-50 to-pink-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <span className="text-4xl">{scene.character}</span>
            <div>
              <h4 className="text-xl">{scene.title}</h4>
              <div className="text-4xl mt-2">{scene.image}</div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700 mb-6 text-lg leading-relaxed">
            {scene.description}
          </p>

          {!showConsequence ? (
            <div className="space-y-3">
              <p className="font-semibold mb-4">Pilih yang terbaik:</p>
              {scene.choices.map((choice) => (
                <motion.div key={choice.id} whileHover={{ scale: 1.02 }}>
                  <Button
                    variant="outline"
                    className="w-full p-4 h-auto text-left justify-start"
                    onClick={() => handleChoiceSelect(choice)}
                  >
                    <span className="text-2xl mr-3">{choice.emoji}</span>
                    <span className="text-base">{choice.text}</span>
                  </Button>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-white border-2 border-gray-200">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">{selectedChoice?.emoji}</span>
                  <span className="font-semibold">Pilihanmu:</span>
                </div>
                <p className="text-gray-700 mb-3">{selectedChoice?.text}</p>
                <div className={`p-3 rounded-lg ${selectedChoice?.isGood ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'} border`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">{selectedChoice?.isGood ? '✅' : '❌'}</span>
                    <span className="font-semibold">
                      {selectedChoice?.isGood ? 'Pilihan Bagus!' : 'Pilihan Kurang Tepat'}
                    </span>
                  </div>
                  <p className="text-gray-700">{selectedChoice?.consequence}</p>
                </div>
              </div>

              <div className="text-center">
                <Button onClick={handleNextScene} className="bg-purple-600 hover:bg-purple-700">
                  {currentScene < storyScenes.length - 1 ? 'Lanjut Cerita' : 'Selesai'}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="text-center">
        <p className="text-sm text-gray-500">
          Buat pilihan yang baik untuk mendapatkan badge "App Storyteller"! 🏆
        </p>
      </div>
    </div>
  );
}