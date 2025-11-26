'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { supabase, BuffaloCall, Profile, FeedEvent } from '@/lib/supabase';
import { BottomNav } from '@/components/bottom-nav';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Beer, Camera, Upload, Clock, Target, Trophy, Zap, AlertCircle, Play } from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';

type FeedItem = BuffaloCall & {
  caller: Profile;
  recipient: Profile;
};

export default function FeedPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const callRecipientId = searchParams?.get('call');

  const [loading, setLoading] = useState(true);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [feedEvents, setFeedEvents] = useState<Array<FeedEvent & { user: Profile; related_user?: Profile }>>([]);
  const [showCallDialog, setShowCallDialog] = useState(false);
  const [selectedRecipient, setSelectedRecipient] = useState<Profile | null>(null);
  const [uploadingCall, setUploadingCall] = useState<string | null>(null);
  const [currentYear] = useState(new Date().getFullYear());
  const [timerDuration, setTimerDuration] = useState('60');
  const [customMessage, setCustomMessage] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth');
    } else if (user) {
      loadFeed();
      if (callRecipientId) {
        loadRecipientAndShowDialog(callRecipientId);
      }
    }
  }, [user, authLoading, router, callRecipientId]);

  async function loadFeed() {
    const [buffaloCallsRes, eventsRes] = await Promise.all([
      supabase
        .from('buffalo_calls')
        .select('*, caller:profiles!buffalo_calls_caller_id_fkey(*), recipient:profiles!buffalo_calls_recipient_id_fkey(*)')
        .order('called_at', { ascending: false })
        .limit(50),
      supabase
        .from('feed_events')
        .select('*, user:profiles!feed_events_user_id_fkey(*), related_user:profiles!feed_events_related_user_id_fkey(*)')
        .order('created_at', { ascending: false })
        .limit(50)
    ]);

    if (buffaloCallsRes.data) setFeed(buffaloCallsRes.data as any);
    if (eventsRes.data) setFeedEvents(eventsRes.data as any);
    setLoading(false);
  }

  async function loadRecipientAndShowDialog(recipientId: string) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', recipientId)
      .maybeSingle();

    if (data) {
      setSelectedRecipient(data);
      setShowCallDialog(true);
    }
  }

  async function handleCallBuffalo() {
    if (!selectedRecipient) return;

    const { data: balance } = await supabase
      .from('buffalo_balances')
      .select('balance')
      .eq('caller_id', user!.id)
      .eq('recipient_id', selectedRecipient.id)
      .eq('year', currentYear)
      .maybeSingle();

    if (!balance || balance.balance <= 0) {
      toast.error('You have no buffalos on this person');
      return;
    }

    const deadline = new Date();
    deadline.setMinutes(deadline.getMinutes() + parseInt(timerDuration));

    const { error: insertError } = await supabase
      .from('buffalo_calls')
      .insert({
        caller_id: user!.id,
        recipient_id: selectedRecipient.id,
        year: currentYear,
        timer_deadline: deadline.toISOString(),
        status: 'pending',
        message: customMessage || null,
      });

    if (insertError) {
      toast.error('Failed to call buffalo');
      return;
    }

    const { error: updateError } = await supabase
      .from('buffalo_balances')
      .update({ balance: balance.balance - 1 })
      .eq('caller_id', user!.id)
      .eq('recipient_id', selectedRecipient.id)
      .eq('year', currentYear);

    if (updateError) {
      toast.error('Failed to update balance');
      return;
    }

    await supabase.from('feed_events').insert({
      event_type: 'buffalo_call',
      user_id: user!.id,
      related_user_id: selectedRecipient.id,
      year: currentYear,
      title: `${profile?.display_name} called buffalo on ${selectedRecipient.display_name}`,
      description: customMessage || 'Time to take a shot!',
    });

    toast.success(`Buffalo called on ${selectedRecipient.display_name}!`);
    setShowCallDialog(false);
    setCustomMessage('');
    setTimerDuration('60');
    loadFeed();
    router.push('/feed');
  }

  async function handleMediaUpload(callId: string, file: File) {
    setUploadingCall(callId);

    const fileExt = file.name.split('.').pop();
    const fileName = `${user!.id}-${Date.now()}.${fileExt}`;
    const isVideo = file.type.startsWith('video/');

    const { error: uploadError } = await supabase.storage
      .from('buffalo-shots')
      .upload(fileName, file);

    if (uploadError) {
      toast.error(`Failed to upload ${isVideo ? 'video' : 'photo'}`);
      setUploadingCall(null);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('buffalo-shots')
      .getPublicUrl(fileName);

    const updateData: any = {
      photo_uploaded_at: new Date().toISOString(),
      status: 'completed',
    };

    if (isVideo) {
      updateData.video_url = publicUrl;
    } else {
      updateData.photo_url = publicUrl;
    }

    const { error: updateError } = await supabase
      .from('buffalo_calls')
      .update(updateData)
      .eq('id', callId);

    if (updateError) {
      toast.error('Failed to update proof');
      setUploadingCall(null);
      return;
    }

    toast.success('Proof uploaded!');
    setUploadingCall(null);
    loadFeed();
  }

  const getTimeRemaining = (deadline: string | null) => {
    if (!deadline) return null;
    const now = new Date().getTime();
    const end = new Date(deadline).getTime();
    const diff = end - now;

    if (diff <= 0) return 'Expired';

    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);

    if (minutes > 60) {
      const hours = Math.floor(minutes / 60);
      return `${hours}h ${minutes % 60}m`;
    }

    return `${minutes}m ${seconds}s`;
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'submission': return <Target className="w-4 h-4" />;
      case 'buffalo_call': return <Beer className="w-4 h-4" />;
      case 'result': return <Trophy className="w-4 h-4" />;
      default: return <Zap className="w-4 h-4" />;
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <p className="text-zinc-400">Loading...</p>
      </div>
    );
  }

  const allActivity = [
    ...feed.map(item => ({ ...item, type: 'buffalo_call' as const, timestamp: item.called_at })),
    ...feedEvents.map(event => ({ ...event, type: event.event_type, timestamp: event.created_at }))
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const filteredActivity = activeTab === 'all' ? allActivity :
    activeTab === 'buffalos' ? feed :
    allActivity.filter(a => a.type === activeTab);

  return (
    <div className="min-h-screen bg-zinc-950 pb-24">
      <div className="gradient-animate text-white p-6">
        <h1 className="text-3xl font-bold mb-2">Activity Feed</h1>
        <p className="text-amber-100">All the action in one place</p>
      </div>

      <div className="p-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mb-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="buffalos">Buffalos</TabsTrigger>
            <TabsTrigger value="submission">Submissions</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="space-y-4">
          {activeTab === 'buffalos' || activeTab === 'all' ? (
            feed.map((item) => {
              const timeRemaining = getTimeRemaining(item.timer_deadline || null);
              const isExpired = timeRemaining === 'Expired';
              const isPending = item.status === 'pending' && !isExpired;

              return (
                <Card key={item.id} className="card-hover animate-slide-up">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${isPending ? 'bg-amber-600 animate-pulse-slow' : 'bg-amber-600'}`}>
                        <Beer className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">
                          {item.caller.display_name} called buffalo on {item.recipient.display_name}
                        </p>
                        <p className="text-sm text-zinc-400">
                          {new Date(item.called_at).toLocaleString()}
                        </p>
                        {item.message && (
                          <p className="text-sm text-zinc-300 mt-1 italic">"{item.message}"</p>
                        )}
                      </div>
                    </div>

                    {isPending && timeRemaining && (
                      <div className="bg-amber-600/20 border border-amber-600/50 rounded-lg p-3 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-amber-400" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-amber-300">Time Remaining</p>
                          <p className="text-lg font-bold text-amber-400">{timeRemaining}</p>
                        </div>
                      </div>
                    )}

                    {isExpired && !item.photo_url && !item.video_url && (
                      <div className="bg-red-600/20 border border-red-600/50 rounded-lg p-3 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-red-400" />
                        <p className="text-sm text-red-300">Time expired - No proof uploaded</p>
                      </div>
                    )}

                    {(item.photo_url || item.video_url) ? (
                      <div className="rounded-lg overflow-hidden border border-zinc-800">
                        {item.video_url ? (
                          <video
                            src={item.video_url}
                            controls
                            className="w-full max-h-96"
                          >
                            Your browser does not support video playback.
                          </video>
                        ) : item.photo_url ? (
                          <Image
                            src={item.photo_url}
                            alt="Shot proof"
                            width={400}
                            height={400}
                            className="w-full h-auto"
                          />
                        ) : null}
                        <div className="bg-zinc-900 p-2">
                          <p className="text-xs text-zinc-500">
                            Proof uploaded {new Date(item.photo_uploaded_at!).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ) : item.recipient_id === user?.id ? (
                      <div className="bg-zinc-900 rounded-lg p-4 text-center border border-zinc-800">
                        <Camera className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                        <p className="text-sm text-zinc-400 mb-3">Upload proof you took the shot</p>
                        <input
                          type="file"
                          accept="image/*,video/*"
                          id={`upload-${item.id}`}
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleMediaUpload(item.id, file);
                          }}
                          disabled={uploadingCall === item.id}
                        />
                        <Button
                          size="sm"
                          className="bg-amber-600 hover:bg-amber-700 button-press"
                          onClick={() => document.getElementById(`upload-${item.id}`)?.click()}
                          disabled={uploadingCall === item.id}
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          {uploadingCall === item.id ? 'Uploading...' : 'Upload Photo/Video'}
                        </Button>
                      </div>
                    ) : (
                      <div className="bg-zinc-900 rounded-lg p-4 text-center border border-zinc-800">
                        <p className="text-sm text-zinc-400">Waiting for proof...</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          ) : null}

          {(activeTab === 'submission' || activeTab === 'all') && feedEvents
            .filter(e => activeTab === 'all' || e.event_type === activeTab)
            .map((event) => (
              <Card key={event.id} className="card-hover animate-slide-up">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="bg-blue-600 p-2 rounded-lg">
                      {getEventIcon(event.event_type)}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{event.title}</p>
                      {event.description && (
                        <p className="text-sm text-zinc-400 mt-1">{event.description}</p>
                      )}
                      <p className="text-xs text-zinc-500 mt-2">
                        {new Date(event.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

          {filteredActivity.length === 0 && (
            <Card>
              <CardContent className="text-center py-12">
                <Beer className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
                <p className="text-zinc-400">No activity yet</p>
                <p className="text-sm text-zinc-500 mt-2">
                  Activity will appear here as the competition progresses
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Dialog open={showCallDialog} onOpenChange={setShowCallDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Call Buffalo on {selectedRecipient?.display_name}</DialogTitle>
            <DialogDescription>
              They'll need to upload proof within the time limit
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="timer">Time Limit (minutes)</Label>
              <Input
                id="timer"
                type="number"
                value={timerDuration}
                onChange={(e) => setTimerDuration(e.target.value)}
                min="1"
                max="1440"
                placeholder="60"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">Message (optional)</Label>
              <Input
                id="message"
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder="Add a message..."
                maxLength={200}
              />
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowCallDialog(false);
                  setCustomMessage('');
                  setTimerDuration('60');
                }}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-amber-600 hover:bg-amber-700 button-press"
                onClick={handleCallBuffalo}
              >
                <Beer className="w-4 h-4 mr-2" />
                Call Buffalo
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
}
