import { Card, CardContent } from "@/components/ui/card";

interface BadgesProps {
  badges: string[];
}

const availableBadges = [
  { id: 'quiz-master', name: 'Quiz Master', emoji: '🧠' },
  { id: 'quiz-complete', name: 'Quiz Complete', emoji: '✅' },
  { id: 'artist', name: 'Artist', emoji: '🎨' },
  { id: 'sorter', name: 'Sorter', emoji: '🎯' },
  { id: 'storyteller', name: 'Storyteller', emoji: '📖' },
  { id: 'champion', name: 'Champion', emoji: '🏆' },
];

export default function Badges({ badges }: BadgesProps) {
  return (
    <Card className="bg-white rounded-2xl shadow-xl overflow-hidden">
      <div className="bg-gradient-to-r from-purple-400 to-pink-500 text-white p-4">
        <h3 className="text-lg font-fredoka flex items-center">
          <span className="text-2xl mr-2">🎖️</span>
          Your Badges
        </h3>
      </div>
      <CardContent className="p-4">
        <div className="grid grid-cols-3 gap-2">
          {availableBadges.map((badge) => {
            const isEarned = badges.includes(badge.id);
            
            return (
              <div
                key={badge.id}
                className={`text-center p-2 rounded-lg border-2 transition-all ${
                  isEarned
                    ? 'bg-yellow-50 border-yellow-300'
                    : 'bg-gray-50 border-gray-200 opacity-50'
                }`}
              >
                <div className="text-2xl mb-1">{badge.emoji}</div>
                <div className="text-xs font-medium">{badge.name}</div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
