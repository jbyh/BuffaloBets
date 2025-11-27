'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { supabase, BuffaloRequest, Profile } from '@/lib/supabase';
import { LoadingScreen } from '@/components/loading-screen';
import { BottomNav } from '@/components/bottom-nav';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, Beer, Check, X, User, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

type RequestWithProfile = BuffaloRequest & {
  requester: Profile;
};

export default function NotificationsPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [pendingRequests, setPendingRequests] = useState<RequestWithProfile[]>([]);
  const [pastRequests, setPastRequests] = useState<RequestWithProfile[]>([]);
  const [responding, setResponding] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth');
    } else if (user) {
      loadRequests();
    }
  }, [user, authLoading, router]);

  async function loadRequests() {
    const [pendingRes, pastRes] = await Promise.all([
      supabase
        .from('buffalo_requests')
        .select('*, requester:profiles!buffalo_requests_requester_id_fkey(*)')
        .eq('recipient_id', user!.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false }),
      supabase
        .from('buffalo_requests')
        .select('*, requester:profiles!buffalo_requests_requester_id_fkey(*)')
        .eq('recipient_id', user!.id)
        .in('status', ['accepted', 'declined'])
        .order('responded_at', { ascending: false })
        .limit(10),
    ]);

    if (pendingRes.data) setPendingRequests(pendingRes.data as any);
    if (pastRes.data) setPastRequests(pastRes.data as any);

    const { error: markReadError } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user!.id)
      .eq('type', 'buffalo_request')
      .eq('read', false);

    if (markReadError) {
      console.error('Failed to mark notifications as read:', markReadError);
    }

    setLoading(false);
  }

  async function handleRespond(requestId: string, accept: boolean) {
    if (!user || !profile) return;

    setResponding(requestId);

    const request = pendingRequests.find(r => r.id === requestId);
    if (!request) return;

    const { error: updateError } = await supabase
      .from('buffalo_requests')
      .update({
        status: accept ? 'accepted' : 'declined',
        responded_at: new Date().toISOString(),
      })
      .eq('id', requestId);

    if (updateError) {
      toast.error('Failed to respond to request');
      setResponding(null);
      return;
    }

    if (accept) {
      const currentYear = new Date().getFullYear();

      const { data: existingBalance, error: balanceCheckError } = await supabase
        .from('buffalo_balances')
        .select('*')
        .eq('caller_id', request.requester_id)
        .eq('recipient_id', user.id)
        .eq('year', currentYear)
        .maybeSingle();

      if (balanceCheckError) {
        console.error('Error checking balance:', balanceCheckError);
        toast.error('Failed to check buffalo balance');
        setResponding(null);
        return;
      }

      if (existingBalance) {
        const { error: updateError } = await supabase
          .from('buffalo_balances')
          .update({ balance: existingBalance.balance + 1 })
          .eq('id', existingBalance.id);

        if (updateError) {
          console.error('Error updating balance:', updateError);
          toast.error('Failed to update buffalo balance');
          setResponding(null);
          return;
        }
      } else {
        const { error: insertError } = await supabase.from('buffalo_balances').insert({
          year: currentYear,
          caller_id: request.requester_id,
          recipient_id: user.id,
          balance: 1,
        });

        if (insertError) {
          console.error('Error inserting balance:', insertError);
          toast.error('Failed to create buffalo balance');
          setResponding(null);
          return;
        }
      }

      const { error: feedError } = await supabase.from('feed_events').insert({
        event_type: 'buffalo_accepted',
        user_id: request.requester_id,
        related_user_id: user.id,
        year: currentYear,
        title: `${profile.display_name} accepted a buffalo from ${request.requester.display_name}`,
        description: request.note || 'Buffalo accepted!',
      });

      if (feedError) {
        console.error('Error creating feed event:', feedError);
      }

      toast.success(`Buffalo accepted! ${request.requester.display_name} now has a buffalo on you.`);
    } else {
      toast.success('Request declined');
    }

    setResponding(null);
    loadRequests();
  }

  if (authLoading || loading) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-zinc-950 pb-16">
      <div className="bg-gradient-to-br from-amber-600 to-amber-700 border-b border-zinc-800 px-6 py-5">
        <Button
          variant="ghost"
          size="sm"
          className="text-white hover:bg-white/20 mb-3 button-press -ml-2"
          onClick={() => router.back()}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 flex items-center justify-center flex-shrink-0">
            <Bell className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Notifications</h1>
            <p className="text-sm mt-0.5 text-amber-100">Buffalo requests & updates</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {pendingRequests.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Beer className="w-5 h-5 text-amber-500" />
                Pending Requests
                <Badge className="bg-amber-600">{pendingRequests.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {pendingRequests.map((request) => (
                <div
                  key={request.id}
                  className="p-4 bg-zinc-900 rounded-lg border border-amber-600/30 space-y-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="bg-amber-600 p-2 rounded-lg">
                      <User className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">
                        <span
                          className="text-amber-500 cursor-pointer hover:underline"
                          onClick={() => router.push(`/player/${request.requester_id}`)}
                        >
                          {request.requester.display_name}
                        </span>{' '}
                        wants to add a buffalo on you
                      </p>
                      {request.note && (
                        <p className="text-sm text-zinc-400 mt-1 italic">"{request.note}"</p>
                      )}
                      <p className="text-xs text-zinc-500 mt-1">
                        {new Date(request.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1 bg-green-600 hover:bg-green-700 button-press"
                      onClick={() => handleRespond(request.id, true)}
                      disabled={responding === request.id}
                    >
                      <Check className="w-4 h-4 mr-2" />
                      {responding === request.id ? 'Accepting...' : 'Accept'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 border-red-600 text-red-400 hover:bg-red-600/10 button-press"
                      onClick={() => handleRespond(request.id, false)}
                      disabled={responding === request.id}
                    >
                      <X className="w-4 h-4 mr-2" />
                      {responding === request.id ? 'Declining...' : 'Decline'}
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {pastRequests.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Past Requests</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {pastRequests.map((request) => (
                <div
                  key={request.id}
                  className="p-3 bg-zinc-900 rounded-lg border border-zinc-800"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm">
                        <span className="font-medium">{request.requester.display_name}</span>
                        {request.note && ` - "${request.note}"`}
                      </p>
                      <p className="text-xs text-zinc-500 mt-1">
                        {new Date(request.responded_at || request.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge
                      className={
                        request.status === 'accepted'
                          ? 'bg-green-600'
                          : 'bg-red-600'
                      }
                    >
                      {request.status === 'accepted' ? 'Accepted' : 'Declined'}
                    </Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {pendingRequests.length === 0 && pastRequests.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <Bell className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
              <p className="text-zinc-400">No notifications yet</p>
              <p className="text-sm text-zinc-500 mt-2">
                Buffalo requests will appear here
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
