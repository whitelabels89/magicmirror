import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { slides } from "@/lib/slides-data.tsx";
import { slidesL2 } from "@/lib/slides-data-l2";
import { slidesL3 } from "@/lib/slides-data-l3";
import { slidesL4 } from "@/lib/slides-data-l4";
import { slidesL5 } from "@/lib/slides-data-l5";

interface SlideViewerProps {
  currentSlide: number;
  onSlideChange: (slide: number) => void;
  level?: "L1" | "L2" | "L3" | "L4" | "L5";
}

export default function SlideViewer({ currentSlide, onSlideChange, level = "L1" }: SlideViewerProps) {
  const currentSlides = level === "L2" ? slidesL2 : level === "L3" ? slidesL3 : level === "L4" ? slidesL4 : level === "L5" ? slidesL5 : slides;
  const nextSlide = () => {
    if (currentSlide < currentSlides.length - 1) {
      onSlideChange(currentSlide + 1);
    }
  };

  const prevSlide = () => {
    if (currentSlide > 0) {
      onSlideChange(currentSlide - 1);
    }
  };

  const goToSlide = (index: number) => {
    onSlideChange(index);
  };

  return (
    <Card className="bg-white rounded-2xl shadow-xl overflow-hidden">
      {/* Slide Navigation */}
      <div className="bg-gray-50 px-6 py-4 border-b">
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={prevSlide}
            disabled={currentSlide === 0}
            className="flex items-center space-x-2"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Previous</span>
          </Button>
          
          <div className="flex space-x-2">
            {currentSlides.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`w-3 h-3 rounded-full transition-all duration-200 ${
                  index === currentSlide ? 'bg-primary' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
          
          <Button
            onClick={nextSlide}
            disabled={currentSlide === currentSlides.length - 1}
            className="flex items-center space-x-2"
          >
            <span>Next</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Slide Content */}
      <CardContent className="p-8">
        <div className="min-h-96">
          {currentSlides[currentSlide] && (
            <div className="slide-content">
              <h2 className="text-3xl font-fredoka text-primary mb-8 text-center">
                {currentSlides[currentSlide].title}
              </h2>
              <div className="slide-body">
                {currentSlides[currentSlide].content}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
