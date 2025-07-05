import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Clock, AlertTriangle, CheckCircle2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { StudentProgress } from "@shared/schema";

interface HealthyHabitsActivityProps {
  studentName: string;
  progress: StudentProgress;
}

export default function HealthyHabitsActivity({ studentName, progress }: HealthyHabitsActivityProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [responses, setResponses] = useState<string[]>([]);
  const [currentResponse, setCurrentResponse] = useState("");
  const [timerStarted, setTimerStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(5 * 60); // 5 minutes in seconds
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

  const steps = [
    {
      title: "Cerita Pengalaman",
      icon: "💭",
      question: "Pernahkah kamu main tablet atau gadget terlalu lama sampai mata pegal atau kepala pusing? Ceritakan pengalamanmu!",
      type: "text" as const
    },
    {
      title: "Aturan Screen Time (5 Menit)",
      icon: "⏰",
      question: "Mari kita coba aturan screen time! Klik tombol untuk memulai timer 5 menit dan rasakan bagaimana rasanya bermain dengan batas waktu yang sehat!",
      type: "timer" as const
    },
    {
      title: "Efek Screen Time Berlebihan",
      icon: "⚠️",
      question: "Apa saja yang kamu rasakan ketika terlalu lama menatap layar? Tuliskan minimal 3 efek yang kamu ketahui!",
      type: "text" as const
    },
    {
      title: "Komitmen Sehat",
      icon: "✅",
      question: "Buatlah komitmen untuk menggunakan gadget dengan sehat! Tuliskan 3 hal yang akan kamu lakukan mulai hari ini.",
      type: "text" as const
    }
  ];

  const currentStepData = steps[currentStep];

  const handleTimerStart = () => {
    setTimerStarted(true);
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setTimerStarted(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleNextStep = () => {
    if (currentStepData.type === "text") {
      setResponses([...responses, currentResponse]);
      setCurrentResponse("");
    }
    
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      completeActivity();
    }
  };

  const completeActivity = () => {
    const newCompletedActivities = [...(progress.completedActivities || [])];
    const activityId = "l3-healthy-habits";
    
    if (!newCompletedActivities.includes(activityId)) {
      newCompletedActivities.push(activityId);
    }

    const newBadges = [...(progress.badges || [])];
    if (!newBadges.includes("Healthy Habits Champion")) {
      newBadges.push("Healthy Habits Champion");
    }

    updateProgressMutation.mutate({
      completedActivities: newCompletedActivities,
      badges: newBadges
    });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const canProceed = () => {
    if (currentStepData.type === "text") {
      return currentResponse.trim().length > 0;
    }
    if (currentStepData.type === "timer") {
      return true; // Allow proceeding at any time
    }
    return true;
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg flex items-center gap-2">
            {currentStepData.icon} {currentStepData.title}
          </CardTitle>
          <Badge variant="outline">
            {currentStep + 1} / {steps.length}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="text-lg font-medium text-blue-800 mb-2">
            {currentStepData.question}
          </p>
        </div>

        {currentStepData.type === "text" && (
          <div className="space-y-3">
            <Textarea
              placeholder="Tuliskan jawabanmu di sini..."
              value={currentResponse}
              onChange={(e) => setCurrentResponse(e.target.value)}
              className="min-h-[120px]"
            />
            <p className="text-sm text-gray-500">
              Minimal 10 karakter untuk melanjutkan
            </p>
          </div>
        )}

        {currentStepData.type === "timer" && (
          <div className="space-y-4">
            <div className="text-center">
              <div className="text-6xl font-bold text-blue-600 mb-4">
                {formatTime(timeLeft)}
              </div>
              <div className="space-y-2">
                {!timerStarted && timeLeft > 0 && (
                  <Button
                    onClick={handleTimerStart}
                    size="lg"
                    className="w-full"
                  >
                    <Clock className="h-5 w-5 mr-2" />
                    Mulai Timer 5 Menit
                  </Button>
                )}
                {timerStarted && (
                  <div className="bg-green-50 p-4 rounded-lg">
                    <p className="text-green-800 font-medium mb-3">
                      Timer sedang berjalan! Silakan bermain dengan gadget dan rasakan pengalamannya.
                    </p>
                    <Button
                      onClick={() => setTimeLeft(0)}
                      size="sm"
                      variant="outline"
                      className="w-full"
                    >
                      Lewati Timer (Sudah Merasakan Pengalaman)
                    </Button>
                  </div>
                )}
                {timeLeft === 0 && (
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <div className="flex items-center gap-2 text-yellow-800">
                      <AlertTriangle className="h-5 w-5" />
                      <p className="font-medium">
                        Waktu habis! Saatnya istirahat. Bagaimana perasaanmu?
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {currentStep === steps.length - 1 && responses.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold">Ringkasan Jawaban:</h3>
            {responses.map((response, index) => {
              // Find the corresponding text step for this response
              const textSteps = steps.filter(step => step.type === 'text');
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
        )}

        <div className="flex justify-between pt-4">
          <Button
            variant="outline"
            onClick={() => {
              if (currentStep > 0) {
                setCurrentStep(currentStep - 1);
                if (currentStepData.type === "text") {
                  setCurrentResponse(responses[currentStep - 1] || "");
                }
              }
            }}
            disabled={currentStep === 0}
          >
            Sebelumnya
          </Button>
          
          <Button
            onClick={handleNextStep}
            disabled={!canProceed()}
            className="min-w-[100px]"
          >
            {currentStep === steps.length - 1 ? (
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