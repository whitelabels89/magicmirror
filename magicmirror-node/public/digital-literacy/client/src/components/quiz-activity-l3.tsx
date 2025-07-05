import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, XCircle, Trophy } from "lucide-react";
import { quizQuestionsL3 } from "@/lib/quiz-data-l3";
import { apiRequest } from "@/lib/queryClient";
import { StudentProgress } from "@shared/schema";

interface QuizActivityL3Props {
  studentName: string;
  progress: StudentProgress;
}

export default function QuizActivityL3({ studentName, progress }: QuizActivityL3Props) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<(string | number)[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<string | number>("");
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const queryClient = useQueryClient();

  const updateProgressMutation = useMutation({
    mutationFn: async (data: { 
      currentSlide?: number; 
      score?: number; 
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

  const handleAnswerSelect = (answer: string | number) => {
    setSelectedAnswer(answer);
  };

  const handleSubmitAnswer = () => {
    const newAnswers = [...answers, selectedAnswer];
    setAnswers(newAnswers);
    
    if (currentQuestion < quizQuestionsL3.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer("");
    } else {
      calculateScore(newAnswers);
      setIsComplete(true);
    }
  };

  const calculateScore = (finalAnswers: (string | number)[]) => {
    let correctCount = 0;
    
    finalAnswers.forEach((answer, index) => {
      const question = quizQuestionsL3[index];
      if (question.type === 'multiple' && question.correct !== undefined) {
        if (answer === question.correct) {
          correctCount++;
        }
      } else if (question.type === 'text' && typeof answer === 'string') {
        if (answer.trim().length > 3) {
          correctCount++;
        }
      }
    });
    
    const finalScore = Math.round((correctCount / quizQuestionsL3.length) * 100);
    setScore(finalScore);
    setShowResult(true);
    
    // Update progress
    const newBadges = [...(progress.badges || [])];
    if (finalScore >= 80 && !newBadges.includes("Quiz Master L3")) {
      newBadges.push("Quiz Master L3");
    }
    if (finalScore >= 90 && !newBadges.includes("Healthy Habits Expert")) {
      newBadges.push("Healthy Habits Expert");
    }
    
    const newCompletedActivities = [...(progress.completedActivities || [])];
    if (!newCompletedActivities.includes("l3-quiz")) {
      newCompletedActivities.push("l3-quiz");
    }
    
    updateProgressMutation.mutate({
      score: Math.max(progress.score || 0, finalScore),
      completedActivities: newCompletedActivities,
      badges: newBadges
    });
  };

  const resetQuiz = () => {
    setCurrentQuestion(0);
    setAnswers([]);
    setSelectedAnswer("");
    setShowResult(false);
    setScore(0);
    setIsComplete(false);
  };

  const currentQ = quizQuestionsL3[currentQuestion];
  const progressPercentage = ((currentQuestion + 1) / quizQuestionsL3.length) * 100;

  if (showResult) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Trophy className="h-16 w-16 text-yellow-500" />
          </div>
          <CardTitle className="text-2xl">Kuis Selesai!</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center">
            <div className="text-4xl font-bold text-green-600 mb-2">
              {score}%
            </div>
            <p className="text-lg text-gray-600">
              Kamu berhasil menjawab {Math.round((score / 100) * quizQuestionsL3.length)} dari {quizQuestionsL3.length} pertanyaan dengan benar!
            </p>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">🎉 Hebat!</h3>
            <p className="text-sm text-gray-700">
              Kamu sudah memahami pentingnya kebiasaan sehat saat menggunakan gadget. 
              Ingat untuk selalu mengatur waktu layar dan menjaga postur tubuh yang baik!
            </p>
          </div>
          
          <div className="flex space-x-3">
            <Button onClick={resetQuiz} variant="outline" className="flex-1">
              Ulangi Kuis
            </Button>
            <Button className="flex-1" onClick={() => setShowResult(false)}>
              Selesai
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isComplete && !showResult) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto mb-4"></div>
          <p>Menghitung skor...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg">
            Kuis Level 3: Kebiasaan Sehat
          </CardTitle>
          <Badge variant="outline">
            {currentQuestion + 1} / {quizQuestionsL3.length}
          </Badge>
        </div>
        <Progress value={progressPercentage} className="mt-2" />
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-lg font-medium">
            {currentQ.question}
          </h3>
          
          {currentQ.type === 'multiple' && currentQ.options ? (
            <div className="space-y-3">
              {currentQ.options.map((option, index) => (
                <Button
                  key={index}
                  variant={selectedAnswer === index ? "default" : "outline"}
                  className="w-full justify-start text-left h-auto p-4"
                  onClick={() => handleAnswerSelect(index)}
                >
                  <div className="flex items-center">
                    {selectedAnswer === index ? (
                      <CheckCircle className="h-5 w-5 mr-3 text-green-500" />
                    ) : (
                      <div className="h-5 w-5 mr-3 border-2 border-gray-300 rounded-full" />
                    )}
                    {option}
                  </div>
                </Button>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              <Input
                placeholder={currentQ.placeholder}
                value={selectedAnswer as string}
                onChange={(e) => setSelectedAnswer(e.target.value)}
                className="text-base"
              />
              <p className="text-sm text-gray-500">
                Berikan jawaban yang lengkap dan jelas
              </p>
            </div>
          )}
        </div>
        
        <div className="flex justify-between pt-4">
          <Button
            variant="outline"
            onClick={() => {
              if (currentQuestion > 0) {
                setCurrentQuestion(currentQuestion - 1);
                setSelectedAnswer(answers[currentQuestion - 1] || "");
              }
            }}
            disabled={currentQuestion === 0}
          >
            Sebelumnya
          </Button>
          
          <Button
            onClick={handleSubmitAnswer}
            disabled={!selectedAnswer && selectedAnswer !== 0}
            className="min-w-[100px]"
          >
            {currentQuestion === quizQuestionsL3.length - 1 ? "Selesai" : "Berikutnya"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}