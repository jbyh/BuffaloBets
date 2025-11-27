'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { supabase, Score, BuffaloBalance, FeedEvent } from '@/lib/supabase';
import { BottomNav } from '@/components/bottom-nav';
import { LoadingScreen } from '@/components/loading-screen';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trophy, LogOut, Beer, TrendingUp, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

type FeedEventWithProfile = FeedEvent & {
  user?: { display_name: string };
  related_user?: { display_name: string };
};

export default function ProfilePage() {
  const { user, profile, signOut, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalWins: 0,
    totalCompetitions: 0,
  });
  const [buffaloLedger, setBuffaloLedger] = useState({
    totalOwed: 0,
    totalOwedToMe: 0,
  });
  const [activityFeed, setActivityFeed] = useState<FeedEventWithProfile[]>([]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth');
    } else if (user) {
      loadProfileData();
    }
  }, [user, authLoading, router]);

  async function loadProfileData() {
    await Promise.all([
      loadStats(),
      loadBuffaloLedger(),
      loadActivityFeed(),
    ]);
    setLoading(false);
  }

  async function loadStats() {
    const { data } = await supabase
      .from('scores')
      .select('*')
      .eq('user_id', user!.id)
      .order('year', { ascending: false });

    if (data) {
      const wins = data.filter(s => s.final_rank === 1).length;
      setStats({
        totalWins: wins,
        totalCompetitions: data.length,
      });
    }
  }

  async function loadBuffaloLedger() {
    const [{ data: owedData }, { data: owedToMeData }] = await Promise.all([
      supabase
        .from('buffalo_balances')
        .select('balance')
        .eq('recipient_id', user!.id),
      supabase
        .from('buffalo_balances')
        .select('balance')
        .eq('caller_id', user!.id),
    ]);

    const totalOwed = owedData?.reduce((sum, item) => sum + item.balance, 0) || 0;
    const totalOwedToMe = owedToMeData?.reduce((sum, item) => sum + item.balance, 0) || 0;

    setBuffaloLedger({
      totalOwed,
      totalOwedToMe,
    });
  }

  async function loadActivityFeed() {
    const { data } = await supabase
      .from('feed_events')
      .select(`
        *,
        user:user_id(display_name),
        related_user:related_user_id(display_name)
      `)
      .or(`user_id.eq.${user!.id},related_user_id.eq.${user!.id}`)
      .order('created_at', { ascending: false })
      .limit(20);

    if (data) {
      setActivityFeed(data as FeedEventWithProfile[]);
    }
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

  return (
    <div className="min-h-screen bg-zinc-950 pb-24">
      <div className="bg-zinc-900 border-b border-zinc-800 p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="bg-amber-600/20 p-3 rounded-full">
            <Beer className="w-6 h-6 text-amber-500" />
          </div>
          <h1 className="text-2xl font-bold text-white">{profile.display_name}</h1>
        </div>

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-zinc-400">
            <Calendar className="w-4 h-4" />
            <span>Member since {new Date(profile.created_at).toLocaleDateString()}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className="text-zinc-400 hover:text-white"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
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
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-zinc-900 rounded-lg">
                <p className="text-3xl font-bold text-yellow-500">{stats.totalWins}</p>
                <p className="text-xs text-zinc-400 mt-1">Championships</p>
              </div>
              <div className="text-center p-4 bg-zinc-900 rounded-lg">
                <p className="text-3xl font-bold text-blue-500">{stats.totalCompetitions}</p>
                <p className="text-xs text-zinc-400 mt-1">Competitions</p>
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
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-amber-500" />
              Buffalo Ledger
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-zinc-900 rounded-lg">
                <p className="text-3xl font-bold text-red-500">{buffaloLedger.totalOwed}</p>
                <p className="text-xs text-zinc-400 mt-1">I Owe</p>
              </div>
              <div className="text-center p-4 bg-zinc-900 rounded-lg">
                <p className="text-3xl font-bold text-green-500">{buffaloLedger.totalOwedToMe}</p>
                <p className="text-xs text-zinc-400 mt-1">Owed to Me</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {activityFeed.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Activity Feed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {activityFeed.map((event) => (
                  <div
                    key={event.id}
                    className="p-3 bg-zinc-900 rounded-lg border border-zinc-800"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-white">{event.title}</p>
                        {event.description && (
                          <p className="text-xs text-zinc-400 mt-1">{event.description}</p>
                        )}
                      </div>
                      <span className="text-xs text-zinc-500 whitespace-nowrap">
                        {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
