// ═══════════════════════════════════════════════════════════════
// Finance tRPC Router (Transactions, Accounts, Net Worth, Goals, Debts)
// ═══════════════════════════════════════════════════════════════

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../index';
import {
  createTransactionSchema,
  updateTransactionSchema,
  createGoalSchema,
  createDebtSchema,
  mortgageSchema,
  dcfSchema,
  monteCarloSchema,
} from '@solvesphere/shared';
import {
  calculateMortgage,
  calculateDebtPayoff,
  projectSavingsGoal,
  calculateNetWorth,
  estimateTax,
  runMonteCarlo,
  calculateDCF,
} from '@solvesphere/shared';
import { generateSpendingInsight } from '../services/claude';

export const financeRouter = router({
  // ──────────────────────────────────────
  // NET WORTH DASHBOARD
  // ──────────────────────────────────────

  netWorth: protectedProcedure.query(async ({ ctx }) => {
    const accounts = await ctx.prisma.financialAccount.findMany({
      where: { userId: ctx.userId!, isActive: true, includeInNetWorth: true },
    });

    const assets = accounts
      .filter((a) => !['CREDIT_CARD', 'LOAN', 'MORTGAGE'].includes(a.type))
      .map((a) => ({ amount: Number(a.currentBalance), type: a.type }));

    const liabilities = accounts
      .filter((a) => ['CREDIT_CARD', 'LOAN', 'MORTGAGE'].includes(a.type))
      .map((a) => ({ amount: Math.abs(Number(a.currentBalance)), type: a.type }));

    return calculateNetWorth(assets, liabilities);
  }),

  // ──────────────────────────────────────
  // TRANSACTIONS
  // ──────────────────────────────────────

  transactions: protectedProcedure
    .input(z.object({
      page: z.number().int().positive().default(1),
      pageSize: z.number().int().min(1).max(100).default(30),
      accountId: z.string().uuid().optional(),
      category: z.string().optional(),
      type: z.enum(['INCOME', 'EXPENSE', 'TRANSFER']).optional(),
      search: z.string().optional(),
      startDate: z.string().datetime().optional(),
      endDate: z.string().datetime().optional(),
    }))
    .query(async ({ input, ctx }) => {
      const where: Record<string, unknown> = { userId: ctx.userId! };
      if (input.accountId) where.accountId = input.accountId;
      if (input.category) where.category = input.category;
      if (input.type) where.type = input.type;
      if (input.search) {
        where.OR = [
          { merchant: { contains: input.search, mode: 'insensitive' } },
          { description: { contains: input.search, mode: 'insensitive' } },
        ];
      }
      if (input.startDate || input.endDate) {
        where.date = {};
        if (input.startDate) (where.date as any).gte = new Date(input.startDate);
        if (input.endDate) (where.date as any).lte = new Date(input.endDate);
      }

      const [items, total] = await Promise.all([
        ctx.prisma.transaction.findMany({
          where,
          orderBy: { date: 'desc' },
          skip: (input.page - 1) * input.pageSize,
          take: input.pageSize,
          include: { account: { select: { name: true, type: true } } },
        }),
        ctx.prisma.transaction.count({ where }),
      ]);

      return { items, total, page: input.page, pageSize: input.pageSize, hasNextPage: input.page * input.pageSize < total };
    }),

  createTransaction: protectedProcedure
    .input(createTransactionSchema)
    .mutation(async ({ input, ctx }) => {
      return ctx.prisma.transaction.create({
        data: {
          userId: ctx.userId!,
          type: input.type,
          category: input.category as any,
          merchant: input.merchant,
          description: input.description,
          amount: input.amount,
          currency: (input.currency ?? 'USD') as any,
          date: new Date(input.date as string),
          accountId: input.accountId,
          notes: input.notes,
        },
      });
    }),

  updateTransaction: protectedProcedure
    .input(updateTransactionSchema)
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;
      const tx = await ctx.prisma.transaction.findFirst({ where: { id, userId: ctx.userId! } });
      if (!tx) throw new TRPCError({ code: 'NOT_FOUND' });

      return ctx.prisma.transaction.update({
        where: { id },
        data: {
          ...data,
          date: data.date ? new Date(data.date as string) : undefined,
        } as any,
      });
    }),

  deleteTransaction: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      await ctx.prisma.transaction.deleteMany({ where: { id: input.id, userId: ctx.userId! } });
      return { success: true };
    }),

  // ──────────────────────────────────────
  // SPENDING INSIGHTS
  // ──────────────────────────────────────

  spendingInsight: protectedProcedure
    .input(z.object({ year: z.number().int(), month: z.number().int().min(1).max(12) }))
    .query(async ({ input, ctx }) => {
      const start = new Date(input.year, input.month - 1, 1);
      const end = new Date(input.year, input.month, 0, 23, 59, 59);
      const prevStart = new Date(input.year, input.month - 2, 1);
      const prevEnd = new Date(input.year, input.month - 1, 0, 23, 59, 59);

      const [current, previous] = await Promise.all([
        ctx.prisma.transaction.groupBy({
          by: ['category'],
          where: { userId: ctx.userId!, type: 'EXPENSE', date: { gte: start, lte: end } },
          _sum: { amount: true },
        }),
        ctx.prisma.transaction.groupBy({
          by: ['category'],
          where: { userId: ctx.userId!, type: 'EXPENSE', date: { gte: prevStart, lte: prevEnd } },
          _sum: { amount: true },
        }),
      ]);

      const prevMap = new Map(previous.map((p) => [p.category, Number(p._sum.amount)]));
      const spendingData = current.map((c) => ({
        category: c.category,
        amount: Number(c._sum.amount ?? 0),
        prevAmount: prevMap.get(c.category) ?? 0,
      }));

      const incomeResult = await ctx.prisma.transaction.aggregate({
        where: { userId: ctx.userId!, type: 'INCOME', date: { gte: start, lte: end } },
        _sum: { amount: true },
      });

      const income = Number(incomeResult._sum.amount ?? 0);
      const aiSummary = await generateSpendingInsight(
        `${input.year}-${String(input.month).padStart(2, '0')}`,
        spendingData,
        income
      );

      return { spendingData, income, aiSummary, period: start };
    }),

  // ──────────────────────────────────────
  // SAVINGS GOALS
  // ──────────────────────────────────────

  goals: protectedProcedure.query(async ({ ctx }) =>
    ctx.prisma.savingsGoal.findMany({ where: { userId: ctx.userId! }, orderBy: { createdAt: 'desc' } })
  ),

  createGoal: protectedProcedure
    .input(createGoalSchema)
    .mutation(async ({ input, ctx }) =>
      ctx.prisma.savingsGoal.create({
        data: {
          userId: ctx.userId!,
          name: input.name,
          type: input.type as any,
          targetAmount: input.targetAmount,
          currentAmount: input.currentAmount,
          currency: (input.currency ?? 'USD') as any,
          targetDate: input.targetDate ? new Date(input.targetDate) : undefined,
          monthlyContrib: input.monthlyContrib,
        },
      })
    ),

  goalProjection: protectedProcedure
    .input(z.object({
      goalId: z.string().uuid(),
      annualReturn: z.number().min(0).max(0.5).default(0.05),
    }))
    .query(async ({ input, ctx }) => {
      const goal = await ctx.prisma.savingsGoal.findFirst({
        where: { id: input.goalId, userId: ctx.userId! },
      });
      if (!goal) throw new TRPCError({ code: 'NOT_FOUND' });

      return projectSavingsGoal(
        Number(goal.currentAmount),
        Number(goal.monthlyContrib ?? 0),
        input.annualReturn,
        Number(goal.targetAmount)
      );
    }),

  // ──────────────────────────────────────
  // DEBT TRACKER
  // ──────────────────────────────────────

  debts: protectedProcedure.query(async ({ ctx }) =>
    ctx.prisma.debt.findMany({ where: { userId: ctx.userId!, isActive: true }, orderBy: { interestRate: 'desc' } })
  ),

  createDebt: protectedProcedure
    .input(createDebtSchema)
    .mutation(async ({ input, ctx }) =>
      ctx.prisma.debt.create({
        data: { userId: ctx.userId!, ...input, type: input.type as any, currency: (input.currency ?? 'USD') as any },
      })
    ),

  debtPayoffPlan: protectedProcedure
    .input(z.object({
      strategy: z.enum(['SNOWBALL', 'AVALANCHE']),
      extraMonthly: z.number().min(0).default(0),
    }))
    .query(async ({ input, ctx }) => {
      const debts = await ctx.prisma.debt.findMany({
        where: { userId: ctx.userId!, isActive: true },
      });

      if (debts.length === 0) throw new TRPCError({ code: 'NOT_FOUND', message: 'No active debts' });

      return calculateDebtPayoff(
        debts.map((d) => ({
          id: d.id,
          name: d.name,
          balance: Number(d.currentBalance),
          interestRate: d.interestRate,
          minimumPayment: Number(d.minimumPayment),
        })),
        input.extraMonthly,
        input.strategy
      );
    }),

  // ──────────────────────────────────────
  // ADVANCED FINANCE TOOLS
  // ──────────────────────────────────────

  mortgage: protectedProcedure
    .input(mortgageSchema)
    .query(async ({ input }) => calculateMortgage(input)),

  taxEstimate: protectedProcedure
    .input(z.object({
      country: z.enum(['US', 'CA']),
      grossIncome: z.number().positive(),
      deductions: z.number().min(0).default(0),
      taxYear: z.number().int().default(2024),
    }))
    .query(async ({ input }) => estimateTax(input.country, input.grossIncome, input.deductions, input.taxYear)),

  monteCarlo: protectedProcedure
    .input(monteCarloSchema)
    .query(async ({ input }) => runMonteCarlo(input)),

  dcfValuation: protectedProcedure
    .input(dcfSchema)
    .query(async ({ input }) => calculateDCF(input)),
});
