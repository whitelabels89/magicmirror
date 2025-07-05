import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle, User } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { StudentProgress } from "@shared/schema";

interface PostureActivityProps {
  studentName: string;
  progress: StudentProgress;
}

export default function PostureActivity({ studentName, progress }: PostureActivityProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [checkedItems, setCheckedItems] = useState<boolean[]>([]);
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

  const postureSteps = [
    {
      title: "Persiapan Posisi",
      icon: "🪑",
      description: "Mari kita periksa posisi duduk yang benar saat menggunakan gadget",
      checkpoints: [
        "Duduk di kursi dengan sandaran punggung",
        "Kaki menyentuh lantai dengan rata",
        "Punggung tegak menempel di sandaran",
        "Bahu rileks, tidak tegang"
      ]
    },
    {
      title: "Posisi Layar",
      icon: "📱",
      description: "Sekarang atur posisi layar gadget dengan benar",
      checkpoints: [
        "Layar sejajar dengan mata",
        "Jarak mata ke layar sekitar 50-70 cm",
        "Layar tidak terlalu tinggi atau rendah",
        "Cahaya ruangan cukup, tidak terlalu gelap"
      ]
    },
    {
      title: "Posisi Tangan",
      icon: "✋",
      description: "Periksa posisi tangan dan lengan saat menggunakan gadget",
      checkpoints: [
        "Lengan rileks di samping tubuh",
        "Siku membentuk sudut 90 derajat",
        "Pergelangan tangan lurus, tidak menekuk",
        "Jari-jari rileks saat menyentuh layar"
      ]
    },
    {
      title: "Evaluasi Postur",
      icon: "✅",
      description: "Sekarang duduk dengan posisi yang benar selama 2 menit",
      checkpoints: [
        "Semua posisi sudah benar",
        "Tubuh terasa nyaman",
        "Tidak ada rasa pegal atau tegang",
        "Siap untuk menggunakan gadget dengan sehat"
      ]
    }
  ];

  const currentStepData = postureSteps[currentStep];

  const handleCheckItem = (index: number) => {
    const newCheckedItems = [...checkedItems];
    newCheckedItems[index] = !newCheckedItems[index];
    setCheckedItems(newCheckedItems);
  };

  const handleNextStep = () => {
    if (currentStep < postureSteps.length - 1) {
      setCurrentStep(currentStep + 1);
      setCheckedItems([]);
    } else {
      completeActivity();
    }
  };

  const completeActivity = () => {
    setIsCompleted(true);
    
    const newCompletedActivities = [...(progress.completedActivities || [])];
    const activityId = "l3-posture-check";
    
    if (!newCompletedActivities.includes(activityId)) {
      newCompletedActivities.push(activityId);
    }

    const newBadges = [...(progress.badges || [])];
    if (!newBadges.includes("Posture Master")) {
      newBadges.push("Posture Master");
    }

    updateProgressMutation.mutate({
      completedActivities: newCompletedActivities,
      badges: newBadges
    });
  };

  const canProceed = () => {
    return checkedItems.filter(Boolean).length === currentStepData.checkpoints.length;
  };

  if (isCompleted) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle2 className="h-16 w-16 text-green-500" />
          </div>
          <CardTitle className="text-2xl">Postur Sempurna!</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center">
            <p className="text-lg text-gray-600">
              Selamat! Kamu sudah menguasai posisi duduk yang benar saat menggunakan gadget.
            </p>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">🎉 Tips Penting:</h3>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• Selalu ingat posisi yang sudah dipelajari</li>
              <li>• Lakukan peregangan ringan setiap 30 menit</li>
              <li>• Jangan lupa untuk berkedip secara teratur</li>
              <li>• Pastikan pencahayaan ruangan cukup</li>
            </ul>
          </div>
          
          <Button 
            className="w-full" 
            onClick={() => {
              setIsCompleted(false);
              setCurrentStep(0);
              setCheckedItems([]);
            }}
          >
            Ulangi Latihan
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
            {currentStepData.icon} {currentStepData.title}
          </CardTitle>
          <Badge variant="outline">
            {currentStep + 1} / {postureSteps.length}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="text-lg font-medium text-blue-800">
            {currentStepData.description}
          </p>
        </div>

        <div className="space-y-4">
          <h3 className="font-semibold flex items-center gap-2">
            <User className="h-5 w-5" />
            Checklist Postur:
          </h3>
          
          <div className="space-y-3">
            {currentStepData.checkpoints.map((checkpoint, index) => (
              <div
                key={index}
                className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  checkedItems[index] 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                }`}
                onClick={() => handleCheckItem(index)}
              >
                <div className="flex-shrink-0">
                  {checkedItems[index] ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <div className="h-5 w-5 border-2 border-gray-300 rounded-full" />
                  )}
                </div>
                <span className={`text-sm ${
                  checkedItems[index] ? 'text-green-800 font-medium' : 'text-gray-700'
                }`}>
                  {checkpoint}
                </span>
              </div>
            ))}
          </div>
        </div>

        {currentStep === postureSteps.length - 1 && (
          <div className="bg-yellow-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 text-yellow-800">
              <AlertCircle className="h-5 w-5" />
              <p className="font-medium">
                Sekarang praktikkan posisi yang benar selama 2 menit!
              </p>
            </div>
          </div>
        )}

        <div className="flex justify-between pt-4">
          <Button
            variant="outline"
            onClick={() => {
              if (currentStep > 0) {
                setCurrentStep(currentStep - 1);
                setCheckedItems([]);
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
            {currentStep === postureSteps.length - 1 ? (
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