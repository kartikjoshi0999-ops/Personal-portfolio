// ═══════════════════════════════════════════════════════════════
// Math Solver tRPC Router
// ═══════════════════════════════════════════════════════════════

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure, publicProcedure } from '../index';
import { solveMathWithClaude } from '../services/claude';
import { extractLatexFromImage } from '../services/mathpix';
import { solveMathSchema, saveMathProblemSchema } from '@solvesphere/shared';
import { FREE_MATH_SCANS_PER_DAY } from '@solvesphere/shared';

export const mathRouter = router({
  // ── OCR: image → LaTeX ─────────────────────────────────────
  extractLatex: protectedProcedure
    .input(z.object({ imageBase64: z.string() }))
    .mutation(async ({ input, ctx }) => {
      await enforceScanLimit(ctx.userId!, ctx.prisma);
      return extractLatexFromImage(input.imageBase64);
    }),

  // ── Solve: LaTeX → step-by-step solution ───────────────────
  solve: protectedProcedure
    .input(solveMathSchema)
    .mutation(async ({ input, ctx }) => {
      await enforceScanLimit(ctx.userId!, ctx.prisma);

      const solution = await solveMathWithClaude(input.latex);

      // Increment scan count
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      await ctx.prisma.userProfile.updateMany({
        where: { userId: ctx.userId! },
        data: {
          mathScansToday: { increment: 1 },
          scanResetDate: today,
        },
      });

      return solution;
    }),

  // ── Save a solved problem to history ───────────────────────
  save: protectedProcedure
    .input(saveMathProblemSchema)
    .mutation(async ({ input, ctx }) => {
      return ctx.prisma.mathProblem.create({
        data: {
          userId: ctx.userId!,
          latex: input.latex,
          subject: input.subject as any,
          tags: input.tags,
          solutionSteps: input.solutionSteps as any,
          finalAnswer: input.finalAnswer,
          imageUrl: input.imageUrl,
          graphData: input.graphData as any,
        },
      });
    }),

  // ── History ────────────────────────────────────────────────
  history: protectedProcedure
    .input(z.object({
      page: z.number().int().positive().default(1),
      pageSize: z.number().int().min(1).max(50).default(20),
      subject: z.string().optional(),
      search: z.string().optional(),
      favoritesOnly: z.boolean().default(false),
    }))
    .query(async ({ input, ctx }) => {
      const { page, pageSize, subject, search, favoritesOnly } = input;
      const where: Record<string, unknown> = { userId: ctx.userId! };
      if (subject) where.subject = subject;
      if (favoritesOnly) where.isFavorited = true;
      if (search) {
        where.OR = [
          { latex: { contains: search, mode: 'insensitive' } },
          { finalAnswer: { contains: search, mode: 'insensitive' } },
          { tags: { has: search } },
        ];
      }

      const [items, total] = await Promise.all([
        ctx.prisma.mathProblem.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        ctx.prisma.mathProblem.count({ where }),
      ]);

      return { items, total, page, pageSize, hasNextPage: page * pageSize < total };
    }),

  // ── Toggle favorite ─────────────────────────────────────────
  toggleFavorite: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      const problem = await ctx.prisma.mathProblem.findFirst({
        where: { id: input.id, userId: ctx.userId! },
      });
      if (!problem) throw new TRPCError({ code: 'NOT_FOUND' });

      return ctx.prisma.mathProblem.update({
        where: { id: input.id },
        data: { isFavorited: !problem.isFavorited },
      });
    }),

  // ── Delete ──────────────────────────────────────────────────
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      await ctx.prisma.mathProblem.deleteMany({
        where: { id: input.id, userId: ctx.userId! },
      });
      return { success: true };
    }),

  // ── Daily scan usage ────────────────────────────────────────
  scanUsage: protectedProcedure.query(async ({ ctx }) => {
    const profile = await ctx.prisma.userProfile.findUnique({
      where: { userId: ctx.userId! },
      select: { mathScansToday: true, scanResetDate: true },
    });
    const sub = await ctx.prisma.subscription.findUnique({
      where: { userId: ctx.userId! },
      select: { tier: true },
    });

    const isPro = sub?.tier !== 'FREE';
    return {
      used: profile?.mathScansToday ?? 0,
      limit: isPro ? Infinity : FREE_MATH_SCANS_PER_DAY,
      isPro,
      resetDate: profile?.scanResetDate,
    };
  }),
});

// ──────────────────────────────────────
// RATE LIMITING HELPER
// ──────────────────────────────────────

async function enforceScanLimit(userId: string, prisma: any) {
  const [profile, sub] = await Promise.all([
    prisma.userProfile.findUnique({ where: { userId } }),
    prisma.subscription.findUnique({ where: { userId } }),
  ]);

  if (!profile) return; // will be created on first scan

  const isPro = sub?.tier !== 'FREE';
  if (isPro) return;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const lastReset = new Date(profile.scanResetDate);
  lastReset.setHours(0, 0, 0, 0);

  const scansUsed = lastReset.getTime() < today.getTime() ? 0 : profile.mathScansToday;

  if (scansUsed >= FREE_MATH_SCANS_PER_DAY) {
    throw new TRPCError({
      code: 'TOO_MANY_REQUESTS',
      message: `Free tier limit reached (${FREE_MATH_SCANS_PER_DAY} scans/day). Upgrade to Pro for unlimited scans.`,
    });
  }
}
