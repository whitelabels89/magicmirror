import { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Play, Pause, Volume2, VolumeX, RotateCcw } from "lucide-react";

interface VideoPlayerProps {
  title: string;
  description?: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  onComplete?: () => void;
  autoPlay?: boolean;
  className?: string;
}

export default function VideoPlayer({
  title,
  description,
  videoUrl,
  thumbnailUrl,
  onComplete,
  autoPlay = false,
  className = ""
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [hasCompleted, setHasCompleted] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateProgress = () => {
      if (video.duration) {
        const progressPercent = (video.currentTime / video.duration) * 100;
        setProgress(progressPercent);
      }
    };

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setHasCompleted(true);
      onComplete?.();
    };

    video.addEventListener('timeupdate', updateProgress);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('ended', handleEnded);

    if (autoPlay) {
      video.play();
      setIsPlaying(true);
    }

    return () => {
      video.removeEventListener('timeupdate', updateProgress);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('ended', handleEnded);
    };
  }, [autoPlay, onComplete]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
    } else {
      video.play();
      setIsPlaying(true);
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = !video.muted;
    setIsMuted(video.muted);
  };

  const restart = () => {
    const video = videoRef.current;
    if (!video) return;

    video.currentTime = 0;
    setProgress(0);
    setHasCompleted(false);
    video.play();
    setIsPlaying(true);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // If no video URL is provided, show placeholder with animation
  if (!videoUrl) {
    return (
      <Card className={`overflow-hidden ${className}`}>
        <CardContent className="p-0">
          <div className="bg-gradient-to-br from-blue-400 to-purple-500 aspect-video flex items-center justify-center relative">
            <div className="text-center text-white">
              <div className="text-6xl mb-4 animate-bounce">🎬</div>
              <h3 className="text-xl font-fredoka mb-2">{title}</h3>
              {description && (
                <p className="text-sm opacity-90">{description}</p>
              )}
            </div>
            <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center">
              <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                <Play className="w-8 h-8 text-white ml-1" />
              </div>
            </div>
          </div>
          <div className="p-4">
            <p className="text-sm text-gray-600 text-center">
              Video akan tersedia segera! 🎥
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`overflow-hidden ${className}`}>
      <CardContent className="p-0">
        <div className="relative">
          <video
            ref={videoRef}
            className="w-full aspect-video object-cover"
            poster={thumbnailUrl}
            preload="metadata"
          >
            <source src={videoUrl} type="video/mp4" />
            Browser Anda tidak mendukung video HTML5.
          </video>
          
          {/* Video Controls Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300">
            <div className="absolute bottom-0 left-0 right-0 p-4">
              <div className="flex items-center gap-3 mb-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={togglePlay}
                  className="text-white hover:bg-white/20"
                >
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleMute}
                  className="text-white hover:bg-white/20"
                >
                  {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={restart}
                  className="text-white hover:bg-white/20"
                >
                  <RotateCcw className="w-5 h-5" />
                </Button>
                
                <div className="flex-1 flex items-center gap-2 text-white text-sm">
                  <span>{formatTime((progress / 100) * duration)}</span>
                  <div className="flex-1">
                    <Progress value={progress} className="h-1" />
                  </div>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="p-4">
          <h3 className="font-fredoka text-lg text-gray-800 mb-2">{title}</h3>
          {description && (
            <p className="text-sm text-gray-600 mb-3">{description}</p>
          )}
          
          {hasCompleted && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-center gap-2 text-green-700">
                <div className="text-lg">✅</div>
                <span className="text-sm font-medium">Video selesai ditonton!</span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}