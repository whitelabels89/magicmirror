import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import QuizActivityL2 from "./quiz-activity-l2";
import TapActivity from "./tap-activity";
import DragPuzzleActivity from "./drag-puzzle-activity";
import SwipeGalleryActivity from "./swipe-gallery-activity";
import PracticeActivityL2 from "./practice-activity-l2";
import { StudentProgress } from "@shared/schema";

interface InteractiveBoxL2Props {
  currentSlide: number;
  studentName: string;
  progress: StudentProgress;
}

export default function InteractiveBoxL2({ currentSlide, studentName, progress }: InteractiveBoxL2Props) {
  const getActivityForSlide = () => {
    switch (currentSlide) {
      case 0:
        return (
          <QuizActivityL2
            studentName={studentName}
            progress={progress}
          />
        );
      case 1:
        // Slide 2: Tap material - should have Tap activity
        return (
          <TapActivity
            studentName={studentName}
            progress={progress}
          />
        );
      case 2:
        // Slide 3: Drag material - should have Drag activity
        return (
          <DragPuzzleActivity
            studentName={studentName}
            progress={progress}
          />
        );
      case 3:
        // Slide 4: Swipe material - should have Swipe activity
        return (
          <SwipeGalleryActivity
            studentName={studentName}
            progress={progress}
          />
        );
      case 4:
        return (
          <QuizActivityL2
            studentName={studentName}
            progress={progress}
          />
        );
      case 5:
        // Slide 6: Practice section "Yuk, Kita Coba!" - should have combined practice activities
        return (
          <PracticeActivityL2
            studentName={studentName}
            progress={progress}
          />
        );
      case 6:
        return (
          <QuizActivityL2
            studentName={studentName}
            progress={progress}
          />
        );
      default:
        return (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">🎉</div>
            <p className="text-gray-600">Hebat! Semua aktivitas L2 selesai!</p>
          </div>
        );
    }
  };

  const quizProgress = (progress.currentQuestion / 5) * 100; // 5 questions for L2

  return (
    <Card className="bg-white rounded-2xl shadow-xl overflow-hidden">
      <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white p-6">
        <h3 className="text-xl font-fredoka mb-2">Aktivitas L2 - Gerakan Tablet</h3>
        <div className="bg-white bg-opacity-20 rounded-lg p-3">
          <div className="flex items-center justify-between text-sm mb-2">
            <span>Quiz Progress</span>
            <span>{progress.currentQuestion}/5</span>
          </div>
          <Progress value={quizProgress} className="h-2" />
        </div>
      </div>

      <CardContent className="p-6">
        {getActivityForSlide()}
      </CardContent>
    </Card>
  );
}