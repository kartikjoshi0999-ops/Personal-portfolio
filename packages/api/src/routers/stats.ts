// ═══════════════════════════════════════════════════════════════
// Statistics Module tRPC Router
// ═══════════════════════════════════════════════════════════════

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../index';
import { createDatasetSchema, runAnalysisSchema } from '@solvesphere/shared';
import {
  descriptiveStats,
  linearRegression,
  pearsonCorrelation,
  oneSampleTTest,
  twoSampleTTest,
  chiSquareGoodnessOfFit,
} from '@solvesphere/shared';
import { interpretStatResults } from '../services/claude';
import { extractTableFromImage } from '../services/mathpix';

export const statsRouter = router({
  // ── List datasets ────────────────────────────────────────────
  datasets: protectedProcedure.query(async ({ ctx }) =>
    ctx.prisma.statDataset.findMany({
      where: { userId: ctx.userId! },
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, description: true, sourceType: true, createdAt: true, columns: true },
    })
  ),

  // ── Create dataset ────────────────────────────────────────────
  createDataset: protectedProcedure
    .input(createDatasetSchema)
    .mutation(async ({ input, ctx }) =>
      ctx.prisma.statDataset.create({
        data: {
          userId: ctx.userId!,
          name: input.name,
          columns: input.columns,
          rows: input.rows as any,
          sourceType: input.sourceType,
        },
      })
    ),

  // ── OCR: photo → table ─────────────────────────────────────
  extractTable: protectedProcedure
    .input(z.object({ imageBase64: z.string() }))
    .mutation(async ({ input }) => extractTableFromImage(input.imageBase64)),

  // ── Run descriptive stats ─────────────────────────────────
  describe: protectedProcedure
    .input(z.object({ datasetId: z.string().uuid(), columnIndex: z.number().int().min(0) }))
    .query(async ({ input, ctx }) => {
      const dataset = await ctx.prisma.statDataset.findFirst({
        where: { id: input.datasetId, userId: ctx.userId! },
      });
      if (!dataset) throw new TRPCError({ code: 'NOT_FOUND' });

      const rows = dataset.rows as number[][];
      const colData = rows.map((r) => r[input.columnIndex]).filter((v) => v !== null && !isNaN(v));

      return descriptiveStats(colData);
    }),

  // ── Run analysis ───────────────────────────────────────────
  runAnalysis: protectedProcedure
    .input(runAnalysisSchema)
    .mutation(async ({ input, ctx }) => {
      const dataset = await ctx.prisma.statDataset.findFirst({
        where: { id: input.datasetId, userId: ctx.userId! },
      });
      if (!dataset) throw new TRPCError({ code: 'NOT_FOUND' });

      const rows = dataset.rows as number[][];
      const config = input.config as Record<string, any>;
      let results: Record<string, unknown> = {};

      switch (input.analysisType) {
        case 'descriptive': {
          const colIdx = config.columnIndex ?? 0;
          const data = rows.map((r) => r[colIdx]).filter((v) => v !== null && !isNaN(v));
          results = descriptiveStats(data) as unknown as Record<string, unknown>;
          break;
        }
        case 't-test': {
          const data = rows.map((r) => r[config.columnIndex ?? 0]).filter((v) => !isNaN(v));
          results = oneSampleTTest(data, config.populationMean ?? 0, config.alpha ?? 0.05) as unknown as Record<string, unknown>;
          break;
        }
        case 'two-sample-t': {
          const a = rows.map((r) => r[config.columnA ?? 0]).filter((v) => !isNaN(v));
          const b = rows.map((r) => r[config.columnB ?? 1]).filter((v) => !isNaN(v));
          results = twoSampleTTest(a, b, config.alpha ?? 0.05) as unknown as Record<string, unknown>;
          break;
        }
        case 'linear-regression': {
          const x = rows.map((r) => r[config.xColumn ?? 0]).filter((v) => !isNaN(v));
          const y = rows.map((r) => r[config.yColumn ?? 1]).filter((v) => !isNaN(v));
          results = linearRegression(x, y) as unknown as Record<string, unknown>;
          break;
        }
        case 'correlation': {
          const x = rows.map((r) => r[config.xColumn ?? 0]).filter((v) => !isNaN(v));
          const y = rows.map((r) => r[config.yColumn ?? 1]).filter((v) => !isNaN(v));
          results = { pearsonR: pearsonCorrelation(x, y) };
          break;
        }
        case 'chi-square': {
          const observed = config.observed as number[];
          const expected = config.expected as number[];
          results = chiSquareGoodnessOfFit(observed, expected, config.alpha ?? 0.05) as unknown as Record<string, unknown>;
          break;
        }
        default:
          throw new TRPCError({ code: 'BAD_REQUEST', message: `Unknown analysis: ${input.analysisType}` });
      }

      // Get plain-English interpretation from Claude
      const interpretation = await interpretStatResults(input.analysisType, results);

      const analysis = await ctx.prisma.statAnalysis.create({
        data: {
          datasetId: input.datasetId,
          analysisType: input.analysisType,
          config: input.config,
          results,
          interpretation,
        },
      });

      return { ...analysis, results, interpretation };
    }),

  // ── Analysis history ──────────────────────────────────────
  analyses: protectedProcedure
    .input(z.object({ datasetId: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      const dataset = await ctx.prisma.statDataset.findFirst({
        where: { id: input.datasetId, userId: ctx.userId! },
      });
      if (!dataset) throw new TRPCError({ code: 'NOT_FOUND' });

      return ctx.prisma.statAnalysis.findMany({
        where: { datasetId: input.datasetId },
        orderBy: { createdAt: 'desc' },
      });
    }),
});
