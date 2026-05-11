'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home, Camera, TrendingUp, Wallet, BarChart2, Calculator, MessageCircle, User, Sun, Moon
} from 'lucide-react';
import { useTheme } from 'next-themes';

const NAV_ITEMS = [
  { label: 'Home', href: '/home', icon: Home },
  { label: 'Math', href: '/math', icon: Camera },
  { label: 'Portfolio', href: '/portfolio', icon: TrendingUp },
  { label: 'Budget', href: '/budget', icon: Wallet },
  { label: 'Stats', href: '/stats', icon: BarChart2 },
  { label: 'Finance', href: '/finance', icon: Calculator },
  { label: 'AI Chat', href: '/assistant', icon: MessageCircle },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar (desktop) */}
      <aside className="hidden w-60 flex-shrink-0 flex-col border-r bg-card lg:flex">
        <div className="flex h-16 items-center gap-2 px-5 border-b">
          <div className="h-7 w-7 rounded-lg bg-brand-500 flex items-center justify-center">
            <span className="text-white text-xs font-bold">S</span>
          </div>
          <span className="font-bold text-lg">SolveSphere</span>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  active ? 'bg-brand-500 text-white' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <item.icon className="h-4 w-4 flex-shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t p-3 space-y-1">
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          </button>
          <Link
            href="/profile"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <User className="h-4 w-4" />
            Profile & Settings
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</main>

        {/* Bottom nav (mobile) */}
        <nav className="flex border-t bg-card lg:hidden">
          {NAV_ITEMS.slice(0, 5).map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-1 flex-col items-center gap-1 py-3 text-xs transition-colors ${
                  active ? 'text-brand-500' : 'text-muted-foreground'
                }`}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
