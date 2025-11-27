'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, FileText, Newspaper, TrendingUp, User, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';

export function BottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [notificationCount, setNotificationCount] = useState(0);

  useEffect(() => {
    if (user) {
      loadNotificationCount();

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
            loadNotificationCount();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  async function loadNotificationCount() {
    if (!user) return;

    const { data } = await supabase
      .from('buffalo_requests')
      .select('id', { count: 'exact', head: true })
      .eq('recipient_id', user.id)
      .eq('status', 'pending');

    setNotificationCount(data?.length || 0);
  }

  const navItems = [
    { href: '/', icon: Home, label: 'Home' },
    { href: '/submit', icon: FileText, label: 'Submit' },
    { href: '/buffalo-board', icon: TrendingUp, label: 'Buffalo' },
    { href: '/feed', icon: Newspaper, label: 'Feed' },
    { href: '/notifications', icon: Bell, label: 'Alerts', badge: notificationCount },
    { href: '/profile', icon: User, label: 'Profile' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-zinc-900/95 backdrop-blur-lg border-t border-zinc-800 pb-safe z-50">
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
                  : 'text-zinc-400 hover:text-zinc-300'
              )}
            >
              {isActive && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-amber-500 rounded-b-full animate-scale-in" />
              )}
              <div className="relative inline-block">
                <Icon className={cn(
                  'w-5 h-5 transition-transform',
                  isActive && 'scale-110'
                )} />
                {item.badge && item.badge > 0 && (
                  <div className="absolute -top-2 -right-2 bg-red-600 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center">
                    {item.badge > 9 ? '9+' : item.badge}
                  </div>
                )}
              </div>
              <span className="text-xs font-medium mt-1">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
