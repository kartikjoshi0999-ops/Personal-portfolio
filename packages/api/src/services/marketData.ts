// ═══════════════════════════════════════════════════════════════
// Market Data Service
// Sources: Finnhub (free 60/min) → Alpha Vantage (free 25/day) → Yahoo Finance
// ═══════════════════════════════════════════════════════════════

import axios from 'axios';

const FINNHUB_BASE = 'https://finnhub.io/api/v1';
const AV_BASE = 'https://www.alphavantage.co/query';
const COINGECKO_BASE = 'https://api.coingecko.com/api/v3';

// ──────────────────────────────────────
// STOCK QUOTE
// ──────────────────────────────────────

export interface StockQuote {
  ticker: string;
  name?: string;
  price: number;
  change: number;
  changePct: number;
  high52w?: number;
  low52w?: number;
  volume?: number;
  marketCap?: number;
  peRatio?: number;
  dividendYield?: number;
  currency: string;
  updatedAt: Date;
}

export async function getStockQuote(ticker: string): Promise<StockQuote> {
  try {
    return await getFinnhubQuote(ticker);
  } catch {
    try {
      return await getAlphaVantageQuote(ticker);
    } catch {
      throw new Error(`Unable to fetch quote for ${ticker}`);
    }
  }
}

async function getFinnhubQuote(ticker: string): Promise<StockQuote> {
  const [quoteRes, profileRes] = await Promise.allSettled([
    axios.get(`${FINNHUB_BASE}/quote`, {
      params: { symbol: ticker, token: process.env.FINNHUB_API_KEY },
      timeout: 8000,
    }),
    axios.get(`${FINNHUB_BASE}/stock/profile2`, {
      params: { symbol: ticker, token: process.env.FINNHUB_API_KEY },
      timeout: 8000,
    }),
  ]);

  const quote = quoteRes.status === 'fulfilled' ? quoteRes.value.data : null;
  const profile = profileRes.status === 'fulfilled' ? profileRes.value.data : null;

  if (!quote || !quote.c) throw new Error('No quote data from Finnhub');

  return {
    ticker,
    name: profile?.name,
    price: quote.c,
    change: quote.d,
    changePct: quote.dp,
    high52w: quote.h,
    low52w: quote.l,
    marketCap: profile?.marketCapitalization ? profile.marketCapitalization * 1e6 : undefined,
    currency: profile?.currency ?? 'USD',
    updatedAt: new Date(),
  };
}

async function getAlphaVantageQuote(ticker: string): Promise<StockQuote> {
  const res = await axios.get(AV_BASE, {
    params: {
      function: 'GLOBAL_QUOTE',
      symbol: ticker,
      apikey: process.env.ALPHA_VANTAGE_API_KEY,
    },
    timeout: 10000,
  });

  const q = res.data['Global Quote'];
  if (!q || !q['05. price']) throw new Error('No data from Alpha Vantage');

  return {
    ticker,
    price: parseFloat(q['05. price']),
    change: parseFloat(q['09. change']),
    changePct: parseFloat(q['10. change percent'].replace('%', '')),
    volume: parseInt(q['06. volume']),
    currency: 'USD',
    updatedAt: new Date(),
  };
}

// ──────────────────────────────────────
// BATCH QUOTES
// ──────────────────────────────────────

export async function getBatchQuotes(tickers: string[]): Promise<Map<string, StockQuote>> {
  const results = await Promise.allSettled(tickers.map((t) => getStockQuote(t)));
  const map = new Map<string, StockQuote>();
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') map.set(tickers[i], r.value);
  });
  return map;
}

// ──────────────────────────────────────
// CRYPTO PRICES (CoinGecko — free tier)
// ──────────────────────────────────────

export async function getCryptoPrices(
  coinIds: string[],  // e.g. ["bitcoin", "ethereum"]
  currency = 'usd'
): Promise<Record<string, { price: number; change24h: number }>> {
  const headers: Record<string, string> = {};
  if (process.env.COINGECKO_API_KEY) {
    headers['x-cg-demo-api-key'] = process.env.COINGECKO_API_KEY;
  }

  const res = await axios.get(`${COINGECKO_BASE}/simple/price`, {
    params: {
      ids: coinIds.join(','),
      vs_currencies: currency,
      include_24hr_change: 'true',
    },
    headers,
    timeout: 10000,
  });

  const out: Record<string, { price: number; change24h: number }> = {};
  for (const [id, data] of Object.entries(res.data as Record<string, Record<string, number>>)) {
    out[id] = {
      price: data[currency],
      change24h: data[`${currency}_24h_change`] ?? 0,
    };
  }
  return out;
}

// ──────────────────────────────────────
// HISTORICAL PRICES (for charts)
// ──────────────────────────────────────

export interface OHLCV {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export async function getHistoricalPrices(ticker: string, outputSize: 'compact' | 'full' = 'compact'): Promise<OHLCV[]> {
  const res = await axios.get(AV_BASE, {
    params: {
      function: 'TIME_SERIES_DAILY_ADJUSTED',
      symbol: ticker,
      outputsize: outputSize,
      apikey: process.env.ALPHA_VANTAGE_API_KEY,
    },
    timeout: 15000,
  });

  const series = res.data['Time Series (Daily)'];
  if (!series) throw new Error(`No historical data for ${ticker}`);

  return Object.entries(series)
    .map(([date, d]: [string, Record<string, string>]) => ({
      date,
      open: parseFloat(d['1. open']),
      high: parseFloat(d['2. high']),
      low: parseFloat(d['3. low']),
      close: parseFloat(d['5. adjusted close']),
      volume: parseInt(d['6. volume']),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

// ──────────────────────────────────────
// FX RATES
// ──────────────────────────────────────

export async function getFXRate(from: string, to: string): Promise<number> {
  const res = await axios.get(AV_BASE, {
    params: {
      function: 'CURRENCY_EXCHANGE_RATE',
      from_currency: from,
      to_currency: to,
      apikey: process.env.ALPHA_VANTAGE_API_KEY,
    },
    timeout: 8000,
  });

  const rate = res.data?.['Realtime Currency Exchange Rate']?.['5. Exchange Rate'];
  if (!rate) throw new Error(`Cannot fetch ${from}/${to} rate`);
  return parseFloat(rate);
}
