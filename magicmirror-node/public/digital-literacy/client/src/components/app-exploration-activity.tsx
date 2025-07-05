import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StudentProgress } from "@shared/schema";
import { motion } from "framer-motion";
import { apiRequest } from "@/lib/queryClient";

interface AppExplorationActivityProps {
  studentName: string;
  progress: StudentProgress;
}

interface MiniApp {
  id: string;
  name: string;
  emoji: string;
  description: string;
  category: 'alphabet' | 'number' | 'color' | 'shape';
  difficulty: 'easy' | 'medium';
  color: string;
}

const miniApps: MiniApp[] = [
  {
    id: "alphabet-puzzle",
    name: "Puzzle Alfabet",
    emoji: "🧩",
    description: "Belajar huruf sambil menyusun puzzle seru!",
    category: "alphabet",
    difficulty: "easy",
    color: "bg-blue-100 border-blue-300"
  },
  {
    id: "number-game",
    name: "Game Angka",
    emoji: "🔢",
    description: "Belajar berhitung dengan game menyenangkan!",
    category: "number",
    difficulty: "easy",
    color: "bg-green-100 border-green-300"
  },
  {
    id: "color-match",
    name: "Mencocokkan Warna",
    emoji: "🎨",
    description: "Kenali warna dengan permainan yang seru!",
    category: "color",
    difficulty: "easy",
    color: "bg-purple-100 border-purple-300"
  },
  {
    id: "shape-builder",
    name: "Bangun Bentuk",
    emoji: "⭐",
    description: "Belajar bentuk geometri dengan menyenangkan!",
    category: "shape",
    difficulty: "medium",
    color: "bg-yellow-100 border-yellow-300"
  }
];

// Functional Mini Apps Components
const AlphabetPuzzle = () => {
  const [currentLetter, setCurrentLetter] = useState('A');
  const [score, setScore] = useState(0);
  const [completedLetters, setCompletedLetters] = useState<string[]>([]);
  const [isCompleted, setIsCompleted] = useState(false);
  const [feedback, setFeedback] = useState('');
  const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
  
  const handleLetterClick = (letter: string) => {
    if (isCompleted) return;
    
    if (letter === currentLetter && !completedLetters.includes(letter)) {
      setScore(score + 1);
      setCompletedLetters([...completedLetters, letter]);
      setFeedback(`Benar! Huruf ${letter} 🎉`);
      
      const nextIndex = letters.indexOf(letter) + 1;
      if (nextIndex < letters.length) {
        setTimeout(() => {
          setCurrentLetter(letters[nextIndex]);
          setFeedback('');
        }, 1000);
      } else {
        setIsCompleted(true);
        setFeedback('🎉 Selamat! Semua huruf berhasil dikumpulkan!');
      }
    } else if (!completedLetters.includes(letter)) {
      setFeedback(`Coba lagi! Cari huruf ${currentLetter}`);
      setTimeout(() => setFeedback(''), 1000);
    }
  };

  const resetGame = () => {
    setCurrentLetter('A');
    setScore(0);
    setCompletedLetters([]);
    setIsCompleted(false);
    setFeedback('');
  };

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h4 className="text-lg font-bold mb-2">🔤 Puzzle Alfabet</h4>
        <p className="text-gray-600 mb-2">
          {isCompleted ? 'Game Selesai!' : `Cari Huruf: ${currentLetter}`}
        </p>
        <p className="text-sm text-gray-600">Score: {score}/{letters.length}</p>
      </div>
      
      {feedback && (
        <div className="text-center p-2 bg-blue-50 rounded-lg">
          <p className="text-blue-700 font-semibold">{feedback}</p>
        </div>
      )}
      
      <div className="grid grid-cols-5 gap-2">
        {letters.map((letter) => (
          <Button
            key={letter}
            variant={
              completedLetters.includes(letter) 
                ? "default" 
                : letter === currentLetter && !isCompleted
                  ? "outline" 
                  : "secondary"
            }
            onClick={() => handleLetterClick(letter)}
            className={`h-16 text-xl font-bold ${
              completedLetters.includes(letter) 
                ? 'bg-green-500 text-white' 
                : letter === currentLetter && !isCompleted
                  ? 'border-blue-500 animate-pulse'
                  : ''
            }`}
            disabled={completedLetters.includes(letter)}
          >
            {letter}
          </Button>
        ))}
      </div>
      
      {(isCompleted || score > 0) && (
        <div className="text-center">
          <Button onClick={resetGame} variant="outline">
            🔄 Main Lagi
          </Button>
        </div>
      )}
    </div>
  );
};

