import { useState } from 'react';
import OnlineOfflineActivityL5 from './online-offline-activity-l5';
import ConceptMatchingActivityL5 from './concept-matching-activity-l5';
import PreferenceDiscussionActivityL5 from './preference-discussion-activity-l5';
import QuizActivityL5 from './quiz-activity-l5';
import PracticeActivityL5 from './practice-activity-l5';
import { StudentProgress } from '@shared/schema';

interface InteractiveBoxL5Props {
  currentSlide: number;
  studentName: string;
  progress: StudentProgress;
}

export default function InteractiveBoxL5({ currentSlide, studentName, progress }: InteractiveBoxL5Props) {
  const [currentActivity, setCurrentActivity] = useState<string | null>(null);

  const getSlideActivities = () => {
    switch (currentSlide) {
      case 0:
        return (
          <div className="text-center space-y-4">
            <h3 className="text-xl font-bold text-orange-600">🌐 Konsep Online vs Offline</h3>
            <p className="text-gray-600 mb-4">
              Mari pelajari perbedaan antara online dan offline dengan aktivitas interaktif!
            </p>
            <button
              onClick={() => setCurrentActivity('concept-intro')}
              className="bg-orange-500 text-white px-6 py-3 rounded-lg hover:bg-orange-600 transition-colors"
            >
              Mulai Eksplorasi Konsep 🚀
            </button>
          </div>
        );
      
      case 1:
        return (
          <div className="text-center space-y-4">
            <h3 className="text-xl font-bold text-blue-600">🌐 Identifikasi Kegiatan Online</h3>
            <p className="text-gray-600 mb-4">
              Yuk, cari tahu mana kegiatan yang butuh internet!
            </p>
            <button
              onClick={() => setCurrentActivity('online-activities')}
              className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors"
            >
              Jelajahi Aktivitas Online 📺
            </button>
          </div>
        );
      
      case 2:
        return (
          <div className="text-center space-y-4">
            <h3 className="text-xl font-bold text-gray-600">📴 Identifikasi Kegiatan Offline</h3>
            <p className="text-gray-600 mb-4">
              Sekarang mari temukan kegiatan yang tidak butuh internet!
            </p>
            <button
              onClick={() => setCurrentActivity('offline-activities')}
              className="bg-gray-500 text-white px-6 py-3 rounded-lg hover:bg-gray-600 transition-colors"
            >
              Jelajahi Aktivitas Offline 🧩
            </button>
          </div>
        );
      
      case 3:
        return (
          <div className="text-center space-y-4">
            <h3 className="text-xl font-bold text-purple-600">⚖️ Bandingkan Online vs Offline</h3>
            <p className="text-gray-600 mb-4">
              Mari cocokkan setiap kegiatan dengan jenisnya!
            </p>
            <button
              onClick={() => setCurrentActivity('concept-matching')}
              className="bg-purple-500 text-white px-6 py-3 rounded-lg hover:bg-purple-600 transition-colors"
            >
              Mulai Mencocokkan 🎯
            </button>
          </div>
        );
      
      case 4:
        return (
          <div className="text-center space-y-4">
            <h3 className="text-xl font-bold text-green-600">🤔 Diskusi Preferensi</h3>
            <p className="text-gray-600 mb-4">
              Bagikan pendapat dan preferensimu tentang online vs offline!
            </p>
            <button
              onClick={() => setCurrentActivity('preference-discussion')}
              className="bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 transition-colors"
            >
              Ikut Diskusi 💬
            </button>
          </div>
        );
      
      case 5:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="text-center space-y-4">
              <h3 className="text-xl font-bold text-orange-600">📝 Kuis Pemahaman</h3>
              <p className="text-gray-600 mb-4">
                Tes pemahamanmu tentang online vs offline!
              </p>
              <button
                onClick={() => setCurrentActivity('quiz')}
                className="bg-orange-500 text-white px-6 py-3 rounded-lg hover:bg-orange-600 transition-colors"
              >
                Mulai Kuis 🧠
              </button>
            </div>
            
            <div className="text-center space-y-4">
              <h3 className="text-xl font-bold text-indigo-600">🎯 Latihan Praktis</h3>
              <p className="text-gray-600 mb-4">
                Praktikkan apa yang sudah dipelajari!
              </p>
              <button
                onClick={() => setCurrentActivity('practice')}
                className="bg-indigo-500 text-white px-6 py-3 rounded-lg hover:bg-indigo-600 transition-colors"
              >
                Mulai Praktik 🚀
              </button>
            </div>
          </div>
        );
      
      default:
        return (
          <div className="text-center py-8">
            <p className="text-gray-500">Slide aktivitas akan muncul di sini</p>
          </div>
        );
    }
  };

  const renderActivity = () => {
    switch (currentActivity) {
      case 'concept-intro':
      case 'online-activities':
      case 'offline-activities':
        return (
          <OnlineOfflineActivityL5
            studentName={studentName}
            progress={progress}
            activityType={currentActivity}
            onBack={() => setCurrentActivity(null)}
          />
        );
      
      case 'concept-matching':
        return (
          <ConceptMatchingActivityL5
            studentName={studentName}
            progress={progress}
            onBack={() => setCurrentActivity(null)}
          />
        );
      
      case 'preference-discussion':
        return (
          <PreferenceDiscussionActivityL5
            studentName={studentName}
            progress={progress}
            onBack={() => setCurrentActivity(null)}
          />
        );
      
      case 'quiz':
        return (
          <QuizActivityL5
            studentName={studentName}
            progress={progress}
            onBack={() => setCurrentActivity(null)}
          />
        );
      
      case 'practice':
        return (
          <PracticeActivityL5
            studentName={studentName}
            progress={progress}
            onBack={() => setCurrentActivity(null)}
          />
        );
      
      default:
        return getSlideActivities();
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          🎮 Aktivitas Interaktif
        </h2>
        <p className="text-gray-600">Slide {currentSlide + 1}/6</p>
      </div>

      {renderActivity()}
    </div>
  );
}