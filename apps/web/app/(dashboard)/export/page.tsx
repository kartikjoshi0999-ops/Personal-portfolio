'use client';

import { useState } from 'react';
import {
  Download, FileJson, FileSpreadsheet, Loader2,
  CheckCircle, Database, Brain, TrendingUp, Wallet, Target, CreditCard
} from 'lucide-react';

type ExportFormat = 'json' | 'csv';
type ExportType = 'all' | 'transactions' | 'math' | 'portfolio' | 'budget' | 'goals';

interface ExportOption {
  type: ExportType;
  label: string;
  description: string;
  icon: React.ElementType;
  formats: ExportFormat[];
  color: string;
  bg: string;
}

const EXPORT_OPTIONS: ExportOption[] = [
  {
    type: 'all',
    label: 'Full Data Export',
    description: 'Everything — transactions, math history, portfolios, goals, budgets.',
    icon: Database,
    formats: ['json'],
    color: 'text-brand-600',
    bg: 'bg-brand-50 dark:bg-brand-950',
  },
  {
    type: 'transactions',
    label: 'Transactions',
    description: 'All income and expense records with categories, dates, and amounts.',
    icon: Wallet,
    formats: ['json', 'csv'],
    color: 'text-green-600',
    bg: 'bg-green-50 dark:bg-green-950',
  },
  {
    type: 'math',
    label: 'Math History',
    description: 'Saved math problems with LaTeX, step-by-step solutions, and tags.',
    icon: Brain,
    formats: ['json', 'csv'],
    color: 'text-violet-600',
    bg: 'bg-violet-50 dark:bg-violet-950',
  },
  {
    type: 'portfolio',
    label: 'Portfolio Holdings',
    description: 'All portfolios with holdings, cost basis, shares, and asset classes.',
    icon: TrendingUp,
    formats: ['json', 'csv'],
    color: 'text-orange-600',
    bg: 'bg-orange-50 dark:bg-orange-950',
  },
  {
    type: 'goals',
    label: 'Goals & Debts',
    description: 'Savings goals and debt records with balances and progress.',
    icon: Target,
    formats: ['json', 'csv'],
    color: 'text-pink-600',
    bg: 'bg-pink-50 dark:bg-pink-950',
  },
  {
    type: 'budget',
    label: 'Budgets',
    description: 'Budget categories, limits, and periods.',
    icon: CreditCard,
    formats: ['json'],
    color: 'text-slate-600',
    bg: 'bg-slate-50 dark:bg-slate-950',
  },
];

export default function ExportPage() {
  const [downloading, setDownloading] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const handleExport = async (type: ExportType, format: ExportFormat) => {
    const key = `${type}-${format}`;
    setDownloading(key);
    setDone(null);

    try {
      const res = await fetch(`/api/export?type=${type}&format=${format}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'Export failed');
      }

      // Trigger browser download from the response blob
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      // Pull filename from Content-Disposition header
      const cd = res.headers.get('Content-Disposition') ?? '';
      const match = cd.match(/filename="([^"]+)"/);
      a.download = match?.[1] ?? `solvesphere-${type}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      setDone(key);
      setTimeout(() => setDone(null), 3000);
    } catch (err: any) {
      alert(err.message ?? 'Download failed');
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Export Your Data</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Download your SolveSphere data as JSON or CSV. GDPR &amp; PIPEDA compliant.
          No data is sent to third parties.
        </p>
      </div>

      {/* Notice */}
      <div className="flex gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950">
        <Database className="h-5 w-5 flex-shrink-0 text-blue-600 mt-0.5" />
        <div className="text-sm text-blue-800 dark:text-blue-200">
          <p className="font-semibold mb-0.5">Your data, your device</p>
          <p>Files are generated server-side and sent directly to your browser — nothing is uploaded to external storage. You can import JSON back at any time.</p>
        </div>
      </div>

      {/* Export cards */}
      <div className="grid gap-4">
        {EXPORT_OPTIONS.map((opt) => (
          <div key={opt.type} className="rounded-2xl border bg-card p-5">
            <div className="flex items-start gap-4">
              {/* Icon */}
              <div className={`flex-shrink-0 rounded-xl p-3 ${opt.bg}`}>
                <opt.icon className={`h-5 w-5 ${opt.color}`} />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold">{opt.label}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">{opt.description}</p>
              </div>

              {/* Buttons */}
              <div className="flex flex-shrink-0 items-center gap-2">
                {opt.formats.map((fmt) => {
                  const key = `${opt.type}-${fmt}`;
                  const isLoading = downloading === key;
                  const isDone = done === key;

                  return (
                    <button
                      key={fmt}
                      onClick={() => handleExport(opt.type, fmt)}
                      disabled={isLoading || !!downloading}
                      className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-all disabled:opacity-50
                        ${isDone
                          ? 'border-green-300 bg-green-50 text-green-700 dark:border-green-700 dark:bg-green-950 dark:text-green-300'
                          : 'hover:bg-muted'
                        }`}
                    >
                      {isLoading ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : isDone ? (
                        <CheckCircle className="h-3.5 w-3.5" />
                      ) : fmt === 'csv' ? (
                        <FileSpreadsheet className="h-3.5 w-3.5" />
                      ) : (
                        <FileJson className="h-3.5 w-3.5" />
                      )}
                      {isDone ? 'Saved!' : fmt.toUpperCase()}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Format guide */}
      <div className="rounded-2xl border bg-card p-5 space-y-3">
        <h2 className="font-semibold text-sm">Format guide</h2>
        <div className="grid gap-3 sm:grid-cols-2 text-sm">
          <div className="flex gap-3">
            <FileJson className="h-5 w-5 flex-shrink-0 text-brand-500 mt-0.5" />
            <div>
              <p className="font-medium">JSON</p>
              <p className="text-muted-foreground text-xs mt-0.5">
                Full fidelity — all fields, nested records, exact types. Best for backup or re-import.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <FileSpreadsheet className="h-5 w-5 flex-shrink-0 text-green-500 mt-0.5" />
            <div>
              <p className="font-medium">CSV</p>
              <p className="text-muted-foreground text-xs mt-0.5">
                Flat table — opens in Excel, Google Sheets, or any spreadsheet app instantly.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Delete account notice */}
      <p className="text-center text-xs text-muted-foreground">
        To permanently delete all your data, go to{' '}
        <a href="/profile" className="text-brand-500 hover:underline">
          Profile → Delete Account
        </a>
        .
      </p>
    </div>
  );
}