const NumberGame = () => {
  const [question, setQuestion] = useState({ a: 2, b: 3, answer: 5 });
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [questionsAnswered, setQuestionsAnswered] = useState(0);
  const [gameComplete, setGameComplete] = useState(false);

  const generateQuestion = () => {
    const a = Math.floor(Math.random() * 5) + 1;
    const b = Math.floor(Math.random() * 5) + 1;
    setQuestion({ a, b, answer: a + b });
    setSelectedAnswer(null);
    setFeedback('');
  };

  const checkAnswer = (answer: number) => {
    setSelectedAnswer(answer);
    const newQuestionsAnswered = questionsAnswered + 1;
    
    if (answer === question.answer) {
      setScore(score + 1);
      setFeedback('Benar! 🎉');
    } else {
      setFeedback(`Salah! Jawaban yang benar adalah ${question.answer}`);
    }
    
    setQuestionsAnswered(newQuestionsAnswered);
    
    if (newQuestionsAnswered >= 10) {
      setGameComplete(true);
      setFeedback(`🎉 Game Selesai! Score akhir: ${score + (answer === question.answer ? 1 : 0)}/10`);
    } else {
      setTimeout(generateQuestion, 2000);
    }
  };

  const resetGame = () => {
    setScore(0);
    setQuestionsAnswered(0);
    setGameComplete(false);
    generateQuestion();
  };

  // Generate answer options
  const generateAnswerOptions = () => {
    const correct = question.answer;
    const wrong1 = correct + Math.floor(Math.random() * 3) + 1;
    const wrong2 = Math.max(1, correct - Math.floor(Math.random() * 3) - 1);
    const wrong3 = correct + Math.floor(Math.random() * 5) + 3;
    
    const options = [correct, wrong1, wrong2, wrong3];
    return options.sort(() => Math.random() - 0.5);
  };

  const answerOptions = generateAnswerOptions();

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h4 className="text-lg font-bold mb-2">🔢 Game Angka</h4>
        <p className="text-gray-600 mb-2">
          {gameComplete ? 'Game Selesai!' : 'Berapa hasil dari:'}
        </p>
        {!gameComplete && (
          <div className="text-4xl font-bold text-blue-600 mb-2">
            {question.a} + {question.b} = ?
          </div>
        )}
        <p className="text-sm text-gray-600">
          Score: {score} | Soal: {questionsAnswered}/10
        </p>
      </div>
      
      {feedback && (
        <div className={`text-center p-3 rounded-lg ${
          feedback.includes('Benar') ? 'bg-green-50 text-green-700' : 
          feedback.includes('Salah') ? 'bg-red-50 text-red-700' :
          'bg-blue-50 text-blue-700'
        }`}>
          <p className="font-semibold">{feedback}</p>
        </div>
      )}
      
      {!gameComplete ? (
        <div className="grid grid-cols-2 gap-3">
          {answerOptions.map((option, index) => (
            <Button
              key={index}
              onClick={() => checkAnswer(option)}
              variant={selectedAnswer === option ? "default" : "outline"}
              className={`h-16 text-2xl font-bold ${
                selectedAnswer === option 
                  ? option === question.answer 
                    ? 'bg-green-500 text-white' 
                    : 'bg-red-500 text-white'
                  : ''
              }`}
              disabled={selectedAnswer !== null}
            >
              {option}
            </Button>
          ))}
        </div>
      ) : (
        <div className="text-center">
          <Button onClick={resetGame} className="bg-blue-500 text-white">
            🔄 Main Lagi
          </Button>
        </div>
      )}
    </div>
  );
};

