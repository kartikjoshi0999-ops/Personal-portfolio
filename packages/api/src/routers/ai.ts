// ═══════════════════════════════════════════════════════════════
// AI Assistant tRPC Router
// ═══════════════════════════════════════════════════════════════

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../index';
import { chatMessageSchema } from '@solvesphere/shared';
import { chatWithClaude } from '../services/claude';
import { FREE_AI_MESSAGES_PER_DAY } from '@solvesphere/shared';

export const aiRouter = router({
  // ── Send message ─────────────────────────────────────────────
  chat: protectedProcedure
    .input(chatMessageSchema)
    .mutation(async ({ input, ctx }) => {
      // Rate limit for free tier
      await enforceMessageLimit(ctx.userId!, ctx.subscriptionTier ?? 'FREE', ctx.prisma);

      // Get or create conversation
      let conversationId = input.conversationId;
      if (!conversationId) {
        const convo = await ctx.prisma.aIConversation.create({
          data: { userId: ctx.userId!, context: input.context },
        });
        conversationId = convo.id;
      }

      // Load recent history (last 20 messages for context)
      const history = await ctx.prisma.aIMessage.findMany({
        where: { conversationId },
        orderBy: { createdAt: 'asc' },
        take: 20,
        select: { role: true, content: true },
      });

      // Build user context from DB
      const userContext = await buildUserContext(ctx.userId!, ctx.prisma, ctx.subscriptionTier ?? 'FREE');

      // Call Claude
      const response = await chatWithClaude(input.message, history, userContext, input.context);

      // Store messages
      await ctx.prisma.aIMessage.createMany({
        data: [
          { conversationId: conversationId!, role: 'user', content: input.message },
          { conversationId: conversationId!, role: 'assistant', content: response, model: 'claude-sonnet-4-5' },
        ],
      });

      return { conversationId, response };
    }),

  // ── Conversation history ──────────────────────────────────────
  conversations: protectedProcedure.query(async ({ ctx }) =>
    ctx.prisma.aIConversation.findMany({
      where: { userId: ctx.userId! },
      orderBy: { updatedAt: 'desc' },
      take: 50,
      select: { id: true, title: true, context: true, updatedAt: true },
    })
  ),

  conversationMessages: protectedProcedure
    .input(z.object({ conversationId: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      const convo = await ctx.prisma.aIConversation.findFirst({
        where: { id: input.conversationId, userId: ctx.userId! },
        include: { messages: { orderBy: { createdAt: 'asc' } } },
      });
      if (!convo) throw new TRPCError({ code: 'NOT_FOUND' });
      return convo;
    }),

  // ── Delete conversation ──────────────────────────────────────
  deleteConversation: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      await ctx.prisma.aIConversation.deleteMany({
        where: { id: input.id, userId: ctx.userId! },
      });
      return { success: true };
    }),
});

// ──────────────────────────────────────
// HELPERS
// ──────────────────────────────────────

async function enforceMessageLimit(userId: string, tier: string, prisma: any) {
  if (tier !== 'FREE') return;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const count = await prisma.aIMessage.count({
    where: {
      conversation: { userId },
      role: 'user',
      createdAt: { gte: todayStart },
    },
  });

  if (count >= FREE_AI_MESSAGES_PER_DAY) {
    throw new TRPCError({
      code: 'TOO_MANY_REQUESTS',
      message: `Daily AI message limit reached (${FREE_AI_MESSAGES_PER_DAY}). Upgrade to Pro for unlimited AI chat.`,
    });
  }
}

async function buildUserContext(userId: string, prisma: any, tier: string) {
  const [accounts, incomeAgg, expenseAgg, portfolios, goals] = await Promise.allSettled([
    prisma.financialAccount.findMany({ where: { userId, isActive: true }, select: { currentBalance: true, type: true } }),
    prisma.transaction.aggregate({
      where: { userId, type: 'INCOME', date: { gte: getMonthStart() } },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { userId, type: 'EXPENSE', date: { gte: getMonthStart() } },
      _sum: { amount: true },
    }),
    prisma.portfolio.findMany({ where: { userId }, include: { holdings: true } }),
    prisma.savingsGoal.findMany({ where: { userId, isCompleted: false } }),
  ]);

  const accountData = accounts.status === 'fulfilled' ? accounts.value : [];
  const netWorth = accountData.reduce((s: number, a: any) => {
    const balance = Number(a.currentBalance);
    return ['CREDIT_CARD', 'LOAN', 'MORTGAGE'].includes(a.type) ? s - Math.abs(balance) : s + balance;
  }, 0);

  return {
    subscriptionTier: tier as any,
    currency: 'USD' as any,
    netWorth: isNaN(netWorth) ? undefined : netWorth,
    monthlyIncome: incomeAgg.status === 'fulfilled' ? Number(incomeAgg.value._sum?.amount ?? 0) : undefined,
    monthlyExpenses: expenseAgg.status === 'fulfilled' ? Number(expenseAgg.value._sum?.amount ?? 0) : undefined,
    activeGoals: goals.status === 'fulfilled'
      ? goals.value.map((g: any) => ({
          name: g.name,
          progress: Number(g.currentAmount) / Number(g.targetAmount),
        }))
      : undefined,
  };
}

function getMonthStart(): Date {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}
