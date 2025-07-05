import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import SlideViewer from "@/components/slide-viewer";
import InteractiveBoxL2 from "@/components/interactive-box-l2";
import Leaderboard from "@/components/leaderboard";
import Badges from "@/components/badges";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import AnimatedIntro from "@/components/animated-intro";
import { StudentProgress } from "@shared/schema";

export default function Level2() {
  const [studentName, setStudentName] = useState("Student");
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showIntro, setShowIntro] = useState(true);
  const queryClient = useQueryClient();

  // Get student progress
  const { data: progress, isLoading } = useQuery({
    queryKey: ['/api/progress-l2', studentName],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/progress-l2/${studentName}`);
      return response.json() as Promise<StudentProgress>;
    },
  });

  // Update progress mutation
  const updateProgressMutation = useMutation({
    mutationFn: async (data: Partial<StudentProgress>) => {
      const response = await apiRequest('PUT', `/api/progress-l2/${studentName}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/progress-l2', studentName] });
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
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">👆</div>
          <div className="text-xl font-fredoka text-primary">Loading L2...</div>
        </div>
      </div>
    );
  }

  if (!progress) {
    return <div>Error loading progress</div>;
  }

  const totalActivities = 3; // tap, drag-puzzle, swipe-gallery
  const completedCount = progress.completedActivities.length;
  const overallProgress = (completedCount / totalActivities) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 font-inter">
      {/* Header */}
      <header className="bg-white shadow-lg border-b-4 border-purple-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <Link href="/">
                <Button variant="outline" size="sm">← L1</Button>
              </Link>
              <div className="bg-purple-500 text-white w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center">
                <span className="text-xl sm:text-2xl">👆</span>
              </div>
              <div>
                <h1 className="text-lg sm:text-2xl font-fredoka text-gray-900">Digital Literacy L2</h1>
                <p className="text-sm sm:text-base text-gray-600 hidden sm:block">Basic Use of Tablet/Computer: Tap, Drag, and Swipe</p>
              </div>
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
              <div className="bg-purple-500 text-white px-3 py-1 sm:px-4 sm:py-2 rounded-full">
                <span className="font-fredoka text-sm sm:text-base">Score: {progress.score}</span>
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
              level="L2"
            />
          </div>

          {/* Interactive Box and Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            <InteractiveBoxL2
              currentSlide={currentSlide}
              studentName={studentName}
              progress={progress}
            />
            
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
                  <Button 
                    variant="default" 
                    size="sm" 
                    className="w-full justify-start"
                    disabled
                  >
                    👆 Level 2 (Aktif)
                  </Button>
                  <Link href="/level3">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full justify-start"
                    >
                      🛡️ Level 3
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
        level="L2"
        show={showIntro}
        onComplete={() => setShowIntro(false)}
      />
    </div>
  );
}