const ColorMatch = () => {
  const [targetColor, setTargetColor] = useState('merah');
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [streak, setStreak] = useState(0);
  const [gameLevel, setGameLevel] = useState(1);
  const [clickedColors, setClickedColors] = useState<string[]>([]);
  
  const colors = [
    { name: 'merah', hex: '#ef4444', bg: 'bg-red-500', emoji: '🔴' },
    { name: 'biru', hex: '#3b82f6', bg: 'bg-blue-500', emoji: '🔵' },
    { name: 'hijau', hex: '#22c55e', bg: 'bg-green-500', emoji: '🟢' },
    { name: 'kuning', hex: '#eab308', bg: 'bg-yellow-500', emoji: '🟡' },
    { name: 'ungu', hex: '#a855f7', bg: 'bg-purple-500', emoji: '🟣' },
    { name: 'orange', hex: '#f97316', bg: 'bg-orange-500', emoji: '🟠' }
  ];

  const handleColorClick = (colorName: string) => {
    if (clickedColors.includes(colorName)) return;
    
    setClickedColors([...clickedColors, colorName]);
    
    if (colorName === targetColor) {
      const newScore = score + 1;
      const newStreak = streak + 1;
      setScore(newScore);
      setStreak(newStreak);
      setFeedback(`Benar! ${colors.find(c => c.name === colorName)?.emoji} +1 poin`);
      
      // Level up every 5 correct answers
      if (newScore % 5 === 0) {
        setGameLevel(Math.floor(newScore / 5) + 1);
        setFeedback(`🎉 Level ${Math.floor(newScore / 5) + 1}! Semakin cepat!`);
      }
      
      setTimeout(() => {
        const nextColor = colors[Math.floor(Math.random() * colors.length)];
        setTargetColor(nextColor.name);
        setClickedColors([]);
        setFeedback('');
      }, 1000);
    } else {
      setStreak(0);
      setFeedback(`Salah! Cari warna ${targetColor}`);
      setTimeout(() => {
        setClickedColors([]);
        setFeedback('');
      }, 1500);
    }
  };

  const resetGame = () => {
    setScore(0);
    setStreak(0);
    setGameLevel(1);
    setClickedColors([]);
    setFeedback('');
    const firstColor = colors[Math.floor(Math.random() * colors.length)];
    setTargetColor(firstColor.name);
  };

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h4 className="text-lg font-bold mb-2">🎨 Mencocokan Warna</h4>
        <div className="mb-2">
          <p className="text-gray-600">Pilih warna: <span className="font-bold text-lg">{targetColor}</span></p>
          <div className="text-2xl">
            {colors.find(c => c.name === targetColor)?.emoji}
          </div>
        </div>
        <div className="flex justify-center gap-4 text-sm text-gray-600">
          <span>Score: {score}</span>
          <span>Streak: {streak}</span>
          <span>Level: {gameLevel}</span>
        </div>
      </div>
      
      {feedback && (
        <div className={`text-center p-3 rounded-lg ${
          feedback.includes('Benar') || feedback.includes('Level') ? 'bg-green-50 text-green-700' : 
          feedback.includes('Salah') ? 'bg-red-50 text-red-700' :
          'bg-blue-50 text-blue-700'
        }`}>
          <p className="font-semibold">{feedback}</p>
        </div>
      )}
      
      <div className="grid grid-cols-3 gap-3">
        {colors.map((color) => (
          <Button
            key={color.name}
            onClick={() => handleColorClick(color.name)}
            className={`h-20 ${color.bg} hover:opacity-80 text-white font-bold relative transition-all ${
              clickedColors.includes(color.name) 
                ? color.name === targetColor 
                  ? 'ring-4 ring-green-300 scale-105' 
                  : 'ring-4 ring-red-300 opacity-50'
                : 'hover:scale-105'
            }`}
            disabled={clickedColors.includes(color.name)}
          >
            <div className="text-center">
              <div className="text-2xl mb-1">{color.emoji}</div>
              <div className="text-sm">{color.name}</div>
            </div>
          </Button>
        ))}
      </div>
      
      {score > 0 && (
        <div className="text-center">
          <Button onClick={resetGame} variant="outline">
            🔄 Main Lagi
          </Button>
        </div>
      )}
    </div>
  );
};

