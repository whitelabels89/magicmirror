import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest } from "@/lib/queryClient";
import { StudentProgress } from "@shared/schema";
import { motion } from "framer-motion";

interface AppDesignActivityProps {
  studentName: string;
  progress: StudentProgress;
}

interface GameComponent {
  id: string;
  type: 'button' | 'text' | 'image' | 'game-element';
  content: string;
  emoji: string;
  x: number;
  y: number;
  color: string;
  size: 'small' | 'medium' | 'large';
}

interface GameTemplate {
  id: string;
  name: string;
  emoji: string;
  description: string;
  components: GameComponent[];
  gameType: 'quiz' | 'memory' | 'puzzle' | 'counting';
}

const gameTemplates: GameTemplate[] = [
  {
    id: 'quiz-game',
    name: 'Game Kuis',
    emoji: '❓',
    description: 'Buat game kuis dengan pertanyaan dan jawaban',
    gameType: 'quiz',
    components: [
      { id: 'title', type: 'text', content: 'Kuis Seru!', emoji: '📝', x: 150, y: 50, color: '#3B82F6', size: 'large' },
      { id: 'question', type: 'text', content: 'Berapa 2 + 2?', emoji: '❓', x: 150, y: 120, color: '#1F2937', size: 'medium' },
      { id: 'answer1', type: 'button', content: '3', emoji: '1️⃣', x: 50, y: 200, color: '#EF4444', size: 'medium' },
      { id: 'answer2', type: 'button', content: '4', emoji: '2️⃣', x: 150, y: 200, color: '#10B981', size: 'medium' },
      { id: 'answer3', type: 'button', content: '5', emoji: '3️⃣', x: 250, y: 200, color: '#F59E0B', size: 'medium' },
      { id: 'score', type: 'text', content: 'Skor: 0', emoji: '🏆', x: 50, y: 280, color: '#8B5CF6', size: 'small' }
    ]
  },
  {
    id: 'memory-game',
    name: 'Game Memory',
    emoji: '🧠',
    description: 'Game mengingat kartu yang cocok',
    gameType: 'memory',
    components: [
      { id: 'title', type: 'text', content: 'Memory Game', emoji: '🧠', x: 150, y: 50, color: '#8B5CF6', size: 'large' },
      { id: 'card1', type: 'game-element', content: '🐱', emoji: '🃏', x: 80, y: 120, color: '#F3F4F6', size: 'medium' },
      { id: 'card2', type: 'game-element', content: '🐶', emoji: '🃏', x: 150, y: 120, color: '#F3F4F6', size: 'medium' },
      { id: 'card3', type: 'game-element', content: '🐱', emoji: '🃏', x: 220, y: 120, color: '#F3F4F6', size: 'medium' },
      { id: 'card4', type: 'game-element', content: '🐶', emoji: '🃏', x: 80, y: 190, color: '#F3F4F6', size: 'medium' },
      { id: 'timer', type: 'text', content: 'Waktu: 60s', emoji: '⏰', x: 50, y: 270, color: '#EF4444', size: 'small' }
    ]
  },
  {
    id: 'puzzle-game',
    name: 'Game Puzzle',
    emoji: '🧩',
    description: 'Susun potongan puzzle menjadi gambar utuh',
    gameType: 'puzzle',
    components: [
      { id: 'title', type: 'text', content: 'Puzzle Seru!', emoji: '🧩', x: 150, y: 50, color: '#10B981', size: 'large' },
      { id: 'piece1', type: 'game-element', content: '🟦', emoji: '🧩', x: 100, y: 120, color: '#3B82F6', size: 'medium' },
      { id: 'piece2', type: 'game-element', content: '🟩', emoji: '🧩', x: 170, y: 120, color: '#10B981', size: 'medium' },
      { id: 'piece3', type: 'game-element', content: '🟨', emoji: '🧩', x: 100, y: 190, color: '#F59E0B', size: 'medium' },
      { id: 'piece4', type: 'game-element', content: '🟪', emoji: '🧩', x: 170, y: 190, color: '#8B5CF6', size: 'medium' },
      { id: 'hint', type: 'text', content: 'Drag ke posisi yang tepat!', emoji: '💡', x: 150, y: 270, color: '#6B7280', size: 'small' }
    ]
  },
  {
    id: 'counting-game',
    name: 'Game Hitung',
    emoji: '🔢',
    description: 'Belajar menghitung dengan menyenangkan',
    gameType: 'counting',
    components: [
      { id: 'title', type: 'text', content: 'Ayo Hitung!', emoji: '🔢', x: 150, y: 50, color: '#F59E0B', size: 'large' },
      { id: 'objects', type: 'game-element', content: '🍎🍎🍎', emoji: '🍎', x: 150, y: 120, color: '#EF4444', size: 'large' },
      { id: 'question', type: 'text', content: 'Berapa banyak apel?', emoji: '❓', x: 150, y: 180, color: '#1F2937', size: 'medium' },
      { id: 'input', type: 'button', content: '3', emoji: '✍️', x: 150, y: 220, color: '#10B981', size: 'medium' },
      { id: 'feedback', type: 'text', content: 'Jawab dengan benar!', emoji: '✅', x: 150, y: 270, color: '#10B981', size: 'small' }
    ]
  }
];

