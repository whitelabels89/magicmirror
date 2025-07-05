import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import TapActivity from "./tap-activity";
import DragPuzzleActivity from "./drag-puzzle-activity";
import SwipeGalleryActivity from "./swipe-gallery-activity";
import { StudentProgress } from "@shared/schema";

interface PracticeActivityL2Props {
  studentName: string;
  progress: StudentProgress;
}

export default function PracticeActivityL2({ studentName, progress }: PracticeActivityL2Props) {
  const [currentActivity, setCurrentActivity] = useState<"tap" | "drag" | "swipe">("tap");

  const activities = [
    {
      id: "tap",
      title: "Tap",
      emoji: "👆",
      description: "Ketuk balon yang muncul",
      color: "bg-blue-50 border-blue-200",
      buttonColor: "bg-blue-500 hover:bg-blue-600"
    },
    {
      id: "drag",
      title: "Drag",
      emoji: "✨",
      description: "Geser puzzle ke tempatnya",
      color: "bg-purple-50 border-purple-200",
      buttonColor: "bg-purple-500 hover:bg-purple-600"
    },
    {
      id: "swipe",
      title: "Swipe",
      emoji: "👉",
      description: "Usap layar ganti gambar",
      color: "bg-green-50 border-green-200",
      buttonColor: "bg-green-500 hover:bg-green-600"
    }
  ];

  const renderCurrentActivity = () => {
    switch (currentActivity) {
      case "tap":
        return <TapActivity studentName={studentName} progress={progress} />;
      case "drag":
        return <DragPuzzleActivity studentName={studentName} progress={progress} />;
      case "swipe":
        return <SwipeGalleryActivity studentName={studentName} progress={progress} />;
      default:
        return null;
    }
  };

  const currentActivityData = activities.find(a => a.id === currentActivity);

  return (
    <div className="space-y-6">
      {/* Activity Selection */}
      <div>
        <h4 className="text-lg font-fredoka text-gray-800 mb-4 text-center">
          Mari Berlatih Gerakan Dasar! 🎯
        </h4>
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {activities.map((activity) => (
            <Button
              key={activity.id}
              variant={currentActivity === activity.id ? "default" : "outline"}
              size="sm"
              onClick={() => setCurrentActivity(activity.id as "tap" | "drag" | "swipe")}
              className={`flex flex-col items-center p-2 sm:p-3 h-auto min-h-[60px] sm:min-h-[80px] ${
                currentActivity === activity.id
                  ? activity.buttonColor + " text-white"
                  : "bg-white hover:bg-gray-50"
              }`}
            >
              <div className="text-xl sm:text-2xl mb-1">{activity.emoji}</div>
              <div className="text-xs sm:text-sm font-medium">{activity.title}</div>
            </Button>
          ))}
        </div>
      </div>

      {/* Current Activity Display */}
      <Card className={`${currentActivityData?.color} border-2`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="text-3xl">{currentActivityData?.emoji}</div>
              <div>
                <h5 className="font-fredoka text-lg text-gray-800">
                  {currentActivityData?.title}
                </h5>
                <p className="text-sm text-gray-600">{currentActivityData?.description}</p>
              </div>
            </div>
            <Badge variant="outline" className="bg-white">
              Latihan
            </Badge>
          </div>
          
          {renderCurrentActivity()}
        </CardContent>
      </Card>

      {/* Progress Indicator */}
      <div className="text-center">
        <p className="text-sm text-gray-600">
          Sudah selesai dengan {currentActivityData?.title}? Coba gerakan lainnya!
        </p>
      </div>
    </div>
  );
}