const ShapeBuilder = () => {
  const [currentShape, setCurrentShape] = useState('lingkaran');
  const [score, setScore] = useState(0);
  const [builtShapes, setBuiltShapes] = useState<string[]>([]);
  const [feedback, setFeedback] = useState('');
  const [challenge, setChallenge] = useState(1);
  
  const shapes = [
    { name: 'lingkaran', emoji: '⭕', color: 'text-red-500' },
    { name: 'persegi', emoji: '⬜', color: 'text-blue-500' },
    { name: 'segitiga', emoji: '🔺', color: 'text-green-500' },
    { name: 'bintang', emoji: '⭐', color: 'text-yellow-500' },
    { name: 'hati', emoji: '❤️', color: 'text-pink-500' },
    { name: 'diamond', emoji: '💎', color: 'text-purple-500' }
  ];

  const handleShapeClick = (shapeName: string) => {
    if (builtShapes.includes(shapeName)) return;
    
    if (shapeName === currentShape) {
      const newScore = score + 1;
      setScore(newScore);
      setBuiltShapes([...builtShapes, shapeName]);
      setFeedback(`Bagus! Bentuk ${shapeName} berhasil dibuat! 🎉`);
      
      // Increase difficulty every 3 shapes
      if (newScore % 3 === 0) {
        setChallenge(challenge + 1);
        setFeedback(`🏆 Challenge ${challenge + 1}! Bentuk semakin kompleks!`);
      }
      
      setTimeout(() => {
        const availableShapes = shapes.filter(s => !builtShapes.includes(s.name) && s.name !== shapeName);
        if (availableShapes.length > 0) {
          const nextShape = availableShapes[Math.floor(Math.random() * availableShapes.length)];
          setCurrentShape(nextShape.name);
        } else {
          // All shapes built, reset
          setBuiltShapes([]);
          const nextShape = shapes[Math.floor(Math.random() * shapes.length)];
          setCurrentShape(nextShape.name);
        }
        setFeedback('');
      }, 1500);
    } else {
      setFeedback(`Coba lagi! Cari bentuk ${currentShape}`);
      setTimeout(() => setFeedback(''), 1000);
    }
  };

  const resetGame = () => {
    setScore(0);
    setBuiltShapes([]);
    setChallenge(1);
    setFeedback('');
    setCurrentShape('lingkaran');
  };

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h4 className="text-lg font-bold mb-2">🔨 Bangun Bentuk</h4>
        <div className="mb-2">
          <p className="text-gray-600">Bangun bentuk: <span className="font-bold text-lg">{currentShape}</span></p>
          <div className="text-4xl">
            {shapes.find(s => s.name === currentShape)?.emoji}
          </div>
        </div>
        <div className="flex justify-center gap-4 text-sm text-gray-600">
          <span>Score: {score}</span>
          <span>Challenge: {challenge}</span>
          <span>Selesai: {builtShapes.length}</span>
        </div>
      </div>
      
      {feedback && (
        <div className={`text-center p-3 rounded-lg ${
          feedback.includes('Bagus') || feedback.includes('Challenge') ? 'bg-green-50 text-green-700' : 
          feedback.includes('Coba') ? 'bg-orange-50 text-orange-700' :
          'bg-blue-50 text-blue-700'
        }`}>
          <p className="font-semibold">{feedback}</p>
        </div>
      )}
      
      <div className="grid grid-cols-3 gap-3">
        {shapes.map((shape) => (
          <Button
            key={shape.name}
            onClick={() => handleShapeClick(shape.name)}
            className={`h-20 text-4xl transition-all ${
              builtShapes.includes(shape.name) 
                ? 'bg-green-100 border-green-500 text-green-700' 
                : shape.name === currentShape
                  ? 'border-blue-500 animate-pulse bg-blue-50'
                  : 'hover:scale-105'
            }`}
            variant={builtShapes.includes(shape.name) ? "default" : "outline"}
            disabled={builtShapes.includes(shape.name)}
          >
            <div className="text-center">
              <div className={`${shape.color}`}>{shape.emoji}</div>
              <div className="text-xs mt-1">{shape.name}</div>
            </div>
          </Button>
        ))}
      </div>
      
      {/* Built shapes display */}
      {builtShapes.length > 0 && (
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600 mb-2">Bentuk yang sudah dibuat:</p>
          <div className="flex justify-center gap-2">
            {builtShapes.map((shapeName) => (
              <span key={shapeName} className="text-2xl">
                {shapes.find(s => s.name === shapeName)?.emoji}
              </span>
            ))}
          </div>
        </div>
      )}
      
      {score > 0 && (
        <div className="text-center">
          <Button onClick={resetGame} variant="outline">
            🔄 Main Lagi
          </Button>
        </div>
      )}
    </div>
  );
};

