import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface AnimatedIntroProps {
  level: "L1" | "L2" | "L3" | "L4" | "L5";
  onComplete: () => void;
  show: boolean;
}

export default function AnimatedIntro({ level, onComplete, show }: AnimatedIntroProps) {
  const [step, setStep] = useState(0);
  const [isVisible, setIsVisible] = useState(show);

  useEffect(() => {
    if (show) {
      setIsVisible(true);
      setStep(0);
    }
  }, [show]);

  const l1Content = [
    {
      emoji: "👋",
      title: "Selamat Datang!",
      text: "Mari belajar tentang perangkat digital di sekitar kita",
      color: "from-blue-400 to-purple-500"
    },
    {
      emoji: "📱",
      title: "Perangkat Digital",
      text: "Kita akan mengenal smartphone, tablet, laptop, dan lainnya",
      color: "from-green-400 to-blue-500"
    },
    {
      emoji: "🎮",
      title: "Belajar Sambil Bermain",
      text: "Ada kuis, menggambar, dan aktivitas seru lainnya!",
      color: "from-orange-400 to-pink-500"
    }
  ];

  const l2Content = [
    {
      emoji: "✨",
      title: "Level 2 - Gerakan Tablet!",
      text: "Sekarang kita belajar cara menggunakan tablet dengan benar",
      color: "from-purple-400 to-pink-500"
    },
    {
      emoji: "👆",
      title: "Tap, Drag, Swipe",
      text: "Tiga gerakan dasar yang harus kamu kuasai",
      color: "from-indigo-400 to-purple-500"
    },
    {
      emoji: "🎯",
      title: "Praktik Langsung",
      text: "Kita akan langsung praktik setiap gerakan!",
      color: "from-pink-400 to-red-500"
    }
  ];

  const l3Content = [
    {
      emoji: "🛡️",
      title: "Level 3 - Kebiasaan Sehat!",
      text: "Mari belajar cara menggunakan gadget dengan aman dan sehat",
      color: "from-green-400 to-blue-500"
    },
    {
      emoji: "⏰",
      title: "Waktu Layar yang Tepat",
      text: "Belajar mengatur waktu bermain gadget supaya mata tidak lelah",
      color: "from-blue-400 to-indigo-500"
    },
    {
      emoji: "💪",
      title: "Tubuh Sehat, Pikiran Cerdas",
      text: "Posisi duduk yang benar dan senam mata untuk kesehatan",
      color: "from-indigo-400 to-purple-500"
    }
  ];

  const l4Content = [
    {
      emoji: "📱",
      title: "Level 4 - Aplikasi Belajar!",
      text: "Mari jelajahi dunia aplikasi yang membantu kita belajar dengan seru",
      color: "from-purple-400 to-pink-500"
    },
    {
      emoji: "🎮",
      title: "Belajar Sambil Bermain",
      text: "Aplikasi belajar membuat belajar huruf, angka, dan warna jadi menyenangkan",
      color: "from-indigo-400 to-purple-500"
    },
    {
      emoji: "🚀",
      title: "Petualangan Belajar",
      text: "Kita akan coba aplikasi bersama dan buat aplikasi impian sendiri!",
      color: "from-pink-400 to-orange-500"
    }
  ];

  const l5Content = [
    {
      emoji: "🌐",
      title: "Level 5 - Online vs Offline!",
      text: "Mari belajar perbedaan antara aktivitas online dan offline",
      color: "from-orange-400 to-red-500"
    },
    {
      emoji: "📶",
      title: "Butuh Internet atau Tidak?",
      text: "Kita akan belajar mana kegiatan yang butuh internet dan mana yang tidak",
      color: "from-blue-400 to-indigo-500"
    },
    {
      emoji: "🎯",
      title: "Bijak Menggunakan Internet",
      text: "Belajar kapan waktu yang tepat untuk online dan offline",
      color: "from-green-400 to-blue-500"
    }
  ];

  const content = level === "L1" ? l1Content : level === "L2" ? l2Content : level === "L3" ? l3Content : level === "L4" ? l4Content : l5Content;
  const currentContent = content[step];

  const handleNext = () => {
    if (step < content.length - 1) {
      setStep(step + 1);
    } else {
      handleClose();
    }
  };

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      onComplete();
    }, 300);
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
        onClick={handleClose}
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ type: "spring", duration: 0.5 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md"
        >
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className={`bg-gradient-to-br ${currentContent.color} p-8 text-center text-white relative overflow-hidden`}>
                {/* Animated background elements */}
                <motion.div
                  className="absolute -top-4 -right-4 w-20 h-20 bg-white bg-opacity-20 rounded-full"
                  animate={{ 
                    scale: [1, 1.2, 1],
                    rotate: [0, 180, 360]
                  }}
                  transition={{ 
                    duration: 4,
                    repeat: Infinity,
                    ease: "linear"
                  }}
                />
                <motion.div
                  className="absolute -bottom-4 -left-4 w-16 h-16 bg-white bg-opacity-15 rounded-full"
                  animate={{ 
                    scale: [1, 0.8, 1],
                    rotate: [360, 180, 0]
                  }}
                  transition={{ 
                    duration: 3,
                    repeat: Infinity,
                    ease: "linear"
                  }}
                />
                
                <motion.div
                  key={step}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.6 }}
                  className="relative z-10"
                >
                  <motion.div
                    className="text-6xl mb-4"
                    animate={{ 
                      scale: [1, 1.1, 1],
                      rotate: [0, 5, -5, 0]
                    }}
                    transition={{ 
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  >
                    {currentContent.emoji}
                  </motion.div>
                  <h2 className="text-2xl font-fredoka mb-3">{currentContent.title}</h2>
                  <p className="text-lg opacity-90">{currentContent.text}</p>
                </motion.div>
              </div>
              
              <div className="p-6">
                {/* Progress indicators */}
                <div className="flex justify-center space-x-2 mb-6">
                  {content.map((_, index) => (
                    <motion.div
                      key={index}
                      className={`w-3 h-3 rounded-full ${
                        index === step ? 'bg-primary' : 'bg-gray-200'
                      }`}
                      animate={index === step ? { scale: [1, 1.2, 1] } : {}}
                      transition={{ duration: 0.3 }}
                    />
                  ))}
                </div>
                
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={handleClose}
                    className="flex-1"
                  >
                    Lewati
                  </Button>
                  <Button
                    onClick={handleNext}
                    className="flex-1 bg-primary hover:bg-primary/90"
                  >
                    {step < content.length - 1 ? 'Lanjut' : 'Mulai Belajar!'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}