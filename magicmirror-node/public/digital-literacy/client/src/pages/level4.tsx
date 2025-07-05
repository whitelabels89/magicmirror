import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import SlideViewer from "@/components/slide-viewer";
import InteractiveBoxL4 from "@/components/interactive-box-l4";
import Leaderboard from "@/components/leaderboard";
import Badges from "@/components/badges";
import AnimatedIntro from "@/components/animated-intro";
import { ChevronLeft, ChevronRight, Home, ArrowLeft } from "lucide-react";

export default function Level4() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [studentName] = useState("Student");
  const [showIntro, setShowIntro] = useState(true);

  const { data: progress } = useQuery({
    queryKey: ['/api/progress-l4', studentName],
    queryFn: async () => {
      const response = await fetch(`/api/progress-l4/${studentName}`);
      if (!response.ok) throw new Error('Failed to fetch progress');
      return response.json();
    },
  });

  const { data: leaderboard } = useQuery({
    queryKey: ['/api/leaderboard'],
  });

  useEffect(() => {
    if (progress && typeof progress.currentSlide === 'number') {
      setCurrentSlide(progress.currentSlide);
    }
  }, [progress]);

  if (!progress) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">📱</div>
          <div className="text-xl font-semibold">Memuat Level 4...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 to-pink-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <Link href="/">
                <Button variant="ghost" size="sm">
                  <Home className="h-4 w-4 mr-2" />
                  Beranda
                </Button>
              </Link>
              <div className="text-2xl font-bold text-purple-600">
                📱 Level 4: Aplikasi Belajar
              </div>
            </div>
            
            {/* Navigation between levels */}
            <div className="flex items-center space-x-2">
              <Link href="/level3">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  L3
                </Button>
              </Link>
              <Link href="/">
                <Button variant="outline" size="sm">L1</Button>
              </Link>
              <Link href="/level2">
                <Button variant="outline" size="sm">L2</Button>
              </Link>
              <Button variant="default" size="sm" disabled>
                L4 (Aktif)
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content - Slide Viewer */}
          <div className="lg:col-span-2">
            <SlideViewer 
              currentSlide={currentSlide} 
              onSlideChange={setCurrentSlide}
              level="L4"
            />
            
            {/* Navigation Controls */}
            <div className="flex justify-between items-center mt-6">
              <Button
                onClick={() => setCurrentSlide(Math.max(0, currentSlide - 1))}
                disabled={currentSlide === 0}
                variant="outline"
                size="lg"
              >
                <ChevronLeft className="h-5 w-5 mr-2" />
                Sebelumnya
              </Button>
              
              <div className="text-center">
                <div className="text-sm text-gray-600">
                  Slide {currentSlide + 1} dari 6
                </div>
                <div className="text-lg font-semibold text-purple-600">
                  Aplikasi Belajar Bersama
                </div>
              </div>
              
              <Button
                onClick={() => setCurrentSlide(Math.min(5, currentSlide + 1))}
                disabled={currentSlide === 5}
                variant="outline"
                size="lg"
              >
                Selanjutnya
                <ChevronRight className="h-5 w-5 ml-2" />
              </Button>
            </div>
          </div>

          {/* Sidebar - Interactive Activities */}
          <div className="lg:col-span-1 space-y-6">
            <InteractiveBoxL4
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
                  <Button 
                    variant="default" 
                    size="sm" 
                    className="w-full justify-start"
                    disabled
                  >
                    📱 Level 4 (Aktif)
                  </Button>
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
        level="L4"
        show={showIntro}
        onComplete={() => setShowIntro(false)}
      />
    </div>
  );
}