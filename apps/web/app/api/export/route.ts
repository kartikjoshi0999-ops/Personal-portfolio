// ═══════════════════════════════════════════════════════════════
// GET /api/export?format=json|csv&type=all|transactions|math|portfolio
// GDPR / PIPEDA compliant data export
// ═══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@solvesphere/api';

export const runtime = 'nodejs';
export const maxDuration = 30;

type ExportType = 'all' | 'transactions' | 'math' | 'portfolio' | 'budget' | 'goals';
type ExportFormat = 'json' | 'csv';

export async function GET(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const format = (searchParams.get('format') ?? 'json') as ExportFormat;
  const type = (searchParams.get('type') ?? 'all') as ExportType;

  try {
    const data = await gatherData(user.id, type);
    const timestamp = new Date().toISOString().slice(0, 10);

    if (format === 'csv') {
      const { csv, filename } = toCSV(data, type, timestamp);
      return new Response(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }

    // JSON export
    const json = JSON.stringify({ exportedAt: new Date().toISOString(), userId: user.id, ...data }, null, 2);
    return new Response(json, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="solvesphere-export-${timestamp}.json"`,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Export failed' }, { status: 500 });
  }
}

// ──────────────────────────────────────
// DATA GATHERING
// ──────────────────────────────────────

async function gatherData(userId: string, type: ExportType) {
  const include: Record<string, boolean> = {
    all: true,
    transactions: type === 'all' || type === 'transactions',
    math: type === 'all' || type === 'math',
    portfolio: type === 'all' || type === 'portfolio',
    budget: type === 'all' || type === 'budget',
    goals: type === 'all' || type === 'goals',
  };

  const [profile, transactions, mathProblems, portfolios, budgets, goals, debts] = await Promise.all([
    prisma.userProfile.findUnique({ where: { userId } }),

    include.transactions
      ? prisma.transaction.findMany({
          where: { userId },
          orderBy: { date: 'desc' },
          select: {
            id: true, type: true, category: true, merchant: true,
            description: true, amount: true, currency: true, date: true,
            notes: true, isRecurring: true, createdAt: true,
          },
        })
      : [],

    include.math
      ? prisma.mathProblem.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          select: {
            id: true, latex: true, subject: true, tags: true,
            finalAnswer: true, solutionSteps: true, isFavorited: true,
            difficulty: true, createdAt: true,
          },
        })
      : [],

    include.portfolio
      ? prisma.portfolio.findMany({
          where: { userId },
          include: {
            holdings: {
              select: {
                ticker: true, name: true, assetClass: true,
                shares: true, avgCost: true, currency: true, isDrip: true,
              },
            },
          },
        })
      : [],

    include.budget
      ? prisma.budget.findMany({
          where: { userId },
          include: { categories: { select: { category: true, limitAmount: true } } },
        })
      : [],

    include.goals
      ? prisma.savingsGoal.findMany({
          where: { userId },
          select: {
            name: true, type: true, targetAmount: true,
            currentAmount: true, currency: true, targetDate: true,
            monthlyContrib: true, isCompleted: true, createdAt: true,
          },
        })
      : [],

    include.goals
      ? prisma.debt.findMany({
          where: { userId },
          select: {
            name: true, type: true, originalAmount: true,
            currentBalance: true, interestRate: true,
            minimumPayment: true, currency: true, isActive: true,
          },
        })
      : [],
  ]);

  return {
    profile: profile
      ? {
          displayName: profile.displayName,
          useCase: profile.useCase,
          currency: profile.currency,
          country: profile.country,
          onboardingCompleted: profile.onboardingCompleted,
        }
      : null,
    transactions,
    mathProblems,
    portfolios,
    budgets,
    goals,
    debts,
  };
}

// ──────────────────────────────────────
// CSV CONVERSION
// ──────────────────────────────────────

function toCSV(data: Awaited<ReturnType<typeof gatherData>>, type: ExportType, timestamp: string) {
  // For CSV, export the most requested single table
  if (type === 'math') {
    const rows = data.mathProblems.map((p) => ({
      Date: new Date(p.createdAt).toLocaleDateString(),
      Subject: p.subject,
      LaTeX: `"${p.latex.replace(/"/g, '""')}"`,
      Answer: `"${p.finalAnswer.replace(/"/g, '""')}"`,
      Favorited: p.isFavorited ? 'Yes' : 'No',
      Tags: p.tags.join('; '),
    }));
    return { csv: objectsToCsv(rows), filename: `solvesphere-math-${timestamp}.csv` };
  }

  if (type === 'portfolio') {
    const rows = data.portfolios.flatMap((p) =>
      p.holdings.map((h) => ({
        Portfolio: p.name,
        Ticker: h.ticker,
        Name: h.name ?? '',
        AssetClass: h.assetClass,
        Shares: Number(h.shares),
        AvgCost: Number(h.avgCost),
        Currency: h.currency,
      }))
    );
    return { csv: objectsToCsv(rows), filename: `solvesphere-portfolio-${timestamp}.csv` };
  }

  if (type === 'goals') {
    const rows = data.goals.map((g) => ({
      Name: g.name,
      Type: g.type,
      Target: Number(g.targetAmount),
      Current: Number(g.currentAmount),
      Currency: g.currency,
      TargetDate: g.targetDate ? new Date(g.targetDate).toLocaleDateString() : '',
      MonthlyContrib: g.monthlyContrib ? Number(g.monthlyContrib) : '',
      Completed: g.isCompleted ? 'Yes' : 'No',
    }));
    return { csv: objectsToCsv(rows), filename: `solvesphere-goals-${timestamp}.csv` };
  }

  // Default: transactions
  const rows = data.transactions.map((tx) => ({
    Date: new Date(tx.date).toLocaleDateString(),
    Type: tx.type,
    Category: tx.category,
    Merchant: tx.merchant ?? '',
    Description: tx.description ?? '',
    Amount: Number(tx.amount),
    Currency: tx.currency,
    Recurring: tx.isRecurring ? 'Yes' : 'No',
    Notes: `"${(tx.notes ?? '').replace(/"/g, '""')}"`,
  }));
  return { csv: objectsToCsv(rows), filename: `solvesphere-transactions-${timestamp}.csv` };
}

function objectsToCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(','),
    ...rows.map((row) =>
      headers.map((h) => {
        const v = row[h];
        if (v === null || v === undefined) return '';
        const s = String(v);
        return s.includes(',') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
      }).join(',')
    ),
  ];
  return lines.join('\n');
}
