import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { quizQuestions } from "@/lib/quiz-data";
import { StudentProgress } from "@shared/schema";

interface QuizActivityProps {
  studentName: string;
  progress: StudentProgress;
}

export default function QuizActivity({ studentName, progress }: QuizActivityProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<string>("");
  const [textAnswer, setTextAnswer] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const submitAnswerMutation = useMutation({
    mutationFn: async (data: { questionIndex: number; answer: string; isCorrect: boolean }) => {
      const response = await apiRequest('POST', `/api/quiz/${studentName}/answer`, data);
      return response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/progress', studentName] });
      
      if (variables.isCorrect) {
        toast({
          title: "Correct! 🎉",
          description: "Great job! You earned 10 points.",
          className: "bg-green-500 text-white",
        });
      } else {
        toast({
          title: "Try again next time! 💪",
          description: "Keep learning and you'll get it!",
          className: "bg-red-500 text-white",
        });
      }
      
      // Reset form
      setSelectedAnswer("");
      setTextAnswer("");
    },
  });

  const handleSubmit = () => {
    const question = quizQuestions[progress.currentQuestion];
    if (!question) return;

    let answer = "";
    let isCorrect = false;

    if (question.type === 'multiple') {
      answer = selectedAnswer;
      isCorrect = parseInt(selectedAnswer) === question.correct;
    } else {
      answer = textAnswer.trim();
      isCorrect = answer.length > 0; // For text answers, any non-empty answer is correct
    }

    if (!answer) {
      toast({
        title: "Please provide an answer",
        description: "Make sure to select or type your answer before submitting.",
        variant: "destructive",
      });
      return;
    }

    submitAnswerMutation.mutate({
      questionIndex: progress.currentQuestion,
      answer,
      isCorrect,
    });
  };

  if (progress.currentQuestion >= quizQuestions.length) {
    const percentage = (progress.score / (quizQuestions.length * 10)) * 100;
    
    return (
      <div className="text-center py-8">
        <div className="text-6xl mb-4">🎉</div>
        <h4 className="text-2xl font-fredoka text-primary mb-2">Quiz Complete!</h4>
        <p className="text-lg text-gray-700 mb-4">
          Your Score: {progress.score} points ({percentage.toFixed(0)}%)
        </p>
        <Card className="bg-gradient-to-r from-green-400 to-blue-500 text-white">
          <CardContent className="p-4">
            <p className="font-medium">Awesome work! You've learned a lot about digital devices!</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentQuestion = quizQuestions[progress.currentQuestion];
  if (!currentQuestion) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-fredoka text-lg text-gray-800">Quiz Time!</h4>
        <Badge variant="outline" className="bg-blue-100 text-blue-800">
          Question {progress.currentQuestion + 1}
        </Badge>
      </div>

      <Card className="bg-gray-50">
        <CardContent className="p-4">
          <h5 className="font-medium text-gray-800 mb-4">{currentQuestion.question}</h5>
          
          {currentQuestion.type === 'multiple' ? (
            <RadioGroup
              value={selectedAnswer}
              onValueChange={setSelectedAnswer}
              className="space-y-2"
            >
              {currentQuestion.options?.map((option, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <RadioGroupItem value={index.toString()} id={`option-${index}`} />
                  <Label htmlFor={`option-${index}`} className="cursor-pointer">
                    {option}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          ) : (
            <Textarea
              value={textAnswer}
              onChange={(e) => setTextAnswer(e.target.value)}
              placeholder={currentQuestion.placeholder}
              rows={3}
              className="w-full"
            />
          )}
        </CardContent>
      </Card>

      <Button
        onClick={handleSubmit}
        disabled={submitAnswerMutation.isPending}
        className="w-full"
      >
        {submitAnswerMutation.isPending ? "Submitting..." : "Submit Answer"}
      </Button>
    </div>
  );
}
