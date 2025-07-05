import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getQueryFn, apiRequest } from '@/lib/queryClient';
import { motion } from 'framer-motion';
import SlideViewer from '@/components/slide-viewer';
import InteractiveBoxL5 from '@/components/interactive-box-l5';
import AnimatedIntro from '@/components/animated-intro';
import Badges from '@/components/badges';
import Leaderboard from '@/components/leaderboard';
import { StudentProgress } from '@shared/schema';

export default function Level5() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [studentName] = useState('Student_L5');
  const [showIntro, setShowIntro] = useState(true);
  const queryClient = useQueryClient();

  const { data: progress, isLoading } = useQuery({
    queryKey: ['/api/progress-l5', studentName],
    queryFn: getQueryFn({ on401: 'returnNull' }),
  });

  const updateProgressMutation = useMutation({
    mutationFn: async (data: { 
      currentSlide?: number;
      completedActivities?: string[];
      badges?: string[];
      score?: number;
    }) => {
      return apiRequest("PUT", `/api/progress-l5/${studentName}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/progress-l5', studentName] });
      queryClient.invalidateQueries({ queryKey: ['/api/leaderboard'] });
    },
  });

  const defaultProgress: StudentProgress = {
    id: 0,
    studentName: studentName,
    currentSlide: 0,
    score: 0,
    completedActivities: [],
    quizAnswers: [],
    currentQuestion: 0,
    badges: [],
    drawingData: null,
    experienceData: null,
    dragDropProgress: null,
    createdAt: null,
    updatedAt: null
  };

  const studentProgress = progress || defaultProgress;

  const handleSlideChange = (newSlide: number) => {
    setCurrentSlide(newSlide);
    
    // Update progress if moving forward
    if (newSlide > studentProgress.currentSlide) {
      updateProgressMutation.mutate({
        currentSlide: newSlide,
        score: studentProgress.score + 5
      });
    }
  };

  const handleIntroComplete = () => {
    setShowIntro(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>Loading Level 5...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
      <AnimatedIntro 
        level="L5" 
        onComplete={handleIntroComplete} 
        show={showIntro} 
      />
      
      {!showIntro && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="container mx-auto px-4 py-6"
        >
          {/* Header with Navigation */}
          <div className="bg-white rounded-lg shadow-lg p-4 mb-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="text-center md:text-left">
                <h1 className="text-2xl md:text-3xl font-bold text-orange-600 mb-1">
                  Level 5: Online vs Offline
                </h1>
                <p className="text-gray-600">
                  Memahami perbedaan aktivitas online dan offline
                </p>
              </div>
              
              {/* Navigation Menu */}
              <div className="flex flex-wrap gap-2">
                <a href="/" className="bg-blue-50 border border-blue-300 text-blue-700 hover:bg-blue-100 px-3 py-1 rounded-lg text-sm transition-colors">
                  🏠 Home
                </a>
                <a href="/level2" className="bg-purple-50 border border-purple-300 text-purple-700 hover:bg-purple-100 px-3 py-1 rounded-lg text-sm transition-colors">
                  L2 👆
                </a>
                <a href="/level3" className="bg-green-50 border border-green-300 text-green-700 hover:bg-green-100 px-3 py-1 rounded-lg text-sm transition-colors">
                  L3 🛡️
                </a>
                <a href="/level4" className="bg-indigo-50 border border-indigo-300 text-indigo-700 hover:bg-indigo-100 px-3 py-1 rounded-lg text-sm transition-colors">
                  L4 📱
                </a>
                <span className="bg-orange-100 border border-orange-400 text-orange-800 px-3 py-1 rounded-lg text-sm font-semibold">
                  L5 🌐 (Current)
                </span>
              </div>
            </div>
          </div>

          {/* Progress */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-600">Progress:</span>
              <span className="text-sm text-gray-600">
                {Math.round(((currentSlide + 1) / 6) * 100)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${((currentSlide + 1) / 6) * 100}%` }}
              ></div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                <SlideViewer
                  currentSlide={currentSlide}
                  onSlideChange={handleSlideChange}
                  level="L5"
                />
              </div>

              {/* Interactive Activities */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <InteractiveBoxL5
                  currentSlide={currentSlide}
                  studentName={studentName}
                  progress={studentProgress}
                />
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Student Info */}
              <div className="bg-white rounded-lg shadow-lg p-4">
                <h3 className="font-semibold text-gray-800 mb-2">Progress Siswa</h3>
                <p className="text-sm text-gray-600 mb-2">
                  Nama: {studentProgress.studentName}
                </p>
                <p className="text-sm text-gray-600 mb-2">
                  Slide: {currentSlide + 1}/6
                </p>
                <p className="text-sm text-gray-600 mb-4">
                  Score: {studentProgress.score}
                </p>
                <Badges badges={studentProgress.badges} />
              </div>

              {/* Leaderboard */}
              <div className="bg-white rounded-lg shadow-lg p-4">
                <Leaderboard />
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}