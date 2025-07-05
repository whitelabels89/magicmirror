import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MessageCircle, Lightbulb, Share2, CheckCircle2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { StudentProgress } from "@shared/schema";

interface AppDiscussionActivityProps {
  studentName: string;
  progress: StudentProgress;
}

export default function AppDiscussionActivity({ studentName, progress }: AppDiscussionActivityProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [responses, setResponses] = useState<string[]>([]);
  const [currentResponse, setCurrentResponse] = useState("");
  const [isCompleted, setIsCompleted] = useState(false);
  const queryClient = useQueryClient();

  const updateProgressMutation = useMutation({
    mutationFn: async (data: { 
      completedActivities?: string[];
      badges?: string[];
    }) => {
      return apiRequest("PUT", `/api/progress-l4/${studentName}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/progress-l4', studentName] });
      queryClient.invalidateQueries({ queryKey: ['/api/leaderboard'] });
    },
  });

  const discussionSteps = [
    {
      title: "Pengalaman Sebelumnya",
      icon: "💭",
      question: "Aplikasi apa yang pernah kamu lihat di HP atau tablet? Ceritakan pengalamanmu!",
      type: "text" as const,
      tips: "Bisa aplikasi game, belajar, atau yang lainnya"
    },
    {
      title: "Aplikasi Favorit",
      icon: "⭐",
      question: "Dari aplikasi belajar yang tadi kamu coba, mana yang paling seru? Kenapa?",
      type: "text" as const,
      tips: "Ceritakan yang membuatmu senang dari aplikasi itu"
    },
    {
      title: "Yang Kamu Pelajari",
      icon: "🧠",
      question: "Apa yang kamu pelajari dari aplikasi belajar hari ini?",
      type: "text" as const,
      tips: "Huruf, angka, warna, atau hal lain?"
    },
    {
      title: "Bagian Paling Seru",
      icon: "🎉",
      question: "Apa bagian yang paling seru saat menggunakan aplikasi belajar?",
      type: "text" as const,
      tips: "Suara, gambar, puzzle, atau yang lainnya?"
    },
    {
      title: "Rencana ke Depan",
      icon: "🚀",
      question: "Aplikasi belajar apa yang ingin kamu coba selanjutnya?",
      type: "text" as const,
      tips: "Bisa yang sudah ada atau yang kamu impikan"
    }
  ];

  const currentStepData = discussionSteps[currentStep];

  const handleNextStep = () => {
    if (currentResponse.trim().length > 0) {
      setResponses([...responses, currentResponse]);
      setCurrentResponse("");
      
      if (currentStep < discussionSteps.length - 1) {
        setCurrentStep(currentStep + 1);
      } else {
        completeActivity();
      }
    }
  };

  const completeActivity = () => {
    const newCompletedActivities = [...(progress.completedActivities || [])];
    const activityId = "l4-app-discussion";
    
    if (!newCompletedActivities.includes(activityId)) {
      newCompletedActivities.push(activityId);
    }

    const newBadges = [...(progress.badges || [])];
    if (!newBadges.includes("App Storyteller")) {
      newBadges.push("App Storyteller");
    }

    updateProgressMutation.mutate({
      completedActivities: newCompletedActivities,
      badges: newBadges
    });

    setIsCompleted(true);
  };

  if (isCompleted) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Share2 className="h-16 w-16 text-purple-500" />
          </div>
          <CardTitle className="text-2xl">Diskusi Selesai!</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center">
            <p className="text-lg text-gray-600">
              Hebat! Kamu sudah berbagi pengalaman tentang aplikasi belajar.
            </p>
          </div>
          
          <div className="space-y-3">
            <h3 className="font-semibold">📝 Ringkasan Ceritamu:</h3>
            {responses.map((response, index) => {
              const textSteps = discussionSteps.filter(step => step.type === 'text');
              const textStep = textSteps[index];
              
              if (!textStep) return null;
              
              return (
                <div key={index} className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm font-medium text-gray-700 mb-1">
                    {textStep.title}:
                  </p>
                  <p className="text-sm">{response}</p>
                </div>
              );
            })}
          </div>

          <div className="bg-purple-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">🎉 Yang Sudah Kamu Lakukan:</h3>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• Berbagi pengalaman dengan aplikasi</li>
              <li>• Menceritakan aplikasi yang kamu suka</li>
              <li>• Menjelaskan apa yang kamu pelajari</li>
              <li>• Merencanakan eksplorasi aplikasi selanjutnya</li>
            </ul>
          </div>
          
          <Button 
            className="w-full" 
            onClick={() => {
              setIsCompleted(false);
              setCurrentStep(0);
              setResponses([]);
              setCurrentResponse("");
            }}
          >
            Diskusi Lagi
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="text-3xl">{currentStepData.icon}</div>
            <div>
              <CardTitle className="text-xl">{currentStepData.title}</CardTitle>
              <p className="text-sm text-gray-600">
                Langkah {currentStep + 1} dari {discussionSteps.length}
              </p>
            </div>
          </div>
          <Badge variant="outline">Diskusi</Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div className="bg-blue-50 p-6 rounded-lg">
          <div className="flex items-start space-x-3">
            <MessageCircle className="h-6 w-6 text-blue-500 mt-1" />
            <div>
              <h3 className="font-semibold text-lg mb-2">{currentStepData.question}</h3>
              <div className="bg-blue-100 p-3 rounded text-sm text-blue-800">
                <Lightbulb className="h-4 w-4 inline mr-1" />
                Tips: {currentStepData.tips}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-sm font-medium">Ceritakan pengalamanmu:</label>
          <Textarea
            value={currentResponse}
            onChange={(e) => setCurrentResponse(e.target.value)}
            placeholder="Tulis ceritamu di sini..."
            className="min-h-[100px]"
          />
          <p className="text-xs text-gray-500">
            {currentResponse.length} karakter
          </p>
        </div>

        {/* Progress indicator */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Progress Diskusi</span>
            <span>{currentStep + 1}/{discussionSteps.length}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentStep + 1) / discussionSteps.length) * 100}%` }}
            />
          </div>
        </div>

        {responses.length > 0 && (
          <div className="bg-green-50 p-4 rounded-lg">
            <h4 className="font-semibold text-sm mb-2">Cerita yang sudah kamu bagikan:</h4>
            <div className="space-y-2">
              {responses.slice(-2).map((response, index) => (
                <p key={index} className="text-sm text-gray-700 bg-white p-2 rounded">
                  "{response.slice(0, 60)}{response.length > 60 ? '...' : ''}"
                </p>
              ))}
            </div>
          </div>
        )}

        <div className="flex space-x-3">
          <Button
            onClick={handleNextStep}
            disabled={currentResponse.trim().length === 0}
            className="flex-1"
            size="lg"
          >
            <CheckCircle2 className="h-5 w-5 mr-2" />
            {currentStep === discussionSteps.length - 1 ? 'Selesai' : 'Lanjut'}
          </Button>
          
          {currentStep > 0 && (
            <Button
              onClick={() => {
                setCurrentStep(currentStep - 1);
                setCurrentResponse(responses[currentStep - 1] || "");
                setResponses(responses.slice(0, -1));
              }}
              variant="outline"
              size="lg"
            >
              Kembali
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}