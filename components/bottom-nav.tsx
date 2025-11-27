'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, FileText, Newspaper, TrendingUp, User, Bell, BellDot } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';

export function BottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [hasPendingRequests, setHasPendingRequests] = useState(false);

  useEffect(() => {
    if (user) {
      loadNotificationStatus();

      const channel = supabase
        .channel('notifications-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'buffalo_requests',
            filter: `recipient_id=eq.${user.id}`,
          },
          () => {
            loadNotificationStatus();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  async function loadNotificationStatus() {
    if (!user) return;

    const { data, count } = await supabase
      .from('buffalo_requests')
      .select('id', { count: 'exact', head: true })
      .eq('recipient_id', user.id)
      .eq('status', 'pending');

    setHasPendingRequests((count || 0) > 0);
  }

  const navItems = [
    { href: '/', icon: Home, label: 'Home' },
    { href: '/submit', icon: FileText, label: 'Submit' },
    { href: '/buffalo-board', icon: TrendingUp, label: 'Buffalo' },
    { href: '/feed', icon: Newspaper, label: 'Feed' },
    { href: '/notifications', icon: hasPendingRequests ? BellDot : Bell, label: 'Alerts', hasAlert: hasPendingRequests },
    { href: '/profile', icon: User, label: 'Profile' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-zinc-900/95 backdrop-blur-lg border-t border-zinc-800 z-50 safe-area-inset-bottom">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center flex-1 h-full transition-all duration-200 relative button-press',
                isActive
                  ? 'text-amber-500'
                  : item.hasAlert
                  ? 'text-amber-400 hover:text-amber-300'
                  : 'text-zinc-400 hover:text-zinc-300'
              )}
            >
              <Icon className={cn(
                'w-5 h-5 transition-transform',
                isActive && 'scale-110'
              )} />
              <span className="text-xs font-medium mt-1">{item.label}</span>
              {isActive && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-amber-500 rounded-t-full animate-scale-in shadow-[0_0_12px_rgba(245,158,11,0.6)]" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
