// ═══════════════════════════════════════════════════════════════
// tRPC Root Router — SolveSphere AI API
// ═══════════════════════════════════════════════════════════════

import { initTRPC, TRPCError } from '@trpc/server';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ──────────────────────────────────────
// PRISMA SINGLETON
// ──────────────────────────────────────

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// ──────────────────────────────────────
// tRPC CONTEXT
// ──────────────────────────────────────

export interface Context {
  prisma: PrismaClient;
  supabase: SupabaseClient;
  userId?: string;
  subscriptionTier?: string;
}

export async function createContext({ req }: { req: Request }): Promise<Context> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  let userId: string | undefined;
  let subscriptionTier: string | undefined;

  const authHeader = req.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const { data } = await supabase.auth.getUser(token);
    if (data.user) {
      userId = data.user.id;
      const sub = await prisma.subscription.findUnique({ where: { userId } });
      subscriptionTier = sub?.tier ?? 'FREE';
    }
  }

  return { prisma, supabase, userId, subscriptionTier };
}

// ──────────────────────────────────────
// tRPC INIT
// ──────────────────────────────────────

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return next({ ctx: { ...ctx, userId: ctx.userId } });
});

export const proOnlyProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.subscriptionTier === 'FREE') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'This feature requires a Pro subscription. Upgrade at solvesphere.ai/upgrade',
    });
  }
  return next({ ctx });
});

// ──────────────────────────────────────
// IMPORT ROUTERS
// ──────────────────────────────────────

import { mathRouter } from './routers/math';
import { financeRouter } from './routers/finance';
import { portfolioRouter } from './routers/portfolio';
import { budgetRouter } from './routers/budget';
import { aiRouter } from './routers/ai';
import { statsRouter } from './routers/stats';

// ──────────────────────────────────────
// APP ROUTER
// ──────────────────────────────────────

export const appRouter = router({
  math: mathRouter,
  finance: financeRouter,
  portfolio: portfolioRouter,
  budget: budgetRouter,
  ai: aiRouter,
  stats: statsRouter,
});

export type AppRouter = typeof appRouter;
