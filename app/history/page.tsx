'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { supabase, Score, Profile } from '@/lib/supabase';
import { BottomNav } from '@/components/bottom-nav';
import { LoadingScreen } from '@/components/loading-screen';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { History, Trophy } from 'lucide-react';

type YearData = {
  scores: Array<Score & { profile: Profile }>;
};

export default function HistoryPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [yearData, setYearData] = useState<YearData | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth');
    } else if (user) {
      loadAvailableYears();
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (selectedYear) {
      loadYearData(selectedYear);
    }
  }, [selectedYear]);

  async function loadAvailableYears() {
    const { data } = await supabase
      .from('scores')
      .select('year')
      .order('year', { ascending: false });

    if (data) {
      const years = Array.from(new Set(data.map(d => d.year)));
      setAvailableYears(years);
      if (years.length > 0) {
        setSelectedYear(years[0]);
      }
    }
    setLoading(false);
  }

  async function loadYearData(year: number) {
    const { data } = await supabase
      .from('scores')
      .select('*, profile:profiles(*)')
      .eq('year', year)
      .order('final_rank', { ascending: true });

    if (data) {
      setYearData({ scores: data as any });
    }
  }

  if (authLoading) {
    return <LoadingScreen />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Trophy className="w-8 h-8 text-amber-500 animate-pulse" />
      </div>
    );
  }

  const getRankColor = (rank: number) => {
    if (rank === 1) return 'bg-yellow-500/10 border-yellow-500';
    if (rank === 2) return 'bg-zinc-400/10 border-zinc-400';
    if (rank === 3) return 'bg-amber-700/10 border-amber-700';
    return 'bg-zinc-800/50 border-zinc-700';
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return '4️⃣';
  };

  return (
    <div className="min-h-screen bg-zinc-950 pb-16">
      <div className="bg-gradient-to-br from-amber-600 to-amber-700 border-b border-zinc-800 px-6 py-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 flex items-center justify-center flex-shrink-0">
            <History className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">History</h1>
            <p className="text-sm mt-0.5 text-amber-100">Past competition results</p>
          </div>
        </div>

        {availableYears.length > 0 && (
          <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
            <SelectTrigger className="bg-white/10 border-white/20 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableYears.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="p-4 space-y-4">
        {yearData && yearData.scores.length > 0 ? (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-500" />
                  Final Rankings - {selectedYear}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {yearData.scores.map((score) => (
                  <div
                    key={score.id}
                    className={`p-4 rounded-lg border-2 ${getRankColor(score.final_rank)}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">{getRankIcon(score.final_rank)}</span>
                        <div>
                          <p
                            className="font-bold text-lg cursor-pointer hover:text-amber-500 transition-colors"
                            onClick={() => router.push(`/player/${score.user_id}`)}
                          >
                            {score.profile.display_name}
                          </p>
                          <p className="text-sm text-zinc-400">
                            {score.final_rank === 1 && 'Champion'}
                            {score.final_rank === 2 && 'Runner-up'}
                            {score.final_rank === 3 && '3rd Place'}
                            {score.final_rank === 4 && '4th Place'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-amber-500">{score.total_correct}</p>
                        <p className="text-xs text-zinc-400">Correct</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-zinc-700">
                      <div className="text-center">
                        <p className="text-lg font-bold text-green-500">{score.correct_artists}</p>
                        <p className="text-xs text-zinc-400">Artists</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-blue-500">{score.correct_songs}</p>
                        <p className="text-xs text-zinc-400">Songs</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-purple-500">{score.exact_match_score}</p>
                        <p className="text-xs text-zinc-400">Exact Pts</p>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </>
        ) : (
          <div className="text-center py-12">
            <History className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
            <p className="text-zinc-400">No competition data yet</p>
            <p className="text-sm text-zinc-500 mt-2">
              Results will appear after the admin enters scores
            </p>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
