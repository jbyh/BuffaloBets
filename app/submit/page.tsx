'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { supabase, Submission } from '@/lib/supabase';
import { BottomNav } from '@/components/bottom-nav';
import { LoadingScreen } from '@/components/loading-screen';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Music, Mic2 } from 'lucide-react';
import { toast } from 'sonner';

export default function SubmitPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentYear] = useState(new Date().getFullYear());
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [artists, setArtists] = useState(['', '', '', '', '']);
  const [songs, setSongs] = useState(['', '', '', '', '']);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth');
    } else if (user) {
      loadSubmission();
    }
  }, [user, authLoading, router]);

  async function loadSubmission() {
    const { data } = await supabase
      .from('submissions')
      .select('*')
      .eq('user_id', user!.id)
      .eq('year', currentYear)
      .maybeSingle();

    if (data) {
      setSubmission(data);
      setArtists(data.artists);
      setSongs(data.songs);
    }

    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (artists.some(a => !a.trim()) || songs.some(s => !s.trim())) {
      toast.error('Please fill in all fields');
      return;
    }

    setSaving(true);

    const payload = {
      user_id: user!.id,
      year: currentYear,
      artists: artists.map(a => a.trim()),
      songs: songs.map(s => s.trim()),
    };

    const { error } = submission
      ? await supabase
          .from('submissions')
          .update(payload)
          .eq('id', submission.id)
      : await supabase.from('submissions').insert(payload);

    if (error) {
      toast.error('Failed to save submission');
      setSaving(false);
      return;
    }

    toast.success(submission ? 'Submission updated!' : 'Submission saved!');
    router.push('/');
    setSaving(false);
  }

  if (authLoading) {
    return <LoadingScreen />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Music className="w-8 h-8 text-amber-500 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 pb-16">
      <div className="bg-gradient-to-br from-amber-600 to-amber-700 border-b border-zinc-800 px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 flex items-center justify-center flex-shrink-0">
            <Music className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Submit Predictions</h1>
            <p className="text-sm mt-0.5 text-amber-100">Predict your {currentYear} Spotify Wrapped</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-4 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mic2 className="w-5 h-5 text-amber-500" />
              Top 5 Artists
            </CardTitle>
            <CardDescription>Rank your predicted top 5 artists in order</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {artists.map((artist, index) => (
              <div key={`artist-${index}`} className="space-y-2">
                <Label htmlFor={`artist-${index}`}>#{index + 1} Artist</Label>
                <Input
                  id={`artist-${index}`}
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
            <CardTitle className="flex items-center gap-2">
              <Music className="w-5 h-5 text-blue-500" />
              Top 5 Songs
            </CardTitle>
            <CardDescription>Rank your predicted top 5 songs in order</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {songs.map((song, index) => (
              <div key={`song-${index}`} className="space-y-2">
                <Label htmlFor={`song-${index}`}>#{index + 1} Song</Label>
                <Input
                  id={`song-${index}`}
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

        <div className="space-y-3">
          <Button
            type="submit"
            className="w-full bg-amber-600 hover:bg-amber-700 h-12 text-lg"
            disabled={saving}
          >
            {saving ? 'Saving...' : submission ? 'Update Submission' : 'Submit Predictions'}
          </Button>
          {submission && (
            <p className="text-sm text-zinc-500 text-center">
              Last updated: {new Date(submission.submitted_at).toLocaleString()}
            </p>
          )}
        </div>
      </form>

      <BottomNav />
    </div>
  );
}
