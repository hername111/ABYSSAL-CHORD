'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Swords,
  Library,
  Skull,
  Calculator,
  MessageSquare,
  Home,
  Users,
  Gamepad2,
  BookOpen,
  Sparkles,
} from 'lucide-react';

const navItems = [
  { href: '/', label: '主菜单', icon: Home },
  { href: '/battle', label: '对战', icon: Gamepad2 },
  { href: '/cards', label: '卡牌库', icon: BookOpen },
  { href: '/characters', label: '调音师', icon: Users },
  { href: '/enemies', label: '畸变体', icon: Skull },
  { href: '/calculator', label: '计算器', icon: Calculator },
  { href: '/agent', label: 'AI裁判', icon: Sparkles },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-sonic-purple/20 bg-abyss/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-sonic-purple/20 text-sonic-purple">
            <Swords className="h-4 w-4" />
          </div>
          <span className="font-display text-lg font-bold tracking-wide text-foreground">
            ABYSSAL CHORD
          </span>
        </Link>

        <div className="flex items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-all duration-200',
                  isActive
                    ? 'bg-sonic-purple/20 text-sonic-purple-light'
                    : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden md:inline">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
