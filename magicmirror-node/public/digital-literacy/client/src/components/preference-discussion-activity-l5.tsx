import { useState } from 'react';
import { motion } from 'framer-motion';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StudentProgress } from '@shared/schema';

interface PreferenceDiscussionActivityL5Props {
  studentName: string;
  progress: StudentProgress;
  onBack: () => void;
}

interface DiscussionQuestion {
  id: string;
  question: string;
  type: 'preference' | 'scenario' | 'opinion';
  options: string[];
  followUp?: string;
}

const discussionQuestions: DiscussionQuestion[] = [
  {
    id: '1',
    question: 'Mana yang lebih kamu suka?',
    type: 'preference',
    options: ['Main game online dengan teman', 'Main game offline sendiri', 'Bergantian keduanya'],
    followUp: 'Kenapa kamu memilih itu?'
  },
  {
    id: '2',
    question: 'Kapan waktu yang tepat untuk aktivitas online?',
    type: 'scenario',
    options: ['Saat ada WiFi gratis', 'Setelah izin orang tua', 'Saat tidak ada kegiatan offline', 'Semua jawaban benar'],
    followUp: 'Apa yang perlu dipersiapkan sebelum online?'
  },
  {
    id: '3',
    question: 'Apa yang kamu lakukan kalau internet mati?',
    type: 'scenario',
    options: ['Main game offline', 'Baca buku digital', 'Menggambar di tablet', 'Semua bisa dilakukan'],
    followUp: 'Mana aktivitas offline favorit kamu?'
  },
  {
    id: '4',
    question: 'Menurutmu, mana yang lebih penting?',
    type: 'opinion',
    options: ['Bisa main online kapan saja', 'Punya banyak game offline', 'Seimbang antara keduanya'],
    followUp: 'Bagaimana cara menyeimbangkan online dan offline?'
  }
];

