'use client';

import { useState } from 'react';
import { Plus, Receipt, TrendingDown, PieChart, Bell } from 'lucide-react';
import { CATEGORY_LABELS, CATEGORY_ICONS } from '@solvesphere/shared';

interface CategoryProgress {
  category: string;
  limitAmount: number;
  spent: number;
  remaining: number;
  pct: number;
  isOverBudget: boolean;
  isNearLimit: boolean;
}

// Demo data (in production: fetched from tRPC)
const DEMO_PROGRESS: CategoryProgress[] = [
  { category: 'FOOD_DINING', limitAmount: 600, spent: 487.32, remaining: 112.68, pct: 0.812, isOverBudget: false, isNearLimit: true },
  { category: 'TRANSPORT', limitAmount: 300, spent: 142.50, remaining: 157.50, pct: 0.475, isOverBudget: false, isNearLimit: false },
  { category: 'RENT_MORTGAGE', limitAmount: 2000, spent: 2000, remaining: 0, pct: 1.0, isOverBudget: false, isNearLimit: false },
  { category: 'ENTERTAINMENT', limitAmount: 150, spent: 178.99, remaining: 0, pct: 1.193, isOverBudget: true, isNearLimit: false },
  { category: 'SUBSCRIPTIONS', limitAmount: 80, spent: 45.97, remaining: 34.03, pct: 0.574, isOverBudget: false, isNearLimit: false },
  { category: 'HEALTHCARE', limitAmount: 200, spent: 0, remaining: 200, pct: 0, isOverBudget: false, isNearLimit: false },
];

export default function BudgetPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'goals'>('overview');

  const totalBudget = DEMO_PROGRESS.reduce((s, c) => s + c.limitAmount, 0);
  const totalSpent = DEMO_PROGRESS.reduce((s, c) => s + c.spent, 0);
  const overBudgetCount = DEMO_PROGRESS.filter((c) => c.isOverBudget).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Budget & Expenses</h1>
          <p className="text-sm text-muted-foreground">December 2024</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm hover:bg-muted transition-colors">
            <Receipt className="h-4 w-4" /> Scan Receipt
          </button>
          <button className="flex items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-2 text-sm text-white hover:bg-brand-600 transition-colors">
            <Plus className="h-4 w-4" /> Add
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Total Budget', value: `$${totalBudget.toLocaleString()}`, icon: PieChart, color: 'text-brand-500' },
          { label: 'Total Spent', value: `$${totalSpent.toFixed(0)}`, icon: TrendingDown, color: 'text-orange-500' },
          { label: 'Remaining', value: `$${(totalBudget - totalSpent).toFixed(0)}`, icon: TrendingDown, color: 'text-green-500' },
          { label: 'Over Budget', value: `${overBudgetCount} categories`, icon: Bell, color: 'text-red-500' },
        ].map((card) => (
          <div key={card.label} className="rounded-xl border bg-card p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground">{card.label}</p>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </div>
            <p className="text-xl font-bold">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Budget progress bar (overall) */}
      <div className="rounded-xl border bg-card p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium">Monthly Budget Progress</span>
          <span className="text-sm text-muted-foreground">${totalSpent.toFixed(0)} / ${totalBudget.toLocaleString()}</span>
        </div>
        <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${totalSpent / totalBudget > 1 ? 'bg-red-500' : totalSpent / totalBudget > 0.8 ? 'bg-orange-400' : 'bg-brand-500'}`}
            style={{ width: `${Math.min((totalSpent / totalBudget) * 100, 100)}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">{((totalSpent / totalBudget) * 100).toFixed(1)}% used · {Math.ceil(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate() - new Date().getDate())} days left in month</p>
      </div>

      {/* Category breakdown */}
      <div className="space-y-3">
        <h2 className="font-semibold">By Category</h2>
        {DEMO_PROGRESS.map((cat) => (
          <div key={cat.category} className="rounded-xl border bg-card p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">{CATEGORY_ICONS[cat.category] ?? '📋'}</span>
                <div>
                  <p className="text-sm font-medium">{CATEGORY_LABELS[cat.category] ?? cat.category}</p>
                  <p className="text-xs text-muted-foreground">${cat.spent.toFixed(2)} of ${cat.limitAmount.toFixed(2)}</p>
                </div>
              </div>
              <div className="text-right">
                <p className={`text-sm font-semibold ${cat.isOverBudget ? 'text-red-500' : cat.isNearLimit ? 'text-orange-500' : 'text-green-600'}`}>
                  {cat.isOverBudget ? `+$${(cat.spent - cat.limitAmount).toFixed(2)} over` : `$${cat.remaining.toFixed(2)} left`}
                </p>
                <p className="text-xs text-muted-foreground">{(cat.pct * 100).toFixed(0)}%</p>
              </div>
            </div>
            <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${cat.isOverBudget ? 'bg-red-500' : cat.isNearLimit ? 'bg-orange-400' : 'bg-brand-500'}`}
                style={{ width: `${Math.min(cat.pct * 100, 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* AI Insight */}
      <div className="rounded-2xl border border-brand-200 bg-brand-50 p-5 dark:border-brand-800 dark:bg-brand-950">
        <div className="flex items-start gap-3">
          <span className="text-2xl">🤖</span>
          <div>
            <p className="text-sm font-semibold text-brand-800 dark:text-brand-200 mb-1">AI Spending Insight</p>
            <p className="text-sm text-brand-700 dark:text-brand-300">
              Your food spending ($487) is 81% of your $600 budget with 9 days left in December — you're on track.
              Entertainment exceeded budget by $29 — consider pausing one streaming service.
              You're saving approximately 18% of your income this month, which is excellent! 🎉
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
