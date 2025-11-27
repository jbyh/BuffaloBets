'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { supabase, Score, BuffaloBalance, FeedEvent } from '@/lib/supabase';
import { BottomNav } from '@/components/bottom-nav';
import { LoadingScreen } from '@/components/loading-screen';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trophy, LogOut, Beer, Calendar } from 'lucide-react';
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

      const channel = supabase
        .channel('profile-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'buffalo_balances',
          },
          () => {
            loadBuffaloLedger();
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'feed_events',
          },
          () => {
            loadActivityFeed();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
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
    <div className="min-h-screen bg-zinc-950 pb-16">
      <div className="bg-zinc-900 border-b border-zinc-800 px-6 py-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-amber-700 rounded-full flex items-center justify-center flex-shrink-0">
            <Beer className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">{profile.display_name}</h1>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-zinc-400 text-sm">
            <Calendar className="w-3.5 h-3.5" />
            <span>Member since {new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className="h-8 text-zinc-400 hover:text-white hover:bg-zinc-800 -mr-2"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="px-4 py-5 space-y-4">
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-500" />
              Career Stats
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-4 bg-zinc-900 rounded-lg border border-zinc-800">
                <p className="text-3xl font-semibold text-white">{stats.totalWins}</p>
                <p className="text-xs text-zinc-500 mt-1.5 font-medium">Championships</p>
              </div>
              <div className="text-center p-4 bg-zinc-900 rounded-lg border border-zinc-800">
                <p className="text-3xl font-semibold text-white">{stats.totalCompetitions}</p>
                <p className="text-xs text-zinc-500 mt-1.5 font-medium">Competitions</p>
              </div>
            </div>

            {stats.totalCompetitions > 0 && (
              <div className="mt-3 py-2.5 px-4 bg-amber-500/5 rounded-lg border border-amber-500/10">
                <p className="text-center text-sm text-zinc-300">
                  Win Rate: <span className="font-semibold text-amber-500">
                    {((stats.totalWins / stats.totalCompetitions) * 100).toFixed(0)}%
                  </span>
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Beer className="w-4 h-4 text-amber-500" />
              Buffalo Ledger
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-4 bg-zinc-900 rounded-lg border border-zinc-800">
                <p className="text-3xl font-semibold text-white">{buffaloLedger.totalOwed}</p>
                <p className="text-xs text-zinc-500 mt-1.5 font-medium">I Owe</p>
              </div>
              <div className="text-center p-4 bg-zinc-900 rounded-lg border border-zinc-800">
                <p className="text-3xl font-semibold text-white">{buffaloLedger.totalOwedToMe}</p>
                <p className="text-xs text-zinc-500 mt-1.5 font-medium">Owed to Me</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {activityFeed.length > 0 && (
          <Card className="border-zinc-800 bg-zinc-900/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium">Activity Feed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {activityFeed.map((event) => (
                  <div
                    key={event.id}
                    className="px-3 py-2.5 bg-zinc-900 rounded-lg border border-zinc-800"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white leading-snug">{event.title}</p>
                        {event.description && (
                          <p className="text-xs text-zinc-500 mt-1 leading-relaxed">{event.description}</p>
                        )}
                      </div>
                      <span className="text-xs text-zinc-600 whitespace-nowrap flex-shrink-0">
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
