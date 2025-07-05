import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import SlideViewer from "@/components/slide-viewer";
import InteractiveBox from "@/components/interactive-box";
import Leaderboard from "@/components/leaderboard";
import Badges from "@/components/badges";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import AnimatedIntro from "@/components/animated-intro";
import { StudentProgress } from "@shared/schema";

export default function Home() {
  const [studentName, setStudentName] = useState("Student");
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showIntro, setShowIntro] = useState(true);
  const queryClient = useQueryClient();

  // Get student progress
  const { data: progress, isLoading } = useQuery({
    queryKey: ['/api/progress', studentName],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/progress/${studentName}`);
      return response.json() as Promise<StudentProgress>;
    },
  });

  // Update progress mutation
  const updateProgressMutation = useMutation({
    mutationFn: async (data: Partial<StudentProgress>) => {
      const response = await apiRequest('PUT', `/api/progress/${studentName}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/progress', studentName] });
      queryClient.invalidateQueries({ queryKey: ['/api/leaderboard'] });
    },
  });

  // Sync current slide with progress
  useEffect(() => {
    if (progress) {
      setCurrentSlide(progress.currentSlide);
    }
  }, [progress]);

  // Update slide in progress
  const handleSlideChange = (newSlide: number) => {
    setCurrentSlide(newSlide);
    updateProgressMutation.mutate({ currentSlide: newSlide });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">📱</div>
          <div className="text-xl font-fredoka text-primary">Loading...</div>
        </div>
      </div>
    );
  }

  if (!progress) {
    return <div>Error loading progress</div>;
  }

  const totalActivities = 4;
  const completedCount = progress.completedActivities.length;
  const overallProgress = (completedCount / totalActivities) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 font-inter">
      {/* Header */}
      <header className="bg-white shadow-lg border-b-4 border-primary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="bg-primary text-white w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center">
                <span className="text-xl sm:text-2xl">📱</span>
              </div>
              <div>
                <h1 className="text-lg sm:text-2xl font-fredoka text-gray-900">Digital Literacy L1</h1>
                <p className="text-sm sm:text-base text-gray-600 hidden sm:block">Recognizing Digital Devices Around Us</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 w-full sm:w-auto">
              <div className="flex flex-wrap gap-2">
                <Link href="/level2">
                  <Button variant="outline" size="sm" className="bg-purple-50 border-purple-300 text-purple-700 hover:bg-purple-100">
                    L2 👆
                  </Button>
                </Link>
                <Link href="/level3">
                  <Button variant="outline" size="sm" className="bg-green-50 border-green-300 text-green-700 hover:bg-green-100">
                    L3 🛡️
                  </Button>
                </Link>
                <Link href="/level4">
                  <Button variant="outline" size="sm" className="bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100">
                    L4 📱
                  </Button>
                </Link>
                <Link href="/level5">
                  <Button variant="outline" size="sm" className="bg-orange-50 border-orange-300 text-orange-700 hover:bg-orange-100">
                    L5 🌐
                  </Button>
                </Link>
              </div>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                {/* Overall Progress */}
                <div className="bg-gray-100 rounded-full px-3 py-1 sm:px-4 sm:py-2 flex-1 sm:flex-none">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs sm:text-sm font-medium text-gray-700">Progress</span>
                    <div className="w-16 sm:w-24">
                      <Progress value={overallProgress} className="h-1.5 sm:h-2" />
                    </div>
                    <span className="text-xs sm:text-sm font-medium text-gray-700">
                      {Math.round(overallProgress)}%
                    </span>
                  </div>
                </div>
                {/* Score */}
                <div className="bg-accent text-white px-3 py-1 sm:px-4 sm:py-2 rounded-full">
                  <span className="font-fredoka text-sm sm:text-base">Score: {progress.score}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          {/* Slide Viewer */}
          <div className="lg:col-span-2">
            <SlideViewer
              currentSlide={currentSlide}
              onSlideChange={handleSlideChange}
            />
          </div>

          {/* Interactive Box and Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            <InteractiveBox
              currentSlide={currentSlide}
              studentName={studentName}
              progress={progress}
            />
            
            {/* Navigation */}
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-3">Navigasi Level</h3>
                <div className="space-y-2">
                  <Button 
                    variant="default" 
                    size="sm" 
                    className="w-full justify-start"
                    disabled
                  >
                    📱 Level 1 (Aktif)
                  </Button>
                  <Link href="/level2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full justify-start"
                    >
                      👆 Level 2
                    </Button>
                  </Link>
                  <Link href="/level3">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full justify-start"
                    >
                      🛡️ Level 3
                    </Button>
                  </Link>
                  <Link href="/level4">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full justify-start"
                    >
                      📱 Level 4
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
            
            <Leaderboard />
            
            <Badges badges={progress.badges} />
          </div>
        </div>
      </main>
      {/* Animated Intro */}
      <AnimatedIntro
        level="L1"
        show={showIntro}
        onComplete={() => setShowIntro(false)}
      />
    </div>
  );
}
