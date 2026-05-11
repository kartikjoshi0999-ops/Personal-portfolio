'use client';

import { useState } from 'react';
import { TrendingUp, TrendingDown, Plus, RefreshCw, MessageCircle } from 'lucide-react';

const DEMO_HOLDINGS = [
  { ticker: 'AAPL', name: 'Apple Inc.', shares: 15, avgCost: 167.50, currentPrice: 248.96, assetClass: 'STOCK', sector: 'Technology' },
  { ticker: 'VTI', name: 'Vanguard Total Market ETF', shares: 42, avgCost: 215.20, currentPrice: 291.45, assetClass: 'ETF', sector: 'Broad Market' },
  { ticker: 'GOOGL', name: 'Alphabet Inc.', shares: 8, avgCost: 142.30, currentPrice: 194.23, assetClass: 'STOCK', sector: 'Technology' },
  { ticker: 'BTC', name: 'Bitcoin', shares: 0.25, avgCost: 42000, currentPrice: 98450, assetClass: 'CRYPTO', sector: 'Crypto' },
  { ticker: 'XEQT.TO', name: 'iShares Core Equity ETF', shares: 120, avgCost: 25.80, currentPrice: 34.12, assetClass: 'ETF', sector: 'Global Equity' },
];

export default function PortfolioPage() {
  const [askAIOpen, setAskAIOpen] = useState(false);
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiAnswer, setAiAnswer] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  const enriched = DEMO_HOLDINGS.map((h) => ({
    ...h,
    totalValue: h.currentPrice * h.shares,
    totalCost: h.avgCost * h.shares,
    gainLoss: (h.currentPrice - h.avgCost) * h.shares,
    gainLossPct: (h.currentPrice - h.avgCost) / h.avgCost,
  }));

  const totalValue = enriched.reduce((s, h) => s + h.totalValue, 0);
  const totalCost = enriched.reduce((s, h) => s + h.totalCost, 0);
  const totalGainLoss = totalValue - totalCost;
  const totalGainLossPct = totalGainLoss / totalCost;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Investment Portfolio</h1>
        <div className="flex gap-2">
          <button className="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm hover:bg-muted transition-colors">
            <RefreshCw className="h-4 w-4" /> Sync
          </button>
          <button className="flex items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-2 text-sm text-white hover:bg-brand-600 transition-colors">
            <Plus className="h-4 w-4" /> Add Holding
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 p-6 text-white">
        <p className="text-sm text-brand-200">Total Portfolio Value</p>
        <p className="text-4xl font-bold mt-1">${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        <div className="flex items-center gap-2 mt-2">
          {totalGainLoss >= 0 ? <TrendingUp className="h-4 w-4 text-green-300" /> : <TrendingDown className="h-4 w-4 text-red-300" />}
          <p className={`text-sm ${totalGainLoss >= 0 ? 'text-green-300' : 'text-red-300'}`}>
            {totalGainLoss >= 0 ? '+' : ''}${totalGainLoss.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({(totalGainLossPct * 100).toFixed(2)}%) all time
          </p>
        </div>
        <div className="grid grid-cols-3 gap-4 mt-5 pt-4 border-t border-brand-500">
          <div>
            <p className="text-xs text-brand-300">Cost Basis</p>
            <p className="font-semibold">${totalCost.toLocaleString('en-US', { maximumFractionDigits: 0 })}</p>
          </div>
          <div>
            <p className="text-xs text-brand-300">Holdings</p>
            <p className="font-semibold">{enriched.length}</p>
          </div>
          <div>
            <p className="text-xs text-brand-300">Currency</p>
            <p className="font-semibold">USD/CAD</p>
          </div>
        </div>
      </div>

      {/* Allocation by Asset Class */}
      <div className="rounded-xl border bg-card p-5">
        <h2 className="font-semibold mb-4">Allocation by Asset Class</h2>
        {[
          { label: 'ETF', value: enriched.filter((h) => h.assetClass === 'ETF').reduce((s, h) => s + h.totalValue, 0) },
          { label: 'Stock', value: enriched.filter((h) => h.assetClass === 'STOCK').reduce((s, h) => s + h.totalValue, 0) },
          { label: 'Crypto', value: enriched.filter((h) => h.assetClass === 'CRYPTO').reduce((s, h) => s + h.totalValue, 0) },
        ].map((slice) => (
          <div key={slice.label} className="mb-3">
            <div className="flex items-center justify-between mb-1 text-sm">
              <span className="font-medium">{slice.label}</span>
              <span className="text-muted-foreground">{((slice.value / totalValue) * 100).toFixed(1)}%  ·  ${slice.value.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
            </div>
            <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-brand-500 rounded-full" style={{ width: `${(slice.value / totalValue) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>

      {/* Holdings Table */}
      <div>
        <h2 className="font-semibold mb-3">Holdings</h2>
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  {['Ticker', 'Name', 'Shares', 'Avg Cost', 'Current', 'Value', 'Gain/Loss', 'G/L %'].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {enriched.map((h) => (
                  <tr key={h.ticker} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-semibold text-brand-600">{h.ticker}</td>
                    <td className="px-4 py-3 text-muted-foreground max-w-[160px] truncate">{h.name}</td>
                    <td className="px-4 py-3">{h.shares}</td>
                    <td className="px-4 py-3">${h.avgCost.toLocaleString()}</td>
                    <td className="px-4 py-3 font-medium">${h.currentPrice.toLocaleString()}</td>
                    <td className="px-4 py-3 font-semibold">${h.totalValue.toLocaleString('en-US', { maximumFractionDigits: 0 })}</td>
                    <td className={`px-4 py-3 font-medium ${h.gainLoss >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {h.gainLoss >= 0 ? '+' : ''}${h.gainLoss.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                    </td>
                    <td className={`px-4 py-3 font-medium ${h.gainLossPct >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {h.gainLossPct >= 0 ? '+' : ''}{(h.gainLossPct * 100).toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Ask AI */}
      <div className="rounded-2xl border bg-card p-5">
        <div className="flex items-center gap-2 mb-3">
          <MessageCircle className="h-5 w-5 text-brand-500" />
          <h2 className="font-semibold">Ask AI about your portfolio</h2>
        </div>
        <div className="flex gap-2">
          <input
            value={aiQuestion}
            onChange={(e) => setAiQuestion(e.target.value)}
            placeholder="Should I rebalance? Am I over-weighted in tech?"
            className="flex-1 rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            onKeyDown={(e) => e.key === 'Enter' && setAskAIOpen(true)}
          />
          <button
            disabled={!aiQuestion || aiLoading}
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50 transition-colors"
          >
            Ask
          </button>
        </div>
        <div className="mt-2 flex gap-2 flex-wrap">
          {['Should I rebalance?', 'Am I over-exposed to tech?', 'Tax-loss harvesting opportunities?'].map((q) => (
            <button
              key={q}
              onClick={() => setAiQuestion(q)}
              className="rounded-md bg-muted px-2.5 py-1 text-xs hover:bg-brand-100 dark:hover:bg-brand-900 transition-colors"
            >
              {q}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
