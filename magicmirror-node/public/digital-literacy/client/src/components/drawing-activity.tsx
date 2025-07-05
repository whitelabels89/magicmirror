import { useRef, useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { StudentProgress } from "@shared/schema";

interface DrawingActivityProps {
  studentName: string;
  progress: StudentProgress;
}

export default function DrawingActivity({ studentName, progress }: DrawingActivityProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentTool, setCurrentTool] = useState('pen');
  const [currentColor, setCurrentColor] = useState('#000000');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const saveDrawingMutation = useMutation({
    mutationFn: async (drawingData: string) => {
      const response = await apiRequest('POST', `/api/drawing/${studentName}`, { drawingData });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/progress', studentName] });
      toast({
        title: "Drawing saved! 🎨",
        description: "Great artwork! You earned 20 points.",
        className: "bg-green-500 text-white",
      });
    },
  });

  const tools = [
    { name: 'pen', color: '#000000', label: 'Black' },
    { name: 'pen', color: '#FF6B6B', label: 'Red' },
    { name: 'pen', color: '#4ECDC4', label: 'Teal' },
    { name: 'pen', color: '#45B7D1', label: 'Blue' },
    { name: 'pen', color: '#F7DC6F', label: 'Yellow' },
    { name: 'eraser', color: '', label: 'Eraser' },
  ];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set initial canvas properties
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 3;
    
    // Fill with white background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();

    if (currentTool === 'pen') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = currentColor;
      ctx.lineWidth = 3;
    } else if (currentTool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = 10;
    }

    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const saveDrawing = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dataURL = canvas.toDataURL();
    saveDrawingMutation.mutate(dataURL);
  };

  return (
    <div className="space-y-4">
      <div>
        <h4 className="font-fredoka text-lg text-gray-800 mb-2">Drawing Canvas</h4>
        <p className="text-gray-600 mb-4">Draw your favorite digital device!</p>
      </div>

      <Card className="border-2 border-dashed border-gray-300">
        <CardContent className="p-4">
          {/* Drawing Tools */}
          <div className="flex space-x-2 mb-4">
            {tools.map((tool, index) => (
              <button
                key={index}
                onClick={() => {
                  setCurrentTool(tool.name);
                  setCurrentColor(tool.color);
                }}
                className={`w-8 h-8 flex items-center justify-center border-2 rounded-lg transition-colors ${
                  currentTool === tool.name && currentColor === tool.color
                    ? 'border-primary bg-primary bg-opacity-10'
                    : 'border-gray-300 hover:border-primary'
                }`}
              >
                {tool.name === 'eraser' ? (
                  <span className="text-sm">🧹</span>
                ) : (
                  <div
                    className="w-6 h-6 rounded-full"
                    style={{ backgroundColor: tool.color }}
                  />
                )}
              </button>
            ))}
          </div>

          {/* Canvas */}
          <div className="bg-white rounded border mb-4">
            <canvas
              ref={canvasRef}
              width={280}
              height={200}
              className="cursor-crosshair"
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
            />
          </div>

          {/* Controls */}
          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={clearCanvas}
              className="flex-1"
            >
              Clear
            </Button>
            <Button
              onClick={saveDrawing}
              disabled={saveDrawingMutation.isPending}
              className="flex-1"
            >
              {saveDrawingMutation.isPending ? "Saving..." : "Save Drawing"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
