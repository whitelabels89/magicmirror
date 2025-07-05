import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, XCircle, Brain, Trophy } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { StudentProgress } from "@shared/schema";
import { quizQuestionsL4, QuizQuestion } from "@/lib/quiz-data-l4";

interface QuizActivityL4Props {
  studentName: string;
  progress: StudentProgress;
}

export default function QuizActivityL4({ studentName, progress }: QuizActivityL4Props) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<(string | number)[]>([]);
  const [currentAnswer, setCurrentAnswer] = useState<string | number>("");
  const [showResults, setShowResults] = useState(false);
  const [score, setScore] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const queryClient = useQueryClient();

  const updateProgressMutation = useMutation({
    mutationFn: async (data: { 
      score?: number; 
      completedActivities?: string[];
      badges?: string[];
      quizAnswers?: (string | number)[];
      currentQuestion?: number;
    }) => {
      return apiRequest("PUT", `/api/progress-l4/${studentName}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/progress-l4', studentName] });
      queryClient.invalidateQueries({ queryKey: ['/api/leaderboard'] });
    },
  });

  const question = quizQuestionsL4[currentQuestion];
  const progressPercentage = ((currentQuestion + 1) / quizQuestionsL4.length) * 100;

  const handleAnswerSubmit = () => {
    const newAnswers = [...answers, currentAnswer];
    setAnswers(newAnswers);

    if (currentQuestion < quizQuestionsL4.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setCurrentAnswer("");
    } else {
      calculateScore(newAnswers);
    }
  };

  const calculateScore = (finalAnswers: (string | number)[]) => {
    let correctCount = 0;
    
    finalAnswers.forEach((answer, index) => {
      const question = quizQuestionsL4[index];
      if (question.type === 'multiple' && question.correct !== undefined) {
        if (answer === question.correct) {
          correctCount++;
        }
      } else if (question.type === 'text') {
        // Give credit for text answers if they have content
        if (typeof answer === 'string' && answer.trim().length > 0) {
          correctCount++;
        }
      }
    });

    const finalScore = Math.round((correctCount / quizQuestionsL4.length) * 100);
    setScore(finalScore);
    setShowResults(true);
    
    // Update progress
    updateProgressMutation.mutate({
      score: finalScore,
      quizAnswers: finalAnswers,
      currentQuestion: quizQuestionsL4.length
    });
  };

  const completeQuiz = () => {
    const newCompletedActivities = [...(progress.completedActivities || [])];
    const activityId = "l4-quiz";
    
    if (!newCompletedActivities.includes(activityId)) {
      newCompletedActivities.push(activityId);
    }

    const newBadges = [...(progress.badges || [])];
    if (score >= 80 && !newBadges.includes("App Expert")) {
      newBadges.push("App Expert");
    } else if (score >= 60 && !newBadges.includes("App Learner")) {
      newBadges.push("App Learner");
    }

    updateProgressMutation.mutate({
      completedActivities: newCompletedActivities,
      badges: newBadges,
      score: (progress.score || 0) + Math.round(score / 4)
    });

    setIsCompleted(true);
  };

  if (isCompleted) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Trophy className="h-16 w-16 text-yellow-500" />
          </div>
          <CardTitle className="text-2xl">Quiz Selesai!</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center">
            <div className="text-4xl font-bold text-blue-600 mb-2">{score}%</div>
            <p className="text-lg text-gray-600">
              {score >= 80 ? "Hebat sekali!" : score >= 60 ? "Bagus!" : "Terus belajar!"}
            </p>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">📚 Yang Sudah Kamu Pelajari:</h3>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• Memahami apa itu aplikasi edukasi</li>
              <li>• Mengenal berbagai contoh aplikasi belajar</li>
              <li>• Mengetahui manfaat aplikasi untuk belajar</li>
              <li>• Cara menggunakan aplikasi belajar dengan baik</li>
            </ul>
          </div>
          
          <Button 
            className="w-full" 
            onClick={() => {
              setIsCompleted(false);
              setShowResults(false);
              setCurrentQuestion(0);
              setAnswers([]);
              setCurrentAnswer("");
              setScore(0);
            }}
          >
            Coba Quiz Lagi
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (showResults) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Brain className="h-16 w-16 text-purple-500" />
          </div>
          <CardTitle className="text-2xl">Hasil Quiz</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center">
            <div className="text-6xl font-bold text-blue-600 mb-4">{score}%</div>
            <p className="text-xl">
              {score >= 80 ? "Luar biasa! Kamu sudah paham tentang aplikasi belajar!" :
               score >= 60 ? "Bagus! Kamu sudah memahami dasar-dasar aplikasi belajar." :
               "Terus belajar! Kamu bisa coba lagi."}
            </p>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold">Review Jawaban:</h3>
            {quizQuestionsL4.map((q, index) => {
              const userAnswer = answers[index];
              const isCorrect = q.type === 'multiple' ? 
                userAnswer === q.correct : 
                (typeof userAnswer === 'string' && userAnswer.trim().length > 0);

              return (
                <div key={index} className="border rounded-lg p-3">
                  <div className="flex items-start space-x-2">
                    {isCorrect ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <p className="font-medium text-sm">{q.question}</p>
                      {q.type === 'multiple' && (
                        <p className="text-sm text-gray-600">
                          Jawabanmu: {q.options?.[userAnswer as number] || 'Tidak dijawab'}
                        </p>
                      )}
                      {q.type === 'text' && (
                        <p className="text-sm text-gray-600">
                          Jawabanmu: "{userAnswer || 'Tidak dijawab'}"
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <Button className="w-full" onClick={completeQuiz}>
            Selesai Quiz
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl">Quiz Level 4</CardTitle>
            <p className="text-sm text-gray-600">
              Pertanyaan {currentQuestion + 1} dari {quizQuestionsL4.length}
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-blue-600">
              {Math.round(progressPercentage)}%
            </div>
          </div>
        </div>
        <Progress value={progressPercentage} className="mt-4" />
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div className="bg-blue-50 p-6 rounded-lg">
          <h3 className="text-lg font-semibold mb-4">{question.question}</h3>
          
          {question.type === 'multiple' && question.options && (
            <div className="space-y-3">
              {question.options.map((option, index) => (
                <Button
                  key={index}
                  variant={currentAnswer === index ? "default" : "outline"}
                  className="w-full text-left justify-start h-auto p-4"
                  onClick={() => setCurrentAnswer(index)}
                >
                  <span className="font-medium mr-3">{String.fromCharCode(65 + index)}.</span>
                  {option}
                </Button>
              ))}
            </div>
          )}

          {question.type === 'text' && (
            <div className="space-y-3">
              <Textarea
                value={currentAnswer as string}
                onChange={(e) => setCurrentAnswer(e.target.value)}
                placeholder={question.placeholder || "Tulis jawabanmu di sini..."}
                className="min-h-[100px]"
              />
              <p className="text-xs text-gray-500">
                {(currentAnswer as string).length} karakter
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-between">
          <Button
            onClick={() => {
              if (currentQuestion > 0) {
                setCurrentQuestion(currentQuestion - 1);
                setCurrentAnswer(answers[currentQuestion - 1] || "");
                setAnswers(answers.slice(0, -1));
              }
            }}
            variant="outline"
            disabled={currentQuestion === 0}
          >
            Kembali
          </Button>
          
          <Button
            onClick={handleAnswerSubmit}
            disabled={
              question.type === 'multiple' ? 
                currentAnswer === "" : 
                (currentAnswer as string).trim().length === 0
            }
          >
            {currentQuestion === quizQuestionsL4.length - 1 ? 'Selesai' : 'Lanjut'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}