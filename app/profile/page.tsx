'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { supabase, Score } from '@/lib/supabase';
import { BottomNav } from '@/components/bottom-nav';
import { LoadingScreen } from '@/components/loading-screen';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User, Trophy, LogOut, Crown, Beer } from 'lucide-react';
import { toast } from 'sonner';

export default function ProfilePage() {
  const { user, profile, signOut, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalWins: 0,
    totalCompetitions: 0,
    bestRank: 0,
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth');
    } else if (user) {
      loadStats();
    }
  }, [user, authLoading, router]);

  async function loadStats() {
    const { data } = await supabase
      .from('scores')
      .select('*')
      .eq('user_id', user!.id)
      .order('year', { ascending: false });

    if (data) {
      const wins = data.filter(s => s.final_rank === 1).length;
      const bestRank = data.length > 0 ? Math.min(...data.map(s => s.final_rank)) : 0;
      setStats({
        totalWins: wins,
        totalCompetitions: data.length,
        bestRank,
      });
    }

    setLoading(false);
  }

  async function handleSignOut() {
    await signOut();
    toast.success('Signed out successfully');
    router.push('/auth');
  }

  if (authLoading) {
    return <LoadingScreen />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Beer className="w-8 h-8 text-amber-500 animate-pulse" />
      </div>
    );
  }

  if (!profile) return null;

  const getRankEmoji = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return '4️⃣';
  };

  return (
    <div className="min-h-screen bg-zinc-950 pb-24">
      <div className="bg-gradient-to-br from-amber-600 to-amber-800 text-white p-6 pb-12">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="bg-white/20 p-6 rounded-full mb-4">
            <Beer className="w-16 h-16" />
          </div>
          <h1 className="text-3xl font-bold">{profile.display_name}</h1>
          <p className="text-amber-100 mt-1">{profile.email}</p>
        </div>

        {profile.is_admin && (
          <div className="bg-purple-600/30 border border-purple-400 rounded-lg p-3 flex items-center justify-center gap-2">
            <Crown className="w-5 h-5 text-purple-300" />
            <p className="text-sm font-medium text-purple-100">Admin Account</p>
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

            {stats.totalCompetitions > 0 && (
              <div className="mt-4 p-4 bg-amber-600/10 rounded-lg border border-amber-600/30">
                <p className="text-center text-sm text-zinc-300">
                  Win Rate: <span className="font-bold text-amber-500">
                    {((stats.totalWins / stats.totalCompetitions) * 100).toFixed(0)}%
                  </span>
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="p-3 bg-zinc-900 rounded-lg">
              <p className="text-sm text-zinc-400">Member since</p>
              <p className="font-medium">{new Date(profile.created_at).toLocaleDateString()}</p>
            </div>

            <Button
              variant="destructive"
              className="w-full"
              onClick={handleSignOut}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>

      <BottomNav />
    </div>
  );
}
