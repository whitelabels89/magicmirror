import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import SlideViewer from "@/components/slide-viewer";
import InteractiveBoxL3 from "@/components/interactive-box-l3";
import Leaderboard from "@/components/leaderboard";
import Badges from "@/components/badges";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import AnimatedIntro from "@/components/animated-intro";
import { StudentProgress } from "@shared/schema";

export default function Level3() {
  const [studentName, setStudentName] = useState("Student");
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showIntro, setShowIntro] = useState(true);
  const queryClient = useQueryClient();

  const { data: progress, isLoading } = useQuery<StudentProgress>({
    queryKey: ['/api/progress-l3', studentName],
    enabled: !!studentName,
  });

  const { data: leaderboard } = useQuery({
    queryKey: ['/api/leaderboard'],
  });

  const handleSlideChange = (newSlide: number) => {
    setCurrentSlide(newSlide);
  };

  const calculateProgress = () => {
    if (!progress) return 0;
    const totalActivities = 8; // 6 slides + quiz + practice
    const completedActivities = 
      (progress.currentSlide || 0) + 
      (progress.completedActivities?.length || 0);
    return Math.min((completedActivities / totalActivities) * 100, 100);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-500 mx-auto mb-4"></div>
          <p className="text-lg font-medium text-gray-600">Loading Level 3...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/">
                <Button variant="ghost" size="sm">
                  ← Kembali
                </Button>
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">
                Level 3: Kebiasaan Layar yang Sehat 🛡️
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                Halo, {studentName}! 👋
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Progress Bar */}
            <Card>
              <CardContent className="p-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    Progress Level 3
                  </span>
                  <span className="text-sm text-gray-500">
                    {Math.round(calculateProgress())}%
                  </span>
                </div>
                <Progress value={calculateProgress()} className="h-2" />
              </CardContent>
            </Card>

            {/* Slide Viewer */}
            <div className="bg-white rounded-lg shadow-sm">
              <SlideViewer 
                currentSlide={currentSlide} 
                onSlideChange={handleSlideChange}
                level="L3"
              />
            </div>

            {/* Interactive Activities */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4">
                  Aktivitas Interaktif
                </h3>
                <InteractiveBoxL3 
                  currentSlide={currentSlide}
                  studentName={studentName}
                  progress={progress || {
                    id: 0,
                    studentName,
                    currentSlide: 0,
                    score: 0,
                    completedActivities: [],
                    badges: []
                  }}
                />
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Navigation */}
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-3">Navigasi Level</h3>
                <div className="space-y-2">
                  <Link href="/">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full justify-start"
                    >
                      📱 Level 1
                    </Button>
                  </Link>
                  <Link href="/level2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full justify-start"
                    >
                      👆 Level 2
                    </Button>
                  </Link>
                  <Button 
                    variant="default" 
                    size="sm" 
                    className="w-full justify-start"
                    disabled
                  >
                    🛡️ Level 3 (Aktif)
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Leaderboard */}
            <Leaderboard />
            
            {/* Badges */}
            <Badges badges={progress?.badges || []} />
          </div>
        </div>
      </main>

      {/* Animated Intro */}
      <AnimatedIntro
        level="L3"
        show={showIntro}
        onComplete={() => setShowIntro(false)}
      />
    </div>
  );
}