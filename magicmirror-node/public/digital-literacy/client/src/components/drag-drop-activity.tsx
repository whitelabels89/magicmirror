import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { StudentProgress } from "@shared/schema";

interface DragDropActivityProps {
  studentName: string;
  progress: StudentProgress;
}

interface DragItem {
  id: string;
  name: string;
  type: 'digital' | 'non-digital';
  emoji: string;
}

const initialItems: DragItem[] = [
  { id: '1', name: 'Smartphone', type: 'digital', emoji: '📱' },
  { id: '2', name: 'Buku', type: 'non-digital', emoji: '📚' },
  { id: '3', name: 'Laptop', type: 'digital', emoji: '💻' },
  { id: '4', name: 'Pensil', type: 'non-digital', emoji: '✏️' },
  { id: '5', name: 'Tablet', type: 'digital', emoji: '📱' },
  { id: '6', name: 'Jam Analog', type: 'non-digital', emoji: '🕐' },
  { id: '7', name: 'Kalkulator', type: 'digital', emoji: '🧮' },
  { id: '8', name: 'Penggaris', type: 'non-digital', emoji: '📏' },
];

export default function DragDropActivity({ studentName, progress }: DragDropActivityProps) {
  const [items, setItems] = useState<DragItem[]>(initialItems);
  const [digitalItems, setDigitalItems] = useState<DragItem[]>([]);
  const [nonDigitalItems, setNonDigitalItems] = useState<DragItem[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateProgressMutation = useMutation({
    mutationFn: async (data: { dragDropData: any; isComplete: boolean }) => {
      const response = await apiRequest('POST', `/api/dragdrop/${studentName}`, data);
      return response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/progress', studentName] });
      
      if (variables.isComplete) {
        toast({
          title: "All items sorted correctly! 🎯",
          description: "Amazing! You earned 15 points.",
          className: "bg-green-500 text-white",
        });
      } else {
        toast({
          title: "Great job! 🎉",
          description: "You earned 5 points for the correct placement.",
          className: "bg-green-500 text-white",
        });
      }
    },
  });

  const handleDragStart = (e: React.DragEvent, item: DragItem) => {
    e.dataTransfer.setData('text/plain', item.id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, zone: 'digital' | 'non-digital') => {
    e.preventDefault();
    const itemId = e.dataTransfer.getData('text/plain');
    const item = items.find(i => i.id === itemId);
    
    if (!item) return;

    const isCorrect = item.type === zone;
    
    if (isCorrect) {
      // Remove from items
      setItems(prev => prev.filter(i => i.id !== itemId));
      
      // Add to correct zone
      if (zone === 'digital') {
        setDigitalItems(prev => [...prev, item]);
      } else {
        setNonDigitalItems(prev => [...prev, item]);
      }
      
      // Check if all items are placed
      const remainingItems = items.filter(i => i.id !== itemId);
      const isComplete = remainingItems.length === 0;
      
      // Update progress
      updateProgressMutation.mutate({
        dragDropData: {
          digitalItems: zone === 'digital' ? [...digitalItems, item] : digitalItems,
          nonDigitalItems: zone === 'non-digital' ? [...nonDigitalItems, item] : nonDigitalItems,
          remainingItems: remainingItems.length,
        },
        isComplete,
      });
    } else {
      toast({
        title: "Try again! 💪",
        description: "That item belongs in the other category.",
        className: "bg-red-500 text-white",
      });
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h4 className="font-fredoka text-lg text-gray-800 mb-2">Drag & Drop Challenge</h4>
        <p className="text-gray-600 mb-4">Drag items to the correct category!</p>
      </div>

      {/* Items to drag */}
      <Card className="bg-gray-50">
        <CardContent className="p-4">
          <h5 className="font-medium text-gray-700 mb-3">Items:</h5>
          <div className="flex flex-wrap gap-2">
            {items.map((item) => (
              <div
                key={item.id}
                draggable
                onDragStart={(e) => handleDragStart(e, item)}
                className="bg-white border-2 border-gray-200 rounded-lg p-3 cursor-move hover:shadow-md transition-shadow select-none"
              >
                <div className="text-center">
                  <div className="text-2xl mb-1">{item.emoji}</div>
                  <div className="text-sm font-medium">{item.name}</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Drop zones */}
      <div className="grid grid-cols-2 gap-4">
        <Card
          className="bg-blue-50 border-2 border-dashed border-blue-300 min-h-24 transition-all duration-200"
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, 'digital')}
        >
          <CardContent className="p-4">
            <h5 className="font-fredoka text-blue-700 text-center mb-2">Digital</h5>
            <div className="text-center text-3xl mb-2">📱</div>
            <div className="space-y-2">
              {digitalItems.map((item) => (
                <div key={item.id} className="bg-white rounded-lg p-2 text-center border">
                  <div className="text-lg mb-1">{item.emoji}</div>
                  <div className="text-xs font-medium">{item.name}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card
          className="bg-green-50 border-2 border-dashed border-green-300 min-h-24 transition-all duration-200"
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, 'non-digital')}
        >
          <CardContent className="p-4">
            <h5 className="font-fredoka text-green-700 text-center mb-2">Non-Digital</h5>
            <div className="text-center text-3xl mb-2">📏</div>
            <div className="space-y-2">
              {nonDigitalItems.map((item) => (
                <div key={item.id} className="bg-white rounded-lg p-2 text-center border">
                  <div className="text-lg mb-1">{item.emoji}</div>
                  <div className="text-xs font-medium">{item.name}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