export default function AppExplorationActivity({ studentName, progress }: AppExplorationActivityProps) {
  const [selectedApp, setSelectedApp] = useState<MiniApp | null>(null);
  const [exploredApps, setExploredApps] = useState<string[]>([]);
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

  const handleAppExploration = (app: MiniApp) => {
    setSelectedApp(app);
    if (!exploredApps.includes(app.id)) {
      const newExploredApps = [...exploredApps, app.id];
      setExploredApps(newExploredApps);
      
      // Update progress and give points
      const newActivities = progress.completedActivities.includes('app-exploration') 
        ? progress.completedActivities 
        : [...progress.completedActivities, 'app-exploration'];
      
      const newBadges = newExploredApps.length >= 4 && !progress.badges.includes('App Explorer')
        ? [...progress.badges, 'App Explorer']
        : progress.badges;

      updateProgressMutation.mutate({
        completedActivities: newActivities,
        badges: newBadges,
        score: progress.score + 10
      });
    }
  };

  const renderMiniApp = (app: MiniApp) => {
    switch (app.id) {
      case 'alphabet-puzzle':
        return <AlphabetPuzzle />;
      case 'number-game':
        return <NumberGame />;
      case 'color-match':
        return <ColorMatch />;
      case 'shape-builder':
        return <ShapeBuilder />;
      default:
        return <div>App tidak ditemukan</div>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-2xl font-bold text-purple-600 mb-4">
          🎮 Jelajahi Aplikasi Belajar
        </h3>
        <p className="text-gray-600 mb-6">
          Pilih aplikasi yang ingin kamu coba dan mainkan langsung!
        </p>
      </div>

      {!selectedApp ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {miniApps.map((app) => (
            <motion.div
              key={app.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Card 
                className={`cursor-pointer transition-all hover:shadow-lg ${app.color}`}
                onClick={() => handleAppExploration(app)}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <span className="text-3xl">{app.emoji}</span>
                      {app.name}
                    </CardTitle>
                    <Badge variant={app.difficulty === 'easy' ? 'default' : 'secondary'}>
                      {app.difficulty === 'easy' ? 'Mudah' : 'Sedang'}
                    </Badge>
                  </div>
                  <CardDescription>{app.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full" size="sm">
                    Main Sekarang
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <Button 
              variant="outline" 
              onClick={() => setSelectedApp(null)}
              className="flex items-center gap-2"
            >
              ← Kembali
            </Button>
            <Badge className="bg-green-100 text-green-800">
              {exploredApps.length}/4 Aplikasi Dijelajahi
            </Badge>
          </div>

          <Card className={`${selectedApp.color}`}>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <span className="text-4xl">{selectedApp.emoji}</span>
                <div>
                  <h3 className="text-2xl">{selectedApp.name}</h3>
                  <p className="text-gray-600">{selectedApp.description}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedApp(null)}
                  className="ml-auto"
                >
                  ← Kembali
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {renderMiniApp(selectedApp)}
            </CardContent>
          </Card>
        </div>
      )}

      <div className="text-center">
        <p className="text-sm text-gray-500">
          Jelajahi semua aplikasi untuk mendapatkan badge "App Explorer"! 🏆
        </p>
      </div>
    </div>
  );
}