export default function PreferenceDiscussionActivityL5({ 
  studentName, 
  progress, 
  onBack 
}: PreferenceDiscussionActivityL5Props) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<{[key: string]: string}>({});
  const [showSummary, setShowSummary] = useState(false);
  const [discussionComplete, setDiscussionComplete] = useState(false);
  const queryClient = useQueryClient();

  const updateProgressMutation = useMutation({
    mutationFn: async (data: { 
      completedActivities?: string[];
      badges?: string[];
      score?: number;
    }) => {
      return apiRequest("PUT", `/api/progress-l5/${studentName}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/progress-l5', studentName] });
      queryClient.invalidateQueries({ queryKey: ['/api/leaderboard'] });
    },
  });

  const handleAnswer = (answer: string) => {
    const question = discussionQuestions[currentQuestion];
    setAnswers({
      ...answers,
      [question.id]: answer
    });

    if (currentQuestion < discussionQuestions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      setShowSummary(true);
    }
  };

  const completeDiscussion = () => {
    setDiscussionComplete(true);

    // Update progress
    const activityName = 'preference-discussion-l5';
    const newActivities = progress.completedActivities.includes(activityName) 
      ? progress.completedActivities 
      : [...progress.completedActivities, activityName];
    
    const newBadges = [...progress.badges];
    if (Object.keys(answers).length >= 4 && !newBadges.includes('Discussion Master')) {
      newBadges.push('Discussion Master');
    }
    if (!newBadges.includes('Voice Sharer')) {
      newBadges.push('Voice Sharer');
    }

    updateProgressMutation.mutate({
      completedActivities: newActivities,
      badges: newBadges,
      score: progress.score + 25
    });
  };

  const resetDiscussion = () => {
    setCurrentQuestion(0);
    setAnswers({});
    setShowSummary(false);
    setDiscussionComplete(false);
  };

  if (discussionComplete) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <Button onClick={onBack} variant="outline" className="mb-4">
            ← Kembali
          </Button>
          <h3 className="text-2xl font-bold text-green-600 mb-4">
            🎉 Diskusi Selesai!
          </h3>
        </div>

        <Card className="p-6">
          <div className="text-center space-y-4">
            <div className="text-6xl">💬</div>
            <h4 className="text-xl font-bold">Terima kasih sudah berbagi!</h4>
            <p className="text-gray-600">
              Kamu telah menyelesaikan diskusi tentang preferensi online vs offline. 
              Setiap pendapat sangat berharga untuk pembelajaran bersama!
            </p>
            
            <div className="bg-green-50 p-4 rounded-lg">
              <h5 className="font-bold text-green-600 mb-2">🏆 Pencapaian</h5>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>✓ Menyelesaikan {Object.keys(answers).length} pertanyaan diskusi</li>
                <li>✓ Berbagi pendapat dengan jujur</li>
                <li>✓ Memahami perspektif yang berbeda</li>
                <li>✓ Meraih badge "Discussion Master"</li>
              </ul>
            </div>

            <div className="flex gap-4 justify-center mt-6">
              <Button onClick={resetDiscussion} variant="outline">
                🔄 Diskusi Lagi
              </Button>
              <Button onClick={onBack}>
                ✅ Selesai
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (showSummary) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h3 className="text-2xl font-bold text-green-600 mb-4">
            📋 Ringkasan Diskusi
          </h3>
          <p className="text-gray-600 mb-6">
            Ini adalah jawaban yang telah kamu berikan:
          </p>
        </div>

        <div className="space-y-4">
          {discussionQuestions.map((question, index) => (
            <Card key={question.id} className="p-4">
              <div className="space-y-2">
                <h4 className="font-semibold text-gray-800">
                  {index + 1}. {question.question}
                </h4>
                <div className="bg-blue-50 p-3 rounded">
                  <p className="text-blue-700 font-medium">
                    Jawaban kamu: {answers[question.id]}
                  </p>
                </div>
                {question.followUp && (
                  <p className="text-sm text-gray-600 italic">
                    💭 {question.followUp}
                  </p>
                )}
              </div>
            </Card>
          ))}
        </div>

        <div className="text-center">
          <div className="bg-yellow-50 p-4 rounded-lg mb-6">
            <h4 className="font-bold text-yellow-700 mb-2">🤔 Refleksi</h4>
            <p className="text-sm text-gray-700">
              Setelah menjawab semua pertanyaan, apa yang kamu pelajari tentang 
              perbedaan online dan offline? Diskusikan dengan teman atau guru!
            </p>
          </div>
          
          <Button 
            onClick={completeDiscussion}
            className="bg-green-500 text-white px-8 py-3 text-lg"
          >
            🎯 Selesaikan Diskusi
          </Button>
        </div>
      </div>
    );
  }

  const question = discussionQuestions[currentQuestion];

  return (
    <div className="space-y-6">
      <div className="text-center">
        <Button onClick={onBack} variant="outline" className="mb-4">
          ← Kembali
        </Button>
        <h3 className="text-2xl font-bold text-green-600 mb-2">
          💬 Diskusi Preferensi
        </h3>
        <p className="text-gray-600 mb-4">
          Mari berbagi pendapat tentang online vs offline!
        </p>
        <div className="text-sm text-gray-500">
          Pertanyaan {currentQuestion + 1} dari {discussionQuestions.length}
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-green-500 h-2 rounded-full transition-all duration-300"
          style={{ width: `${((currentQuestion + 1) / discussionQuestions.length) * 100}%` }}
        ></div>
      </div>

      <Card className="p-6">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">
            🤔 {question.question}
          </CardTitle>
          <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
            question.type === 'preference' ? 'bg-purple-100 text-purple-800' :
            question.type === 'scenario' ? 'bg-blue-100 text-blue-800' :
            'bg-green-100 text-green-800'
          }`}>
            {question.type === 'preference' ? '💝 Preferensi' :
             question.type === 'scenario' ? '🎭 Skenario' :
             '💭 Pendapat'}
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="grid grid-cols-1 gap-4">
            {question.options.map((option, index) => (
              <motion.div
                key={index}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button
                  onClick={() => handleAnswer(option)}
                  variant="outline"
                  className="w-full h-auto p-4 text-left justify-start hover:bg-green-50 hover:border-green-300"
                >
                  <span className="text-2xl mr-3">
                    {String.fromCharCode(65 + index)}
                  </span>
                  <span className="text-lg">{option}</span>
                </Button>
              </motion.div>
            ))}
          </div>
          
          {question.followUp && (
            <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
              <p className="text-sm text-yellow-700">
                <strong>💡 Pertanyaan lanjutan:</strong> {question.followUp}
              </p>
              <p className="text-xs text-gray-600 mt-1">
                Pikirkan jawabannya setelah memilih opsi di atas
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Previous answers */}
      {Object.keys(answers).length > 0 && (
        <Card className="p-4 bg-gray-50">
          <h4 className="font-semibold text-gray-700 mb-2">📝 Jawaban Sebelumnya:</h4>
          <div className="text-sm text-gray-600 space-y-1">
            {Object.entries(answers).map(([questionId, answer]) => {
              const prevQuestion = discussionQuestions.find(q => q.id === questionId);
              return (
                <div key={questionId}>
                  <strong>{prevQuestion?.question}</strong> → {answer}
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}