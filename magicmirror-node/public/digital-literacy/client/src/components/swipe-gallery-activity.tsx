import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { StudentProgress } from "@shared/schema";

interface SwipeGalleryActivityProps {
  studentName: string;
  progress: StudentProgress;
}

interface GalleryImage {
  id: number;
  emoji: string;
  name: string;
  description: string;
  color: string;
}

const galleryImages: GalleryImage[] = [
  { id: 1, emoji: '🐱', name: 'Kucing', description: 'Hewan peliharaan yang lucu', color: 'bg-orange-100' },
  { id: 2, emoji: '🐶', name: 'Anjing', description: 'Sahabat setia manusia', color: 'bg-brown-100' },
  { id: 3, emoji: '🦋', name: 'Kupu-kupu', description: 'Serangga yang cantik', color: 'bg-purple-100' },
  { id: 4, emoji: '🌸', name: 'Bunga', description: 'Indah dan wangi', color: 'bg-pink-100' },
  { id: 5, emoji: '🌈', name: 'Pelangi', description: 'Warna-warni di langit', color: 'bg-blue-100' },
  { id: 6, emoji: '⭐', name: 'Bintang', description: 'Bersinar di malam hari', color: 'bg-yellow-100' },
];

export default function SwipeGalleryActivity({ studentName, progress }: SwipeGalleryActivityProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [swipeCount, setSwipeCount] = useState(0);
  const [startX, setStartX] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const saveProgressMutation = useMutation({
    mutationFn: async (data: { swipeData: any; swipeCount: number }) => {
      const response = await apiRequest('POST', `/api/swipe-gallery/${studentName}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/progress', studentName] });
      toast({
        title: "Swipe berhasil! 👉",
        description: `Kamu sudah swipe ${swipeCount} kali! Earned 15 points.`,
        className: "bg-green-500 text-white",
      });
    },
  });

  const currentImage = galleryImages[currentImageIndex];

  const handleSwipeLeft = () => {
    if (currentImageIndex > 0) {
      setCurrentImageIndex(prev => prev - 1);
      setSwipeCount(prev => prev + 1);
      toast({
        title: "Swipe Kiri! ⬅️",
        description: "Gambar sebelumnya",
        className: "bg-blue-500 text-white",
      });
    }
  };

  const handleSwipeRight = () => {
    if (currentImageIndex < galleryImages.length - 1) {
      setCurrentImageIndex(prev => prev + 1);
      setSwipeCount(prev => prev + 1);
      toast({
        title: "Swipe Kanan! ➡️",
        description: "Gambar selanjutnya",
        className: "bg-blue-500 text-white",
      });
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (startX === null) return;
    
    const endX = e.changedTouches[0].clientX;
    const diffX = startX - endX;
    
    // Minimum swipe distance
    if (Math.abs(diffX) > 50) {
      if (diffX > 0) {
        // Swiped left (next image)
        handleSwipeRight();
      } else {
        // Swiped right (previous image)
        handleSwipeLeft();
      }
    }
    
    setStartX(null);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setStartX(e.clientX);
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (startX === null) return;
    
    const endX = e.clientX;
    const diffX = startX - endX;
    
    // Minimum swipe distance
    if (Math.abs(diffX) > 50) {
      if (diffX > 0) {
        // Swiped left (next image)
        handleSwipeRight();
      } else {
        // Swiped right (previous image)
        handleSwipeLeft();
      }
    }
    
    setStartX(null);
  };

  const saveProgress = () => {
    saveProgressMutation.mutate({
      swipeData: { 
        totalSwipes: swipeCount, 
        currentImage: currentImageIndex,
        timestamp: new Date()
      },
      swipeCount
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <h4 className="font-fredoka text-lg text-gray-800 mb-2">Swipe Gallery - Usap Gambar!</h4>
        <p className="text-gray-600 mb-4">Usap ke kiri atau kanan untuk ganti gambar!</p>
      </div>

      <Card className="bg-white border-2 border-gray-300">
        <CardContent className="p-4">
          <div className="text-center mb-4">
            <div className="text-sm text-gray-600 mb-2">
              Gambar {currentImageIndex + 1} dari {galleryImages.length} | Swipe: {swipeCount}
            </div>
            
            {/* Progress dots */}
            <div className="flex justify-center space-x-2 mb-4">
              {galleryImages.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    index === currentImageIndex ? 'bg-blue-500' : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Gallery Area */}
          <div
            className={`${currentImage.color} rounded-2xl p-8 text-center cursor-pointer select-none transition-all duration-300 hover:scale-105`}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
          >
            <div className="text-8xl mb-4">{currentImage.emoji}</div>
            <h3 className="text-2xl font-fredoka text-gray-800 mb-2">{currentImage.name}</h3>
            <p className="text-gray-600">{currentImage.description}</p>
          </div>

          {/* Instructions */}
          <div className="mt-4 text-center text-sm text-gray-600">
            <p>💡 Usap gambar ke kiri/kanan atau gunakan tombol</p>
          </div>

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-4">
            <Button
              onClick={handleSwipeLeft}
              disabled={currentImageIndex === 0}
              variant="outline"
              className="flex items-center space-x-2"
            >
              <span>⬅️</span>
              <span>Sebelumnya</span>
            </Button>
            
            <Button
              onClick={handleSwipeRight}
              disabled={currentImageIndex === galleryImages.length - 1}
              variant="outline"
              className="flex items-center space-x-2"
            >
              <span>Selanjutnya</span>
              <span>➡️</span>
            </Button>
          </div>

          {/* Save Progress Button */}
          <Button
            onClick={saveProgress}
            disabled={saveProgressMutation.isPending || swipeCount === 0}
            className="w-full mt-4"
          >
            {saveProgressMutation.isPending ? "Menyimpan..." : "Simpan Progress"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}