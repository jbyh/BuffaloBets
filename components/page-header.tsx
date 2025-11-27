import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  variant?: 'default' | 'profile';
}

export function PageHeader({ icon: Icon, title, subtitle, variant = 'default' }: PageHeaderProps) {
  return (
    <div className={cn(
      "border-b border-zinc-800 px-6 py-5",
      variant === 'profile'
        ? "bg-zinc-900"
        : "bg-gradient-to-br from-amber-600 to-amber-700"
    )}>
      <div className="flex items-center gap-3">
        <div className={cn(
          "flex items-center justify-center flex-shrink-0",
          variant === 'profile'
            ? "w-10 h-10 bg-gradient-to-br from-amber-500 to-amber-700 rounded-full"
            : "w-10 h-10"
        )}>
          <Icon className={cn(
            "w-6 h-6",
            variant === 'profile' ? "text-white" : "text-white"
          )} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">{title}</h1>
          <p className={cn(
            "text-sm mt-0.5",
            variant === 'profile' ? "text-zinc-400" : "text-amber-100"
          )}>{subtitle}</p>
        </div>
      </div>
    </div>
  );
}
