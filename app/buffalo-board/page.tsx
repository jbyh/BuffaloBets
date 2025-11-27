'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { supabase, Profile, BuffaloBalance } from '@/lib/supabase';
import { BottomNav } from '@/components/bottom-nav';
import { LoadingScreen } from '@/components/loading-screen';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Beer, TrendingUp, List, Grid3x3 } from 'lucide-react';

type BuffaloRelationship = BuffaloBalance & {
  caller: Profile;
  recipient: Profile;
};

export default function BuffaloBoardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [currentYear] = useState(new Date().getFullYear());
  const [allBalances, setAllBalances] = useState<BuffaloRelationship[]>([]);
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth');
    } else if (user) {
      loadData();

      const channel = supabase
        .channel('buffalo-board-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'buffalo_balances',
          },
          () => {
            loadData();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, authLoading, router]);

  async function loadData() {
    const [balancesRes, profilesRes] = await Promise.all([
      supabase
        .from('buffalo_balances')
        .select('*, caller:profiles!buffalo_balances_caller_id_fkey(*), recipient:profiles!buffalo_balances_recipient_id_fkey(*)')
        .eq('year', currentYear)
        .gt('balance', 0),
      supabase.from('profiles').select('*').order('display_name')
    ]);

    if (balancesRes.data) setAllBalances(balancesRes.data as any);
    if (profilesRes.data) setAllProfiles(profilesRes.data);
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

  const getBuffalosBetween = (callerId: string, recipientId: string) => {
    const balance = allBalances.find(
      b => b.caller_id === callerId && b.recipient_id === recipientId
    );
    return balance?.balance || 0;
  };

  const getPlayerTotals = (playerId: string) => {
    const canCall = allBalances
      .filter(b => b.caller_id === playerId)
      .reduce((sum, b) => sum + b.balance, 0);
    const owes = allBalances
      .filter(b => b.recipient_id === playerId)
      .reduce((sum, b) => sum + b.balance, 0);
    return { canCall, owes };
  };

  const sortedPlayers = [...allProfiles].sort((a, b) => {
    const aTotals = getPlayerTotals(a.id);
    const bTotals = getPlayerTotals(b.id);
    return bTotals.canCall - aTotals.canCall;
  });

  return (
    <div className="min-h-screen bg-zinc-950 pb-16">
      <div className="bg-gradient-to-br from-amber-600 to-amber-700 border-b border-zinc-800 px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 flex items-center justify-center flex-shrink-0">
            <TrendingUp className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Buffalo Billables</h1>
            <p className="text-sm mt-0.5 text-amber-100">Who has buffalos on whom</p>
          </div>
        </div>
      </div>

      <div className="p-4">
        <Tabs defaultValue="list" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="list">
              <List className="w-4 h-4 mr-2" />
              List View
            </TabsTrigger>
            <TabsTrigger value="matrix">
              <Grid3x3 className="w-4 h-4 mr-2" />
              Matrix View
            </TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="space-y-3">
            {sortedPlayers.map((player) => {
              const totals = getPlayerTotals(player.id);
              const relationships = allBalances.filter(
                b => b.caller_id === player.id || b.recipient_id === player.id
              );
              const isExpanded = selectedPlayer === player.id;
              const isCurrentUser = player.id === user?.id;

              return (
                <Card
                  key={player.id}
                  className={`card-hover ${isCurrentUser ? 'border-amber-600/50' : ''}`}
                >
                  <CardHeader className="pb-3">
                    <div
                      className="flex items-center justify-between cursor-pointer"
                      onClick={() => setSelectedPlayer(isExpanded ? null : player.id)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="bg-amber-600 p-3 rounded-full">
                          <Beer className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">
                            <span
                              className="cursor-pointer hover:text-amber-500 transition-colors"
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/player/${player.id}`);
                              }}
                            >
                              {player.display_name}
                            </span>
                            {isCurrentUser && (
                              <span className="text-sm text-amber-500 ml-2">(You)</span>
                            )}
                          </CardTitle>
                          <div className="flex gap-4 mt-1">
                            <p className="text-sm text-green-400">
                              {totals.canCall} can call
                            </p>
                            <p className="text-sm text-red-400">
                              {totals.owes} owes
                            </p>
                          </div>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">
                        {isExpanded ? '−' : '+'}
                      </Button>
                    </div>
                  </CardHeader>

                  {isExpanded && (
                    <CardContent className="pt-0 space-y-3">
                      {allBalances
                        .filter(b => b.caller_id === player.id)
                        .map(balance => (
                          <div
                            key={balance.id}
                            className="flex items-center justify-between p-3 bg-green-600/10 border border-green-600/30 rounded-lg"
                          >
                            <div>
                              <p className="font-medium">→ {balance.recipient.display_name}</p>
                              <p className="text-sm text-zinc-400">
                                Can call {balance.balance} buffalo{balance.balance !== 1 ? 's' : ''}
                              </p>
                            </div>
                            {isCurrentUser && (
                              <Button
                                size="sm"
                                className="bg-amber-600 hover:bg-amber-700 button-press"
                                onClick={() => router.push(`/feed?call=${balance.recipient_id}`)}
                              >
                                Call
                              </Button>
                            )}
                          </div>
                        ))}

                      {allBalances
                        .filter(b => b.recipient_id === player.id)
                        .map(balance => (
                          <div
                            key={balance.id}
                            className="flex items-center justify-between p-3 bg-red-600/10 border border-red-600/30 rounded-lg"
                          >
                            <div>
                              <p className="font-medium">← {balance.caller.display_name}</p>
                              <p className="text-sm text-zinc-400">
                                Owes {balance.balance} buffalo{balance.balance !== 1 ? 's' : ''}
                              </p>
                            </div>
                          </div>
                        ))}

                      {relationships.length === 0 && (
                        <p className="text-sm text-zinc-400 text-center py-4">
                          No buffalo relationships
                        </p>
                      )}
                    </CardContent>
                  )}
                </Card>
              );
            })}

            {allBalances.length === 0 && (
              <Card>
                <CardContent className="text-center py-12">
                  <Beer className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
                  <p className="text-zinc-400">No buffalos yet this year</p>
                  <p className="text-sm text-zinc-500 mt-2">
                    Buffalos will appear after results are calculated
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="matrix" className="space-y-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-left p-2 text-zinc-400 font-medium">Caller →</th>
                    {allProfiles.map(profile => (
                      <th
                        key={profile.id}
                        className="p-2 text-center text-zinc-400 font-medium min-w-[80px]"
                      >
                        {profile.display_name.split(' ')[0]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {allProfiles.map(caller => (
                    <tr key={caller.id}>
                      <td className="p-2 font-medium text-zinc-300">
                        {caller.display_name}
                      </td>
                      {allProfiles.map(recipient => {
                        if (caller.id === recipient.id) {
                          return (
                            <td key={recipient.id} className="p-2 text-center">
                              <div className="w-12 h-12 bg-zinc-800 rounded flex items-center justify-center mx-auto">
                                −
                              </div>
                            </td>
                          );
                        }

                        const count = getBuffalosBetween(caller.id, recipient.id);
                        const isUserInvolved = caller.id === user?.id || recipient.id === user?.id;

                        return (
                          <td key={recipient.id} className="p-2 text-center">
                            <div
                              className={`w-12 h-12 rounded flex items-center justify-center mx-auto font-bold ${
                                count > 0
                                  ? isUserInvolved && caller.id === user?.id
                                    ? 'bg-green-600/20 border border-green-600 text-green-400'
                                    : isUserInvolved && recipient.id === user?.id
                                    ? 'bg-red-600/20 border border-red-600 text-red-400'
                                    : 'bg-blue-600/20 border border-blue-600 text-blue-400'
                                  : 'bg-zinc-800/50 text-zinc-600'
                              }`}
                            >
                              {count || '0'}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Legend</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-600/20 border border-green-600 rounded" />
                  <p className="text-zinc-300">Buffalos you can call</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-red-600/20 border border-red-600 rounded" />
                  <p className="text-zinc-300">Buffalos you owe</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-600/20 border border-blue-600 rounded" />
                  <p className="text-zinc-300">Other relationships</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <BottomNav />
    </div>
  );
}
