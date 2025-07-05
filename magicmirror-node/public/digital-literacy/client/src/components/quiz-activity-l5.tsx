import { useState } from 'react';
import { motion } from 'framer-motion';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StudentProgress } from '@shared/schema';

interface QuizActivityL5Props {
  studentName: string;
  progress: StudentProgress;
  onBack: () => void;
}

interface QuizQuestion {
  id: string;
  question: string;
  type: 'multiple' | 'truefalse' | 'scenario';
  options: string[];
  correct: number;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

const quizQuestions: QuizQuestion[] = [
  {
    id: '1',
    question: 'Apa arti "online"?',
    type: 'multiple',
    options: ['Tidak butuh internet', 'Butuh internet untuk berjalan', 'Bisa digunakan kapan saja', 'Gratis dari kuota'],
    correct: 1,
    explanation: 'Online berarti membutuhkan koneksi internet untuk dapat berfungsi.',
    difficulty: 'easy'
  },
  {
    id: '2',
    question: 'Manakah contoh kegiatan offline?',
    type: 'multiple',
    options: ['Nonton YouTube', 'Video call dengan teman', 'Main puzzle di tablet', 'Download aplikasi'],
    correct: 2,
    explanation: 'Main puzzle di tablet adalah kegiatan offline karena tidak membutuhkan internet.',
    difficulty: 'easy'
  },
  {
    id: '3',
    question: 'Kegiatan online membutuhkan koneksi internet.',
    type: 'truefalse',
    options: ['Benar', 'Salah'],
    correct: 0,
    explanation: 'Benar! Kegiatan online selalu membutuhkan koneksi internet untuk dapat berfungsi.',
    difficulty: 'easy'
  },
  {
    id: '4',
    question: 'Apa keuntungan utama kegiatan offline?',
    type: 'multiple',
    options: ['Bisa main dengan teman jauh', 'Tidak menggunakan kuota internet', 'Konten selalu update', 'Fitur lebih lengkap'],
    correct: 1,
    explanation: 'Kegiatan offline tidak menggunakan kuota internet dan bisa diakses kapan saja.',
    difficulty: 'medium'
  },
  {
    id: '5',
    question: 'Kamu ingin main game saat wifi mati. Apa yang sebaiknya dilakukan?',
    type: 'scenario',
    options: ['Tetap coba main game online', 'Pilih game offline yang sudah terinstall', 'Minta kuota ke orang tua', 'Berhenti main game'],
    correct: 1,
    explanation: 'Saat wifi mati, pilihan terbaik adalah main game offline yang sudah terinstall di perangkat.',
    difficulty: 'medium'
  },
  {
    id: '6',
    question: 'Apa yang membedakan streaming musik online dengan mendengar musik offline?',
    type: 'multiple',
    options: ['Kualitas suara lebih baik', 'Musik online butuh internet, offline tidak', 'Musik offline lebih mahal', 'Tidak ada perbedaan'],
    correct: 1,
    explanation: 'Streaming musik online membutuhkan internet, sedangkan musik offline sudah tersimpan di perangkat.',
    difficulty: 'medium'
  },
  {
    id: '7',
    question: 'Semua aplikasi di tablet membutuhkan koneksi internet untuk berfungsi.',
    type: 'truefalse',
    options: ['Benar', 'Salah'],
    correct: 1,
    explanation: 'Salah! Banyak aplikasi seperti kalkulator, kamera, dan game offline tidak membutuhkan internet.',
    difficulty: 'hard'
  },
  {
    id: '8',
    question: 'Kapan waktu yang tepat untuk melakukan aktivitas online?',
    type: 'scenario',
    options: ['Kapan saja sesuai keinginan', 'Setelah mendapat izin dan ada koneksi yang baik', 'Hanya saat orang tua tidak ada', 'Tidak perlu izin siapa-siapa'],
    correct: 1,
    explanation: 'Aktivitas online sebaiknya dilakukan setelah mendapat izin orang tua dan memastikan koneksi internet yang stabil.',
    difficulty: 'hard'
  }
];

export default function QuizActivityL5({ 
  studentName, 
  progress, 
  onBack 
}: QuizActivityL5Props) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [answers, setAnswers] = useState<number[]>([]);
  const [quizComplete, setQuizComplete] = useState(false);
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

