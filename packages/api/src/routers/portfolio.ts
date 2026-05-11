// ═══════════════════════════════════════════════════════════════
// Portfolio tRPC Router
// ═══════════════════════════════════════════════════════════════

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../index';
import { createPortfolioSchema, addHoldingSchema } from '@solvesphere/shared';
import {
  calculateSharpeRatio,
  calculateMaxDrawdown,
  calculateVolatility,
} from '@solvesphere/shared';
import { getBatchQuotes, getHistoricalPrices } from '../services/marketData';
import { chatWithClaude } from '../services/claude';
import { FREE_PORTFOLIO_HOLDINGS, FREE_PORTFOLIOS } from '@solvesphere/shared';

export const portfolioRouter = router({
  // ── List portfolios ─────────────────────────────────────────
  list: protectedProcedure.query(async ({ ctx }) =>
    ctx.prisma.portfolio.findMany({
      where: { userId: ctx.userId! },
      include: {
        _count: { select: { holdings: true } },
      },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    })
  ),

  // ── Create portfolio ─────────────────────────────────────────
  create: protectedProcedure
    .input(createPortfolioSchema)
    .mutation(async ({ input, ctx }) => {
      const count = await ctx.prisma.portfolio.count({ where: { userId: ctx.userId! } });
      const sub = await ctx.prisma.subscription.findUnique({ where: { userId: ctx.userId! } });
      if (sub?.tier === 'FREE' && count >= FREE_PORTFOLIOS) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: `Free tier allows ${FREE_PORTFOLIOS} portfolio. Upgrade to Pro for unlimited portfolios.`,
        });
      }

      const isFirst = count === 0;
      return ctx.prisma.portfolio.create({
        data: { userId: ctx.userId!, ...input, isDefault: isFirst, targetAllocation: input.targetAllocation as any },
      });
    }),

  // ── Get portfolio with live prices ──────────────────────────
  detail: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      const portfolio = await ctx.prisma.portfolio.findFirst({
        where: { id: input.id, userId: ctx.userId! },
        include: { holdings: true, benchmarks: true },
      });
      if (!portfolio) throw new TRPCError({ code: 'NOT_FOUND' });

      const tickers = portfolio.holdings.map((h) => h.ticker);
      const quotes = tickers.length > 0 ? await getBatchQuotes(tickers) : new Map();

      const enrichedHoldings = portfolio.holdings.map((h) => {
        const quote = quotes.get(h.ticker);
        const currentPrice = quote?.price ?? Number(h.currentPrice ?? h.avgCost);
        const totalValue = currentPrice * Number(h.shares);
        const totalCost = Number(h.avgCost) * Number(h.shares);
        const gainLoss = totalValue - totalCost;
        const gainLossPct = totalCost > 0 ? gainLoss / totalCost : 0;

        return {
          ...h,
          currentPrice,
          totalValue,
          totalCost,
          gainLoss,
          gainLossPct,
          dayChange: quote?.change,
          dayChangePct: quote?.changePct,
        };
      });

      const totalValue = enrichedHoldings.reduce((s, h) => s + h.totalValue, 0);
      const totalCost = enrichedHoldings.reduce((s, h) => s + h.totalCost, 0);

      // Allocation
      const allocation = enrichedHoldings.map((h) => ({
        ticker: h.ticker,
        name: h.name,
        assetClass: h.assetClass,
        value: h.totalValue,
        percent: totalValue > 0 ? h.totalValue / totalValue : 0,
        targetPercent: (portfolio.targetAllocation as any)?.[h.assetClass],
      }));

      return {
        ...portfolio,
        holdings: enrichedHoldings,
        metrics: {
          totalValue,
          totalCost,
          totalGainLoss: totalValue - totalCost,
          totalGainLossPct: totalCost > 0 ? (totalValue - totalCost) / totalCost : 0,
        },
        allocation,
      };
    }),

  // ── Add holding ──────────────────────────────────────────────
  addHolding: protectedProcedure
    .input(addHoldingSchema)
    .mutation(async ({ input, ctx }) => {
      const portfolio = await ctx.prisma.portfolio.findFirst({
        where: { id: input.portfolioId, userId: ctx.userId! },
        include: { _count: { select: { holdings: true } } },
      });
      if (!portfolio) throw new TRPCError({ code: 'NOT_FOUND' });

      const sub = await ctx.prisma.subscription.findUnique({ where: { userId: ctx.userId! } });
      if (sub?.tier === 'FREE' && portfolio._count.holdings >= FREE_PORTFOLIO_HOLDINGS) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: `Free tier allows ${FREE_PORTFOLIO_HOLDINGS} holdings per portfolio. Upgrade for unlimited.`,
        });
      }

      return ctx.prisma.holding.upsert({
        where: { portfolioId_ticker: { portfolioId: input.portfolioId, ticker: input.ticker } },
        create: {
          portfolioId: input.portfolioId,
          ticker: input.ticker,
          name: input.name,
          assetClass: input.assetClass as any,
          shares: input.shares,
          avgCost: input.avgCost,
          currency: (input.currency ?? 'USD') as any,
        },
        update: {
          shares: { increment: input.shares },
          // Weighted avg cost
        },
      });
    }),

  // ── Portfolio analytics (Sharpe, MaxDD, Volatility) ─────────
  analytics: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      const portfolio = await ctx.prisma.portfolio.findFirst({
        where: { id: input.id, userId: ctx.userId! },
        include: { holdings: true },
      });
      if (!portfolio || portfolio.holdings.length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }

      // Use largest holding as proxy for portfolio history
      const mainTicker = portfolio.holdings.sort((a, b) => Number(b.shares) - Number(a.shares))[0].ticker;
      const history = await getHistoricalPrices(mainTicker, 'compact');

      const closes = history.map((h) => h.close);
      const returns = closes.slice(1).map((c, i) => (c - closes[i]) / closes[i]);

      return {
        sharpeRatio: calculateSharpeRatio(returns),
        maxDrawdown: calculateMaxDrawdown(closes),
        volatility: calculateVolatility(returns),
        dataPoints: history.length,
      };
    }),

  // ── Rebalancing suggestions ──────────────────────────────────
  rebalanceSuggestions: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      const portfolio = await ctx.prisma.portfolio.findFirst({
        where: { id: input.id, userId: ctx.userId! },
        include: { holdings: true },
      });
      if (!portfolio?.targetAllocation) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Portfolio has no target allocation set.' });
      }

      const tickers = portfolio.holdings.map((h) => h.ticker);
      const quotes = await getBatchQuotes(tickers);
      const target = portfolio.targetAllocation as Record<string, number>;

      const currentValues = portfolio.holdings.map((h) => ({
        ticker: h.ticker,
        assetClass: h.assetClass,
        value: (quotes.get(h.ticker)?.price ?? Number(h.avgCost)) * Number(h.shares),
        price: quotes.get(h.ticker)?.price ?? Number(h.avgCost),
        shares: Number(h.shares),
      }));

      const totalValue = currentValues.reduce((s, h) => s + h.value, 0);

      const suggestions = currentValues.map((h) => {
        const currentPct = totalValue > 0 ? h.value / totalValue : 0;
        const targetPct = (target[h.assetClass] ?? 0) / 100;
        const targetValue = totalValue * targetPct;
        const diff = targetValue - h.value;
        const sharesNeeded = h.price > 0 ? Math.abs(diff) / h.price : 0;

        return {
          ticker: h.ticker,
          assetClass: h.assetClass,
          currentPct,
          targetPct,
          drift: currentPct - targetPct,
          action: diff > 0 ? 'BUY' : 'SELL',
          estimatedValue: Math.abs(diff),
          shares: Math.round(sharesNeeded * 1000) / 1000,
        };
      }).filter((s) => Math.abs(s.drift) > 0.02); // only rebalance if >2% drift

      return suggestions;
    }),

  // ── Watchlist ────────────────────────────────────────────────
  watchlists: protectedProcedure.query(async ({ ctx }) =>
    ctx.prisma.watchlist.findMany({
      where: { userId: ctx.userId! },
      include: { items: true },
    })
  ),

  addToWatchlist: protectedProcedure
    .input(z.object({
      watchlistId: z.string().uuid().optional(),
      ticker: z.string().min(1).max(20),
      name: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      let watchlistId = input.watchlistId;
      if (!watchlistId) {
        const defaultWl = await ctx.prisma.watchlist.findFirst({
          where: { userId: ctx.userId!, isDefault: true },
        });
        if (!defaultWl) {
          const wl = await ctx.prisma.watchlist.create({
            data: { userId: ctx.userId!, name: 'My Watchlist', isDefault: true },
          });
          watchlistId = wl.id;
        } else {
          watchlistId = defaultWl.id;
        }
      }

      return ctx.prisma.watchlistItem.upsert({
        where: { watchlistId_ticker: { watchlistId: watchlistId!, ticker: input.ticker.toUpperCase() } },
        create: { watchlistId: watchlistId!, ticker: input.ticker.toUpperCase(), name: input.name },
        update: {},
      });
    }),

  // ── AI "Ask about my portfolio" ──────────────────────────────
  askAI: protectedProcedure
    .input(z.object({
      portfolioId: z.string().uuid(),
      question: z.string().min(1).max(2000),
    }))
    .mutation(async ({ input, ctx }) => {
      const portfolio = await ctx.prisma.portfolio.findFirst({
        where: { id: input.portfolioId, userId: ctx.userId! },
        include: { holdings: true },
      });
      if (!portfolio) throw new TRPCError({ code: 'NOT_FOUND' });

      const tickers = portfolio.holdings.map((h) => h.ticker);
      const quotes = await getBatchQuotes(tickers);

      const portfolioSummary = portfolio.holdings.map((h) => {
        const price = quotes.get(h.ticker)?.price ?? Number(h.avgCost);
        const value = price * Number(h.shares);
        return `${h.ticker}: ${Number(h.shares)} shares @ $${price.toFixed(2)} = $${value.toFixed(2)}`;
      }).join('\n');

      const sub = await ctx.prisma.subscription.findUnique({ where: { userId: ctx.userId! } });

      const answer = await chatWithClaude(
        input.question,
        [],
        {
          subscriptionTier: (sub?.tier ?? 'FREE') as any,
          currency: 'USD',
          portfolioValue: portfolio.holdings.reduce((s, h) => s + (quotes.get(h.ticker)?.price ?? Number(h.avgCost)) * Number(h.shares), 0),
        },
        `portfolio\n\nPortfolio: ${portfolio.name}\nHoldings:\n${portfolioSummary}`
      );

      return { answer };
    }),
});
