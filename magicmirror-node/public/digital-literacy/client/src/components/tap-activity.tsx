import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { StudentProgress } from "@shared/schema";

interface TapActivityProps {
  studentName: string;
  progress: StudentProgress;
}

interface Balloon {
  id: number;
  x: number;
  y: number;
  color: string;
  emoji: string;
}

export default function TapActivity({ studentName, progress }: TapActivityProps) {
  const [balloons, setBalloons] = useState<Balloon[]>([]);
  const [score, setScore] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const saveProgressMutation = useMutation({
    mutationFn: async (data: { activityData: any; score: number }) => {
      const response = await apiRequest('POST', `/api/tap-activity/${studentName}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/progress', studentName] });
      toast({
        title: "Hebat! 🎈",
        description: `Kamu berhasil ketuk ${score} balon! Earned 20 points.`,
        className: "bg-green-500 text-white",
      });
    },
  });

  const balloonColors = [
    { color: 'bg-red-400', emoji: '🎈' },
    { color: 'bg-blue-400', emoji: '🎈' },
    { color: 'bg-green-400', emoji: '🎈' },
    { color: 'bg-yellow-400', emoji: '🎈' },
    { color: 'bg-purple-400', emoji: '🎈' },
    { color: 'bg-pink-400', emoji: '🎈' },
  ];

  const generateBalloon = (): Balloon => {
    const colorData = balloonColors[Math.floor(Math.random() * balloonColors.length)];
    return {
      id: Date.now() + Math.random(),
      x: Math.random() * 250 + 10, // Random position within container
      y: Math.random() * 150 + 10,
      color: colorData.color,
      emoji: colorData.emoji
    };
  };

  const startActivity = () => {
    setIsActive(true);
    setScore(0);
    setBalloons([]);
    
    // Generate balloons every 1.5 seconds
    const interval = setInterval(() => {
      setBalloons(prev => {
        if (prev.length < 3) {
          return [...prev, generateBalloon()];
        }
        return prev;
      });
    }, 1500);

    // Stop after 30 seconds
    setTimeout(() => {
      setIsActive(false);
      clearInterval(interval);
      setBalloons([]);
      
      // Save progress
      saveProgressMutation.mutate({
        activityData: { tappedBalloons: score, timestamp: new Date() },
        score: score * 5 // 5 points per balloon
      });
    }, 30000);
  };

  const popBalloon = (balloonId: number) => {
    setBalloons(prev => prev.filter(b => b.id !== balloonId));
    setScore(prev => prev + 1);
    
    toast({
      title: "Pop! 🎈",
      description: "Bagus sekali!",
      className: "bg-blue-500 text-white",
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <h4 className="font-fredoka text-lg text-gray-800 mb-2">Tap Activity - Ketuk Balon!</h4>
        <p className="text-gray-600 mb-4">Ketuk balon yang muncul secepat mungkin!</p>
      </div>

      <Card className="bg-gradient-to-b from-sky-100 to-blue-100 border-2 border-blue-300">
        <CardContent className="p-4">
          <div className="flex justify-between items-center mb-4">
            <div className="text-lg font-fredoka text-gray-800">
              Score: <span className="text-blue-600">{score}</span>
            </div>
            {!isActive && (
              <button
                onClick={startActivity}
                disabled={saveProgressMutation.isPending}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-fredoka transition-colors"
              >
                {saveProgressMutation.isPending ? "Saving..." : "Mulai Tap!"}
              </button>
            )}
            {isActive && (
              <div className="text-sm text-gray-600">Ketuk balon yang muncul!</div>
            )}
          </div>

          {/* Game Area */}
          <div className="relative bg-white rounded-lg h-48 border-2 border-dashed border-blue-300 overflow-hidden">
            {balloons.map((balloon) => (
              <button
                key={balloon.id}
                onClick={() => popBalloon(balloon.id)}
                className={`absolute w-12 h-12 ${balloon.color} rounded-full shadow-lg hover:scale-110 transition-transform flex items-center justify-center text-xl animate-bounce`}
                style={{
                  left: `${balloon.x}px`,
                  top: `${balloon.y}px`,
                }}
              >
                {balloon.emoji}
              </button>
            ))}
            
            {!isActive && balloons.length === 0 && (
              <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center">
                  <div className="text-4xl mb-2">🎈</div>
                  <p>Klik "Mulai Tap!" untuk bermain</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}