  const handleAnswerSelect = (answerIndex: number) => {
    setSelectedAnswer(answerIndex);
  };

  const handleSubmitAnswer = () => {
    if (selectedAnswer === null) return;
    
    setAnswers([...answers, selectedAnswer]);
    setShowExplanation(true);
  };

  const handleNextQuestion = () => {
    if (currentQuestion < quizQuestions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
    } else {
      completeQuiz();
    }
  };

  const completeQuiz = () => {
    let correctCount = 0;
    answers.forEach((answer, index) => {
      if (answer === quizQuestions[index].correct) {
        correctCount++;
      }
    });

    const finalScore = Math.round((correctCount / quizQuestions.length) * 100);
    setScore(finalScore);
    setQuizComplete(true);

    // Update progress
    const activityName = 'quiz-l5';
    const newActivities = progress.completedActivities.includes(activityName) 
      ? progress.completedActivities 
      : [...progress.completedActivities, activityName];
    
    const newBadges = [...progress.badges];
    if (finalScore >= 90 && !newBadges.includes('Quiz Master')) {
      newBadges.push('Quiz Master');
    }
    if (finalScore === 100 && !newBadges.includes('Perfect Score')) {
      newBadges.push('Perfect Score');
    }
    if (correctCount >= 6 && !newBadges.includes('Knowledge Seeker')) {
      newBadges.push('Knowledge Seeker');
    }

    updateProgressMutation.mutate({
      completedActivities: newActivities,
      badges: newBadges,
      score: progress.score + Math.floor(finalScore / 5)
    });
  };

  const resetQuiz = () => {
    setCurrentQuestion(0);
    setSelectedAnswer(null);
    setShowExplanation(false);
    setAnswers([]);
    setQuizComplete(false);
    setScore(0);
  };

