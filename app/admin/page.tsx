'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { supabase, Profile, Submission } from '@/lib/supabase';
import { calculateScore, rankPlayers, calculateBuffaloBalances } from '@/lib/scoring';
import { BottomNav } from '@/components/bottom-nav';
import { LoadingScreen } from '@/components/loading-screen';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentYear] = useState(new Date().getFullYear());
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [artists, setArtists] = useState(['', '', '', '', '']);
  const [songs, setSongs] = useState(['', '', '', '', '']);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth');
    } else if (user && profile) {
      if (!profile.is_admin) {
        toast.error('Unauthorized');
        router.push('/');
      } else {
        loadData();
      }
    }
  }, [user, profile, authLoading, router]);

  async function loadData() {
    const [profilesRes, submissionsRes] = await Promise.all([
      supabase.from('profiles').select('*').order('display_name'),
      supabase
        .from('submissions')
        .select('*')
        .eq('year', currentYear),
    ]);

    if (profilesRes.data) setAllProfiles(profilesRes.data);
    if (submissionsRes.data) setSubmissions(submissionsRes.data);

    setLoading(false);
  }

  async function handleSubmitResults(e: React.FormEvent) {
    e.preventDefault();

    if (!selectedUser) {
      toast.error('Please select a user');
      return;
    }

    if (artists.some(a => !a.trim()) || songs.some(s => !s.trim())) {
      toast.error('Please fill in all fields');
      return;
    }

    setSaving(true);

    const { error } = await supabase.from('results').upsert({
      user_id: selectedUser,
      year: currentYear,
      actual_artists: artists.map(a => a.trim()),
      actual_songs: songs.map(s => s.trim()),
    });

    if (error) {
      toast.error('Failed to save results');
      setSaving(false);
      return;
    }

    toast.success('Results saved! Now calculating scores...');

    await calculateAllScores();

    setSaving(false);
    setSelectedUser('');
    setArtists(['', '', '', '', '']);
    setSongs(['', '', '', '', '']);
  }

  async function calculateAllScores() {
    const { data: allResults } = await supabase
      .from('results')
      .select('*')
      .eq('year', currentYear);

    if (!allResults || allResults.length === 0) return;

    const scoresData = [];

    for (const result of allResults) {
      const submission = submissions.find(s => s.user_id === result.user_id);
      if (!submission) continue;

      const scoreData = calculateScore(
        submission.artists,
        submission.songs,
        result.actual_artists,
        result.actual_songs
      );

      scoresData.push({
        user_id: result.user_id,
        year: currentYear,
        ...scoreData,
      });
    }

    const rankedScores = rankPlayers(scoresData);

    for (let i = 0; i < rankedScores.length; i++) {
      await supabase.from('scores').upsert({
        ...rankedScores[i],
        final_rank: i + 1,
      });
    }

    const rankedPlayerIds = rankedScores.map(s => s.user_id);
    const balances = calculateBuffaloBalances(rankedPlayerIds);

    for (const balance of balances) {
      await supabase.from('buffalo_balances').upsert({
        year: currentYear,
        caller_id: balance.caller_id,
        recipient_id: balance.recipient_id,
        balance: balance.balance,
      });
    }

    toast.success('All scores calculated and buffalos awarded!');
  }

  if (authLoading) {
    return <LoadingScreen />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Shield className="w-8 h-8 text-purple-500 animate-pulse" />
      </div>
    );
  }

  const usersWithSubmissions = allProfiles.filter(p =>
    submissions.some(s => s.user_id === p.id)
  );

  return (
    <div className="min-h-screen bg-zinc-950 pb-16">
      <div className="bg-gradient-to-br from-purple-600 to-purple-700 border-b border-zinc-800 px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 flex items-center justify-center flex-shrink-0">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Admin Panel</h1>
            <p className="text-sm mt-0.5 text-purple-100">Enter actual Spotify results</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmitResults} className="p-4 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Select User</CardTitle>
            <CardDescription>Choose which user's results to enter</CardDescription>
          </CardHeader>
          <CardContent>
            <select
              className="w-full p-2 bg-zinc-900 border border-zinc-700 rounded-lg"
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              required
            >
              <option value="">Select a user...</option>
              {usersWithSubmissions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.display_name}
                </option>
              ))}
            </select>
          </CardContent>
        </Card>

        {selectedUser && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Actual Top 5 Artists</CardTitle>
                <CardDescription>From their Spotify Wrapped</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {artists.map((artist, index) => (
                  <div key={`artist-${index}`} className="space-y-2">
                    <Label htmlFor={`actual-artist-${index}`}>#{index + 1} Artist</Label>
                    <Input
                      id={`actual-artist-${index}`}
                      value={artist}
                      onChange={(e) => {
                        const newArtists = [...artists];
                        newArtists[index] = e.target.value;
                        setArtists(newArtists);
                      }}
                      placeholder={`Artist ${index + 1}`}
                      required
                    />
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Actual Top 5 Songs</CardTitle>
                <CardDescription>From their Spotify Wrapped</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {songs.map((song, index) => (
                  <div key={`song-${index}`} className="space-y-2">
                    <Label htmlFor={`actual-song-${index}`}>#{index + 1} Song</Label>
                    <Input
                      id={`actual-song-${index}`}
                      value={song}
                      onChange={(e) => {
                        const newSongs = [...songs];
                        newSongs[index] = e.target.value;
                        setSongs(newSongs);
                      }}
                      placeholder={`Song ${index + 1}`}
                      required
                    />
                  </div>
                ))}
              </CardContent>
            </Card>

            <Button
              type="submit"
              className="w-full bg-purple-600 hover:bg-purple-700 h-12 text-lg"
              disabled={saving}
            >
              <CheckCircle className="w-5 h-5 mr-2" />
              {saving ? 'Saving & Calculating...' : 'Submit Results'}
            </Button>
          </>
        )}

        {submissions.length === 0 && (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-zinc-400">No submissions for {currentYear} yet</p>
            </CardContent>
          </Card>
        )}
      </form>

      <BottomNav />
    </div>
  );
}
