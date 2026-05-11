// ═══════════════════════════════════════════════════════════════
// Budget tRPC Router
// ═══════════════════════════════════════════════════════════════

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../index';
import { createBudgetSchema } from '@solvesphere/shared';
import { parseReceiptWithClaude } from '../services/claude';
import { FREE_BUDGETS } from '@solvesphere/shared';

export const budgetRouter = router({
  // ── List budgets ─────────────────────────────────────────────
  list: protectedProcedure.query(async ({ ctx }) =>
    ctx.prisma.budget.findMany({
      where: { userId: ctx.userId!, isActive: true },
      include: {
        categories: {
          include: { _count: { select: { items: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
  ),

  // ── Create budget ─────────────────────────────────────────────
  create: protectedProcedure
    .input(createBudgetSchema)
    .mutation(async ({ input, ctx }) => {
      const count = await ctx.prisma.budget.count({ where: { userId: ctx.userId!, isActive: true } });
      const sub = await ctx.prisma.subscription.findUnique({ where: { userId: ctx.userId! } });

      if (sub?.tier === 'FREE' && count >= FREE_BUDGETS) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: `Free tier allows ${FREE_BUDGETS} active budget. Upgrade to Pro for unlimited budgets.`,
        });
      }

      return ctx.prisma.budget.create({
        data: {
          userId: ctx.userId!,
          name: input.name,
          period: input.period,
          startDate: new Date(input.startDate as string),
          currency: (input.currency ?? 'USD') as any,
          categories: {
            create: input.categories.map((c) => ({
              category: c.category as any,
              limitAmount: c.limitAmount,
              alertAt: c.alertAt,
            })),
          },
        },
        include: { categories: true },
      });
    }),

  // ── Budget progress ──────────────────────────────────────────
  progress: protectedProcedure
    .input(z.object({ budgetId: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      const budget = await ctx.prisma.budget.findFirst({
        where: { id: input.budgetId, userId: ctx.userId! },
        include: { categories: true },
      });
      if (!budget) throw new TRPCError({ code: 'NOT_FOUND' });

      const now = new Date();
      const periodStart = getPeriodStart(budget.period, now);

      const spending = await ctx.prisma.transaction.groupBy({
        by: ['category'],
        where: {
          userId: ctx.userId!,
          type: 'EXPENSE',
          date: { gte: periodStart, lte: now },
        },
        _sum: { amount: true },
      });

      const spendMap = new Map(spending.map((s) => [s.category, Number(s._sum.amount ?? 0)]));

      const progress = budget.categories.map((cat) => {
        const spent = spendMap.get(cat.category as string) ?? 0;
        const limit = Number(cat.limitAmount);
        const pct = limit > 0 ? spent / limit : 0;
        return {
          category: cat.category,
          limitAmount: limit,
          spent,
          remaining: Math.max(0, limit - spent),
          pct: Math.min(pct, 1),
          isOverBudget: pct > 1,
          isNearLimit: pct >= cat.alertAt && pct <= 1,
        };
      });

      const totalBudget = budget.categories.reduce((s, c) => s + Number(c.limitAmount), 0);
      const totalSpent = progress.reduce((s, p) => s + p.spent, 0);

      return { budget, progress, totalBudget, totalSpent, periodStart };
    }),

  // ── Scan receipt ──────────────────────────────────────────────
  scanReceipt: protectedProcedure
    .input(z.object({
      imageBase64: z.string(),
      mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp']).default('image/jpeg'),
    }))
    .mutation(async ({ input, ctx }) => {
      const parsed = await parseReceiptWithClaude(input.imageBase64, input.mimeType);

      // Store receipt record
      const receipt = await ctx.prisma.receipt.create({
        data: {
          userId: ctx.userId!,
          imageUrl: '', // set after Supabase upload
          merchant: parsed.merchant,
          date: parsed.date ? new Date(parsed.date) : undefined,
          subtotal: parsed.subtotal,
          tax: parsed.tax,
          tip: parsed.tip,
          total: parsed.total,
          lineItems: parsed.lineItems as any,
          isProcessed: true,
        },
      });

      return { receipt, parsed };
    }),
});

// ──────────────────────────────────────
// HELPERS
// ──────────────────────────────────────

function getPeriodStart(period: string, now: Date): Date {
  const start = new Date(now);
  if (period === 'monthly') {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
  } else if (period === 'weekly') {
    const day = start.getDay();
    start.setDate(start.getDate() - day);
    start.setHours(0, 0, 0, 0);
  } else if (period === 'yearly') {
    start.setMonth(0, 1);
    start.setHours(0, 0, 0, 0);
  }
  return start;
}
