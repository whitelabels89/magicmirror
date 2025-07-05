import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { StudentProgress } from "@shared/schema";

interface DragPuzzleActivityProps {
  studentName: string;
  progress: StudentProgress;
}

interface PuzzlePiece {
  id: string;
  content: string;
  emoji: string;
  correctPosition: number;
  currentPosition: number | null;
}

const initialPuzzlePieces: PuzzlePiece[] = [
  { id: 'piece1', content: 'Tablet', emoji: '📱', correctPosition: 0, currentPosition: null },
  { id: 'piece2', content: 'Komputer', emoji: '💻', correctPosition: 1, currentPosition: null },
  { id: 'piece3', content: 'Mouse', emoji: '🖱️', correctPosition: 2, currentPosition: null },
  { id: 'piece4', content: 'Keyboard', emoji: '⌨️', correctPosition: 3, currentPosition: null },
];

export default function DragPuzzleActivity({ studentName, progress }: DragPuzzleActivityProps) {
  const [pieces, setPieces] = useState<PuzzlePiece[]>(initialPuzzlePieces);
  const [draggedPiece, setDraggedPiece] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const saveProgressMutation = useMutation({
    mutationFn: async (data: { dragData: any; isComplete: boolean }) => {
      const response = await apiRequest('POST', `/api/drag-puzzle/${studentName}`, data);
      return response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/progress', studentName] });
      
      if (variables.isComplete) {
        toast({
          title: "Puzzle Selesai! 🧩",
          description: "Hebat! Semua puzzle sudah pada tempatnya. Earned 25 points.",
          className: "bg-green-500 text-white",
        });
      } else {
        toast({
          title: "Bagus! 🎯",
          description: "Piece puzzle benar! Earned 5 points.",
          className: "bg-blue-500 text-white",
        });
      }
    },
  });

  const handleDragStart = (e: React.DragEvent, pieceId: string) => {
    setDraggedPiece(pieceId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetPosition: number) => {
    e.preventDefault();
    
    if (!draggedPiece) return;

    const piece = pieces.find(p => p.id === draggedPiece);
    if (!piece) return;

    const isCorrect = piece.correctPosition === targetPosition;
    
    if (isCorrect) {
      setPieces(prev => prev.map(p => 
        p.id === draggedPiece 
          ? { ...p, currentPosition: targetPosition }
          : p
      ));

      // Check if puzzle is complete
      const updatedPieces = pieces.map(p => 
        p.id === draggedPiece 
          ? { ...p, currentPosition: targetPosition }
          : p
      );
      
      const isComplete = updatedPieces.every(p => p.currentPosition === p.correctPosition);
      
      if (isComplete) {
        setCompleted(true);
      }
      
      // Save progress
      saveProgressMutation.mutate({
        dragData: { pieces: updatedPieces, timestamp: new Date() },
        isComplete
      });
    } else {
      toast({
        title: "Coba lagi! 💪",
        description: "Piece ini bukan untuk posisi tersebut.",
        className: "bg-red-500 text-white",
      });
    }
    
    setDraggedPiece(null);
  };

  const resetPuzzle = () => {
    setPieces(initialPuzzlePieces);
    setCompleted(false);
  };

  const availablePieces = pieces.filter(p => p.currentPosition === null);
  const placedPieces = pieces.filter(p => p.currentPosition !== null);

  return (
    <div className="space-y-4">
      <div>
        <h4 className="font-fredoka text-lg text-gray-800 mb-2">Drag Puzzle - Susun Perangkat!</h4>
        <p className="text-gray-600 mb-4">Geser setiap perangkat ke posisi yang benar!</p>
      </div>

      {completed && (
        <Card className="bg-green-50 border-2 border-green-300">
          <CardContent className="p-4 text-center">
            <div className="text-4xl mb-2">🎉</div>
            <p className="text-green-800 font-fredoka">Puzzle Selesai! Kamu hebat!</p>
          </CardContent>
        </Card>
      )}

      {/* Available Pieces */}
      <Card className="bg-blue-50">
        <CardContent className="p-4">
          <h5 className="font-medium text-gray-700 mb-3">Geser perangkat ini:</h5>
          <div className="flex flex-wrap gap-2">
            {availablePieces.map((piece) => (
              <div
                key={piece.id}
                draggable
                onDragStart={(e) => handleDragStart(e, piece.id)}
                className="bg-white border-2 border-blue-200 rounded-lg p-3 cursor-move hover:shadow-md transition-shadow select-none min-w-20"
              >
                <div className="text-center">
                  <div className="text-2xl mb-1">{piece.emoji}</div>
                  <div className="text-sm font-medium">{piece.content}</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Drop Zones */}
      <Card className="bg-gray-50">
        <CardContent className="p-4">
          <h5 className="font-medium text-gray-700 mb-3">Letakkan di sini:</h5>
          <div className="grid grid-cols-2 gap-3">
            {[0, 1, 2, 3].map((position) => {
              const placedPiece = placedPieces.find(p => p.currentPosition === position);
              
              return (
                <div
                  key={position}
                  className="bg-white border-2 border-dashed border-gray-300 rounded-lg p-4 min-h-20 flex items-center justify-center transition-all duration-200 hover:border-blue-400"
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, position)}
                >
                  {placedPiece ? (
                    <div className="text-center">
                      <div className="text-2xl mb-1">{placedPiece.emoji}</div>
                      <div className="text-sm font-medium">{placedPiece.content}</div>
                    </div>
                  ) : (
                    <div className="text-gray-400 text-center">
                      <div className="text-2xl mb-1">📦</div>
                      <div className="text-xs">Drop di sini</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Button
        onClick={resetPuzzle}
        variant="outline"
        className="w-full"
        disabled={saveProgressMutation.isPending}
      >
        Reset Puzzle
      </Button>
    </div>
  );
}