import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import QuizActivityL4 from "@/components/quiz-activity-l4";
import AppExplorationActivity from "@/components/app-exploration-activity";
import AppDiscussionActivity from "@/components/app-discussion-activity";
import AppDesignActivity from "@/components/app-design-activity";
import AppStorytellingActivity from "@/components/app-storytelling-activity";
import PracticeActivityL4 from "@/components/practice-activity-l4";
import { useState } from "react";
import { StudentProgress } from "@shared/schema";

interface InteractiveBoxL4Props {
  currentSlide: number;
  studentName: string;
  progress: StudentProgress;
}

export default function InteractiveBoxL4({ currentSlide, studentName, progress }: InteractiveBoxL4Props) {
  const [selectedActivity, setSelectedActivity] = useState<string | null>(null);

  // Define activities for each slide
  const slideActivities = {
    0: [ // Slide 1: Apa Itu Aplikasi Belajar?
      {
        id: "discussion",
        title: "Diskusi Pengalaman",
        description: "Ceritakan pengalamanmu dengan aplikasi",
        icon: "💭",
        color: "bg-blue-50 hover:bg-blue-100",
        component: AppDiscussionActivity
      }
    ],
    1: [ // Slide 2: Contoh Aplikasi Belajar
      {
        id: "exploration", 
        title: "Jelajahi Aplikasi",
        description: "Coba berbagai aplikasi belajar",
        icon: "🔍",
        color: "bg-green-50 hover:bg-green-100",
        component: AppExplorationActivity
      }
    ],
    2: [ // Slide 3: Kenapa Aplikasi Belajar Itu Seru?
      {
        id: "discussion",
        title: "Diskusi Manfaat",
        description: "Bahas kenapa aplikasi belajar menarik",
        icon: "💭",
        color: "bg-purple-50 hover:bg-purple-100",
        component: AppDiscussionActivity
      }
    ],
    3: [ // Slide 4: Yuk, Kita Coba Bareng!
      {
        id: "practice",
        title: "Praktik Langsung",
        description: "Coba aplikasi bersama guru",
        icon: "🤝",
        color: "bg-orange-50 hover:bg-orange-100",
        component: PracticeActivityL4
      }
    ],
    4: [ // Slide 5: Apa yang Kamu Pelajari?
      {
        id: "storytelling",
        title: "Cerita Aplikasi Belajar",
        description: "Ikuti cerita seru tentang penggunaan aplikasi",
        icon: "📚",
        color: "bg-pink-50 hover:bg-pink-100",
        component: AppStorytellingActivity
      }
    ],
    5: [ // Slide 6: Terima Kasih!
      {
        id: "design",
        title: "Buat Aplikasi Impian",
        description: "Gambar aplikasi belajar favoritmu",
        icon: "🎨",
        color: "bg-yellow-50 hover:bg-yellow-100",
        component: AppDesignActivity
      },
      {
        id: "practice",
        title: "Latihan Lengkap",
        description: "Selesaikan semua tugas praktik",
        icon: "📝",
        color: "bg-cyan-50 hover:bg-cyan-100",
        component: PracticeActivityL4
      }
    ]
  };

  const currentActivities = slideActivities[currentSlide as keyof typeof slideActivities] || [];

  if (selectedActivity) {
    const activity = currentActivities.find(a => a.id === selectedActivity);
    if (activity) {
      const ActivityComponent = activity.component;
      return (
        <div className="space-y-4">
          <Button 
            variant="outline" 
            onClick={() => setSelectedActivity(null)}
            className="mb-4"
          >
            ← Kembali ke Pilihan Aktivitas
          </Button>
          <ActivityComponent studentName={studentName} progress={progress} />
        </div>
      );
    }
  }

  if (currentActivities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Aktivitas Level 4</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="text-4xl mb-4">📱</div>
            <p className="text-gray-600">
              Tidak ada aktivitas khusus untuk slide ini. 
              Nikmati materi pembelajaran!
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center">
          <span className="text-2xl mr-2">📱</span>
          Aktivitas Level 4
        </CardTitle>
        <p className="text-sm text-gray-600">
          Pilih aktivitas yang ingin kamu lakukan untuk slide ini
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {currentActivities.map((activity) => {
            const isCompleted = progress.completedActivities?.includes(`l4-${activity.id}`) || false;
            
            return (
              <div
                key={activity.id}
                className={`p-4 rounded-lg border cursor-pointer transition-all ${activity.color} ${
                  isCompleted ? 'opacity-75' : ''
                }`}
                onClick={() => setSelectedActivity(activity.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{activity.icon}</span>
                    <div>
                      <h3 className="font-semibold">{activity.title}</h3>
                      <p className="text-sm text-gray-600">{activity.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {isCompleted && (
                      <Badge variant="secondary" className="text-xs">
                        ✓ Selesai
                      </Badge>
                    )}
                    <Button size="sm">
                      {isCompleted ? 'Ulangi' : 'Mulai'}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Progress indicator */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-semibold text-sm mb-2">Progress Level 4:</h4>
          <div className="space-y-2">
            {['discussion', 'exploration', 'practice', 'quiz', 'design'].map((activityType) => {
              const isCompleted = progress.completedActivities?.includes(`l4-${activityType}`) || false;
              return (
                <div key={activityType} className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${isCompleted ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <span className="text-sm capitalize">
                    {activityType === 'discussion' ? 'Diskusi' :
                     activityType === 'exploration' ? 'Eksplorasi' :
                     activityType === 'practice' ? 'Praktik' :
                     activityType === 'quiz' ? 'Quiz' : 'Desain'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}