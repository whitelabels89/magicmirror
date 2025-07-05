import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Leaderboard as LeaderboardType } from "@shared/schema";

export default function Leaderboard() {
  const { data: leaderboard, isLoading } = useQuery({
    queryKey: ['/api/leaderboard'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/leaderboard');
      return response.json() as Promise<LeaderboardType[]>;
    },
  });

  if (isLoading) {
    return (
      <Card className="bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white p-4">
          <h3 className="text-lg font-fredoka flex items-center">
            <span className="text-2xl mr-2">🏆</span>
            Leaderboard
          </h3>
        </div>
        <CardContent className="p-4">
          <div className="text-center text-gray-500">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white rounded-2xl shadow-xl overflow-hidden">
      <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white p-4">
        <h3 className="text-lg font-fredoka flex items-center">
          <span className="text-2xl mr-2">🏆</span>
          Leaderboard
        </h3>
      </div>
      <CardContent className="p-4">
        <div className="space-y-3">
          {leaderboard?.map((player, index) => {
            const rank = index + 1;
            const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '🏅';
            const isCurrentUser = player.studentName === 'Student';
            
            return (
              <div
                key={player.id}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  isCurrentUser ? 'bg-yellow-50 border-2 border-yellow-200' : 'bg-gray-50'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{medal}</span>
                  <span className={`font-medium ${
                    isCurrentUser ? 'text-yellow-800' : 'text-gray-800'
                  }`}>
                    {player.studentName}
                  </span>
                </div>
                <span className={`font-bold ${
                  isCurrentUser ? 'text-yellow-800' : 'text-gray-800'
                }`}>
                  {player.score}
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
