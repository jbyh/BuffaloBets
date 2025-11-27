'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { supabase, Profile, Submission, BuffaloBalance, Score, FeedEvent } from '@/lib/supabase';
import { BottomNav } from '@/components/bottom-nav';
import { LoadingScreen } from '@/components/loading-screen';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Beer, Trophy, CheckCircle2, Clock, Medal, Users, TrendingUp, ChevronRight, Zap, Target, Calendar } from 'lucide-react';

export default function HomePage() {
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [currentYear] = useState(new Date().getFullYear());
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [buffalosIHave, setBuffalosIHave] = useState<Array<BuffaloBalance & { recipient: Profile }>>([]);
  const [buffalosOnMe, setBuffalosOnMe] = useState<Array<BuffaloBalance & { caller: Profile }>>([]);
  const [score, setScore] = useState<Score | null>(null);
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [allSubmissions, setAllSubmissions] = useState<Submission[]>([]);
  const [recentActivity, setRecentActivity] = useState<Array<FeedEvent & { user: Profile; related_user?: Profile }>>([]);
  const [showAllBuffalos, setShowAllBuffalos] = useState(false);
  const [showAllOwed, setShowAllOwed] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth');
    } else if (user) {
      loadData();
    }
  }, [user, authLoading, router]);

  async function loadData() {
    setLoading(true);

    const [submissionRes, buffaloHaveRes, buffaloOwedRes, scoresRes, profilesRes, allSubsRes, activityRes] = await Promise.all([
      supabase
        .from('submissions')
        .select('*')
        .eq('user_id', user!.id)
        .eq('year', currentYear)
        .maybeSingle(),
      supabase
        .from('buffalo_balances')
        .select('*, recipient:profiles!buffalo_balances_recipient_id_fkey(*)')
        .eq('caller_id', user!.id)
        .eq('year', currentYear)
        .gt('balance', 0),
      supabase
        .from('buffalo_balances')
        .select('*, caller:profiles!buffalo_balances_caller_id_fkey(*)')
        .eq('recipient_id', user!.id)
        .eq('year', currentYear)
        .gt('balance', 0),
      supabase
        .from('scores')
        .select('*')
        .eq('user_id', user!.id)
        .eq('year', currentYear)
        .maybeSingle(),
      supabase.from('profiles').select('*'),
      supabase.from('submissions').select('*').eq('year', currentYear),
      supabase
        .from('feed_events')
        .select('*, user:profiles!feed_events_user_id_fkey(*), related_user:profiles!feed_events_related_user_id_fkey(*)')
        .eq('year', currentYear)
        .order('created_at', { ascending: false })
        .limit(3)
    ]);

    if (submissionRes.data) setSubmission(submissionRes.data);
    if (buffaloHaveRes.data) setBuffalosIHave(buffaloHaveRes.data as any);
    if (buffaloOwedRes.data) setBuffalosOnMe(buffaloOwedRes.data as any);
    if (scoresRes.data) setScore(scoresRes.data);
    if (profilesRes.data) setAllProfiles(profilesRes.data);
    if (allSubsRes.data) setAllSubmissions(allSubsRes.data);
    if (activityRes.data) setRecentActivity(activityRes.data as any);

    setLoading(false);
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

  const totalBuffalosIHave = buffalosIHave.reduce((sum, b) => sum + b.balance, 0);
  const totalBuffalosOwed = buffalosOnMe.reduce((sum, b) => sum + b.balance, 0);
  const submittedCount = allSubmissions.length;
  const totalPlayers = allProfiles.length;
  const pendingCount = totalPlayers - submittedCount;

  const getCompetitionPhase = () => {
    if (score) return 'Results In';
    if (submittedCount === 0) return 'Live';
    if (submittedCount < totalPlayers) return 'Live';
    return 'Results Pending';
  };

  const phase = getCompetitionPhase();

  const getRankColor = (rank: number) => {
    if (rank === 1) return 'text-yellow-500';
    if (rank === 2) return 'text-zinc-400';
    if (rank === 3) return 'text-amber-700';
    return 'text-zinc-500';
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return '4th';
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'submission': return <Target className="w-4 h-4" />;
      case 'buffalo_call': return <Beer className="w-4 h-4" />;
      case 'result': return <Trophy className="w-4 h-4" />;
      default: return <Zap className="w-4 h-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 pb-16">
      <div className="gradient-animate animated-mesh text-white px-6 py-5 pb-8 relative overflow-hidden">
        <div className="flex items-center justify-between mb-4 animate-fade-in">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-3 tracking-tight">
              <Beer className="w-7 h-7" />
              Buffalo Predictions
            </h1>
            <p className="text-amber-100 mt-1 text-sm">Welcome back, {profile.display_name}!</p>
          </div>
        </div>

        <div className="bg-black/20 backdrop-blur-sm rounded-xl p-5 border border-white/10 animate-scale-in">
          <div className="flex items-center justify-center mb-4">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Calendar className="w-5 h-5 text-amber-200" />
                <p className="text-sm text-amber-200 uppercase tracking-wider font-medium">Current Competition</p>
              </div>
              <p className="text-5xl font-bold mb-3">{currentYear}</p>
              <Badge className={`text-base px-6 py-2 ${
                phase === 'Results In' ? 'bg-green-600' :
                phase === 'Live' ? 'bg-blue-600' :
                'bg-zinc-700'
              }`}>
                {phase}
              </Badge>
            </div>
          </div>

          {phase !== 'Results In' && (
            <div className="mt-3 pt-3 border-t border-white/10">
              <div className="flex items-center justify-between text-sm">
                <span className="text-amber-100">Submissions Progress</span>
                <span className="font-bold">{submittedCount} / {totalPlayers}</span>
              </div>
              <div className="mt-2 h-2 bg-black/30 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-400 to-amber-600 transition-all duration-500"
                  style={{ width: `${totalPlayers > 0 ? (submittedCount / totalPlayers) * 100 : 0}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="p-4 space-y-4">
        <Card className="stagger-item border-amber-600/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {submission ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  Submission Complete
                </>
              ) : (
                <>
                  <Clock className="w-5 h-5 text-amber-500 animate-pulse-slow" />
                  Submission Pending
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {submission ? (
              <div className="space-y-2">
                <p className="text-sm text-zinc-400">
                  Submitted {new Date(submission.submitted_at).toLocaleDateString()}
                </p>
                <Button
                  variant="outline"
                  className="w-full button-press"
                  onClick={() => router.push('/submit')}
                >
                  View Submission
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-zinc-400">
                  Submit your top 5 artists and songs before Spotify Wrapped releases!
                </p>
                <Button
                  className="w-full bg-amber-600 hover:bg-amber-700 button-press animate-glow"
                  onClick={() => router.push('/submit')}
                >
                  <Target className="w-4 h-4 mr-2" />
                  Submit Predictions
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {score && (
          <Card className="stagger-item border-amber-600/50 card-hover">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className={getRankColor(score.final_rank)} />
                Your {currentYear} Results
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center p-6 bg-gradient-to-br from-zinc-900 to-zinc-800 rounded-lg">
                <p className="text-6xl mb-2">{getRankIcon(score.final_rank)}</p>
                <p className={`text-2xl font-bold ${getRankColor(score.final_rank)}`}>
                  {score.final_rank === 1 && 'Champion!'}
                  {score.final_rank === 2 && 'Runner-up'}
                  {score.final_rank === 3 && '3rd Place'}
                  {score.final_rank === 4 && '4th Place'}
                </p>
              </div>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-amber-500">{score.total_correct}</p>
                  <p className="text-xs text-zinc-400">Correct</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-500">{score.correct_artists}</p>
                  <p className="text-xs text-zinc-400">Artists</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-500">{score.correct_songs}</p>
                  <p className="text-xs text-zinc-400">Songs</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="stagger-item card-hover">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Beer className="w-5 h-5 text-amber-500" />
                Buffalo Tally
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/buffalo-board')}
                className="button-press"
              >
                <TrendingUp className="w-4 h-4 mr-1" />
                View Board
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-green-600/10 border border-green-600/30 rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-green-500">{totalBuffalosIHave}</p>
                <p className="text-xs text-zinc-400 mt-1">You Have</p>
              </div>
              <div className="bg-red-600/10 border border-red-600/30 rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-red-500">{totalBuffalosOwed}</p>
                <p className="text-xs text-zinc-400 mt-1">You Owe</p>
              </div>
            </div>

            {buffalosIHave.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-green-400">Buffalos You Can Call</p>
                  {buffalosIHave.length > 2 && (
                    <button
                      onClick={() => setShowAllBuffalos(!showAllBuffalos)}
                      className="text-xs text-zinc-400 hover:text-zinc-300"
                    >
                      {showAllBuffalos ? 'Show Less' : `+${buffalosIHave.length - 2} more`}
                    </button>
                  )}
                </div>
                {buffalosIHave.slice(0, showAllBuffalos ? undefined : 2).map((buffalo) => (
                  <div
                    key={buffalo.id}
                    className="flex items-center justify-between p-3 bg-zinc-900 rounded-lg border border-zinc-800 hover:border-green-600/30 transition-colors"
                  >
                    <div>
                      <p className="font-medium">{buffalo.recipient.display_name}</p>
                      <p className="text-sm text-zinc-400">
                        {buffalo.balance} buffalo{buffalo.balance !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      className="bg-amber-600 hover:bg-amber-700 button-press"
                      onClick={() => router.push(`/feed?call=${buffalo.recipient_id}`)}
                    >
                      Call
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {buffalosOnMe.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-red-400">Buffalos Owed</p>
                  {buffalosOnMe.length > 2 && (
                    <button
                      onClick={() => setShowAllOwed(!showAllOwed)}
                      className="text-xs text-zinc-400 hover:text-zinc-300"
                    >
                      {showAllOwed ? 'Show Less' : `+${buffalosOnMe.length - 2} more`}
                    </button>
                  )}
                </div>
                {buffalosOnMe.slice(0, showAllOwed ? undefined : 2).map((buffalo) => (
                  <div
                    key={buffalo.id}
                    className="flex items-center justify-between p-3 bg-zinc-900 rounded-lg border border-zinc-800"
                  >
                    <div>
                      <p className="font-medium">{buffalo.caller.display_name}</p>
                      <p className="text-sm text-zinc-400">
                        {buffalo.balance} buffalo{buffalo.balance !== 1 ? 's' : ''} on you
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {buffalosIHave.length === 0 && buffalosOnMe.length === 0 && (
              <p className="text-sm text-zinc-400 text-center py-4">
                {score
                  ? "No buffalos this year"
                  : 'Buffalos will be awarded after results are in'}
              </p>
            )}
          </CardContent>
        </Card>

        {recentActivity.length > 0 && (
          <Card className="stagger-item card-hover">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-blue-500" />
                  Recent Activity
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push('/feed')}
                  className="button-press"
                >
                  View All <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentActivity.map((event) => (
                <div
                  key={event.id}
                  className="flex items-start gap-3 p-3 bg-zinc-900 rounded-lg border border-zinc-800 hover:border-zinc-700 transition-colors"
                >
                  <div className="bg-amber-600 p-2 rounded-lg">
                    {getEventIcon(event.event_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{event.title}</p>
                    {event.description && (
                      <p className="text-xs text-zinc-400 mt-1">{event.description}</p>
                    )}
                    <p className="text-xs text-zinc-500 mt-1">
                      {new Date(event.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {profile.is_admin && (
          <Card className="stagger-item border-purple-600/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Medal className="w-5 h-5 text-purple-500" />
                Admin Panel
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                className="w-full button-press"
                onClick={() => router.push('/admin')}
              >
                Enter Results & Calculate Scores
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
