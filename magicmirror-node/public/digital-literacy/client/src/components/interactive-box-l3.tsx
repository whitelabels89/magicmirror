import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import QuizActivityL3 from "@/components/quiz-activity-l3";
import HealthyHabitsActivity from "@/components/healthy-habits-activity";
import PostureActivity from "@/components/posture-activity";
import EyeExerciseActivity from "@/components/eye-exercise-activity";
import PracticeActivityL3 from "@/components/practice-activity-l3";
import { StudentProgress } from "@shared/schema";

interface InteractiveBoxL3Props {
  currentSlide: number;
  studentName: string;
  progress: StudentProgress;
}

export default function InteractiveBoxL3({ currentSlide, studentName, progress }: InteractiveBoxL3Props) {
  const [activeActivity, setActiveActivity] = useState<string | null>(null);

  const getActivityForSlide = () => {
    switch (currentSlide) {
      case 0:
        return {
          title: "Diskusi: Pengalaman Screen Time",
          description: "Ceritakan pengalamanmu saat main gadget terlalu lama",
          component: <HealthyHabitsActivity studentName={studentName} progress={progress} />,
          icon: "💭"
        };
      case 1:
        return {
          title: "Timer Challenge",
          description: "Latihan mengatur waktu bermain gadget",
          component: <HealthyHabitsActivity studentName={studentName} progress={progress} />,
          icon: "⏰"
        };
      case 2:
        return {
          title: "Posture Check",
          description: "Peragakan posisi duduk yang benar",
          component: <PostureActivity studentName={studentName} progress={progress} />,
          icon: "🪑"
        };
      case 3:
        return {
          title: "Senam Mata",
          description: "Lakukan latihan mata bersama",
          component: <EyeExerciseActivity studentName={studentName} progress={progress} />,
          icon: "👀"
        };
      case 4:
        return {
          title: "Simulasi Mata Lelah",
          description: "Apa yang harus dilakukan saat mata lelah?",
          component: <HealthyHabitsActivity studentName={studentName} progress={progress} />,
          icon: "😴"
        };
      case 5:
        return {
          title: "Latihan Lengkap",
          description: "Kumpulan aktivitas sehat penggunaan gadget",
          component: <PracticeActivityL3 studentName={studentName} progress={progress} />,
          icon: "🏆"
        };
      default:
        return {
          title: "Kuis Level 3",
          description: "Uji pemahamanmu tentang kebiasaan layar yang sehat",
          component: <QuizActivityL3 studentName={studentName} progress={progress} />,
          icon: "📝"
        };
    }
  };

  if (activeActivity) {
    const activity = getActivityForSlide();
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            {activity.icon} {activity.title}
          </h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setActiveActivity(null)}
          >
            Tutup
          </Button>
        </div>
        {activity.component}
      </div>
    );
  }

  const activity = getActivityForSlide();

  return (
    <div className="space-y-4">
      <Card className="border-l-4 border-l-green-500">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            {activity.icon} {activity.title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 mb-4">{activity.description}</p>
          <Button
            onClick={() => setActiveActivity(activity.title)}
            className="w-full"
          >
            Mulai Aktivitas
          </Button>
        </CardContent>
      </Card>

      {/* Activity Status */}
      <Card className="bg-green-50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-800">Status Aktivitas</p>
              <p className="text-xs text-green-600">
                {progress.completedActivities?.includes(`l3-slide-${currentSlide}`) 
                  ? "Sudah selesai ✅" 
                  : "Belum selesai ⏳"}
              </p>
            </div>
            <div className="text-2xl">
              {progress.completedActivities?.includes(`l3-slide-${currentSlide}`) 
                ? "🎉" 
                : "🎯"}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}