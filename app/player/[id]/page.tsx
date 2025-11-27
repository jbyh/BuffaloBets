'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { supabase, Profile, Submission, Result, Score, BuffaloBalance } from '@/lib/supabase';
import { LoadingScreen } from '@/components/loading-screen';
import { BottomNav } from '@/components/bottom-nav';
import { BuffaloRequestDialog } from '@/components/buffalo-request-dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { User, Trophy, ArrowLeft, Beer, CheckCircle2, XCircle, Calendar, Target } from 'lucide-react';
import { toast } from 'sonner';

type YearHistory = {
  year: number;
  submission?: Submission;
  result?: Result;
  score?: Score;
};

export default function PlayerProfilePage() {
  const { user, profile: currentProfile, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const playerId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [player, setPlayer] = useState<Profile | null>(null);
  const [history, setHistory] = useState<YearHistory[]>([]);
  const [stats, setStats] = useState({
    totalWins: 0,
    totalCompetitions: 0,
    bestRank: 0,
  });
  const [buffalosWithPlayer, setBuffalosWithPlayer] = useState<{
    iHave: number;
    theyHave: number;
  }>({ iHave: 0, theyHave: 0 });
  const [showRequestDialog, setShowRequestDialog] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth');
    } else if (user && playerId) {
      loadPlayerData();
    }
  }, [user, authLoading, playerId, router]);

  async function loadPlayerData() {
    const [profileRes, submissionsRes, resultsRes, scoresRes, buffaloBalancesRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', playerId).maybeSingle(),
      supabase.from('submissions').select('*').eq('user_id', playerId).order('year', { ascending: false }),
      supabase.from('results').select('*').eq('user_id', playerId).order('year', { ascending: false }),
      supabase.from('scores').select('*').eq('user_id', playerId).order('year', { ascending: false }),
      supabase.from('buffalo_balances').select('*').or(`caller_id.eq.${user!.id},recipient_id.eq.${user!.id}`).or(`caller_id.eq.${playerId},recipient_id.eq.${playerId}`).eq('year', new Date().getFullYear()),
    ]);

    if (profileRes.data) {
      setPlayer(profileRes.data);
    }

    const submissions = submissionsRes.data || [];
    const results = resultsRes.data || [];
    const scores = scoresRes.data || [];

    const yearSet = new Set([
      ...submissions.map(s => s.year),
      ...results.map(r => r.year),
      ...scores.map(sc => sc.year)
    ]);

    const historyData: YearHistory[] = Array.from(yearSet).sort((a, b) => b - a).map(year => ({
      year,
      submission: submissions.find(s => s.year === year),
      result: results.find(r => r.year === year),
      score: scores.find(sc => sc.year === year),
    }));

    setHistory(historyData);

    if (scores.length > 0) {
      const wins = scores.filter(s => s.final_rank === 1).length;
      const bestRank = Math.min(...scores.map(s => s.final_rank));
      setStats({
        totalWins: wins,
        totalCompetitions: scores.length,
        bestRank,
      });
    }

    const buffalos = buffaloBalancesRes.data || [];
    const iHave = buffalos.find(b => b.caller_id === user!.id && b.recipient_id === playerId)?.balance || 0;
    const theyHave = buffalos.find(b => b.caller_id === playerId && b.recipient_id === user!.id)?.balance || 0;
    setBuffalosWithPlayer({ iHave, theyHave });

    setLoading(false);
  }

  const getRankEmoji = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return '4️⃣';
  };

  if (authLoading || loading) {
    return <LoadingScreen />;
  }

  if (!player) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <p className="text-zinc-400">Player not found</p>
      </div>
    );
  }

  const isOwnProfile = player.id === user?.id;

  return (
    <div className="min-h-screen bg-zinc-950 pb-16">
      <div className="bg-gradient-to-br from-amber-600 to-amber-700 border-b border-zinc-800 px-6 py-5 pb-8">
        <Button
          variant="ghost"
          size="sm"
          className="text-white hover:bg-white/20 mb-3 button-press -ml-2"
          onClick={() => router.back()}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
              <User className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{player.display_name}</h1>
              <p className="text-amber-100 text-sm">{player.email}</p>
              {isOwnProfile && (
                <Badge className="mt-1.5 bg-amber-500 text-xs">Your Profile</Badge>
              )}
            </div>
          </div>
        </div>

        {!isOwnProfile && (
          <div className="mt-4 flex gap-3">
            <Button
              className="flex-1 bg-amber-500 hover:bg-amber-600 button-press"
              onClick={() => setShowRequestDialog(true)}
            >
              <Beer className="w-4 h-4 mr-2" />
              Request Buffalo
            </Button>
            {buffalosWithPlayer.iHave > 0 && (
              <Button
                variant="outline"
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                onClick={() => router.push(`/feed?call=${playerId}`)}
              >
                Call Buffalo ({buffalosWithPlayer.iHave})
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="p-4 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500" />
              Career Stats
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-zinc-900 rounded-lg">
                <p className="text-3xl font-bold text-yellow-500">{stats.totalWins}</p>
                <p className="text-xs text-zinc-400 mt-1">Championships</p>
              </div>
              <div className="text-center p-4 bg-zinc-900 rounded-lg">
                <p className="text-3xl font-bold text-blue-500">{stats.totalCompetitions}</p>
                <p className="text-xs text-zinc-400 mt-1">Competitions</p>
              </div>
              <div className="text-center p-4 bg-zinc-900 rounded-lg">
                <p className="text-3xl">{stats.bestRank > 0 ? getRankEmoji(stats.bestRank) : '-'}</p>
                <p className="text-xs text-zinc-400 mt-1">Best Finish</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {!isOwnProfile && (buffalosWithPlayer.iHave > 0 || buffalosWithPlayer.theyHave > 0) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Beer className="w-5 h-5 text-amber-500" />
                Buffalo Balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-green-600/10 border border-green-600/30 rounded-lg p-4 text-center">
                  <p className="text-3xl font-bold text-green-500">{buffalosWithPlayer.iHave}</p>
                  <p className="text-xs text-zinc-400 mt-1">You Have</p>
                </div>
                <div className="bg-red-600/10 border border-red-600/30 rounded-lg p-4 text-center">
                  <p className="text-3xl font-bold text-red-500">{buffalosWithPlayer.theyHave}</p>
                  <p className="text-xs text-zinc-400 mt-1">They Have</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-500" />
              Competition History
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {history.length > 0 ? (
              history.map((yearData) => (
                <div key={yearData.year} className="p-4 bg-zinc-900 rounded-lg border border-zinc-800">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xl font-bold text-amber-500">{yearData.year}</h3>
                    {yearData.score && (
                      <Badge className="bg-amber-600">
                        {getRankEmoji(yearData.score.final_rank)} Rank {yearData.score.final_rank}
                      </Badge>
                    )}
                  </div>

                  {yearData.submission && (
                    <div className="mb-3">
                      <p className="text-sm font-medium text-zinc-400 mb-2 flex items-center gap-2">
                        <Target className="w-4 h-4" />
                        Predictions
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <p className="text-xs text-zinc-500">Top Artists</p>
                          {yearData.submission.artists.slice(0, 3).map((artist, i) => (
                            <p key={i} className="text-sm text-zinc-300">
                              {i + 1}. {artist}
                            </p>
                          ))}
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-zinc-500">Top Songs</p>
                          {yearData.submission.songs.slice(0, 3).map((song, i) => (
                            <p key={i} className="text-sm text-zinc-300">
                              {i + 1}. {song}
                            </p>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {yearData.result && (
                    <div className="pt-3 border-t border-zinc-800">
                      <p className="text-sm font-medium text-zinc-400 mb-2">Actual Results</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          {yearData.result.actual_artists.slice(0, 3).map((artist, i) => {
                            const correct = yearData.submission?.artists.includes(artist);
                            return (
                              <p key={i} className="text-sm flex items-center gap-2">
                                {correct ? (
                                  <CheckCircle2 className="w-3 h-3 text-green-500" />
                                ) : (
                                  <XCircle className="w-3 h-3 text-red-500" />
                                )}
                                <span className={correct ? 'text-green-400' : 'text-zinc-400'}>
                                  {artist}
                                </span>
                              </p>
                            );
                          })}
                        </div>
                        <div className="space-y-1">
                          {yearData.result.actual_songs.slice(0, 3).map((song, i) => {
                            const correct = yearData.submission?.songs.includes(song);
                            return (
                              <p key={i} className="text-sm flex items-center gap-2">
                                {correct ? (
                                  <CheckCircle2 className="w-3 h-3 text-green-500" />
                                ) : (
                                  <XCircle className="w-3 h-3 text-red-500" />
                                )}
                                <span className={correct ? 'text-green-400' : 'text-zinc-400'}>
                                  {song}
                                </span>
                              </p>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {yearData.score && (
                    <div className="mt-3 pt-3 border-t border-zinc-800">
                      <div className="grid grid-cols-3 gap-2">
                        <div className="text-center">
                          <p className="text-lg font-bold text-amber-500">{yearData.score.total_correct}</p>
                          <p className="text-xs text-zinc-400">Total Correct</p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-bold text-green-500">{yearData.score.correct_artists}</p>
                          <p className="text-xs text-zinc-400">Artists</p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-bold text-blue-500">{yearData.score.correct_songs}</p>
                          <p className="text-xs text-zinc-400">Songs</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <p className="text-center text-zinc-400 py-8">No competition history yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      <BottomNav />

      {player && (
        <BuffaloRequestDialog
          open={showRequestDialog}
          onOpenChange={setShowRequestDialog}
          recipient={player}
          onSuccess={loadPlayerData}
        />
      )}
    </div>
  );
}
