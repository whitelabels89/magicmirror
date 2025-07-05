import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import QuizActivity from "./quiz-activity";
import DrawingActivity from "./drawing-activity";
import DragDropActivity from "./drag-drop-activity";
import ExperienceActivity from "./experience-activity";
import { StudentProgress } from "@shared/schema";

interface InteractiveBoxProps {
  currentSlide: number;
  studentName: string;
  progress: StudentProgress;
}

export default function InteractiveBox({ currentSlide, studentName, progress }: InteractiveBoxProps) {
  const getActivityForSlide = () => {
    switch (currentSlide) {
      case 0:
      case 1:
      case 2:
      case 3:
        return (
          <QuizActivity
            studentName={studentName}
            progress={progress}
          />
        );
      case 4:
        return (
          <ExperienceActivity
            studentName={studentName}
            progress={progress}
          />
        );
      case 5:
        return (
          <DrawingActivity
            studentName={studentName}
            progress={progress}
          />
        );
      case 6:
        return (
          <DragDropActivity
            studentName={studentName}
            progress={progress}
          />
        );
      default:
        return (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">🎉</div>
            <p className="text-gray-600">Great job completing all the activities!</p>
          </div>
        );
    }
  };

  const quizProgress = (progress.currentQuestion / 10) * 100;

  return (
    <Card className="bg-white rounded-2xl shadow-xl overflow-hidden">
      <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white p-6">
        <h3 className="text-xl font-fredoka mb-2">Interactive Activities</h3>
        <div className="bg-white bg-opacity-20 rounded-lg p-3">
          <div className="flex items-center justify-between text-sm mb-2">
            <span>Quiz Progress</span>
            <span>{progress.currentQuestion}/10</span>
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
