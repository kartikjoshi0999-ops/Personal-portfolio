import { Suspense } from 'react';
import { Camera, Receipt, Plus, MessageCircle, TrendingUp, TrendingDown } from 'lucide-react';
import Link from 'next/link';

const QuickActions = [
  { label: 'Scan Math', icon: Camera, href: '/math', color: 'bg-blue-500', desc: 'Solve problems with camera' },
  { label: 'Scan Receipt', icon: Receipt, href: '/budget/scan', color: 'bg-green-500', desc: 'Extract & categorize' },
  { label: 'Add Transaction', icon: Plus, href: '/budget/add', color: 'bg-violet-500', desc: 'Log expense or income' },
  { label: 'Ask AI', icon: MessageCircle, href: '/assistant', color: 'bg-orange-500', desc: 'Chat with your advisor' },
];

// This page uses server components to fetch data
export default async function HomePage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Good morning 👋</h1>
        <p className="text-muted-foreground">Here's your financial overview</p>
      </div>

      {/* Net Worth Widget */}
      <Suspense fallback={<NetWorthSkeleton />}>
        <NetWorthCard />
      </Suspense>

      {/* Quick Actions */}
      <section>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {QuickActions.map((action) => (
            <Link key={action.label} href={action.href} className="group rounded-2xl border bg-card p-4 transition-all hover:shadow-md hover:border-brand-300">
              <div className={`mb-3 inline-flex rounded-xl p-2.5 ${action.color}`}>
                <action.icon className="h-5 w-5 text-white" />
              </div>
              <p className="font-medium text-sm">{action.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{action.desc}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Market Summary */}
      <section className="rounded-2xl border bg-card p-5">
        <h2 className="mb-4 font-semibold">Today's Markets</h2>
        <div className="grid grid-cols-3 gap-4 sm:grid-cols-6">
          {[
            { name: 'S&P 500', value: '5,918.72', change: '+0.53%', up: true },
            { name: 'NASDAQ', value: '19,310.79', change: '+0.82%', up: true },
            { name: 'TSX', value: '25,124.11', change: '-0.21%', up: false },
            { name: 'BTC', value: '$98,450', change: '+1.34%', up: true },
            { name: 'ETH', value: '$3,840', change: '-0.67%', up: false },
            { name: 'USD/CAD', value: '1.3821', change: '+0.09%', up: true },
          ].map((m) => (
            <div key={m.name} className="text-center">
              <p className="text-xs text-muted-foreground">{m.name}</p>
              <p className="text-sm font-semibold mt-0.5">{m.value}</p>
              <p className={`text-xs flex items-center justify-center gap-0.5 ${m.up ? 'text-green-600' : 'text-red-500'}`}>
                {m.up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {m.change}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Recent Activity */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold">Recent Transactions</h2>
          <Link href="/budget" className="text-sm text-brand-500 hover:underline">View all</Link>
        </div>
        <div className="rounded-2xl border bg-card divide-y">
          {[
            { merchant: 'Whole Foods', category: '🍔 Food', amount: -87.42, date: 'Today' },
            { merchant: 'Shell Gas Station', category: '🚗 Transport', amount: -65.00, date: 'Yesterday' },
            { merchant: 'Netflix', category: '📦 Subscriptions', amount: -15.49, date: 'Dec 1' },
            { merchant: 'Employer Inc', category: '💰 Salary', amount: 3500.00, date: 'Dec 1' },
          ].map((tx, i) => (
            <div key={i} className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="text-xl">{tx.category.split(' ')[0]}</span>
                <div>
                  <p className="text-sm font-medium">{tx.merchant}</p>
                  <p className="text-xs text-muted-foreground">{tx.category.slice(3)} · {tx.date}</p>
                </div>
              </div>
              <p className={`text-sm font-semibold ${tx.amount > 0 ? 'text-green-600' : 'text-foreground'}`}>
                {tx.amount > 0 ? '+' : ''}{tx.amount.toFixed(2)}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

async function NetWorthCard() {
  // In production this would use server-side tRPC
  const netWorth = 47_832.50;
  const change = 1243.21;
  const changePct = 2.67;

  return (
    <div className="rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 p-6 text-white shadow-lg">
      <p className="text-sm font-medium text-brand-100">Net Worth</p>
      <p className="mt-1 text-4xl font-bold">${netWorth.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
      <p className="mt-2 flex items-center gap-1 text-sm text-brand-100">
        <TrendingUp className="h-4 w-4" />
        +${change.toLocaleString()} ({changePct}%) this month
      </p>
      <div className="mt-5 grid grid-cols-3 gap-4 border-t border-brand-400 pt-4">
        <div>
          <p className="text-xs text-brand-200">Assets</p>
          <p className="font-semibold">$62,450</p>
        </div>
        <div>
          <p className="text-xs text-brand-200">Liabilities</p>
          <p className="font-semibold">$14,617</p>
        </div>
        <div>
          <p className="text-xs text-brand-200">Portfolio</p>
          <p className="font-semibold">$31,200</p>
        </div>
      </div>
    </div>
  );
}

function NetWorthSkeleton() {
  return (
    <div className="rounded-2xl bg-muted p-6 animate-pulse">
      <div className="h-4 w-24 rounded bg-muted-foreground/20 mb-2" />
      <div className="h-10 w-48 rounded bg-muted-foreground/20 mb-4" />
      <div className="h-4 w-36 rounded bg-muted-foreground/20" />
    </div>
  );
}
