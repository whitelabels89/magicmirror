import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface AnimatedGestureProps {
  type: "tap" | "drag" | "swipe";
  size?: "sm" | "md" | "lg";
  autoPlay?: boolean;
  className?: string;
}

export default function AnimatedGesture({ 
  type, 
  size = "md", 
  autoPlay = true, 
  className = "" 
}: AnimatedGestureProps) {
  const [isAnimating, setIsAnimating] = useState(autoPlay);
  const [cycle, setCycle] = useState(0);

  const sizeClasses = {
    sm: "w-32 h-32",
    md: "w-48 h-48", 
    lg: "w-64 h-64"
  };

  useEffect(() => {
    if (autoPlay) {
      const interval = setInterval(() => {
        setCycle(prev => prev + 1);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [autoPlay]);

  const TapAnimation = () => (
    <div className={`relative ${sizeClasses[size]} ${className}`}>
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-100 to-blue-50 border-2 border-blue-200 flex items-center justify-center">
        <motion.div
          key={cycle}
          className="absolute"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ 
            scale: [0, 1.2, 1],
            opacity: [0, 1, 1, 0]
          }}
          transition={{ 
            duration: 2,
            times: [0, 0.3, 0.7, 1],
            repeat: Infinity,
            repeatDelay: 1
          }}
        >
          <div className="w-8 h-8 bg-blue-500 rounded-full shadow-lg" />
        </motion.div>
        
        {/* Ripple effect */}
        <motion.div
          key={`ripple-${cycle}`}
          className="absolute w-8 h-8 border-2 border-blue-400 rounded-full"
          initial={{ scale: 1, opacity: 0.7 }}
          animate={{ 
            scale: [1, 3],
            opacity: [0.7, 0]
          }}
          transition={{ 
            duration: 1.5,
            repeat: Infinity,
            repeatDelay: 1.5
          }}
        />
        
        <div className="text-blue-600 text-3xl">👆</div>
      </div>
    </div>
  );

  const DragAnimation = () => (
    <div className={`relative ${sizeClasses[size]} ${className}`}>
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-purple-100 to-purple-50 border-2 border-purple-200 flex items-center justify-center">
        <motion.div
          key={cycle}
          className="absolute"
          initial={{ x: -40, y: -20, opacity: 0 }}
          animate={{ 
            x: [40, 40],
            y: [20, 20],
            opacity: [0, 1, 1, 0]
          }}
          transition={{ 
            duration: 2.5,
            times: [0, 0.2, 0.8, 1],
            repeat: Infinity,
            repeatDelay: 0.5
          }}
        >
          <div className="w-6 h-6 bg-purple-500 rounded-full shadow-lg" />
        </motion.div>
        
        {/* Trail effect */}
        <motion.div
          key={`trail-${cycle}`}
          className="absolute w-1 h-16 bg-gradient-to-b from-purple-400 to-transparent rounded-full"
          initial={{ x: -40, y: -20, opacity: 0, rotate: 45 }}
          animate={{ 
            x: [40, 40],
            y: [20, 20],
            opacity: [0, 0.5, 0.5, 0]
          }}
          transition={{ 
            duration: 2.5,
            times: [0, 0.2, 0.8, 1],
            repeat: Infinity,
            repeatDelay: 0.5
          }}
        />
        
        <div className="text-purple-600 text-3xl">✨</div>
      </div>
    </div>
  );

  const SwipeAnimation = () => (
    <div className={`relative ${sizeClasses[size]} ${className}`}>
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-green-100 to-green-50 border-2 border-green-200 flex items-center justify-center">
        <motion.div
          key={cycle}
          className="absolute"
          initial={{ x: -60, opacity: 0 }}
          animate={{ 
            x: [60, 60],
            opacity: [0, 1, 1, 0]
          }}
          transition={{ 
            duration: 1.5,
            times: [0, 0.3, 0.7, 1],
            repeat: Infinity,
            repeatDelay: 1
          }}
        >
          <div className="w-6 h-6 bg-green-500 rounded-full shadow-lg" />
        </motion.div>
        
        {/* Swipe trail */}
        <motion.div
          key={`swipe-trail-${cycle}`}
          className="absolute h-1 bg-gradient-to-r from-transparent via-green-400 to-transparent rounded-full"
          initial={{ x: -60, width: 0, opacity: 0 }}
          animate={{ 
            x: [0, 60],
            width: [0, 80, 0],
            opacity: [0, 0.7, 0]
          }}
          transition={{ 
            duration: 1.5,
            repeat: Infinity,
            repeatDelay: 1
          }}
        />
        
        <div className="text-green-600 text-3xl">👉</div>
      </div>
    </div>
  );

  const renderAnimation = () => {
    switch (type) {
      case "tap":
        return <TapAnimation />;
      case "drag":
        return <DragAnimation />;
      case "swipe":
        return <SwipeAnimation />;
      default:
        return null;
    }
  };

  return (
    <AnimatePresence>
      {renderAnimation()}
    </AnimatePresence>
  );
}