const availableComponents = [
  { type: 'text', content: 'Teks Baru', emoji: '📝', color: '#1F2937' },
  { type: 'button', content: 'Tombol', emoji: '🔘', color: '#3B82F6' },
  { type: 'image', content: '🎨', emoji: '🖼️', color: '#10B981' },
  { type: 'game-element', content: '🎮', emoji: '🎯', color: '#8B5CF6' }
];

const colorOptions = [
  '#EF4444', '#10B981', '#3B82F6', '#F59E0B', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'
];

export default function AppDesignActivity({ studentName, progress }: AppDesignActivityProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<GameTemplate | null>(null);
  const [gameComponents, setGameComponents] = useState<GameComponent[]>([]);
  const [selectedComponent, setSelectedComponent] = useState<GameComponent | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isPlayMode, setIsPlayMode] = useState(false);
  const [currentTab, setCurrentTab] = useState('templates');
  const [gameScore, setGameScore] = useState(0);
  const canvasRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const updateProgressMutation = useMutation({
    mutationFn: async (data: { 
      completedActivities?: string[];
      badges?: string[];
      score?: number;
    }) => {
      return apiRequest("PUT", `/api/progress-l4/${studentName}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/progress-l4', studentName] });
      queryClient.invalidateQueries({ queryKey: ['/api/leaderboard'] });
    },
  });

  const handleTemplateSelect = (template: GameTemplate) => {
    setSelectedTemplate(template);
    setGameComponents(template.components);
    setIsPlayMode(false);
  };

  const handleComponentDrop = (e: React.DragEvent, component: any) => {
    e.preventDefault();
    if (!canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const newComponent: GameComponent = {
      id: `component-${Date.now()}`,
      type: component.type,
      content: component.content,
      emoji: component.emoji,
      x: Math.max(0, Math.min(x - 25, 350)),
      y: Math.max(0, Math.min(y - 25, 350)),
      color: component.color,
      size: 'medium'
    };

    setGameComponents([...gameComponents, newComponent]);
  };

  const handleComponentMove = (id: string, x: number, y: number) => {
    setGameComponents(prev => 
      prev.map(comp => 
        comp.id === id 
          ? { ...comp, x: Math.max(0, Math.min(x, 350)), y: Math.max(0, Math.min(y, 350)) }
          : comp
      )
    );
  };

  const handleComponentSelect = (component: GameComponent) => {
    setSelectedComponent(component);
  };

  const handleComponentUpdate = (updates: Partial<GameComponent>) => {
    if (!selectedComponent) return;
    
    setGameComponents(prev =>
      prev.map(comp =>
        comp.id === selectedComponent.id
          ? { ...comp, ...updates }
          : comp
      )
    );
    setSelectedComponent({ ...selectedComponent, ...updates });
  };

  const handleComponentDelete = (id: string) => {
    setGameComponents(prev => prev.filter(comp => comp.id !== id));
    if (selectedComponent?.id === id) {
      setSelectedComponent(null);
    }
  };

  const handlePlayGame = () => {
    setIsPlayMode(true);
    setGameScore(0);
    setCurrentTab('play'); // Switch to Play tab automatically
    
    // Save the design and award points
    const newActivities = progress.completedActivities.includes('app-design') 
      ? progress.completedActivities 
      : [...progress.completedActivities, 'app-design'];
    
    const newBadges = gameComponents.length >= 3 && !progress.badges.includes('App Designer')
      ? [...progress.badges, 'App Designer']
      : progress.badges;

    updateProgressMutation.mutate({
      completedActivities: newActivities,
      badges: newBadges,
      score: progress.score + (gameComponents.length * 5)
    });
  };

  const handleGameInteraction = (component: GameComponent) => {
    if (!isPlayMode) return;
    
    // Play sound effect simulation (visual feedback)
    const playSound = (type: string) => {
      const soundEmoji = type === 'success' ? '🎉' : type === 'click' ? '⚡' : '✨';
      const soundDiv = document.createElement('div');
      soundDiv.textContent = soundEmoji;
      soundDiv.className = 'fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-6xl z-50 animate-ping';
      document.body.appendChild(soundDiv);
      setTimeout(() => soundDiv.remove(), 800);
    };
    
    // Visual feedback for interaction
    const componentElement = document.getElementById(component.id);
    if (componentElement) {
      componentElement.style.transform = 'scale(1.2)';
      componentElement.style.transition = 'transform 0.2s';
      setTimeout(() => {
        componentElement.style.transform = 'scale(1)';
      }, 200);
    }
    
    // Game logic based on component type and selected template
    switch (component.type) {
      case 'button':
        playSound('click');
        setGameScore(prev => prev + 10);
        // Show feedback
        const buttonFeedback = document.createElement('div');
        buttonFeedback.textContent = '+10 poin!';
        buttonFeedback.className = 'absolute text-green-600 font-bold animate-bounce';
        buttonFeedback.style.left = component.x + 'px';
        buttonFeedback.style.top = (component.y - 20) + 'px';
        buttonFeedback.style.zIndex = '1000';
        document.querySelector('.relative')?.appendChild(buttonFeedback);
        setTimeout(() => buttonFeedback.remove(), 1000);
        break;
        
      case 'game-element':
        playSound('success');
        setGameScore(prev => prev + 15);
        // Change emoji for interactive feedback
        const newEmoji = ['⭐', '🎉', '🏆', '💎', '🔥'][Math.floor(Math.random() * 5)];
        setGameComponents(prev => prev.map(c => 
          c.id === component.id 
            ? { ...c, content: newEmoji }
            : c
        ));
        
        // Show feedback
        const elementFeedback = document.createElement('div');
        elementFeedback.textContent = '+15 poin!';
        elementFeedback.className = 'absolute text-blue-600 font-bold animate-pulse';
        elementFeedback.style.left = component.x + 'px';
        elementFeedback.style.top = (component.y - 20) + 'px';
        elementFeedback.style.zIndex = '1000';
        document.querySelector('.relative')?.appendChild(elementFeedback);
        setTimeout(() => elementFeedback.remove(), 1000);
        break;
        
      case 'text':
        playSound('sparkle');
        // Make text interactive by changing color
        const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8'];
        const randomColor = colors[Math.floor(Math.random() * colors.length)];
        setGameComponents(prev => prev.map(c => 
          c.id === component.id 
            ? { ...c, color: randomColor }
            : c
        ));
        setGameScore(prev => prev + 5);
        break;
    }
  };

  const getSizeClass = (size: string) => {
    switch (size) {
      case 'small': return 'text-sm p-1';
      case 'medium': return 'text-base p-2';
      case 'large': return 'text-lg p-3';
      default: return 'text-base p-2';
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-2xl font-bold text-green-600 mb-4">
          🎨 Buat Aplikasi Impianmu
        </h3>
        <p className="text-gray-600 mb-6">
          Pilih template, drag komponen, dan buat game edukatif sendiri!
        </p>
      </div>

      <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="templates">Template</TabsTrigger>
          <TabsTrigger value="design">Design</TabsTrigger>
          <TabsTrigger value="play">Play</TabsTrigger>
        </TabsList>

        <TabsContent value="templates">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {gameTemplates.map((template) => (
              <Card 
                key={template.id}
                className={`cursor-pointer transition-all hover:shadow-lg ${
                  selectedTemplate?.id === template.id ? 'ring-2 ring-blue-500' : ''
                }`}
                onClick={() => handleTemplateSelect(template)}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className="text-2xl">{template.emoji}</span>
                    <div>
                      <h4>{template.name}</h4>
                      <p className="text-sm text-gray-600">{template.description}</p>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-gray-500">
                    {template.components.length} komponen
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="design">
          <div className="flex gap-4">
            {/* Component Palette */}
            <div className="w-64 space-y-4">
              <h4 className="font-semibold">Komponen</h4>
              <div className="grid grid-cols-2 gap-2">
                {availableComponents.map((comp, index) => (
                  <div
                    key={index}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('application/json', JSON.stringify(comp));
                    }}
                    className="p-2 border rounded cursor-move hover:bg-gray-50 text-center"
                  >
                    <div className="text-xl">{comp.emoji}</div>
                    <div className="text-xs">{comp.type}</div>
                  </div>
                ))}
              </div>
              
              {selectedComponent && (
                <Card className="p-4">
                  <h5 className="font-semibold mb-2">Edit Komponen</h5>
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={selectedComponent.content}
                      onChange={(e) => handleComponentUpdate({ content: e.target.value })}
                      className="w-full p-1 border rounded"
                      placeholder="Konten"
                    />
                    <select
                      value={selectedComponent.size}
                      onChange={(e) => handleComponentUpdate({ size: e.target.value as 'small' | 'medium' | 'large' })}
                      className="w-full p-1 border rounded"
                    >
                      <option value="small">Kecil</option>
                      <option value="medium">Sedang</option>
                      <option value="large">Besar</option>
                    </select>
                    <div className="flex gap-1 flex-wrap">
                      {colorOptions.map(color => (
                        <div
                          key={color}
                          className="w-6 h-6 rounded cursor-pointer border-2"
                          style={{ backgroundColor: color }}
                          onClick={() => handleComponentUpdate({ color })}
                        />
                      ))}
                    </div>
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={() => handleComponentDelete(selectedComponent.id)}
                    >
                      Hapus
                    </Button>
                  </div>
                </Card>
              )}
            </div>

            {/* Canvas */}
            <div className="flex-1">
              <div className="mb-4">
                <Button onClick={handlePlayGame} className="bg-green-600 hover:bg-green-700">
                  🎮 Test Game
                </Button>
              </div>
              
              <div
                ref={canvasRef}
                className="relative w-full h-96 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 overflow-hidden"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  const componentData = JSON.parse(e.dataTransfer.getData('application/json'));
                  handleComponentDrop(e, componentData);
                }}
              >
                {gameComponents.map((component) => (
                  <motion.div
                    key={component.id}
                    drag={!isPlayMode}
                    dragConstraints={canvasRef}
                    dragElastic={0}
                    onDragEnd={(e, info) => {
                      handleComponentMove(component.id, component.x + info.offset.x, component.y + info.offset.y);
                    }}
                    className={`absolute cursor-pointer rounded border-2 ${
                      selectedComponent?.id === component.id ? 'border-blue-500' : 'border-gray-200'
                    } ${getSizeClass(component.size)}`}
                    style={{
                      left: component.x,
                      top: component.y,
                      backgroundColor: component.color + '20',
                      borderColor: component.color,
                      color: component.color
                    }}
                    onClick={() => {
                      if (isPlayMode) {
                        handleGameInteraction(component);
                      } else {
                        handleComponentSelect(component);
                      }
                    }}
                    whileHover={{ scale: isPlayMode ? 1.1 : 1.05 }}
                  >
                    {component.type === 'button' && (
                      <div className="flex items-center gap-1">
                        <span>{component.emoji}</span>
                        <span>{component.content}</span>
                      </div>
                    )}
                    {component.type === 'text' && (
                      <span>{component.content}</span>
                    )}
                    {component.type === 'game-element' && (
                      <div className="text-center">
                        <div className="text-2xl">{component.content}</div>
                      </div>
                    )}
                  </motion.div>
                ))}
                
                {gameComponents.length === 0 && (
                  <div className="flex items-center justify-center h-full text-gray-400">
                    <div className="text-center">
                      <div className="text-4xl mb-2">🎨</div>
                      <p>Drag komponen ke sini untuk membuat game!</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="play">
          <div className="text-center space-y-4">
            {gameComponents.length > 0 ? (
              <>
                <div className="mb-4 flex justify-center gap-4">
                  <Badge className="bg-green-100 text-green-800">
                    Mode Bermain - Skor: {gameScore}
                  </Badge>
                  {selectedTemplate && (
                    <Badge className="bg-blue-100 text-blue-800">
                      Game: {selectedTemplate.name}
                    </Badge>
                  )}
                </div>
                
                <div className="mb-4">
                  <p className="text-sm text-gray-600">
                    {selectedTemplate?.gameType === 'quiz' && 'Klik tombol untuk menjawab pertanyaan!'}
                    {selectedTemplate?.gameType === 'memory' && 'Klik untuk mengingat pola!'}
                    {selectedTemplate?.gameType === 'puzzle' && 'Klik untuk menyusun puzzle!'}
                    {selectedTemplate?.gameType === 'counting' && 'Klik untuk menghitung objek!'}
                    {!selectedTemplate && 'Klik komponen untuk berinteraksi!'}
                  </p>
                </div>
                
                <div className="relative w-full h-96 border-2 border-green-300 rounded-lg bg-green-50 overflow-hidden">
                  {gameComponents.map((component) => (
                    <motion.div
                      key={component.id}
                      id={component.id}
                      className={`absolute cursor-pointer rounded border-2 ${getSizeClass(component.size)} hover:shadow-lg transition-all`}
                      style={{
                        left: component.x,
                        top: component.y,
                        backgroundColor: component.color + '20',
                        borderColor: component.color,
                        color: component.color
                      }}
                      onClick={() => handleGameInteraction(component)}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {component.type === 'button' && (
                        <div className="flex items-center gap-1">
                          <span>{component.emoji}</span>
                          <span>{component.content}</span>
                        </div>
                      )}
                      {component.type === 'text' && (
                        <span>{component.content}</span>
                      )}
                      {component.type === 'game-element' && (
                        <div className="text-center">
                          <div className="text-2xl">{component.content}</div>
                        </div>
                      )}
                    </motion.div>
                  ))}
                  
                  {/* Game Instructions Overlay */}
                  {gameScore === 0 && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                      <div className="bg-white p-6 rounded-lg text-center">
                        <div className="text-4xl mb-2">🎮</div>
                        <h4 className="text-lg font-semibold mb-2">Mulai Bermain!</h4>
                        <p className="text-gray-600 mb-4">
                          Klik komponen-komponen di layar untuk mendapatkan poin
                        </p>
                        <Button onClick={() => setGameScore(1)}>
                          🚀 Mulai Game
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="flex justify-center gap-4">
                  <Button onClick={() => setGameScore(0)} variant="outline">
                    🔄 Reset Game
                  </Button>
                  <Button onClick={() => setCurrentTab('design')}>
                    🛠️ Kembali ke Design
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🎮</div>
                <h4 className="text-xl font-semibold mb-2">Belum Ada Game</h4>
                <p className="text-gray-600 mb-4">
                  Pilih template dan design game dulu di tab "Design"
                </p>
                <p className="text-sm text-gray-500 mb-4">
                  Langkah-langkah:
                  <br />1. Pilih template di tab "Template"
                  <br />2. Drag komponen ke canvas di tab "Design"
                  <br />3. Kembali ke sini untuk bermain!
                </p>
                <Button onClick={() => setCurrentTab('templates')}>
                  🎨 Mulai Design
                </Button>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <div className="text-center">
        <p className="text-sm text-gray-500">
          Buat game dengan 3+ komponen untuk mendapatkan badge "App Designer"! 🏆
        </p>
      </div>
    </div>
  );
}