  if (quizComplete) {
    const correctCount = answers.filter((answer, index) => answer === quizQuestions[index].correct).length;
    
    return (
      <div className="space-y-6">
        <div className="text-center">
          <Button onClick={onBack} variant="outline" className="mb-4">
            ← Kembali
          </Button>
          <h3 className="text-2xl font-bold text-orange-600 mb-4">
            🎯 Hasil Kuis
          </h3>
        </div>

        <Card className="p-6">
          <div className="text-center space-y-4">
            <div className="text-6xl">
              {score >= 90 ? '🏆' : score >= 70 ? '🎯' : score >= 50 ? '📚' : '💪'}
            </div>
            <h4 className="text-2xl font-bold">Score: {score}/100</h4>
            <p className="text-lg text-gray-600">
              Kamu menjawab {correctCount} dari {quizQuestions.length} pertanyaan dengan benar!
            </p>
            
            <div className={`p-4 rounded-lg ${
              score >= 90 ? 'bg-green-50 text-green-700' :
              score >= 70 ? 'bg-blue-50 text-blue-700' :
              score >= 50 ? 'bg-yellow-50 text-yellow-700' :
              'bg-red-50 text-red-700'
            }`}>
              <p className="font-semibold">
                {score >= 90 ? '🌟 Luar biasa! Kamu sudah paham betul tentang online vs offline!' :
                 score >= 70 ? '👍 Bagus! Kamu sudah memahami konsep dasar dengan baik!' :
                 score >= 50 ? '📖 Lumayan! Masih ada beberapa konsep yang perlu dipelajari lagi.' :
                 '💪 Jangan menyerah! Coba pelajari materi sekali lagi dan ulangi kuis.'}
              </p>
            </div>

            {/* Detailed Results */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              <div className="bg-green-50 p-4 rounded-lg">
                <h5 className="font-bold text-green-600 mb-2">Jawaban Benar ✓</h5>
                <div className="space-y-1 text-sm">
                  {answers.map((answer, index) => {
                    const question = quizQuestions[index];
                    const isCorrect = answer === question.correct;
                    if (isCorrect) {
                      return (
                        <div key={index} className="text-green-700">
                          {index + 1}. {question.question.substring(0, 30)}...
                        </div>
                      );
                    }
                    return null;
                  })}
                </div>
              </div>
              
              <div className="bg-red-50 p-4 rounded-lg">
                <h5 className="font-bold text-red-600 mb-2">Perlu Review ✗</h5>
                <div className="space-y-1 text-sm">
                  {answers.map((answer, index) => {
                    const question = quizQuestions[index];
                    const isWrong = answer !== question.correct;
                    if (isWrong) {
                      return (
                        <div key={index} className="text-red-700">
                          {index + 1}. {question.question.substring(0, 30)}...
                        </div>
                      );
                    }
                    return null;
                  })}
                </div>
              </div>
            </div>

            <div className="flex gap-4 justify-center mt-6">
              <Button onClick={resetQuiz} variant="outline">
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

  const question = quizQuestions[currentQuestion];
  const isCorrect = selectedAnswer === question.correct;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <Button onClick={onBack} variant="outline" className="mb-4">
          ← Kembali
        </Button>
        <h3 className="text-2xl font-bold text-orange-600 mb-2">
          🧠 Kuis Online vs Offline
        </h3>
        <p className="text-gray-600 mb-4">
          Tes pemahamanmu tentang konsep online dan offline!
        </p>
        <div className="text-sm text-gray-500">
          Pertanyaan {currentQuestion + 1} dari {quizQuestions.length}
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-orange-500 h-2 rounded-full transition-all duration-300"
          style={{ width: `${((currentQuestion + 1) / quizQuestions.length) * 100}%` }}
        ></div>
      </div>

      <Card className="p-6">
        <CardHeader className="text-center">
          <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium mb-4 ${
            question.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
            question.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
            'bg-red-100 text-red-800'
          }`}>
            {question.difficulty === 'easy' ? '😊 Mudah' :
             question.difficulty === 'medium' ? '🤔 Sedang' :
             '🧠 Sulit'}
          </div>
          <CardTitle className="text-xl">
            {question.question}
          </CardTitle>
        </CardHeader>
        
        <CardContent>
          {!showExplanation ? (
            <div className="space-y-3">
              {question.options.map((option, index) => (
                <motion.div
                  key={index}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    onClick={() => handleAnswerSelect(index)}
                    variant={selectedAnswer === index ? "default" : "outline"}
                    className={`w-full h-auto p-4 text-left justify-start ${
                      selectedAnswer === index ? 'bg-orange-500 text-white' : 'hover:bg-orange-50'
                    }`}
                  >
                    <span className="text-lg mr-3 font-bold">
                      {question.type === 'truefalse' 
                        ? (index === 0 ? '✓' : '✗')
                        : String.fromCharCode(65 + index)
                      }
                    </span>
                    <span className="text-lg">{option}</span>
                  </Button>
                </motion.div>
              ))}
              
              <div className="text-center mt-6">
                <Button 
                  onClick={handleSubmitAnswer}
                  disabled={selectedAnswer === null}
                  className="bg-orange-500 text-white px-8 py-3"
                >
                  {selectedAnswer === null ? 'Pilih Jawaban' : 'Submit Jawaban'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className={`p-4 rounded-lg border-2 ${
                isCorrect 
                  ? 'bg-green-50 border-green-300 text-green-700' 
                  : 'bg-red-50 border-red-300 text-red-700'
              }`}>
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-2xl">{isCorrect ? '✅' : '❌'}</span>
                  <span className="font-bold text-lg">
                    {isCorrect ? 'Benar!' : 'Salah!'}
                  </span>
                </div>
                <p>{question.explanation}</p>
                {!isCorrect && (
                  <p className="mt-2 font-medium">
                    Jawaban yang benar: {question.options[question.correct]}
                  </p>
                )}
              </div>
              
              <div className="text-center">
                <Button 
                  onClick={handleNextQuestion}
                  className="bg-blue-500 text-white px-8 py-3"
                >
                  {currentQuestion < quizQuestions.length - 1 ? 'Lanjut ke Pertanyaan Berikutnya' : 'Lihat Hasil'}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}