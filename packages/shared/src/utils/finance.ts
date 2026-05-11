// ═══════════════════════════════════════════════════════════════
// Financial Calculation Utilities
// All monetary amounts are in lowest denomination (cents avoided
// by using Decimal-safe number arithmetic rounded to 4dp).
// ═══════════════════════════════════════════════════════════════

import { DebtStrategy, DebtPayoffSchedule, AmortizationRow, TaxEstimate, MonteCarloResult } from '../types';

// ──────────────────────────────────────
// CORE HELPERS
// ──────────────────────────────────────

export const round = (n: number, dp = 2): number =>
  Math.round((n + Number.EPSILON) * 10 ** dp) / 10 ** dp;

export const pv = (rate: number, nper: number, pmt: number, fv = 0): number => {
  if (rate === 0) return -(pmt * nper + fv);
  return -(pmt * ((1 - (1 + rate) ** -nper) / rate) + fv * (1 + rate) ** -nper);
};

export const fvCalc = (rate: number, nper: number, pmt: number, pv = 0): number => {
  if (rate === 0) return -(pmt * nper + pv);
  return -(pmt * (((1 + rate) ** nper - 1) / rate) + pv * (1 + rate) ** nper);
};

export const pmt = (rate: number, nper: number, pv: number, fv = 0): number => {
  if (rate === 0) return -(pv + fv) / nper;
  return (rate * (pv * (1 + rate) ** nper + fv)) / ((1 + rate) ** nper - 1);
};

// ──────────────────────────────────────
// MORTGAGE / LOAN AMORTIZATION
// ──────────────────────────────────────

export interface MortgageInput {
  principal: number;     // loan amount
  annualRate: number;    // e.g. 0.065 for 6.5%
  termYears: number;
  extraMonthlyPayment?: number;
}

export interface MortgageResult {
  monthlyPayment: number;
  totalPayment: number;
  totalInterest: number;
  payoffMonths: number;
  schedule: AmortizationRow[];
}

export function calculateMortgage(input: MortgageInput): MortgageResult {
  const { principal, annualRate, termYears, extraMonthlyPayment = 0 } = input;
  const monthlyRate = annualRate / 12;
  const nper = termYears * 12;
  const monthlyPayment = round(-pmt(monthlyRate, nper, principal), 2);
  const totalMonthly = monthlyPayment + extraMonthlyPayment;

  const schedule: AmortizationRow[] = [];
  let balance = principal;
  let totalInterestPaid = 0;
  let period = 0;

  while (balance > 0.01 && period < 600) {
    period++;
    const interestCharge = round(balance * monthlyRate, 4);
    const principalCharge = Math.min(round(totalMonthly - interestCharge, 4), balance);
    balance = round(balance - principalCharge, 4);
    totalInterestPaid = round(totalInterestPaid + interestCharge, 4);

    schedule.push({
      period,
      payment: round(principalCharge + interestCharge, 2),
      principal: principalCharge,
      interest: interestCharge,
      balance: Math.max(balance, 0),
      totalInterestPaid,
    });

    if (balance <= 0) break;
  }

  return {
    monthlyPayment,
    totalPayment: round(schedule.reduce((s, r) => s + r.payment, 0), 2),
    totalInterest: round(totalInterestPaid, 2),
    payoffMonths: period,
    schedule,
  };
}

// ──────────────────────────────────────
// DEBT PAYOFF (SNOWBALL / AVALANCHE)
// ──────────────────────────────────────

export interface DebtInput {
  id: string;
  name: string;
  balance: number;
  interestRate: number;  // APR e.g. 0.199 for 19.9%
  minimumPayment: number;
}

export function calculateDebtPayoff(
  debts: DebtInput[],
  extraMonthly: number,
  strategy: DebtStrategy
): DebtPayoffSchedule {
  const sorted = [...debts].sort((a, b) =>
    strategy === 'SNOWBALL'
      ? a.balance - b.balance
      : b.interestRate - a.interestRate
  );

  const balances = sorted.map((d) => ({ ...d, remaining: d.balance }));
  const schedule: DebtPayoffSchedule['monthlySchedule'] = [];
  let month = 0;
  let totalInterest = 0;
  let totalPaid = 0;

  while (balances.some((b) => b.remaining > 0.01) && month < 600) {
    month++;
    let available = extraMonthly + balances.reduce((s, d) => s + d.minimumPayment, 0);

    for (const debt of balances) {
      if (debt.remaining <= 0) continue;

      const monthlyRate = debt.interestRate / 12;
      const interest = round(debt.remaining * monthlyRate, 4);
      totalInterest += interest;

      const minPay = Math.min(debt.minimumPayment, debt.remaining + interest);
      const payment = Math.min(available, debt.remaining + interest);
      const principal = round(payment - interest, 4);

      debt.remaining = round(Math.max(0, debt.remaining - principal), 4);
      available -= payment;
      totalPaid += payment;

      schedule.push({
        month,
        debtId: debt.id,
        payment: round(payment, 2),
        principal: round(principal, 2),
        interest: round(interest, 2),
        remainingBalance: debt.remaining,
      });

      if (debt.remaining <= 0 && strategy === 'SNOWBALL') {
        // freed minimum cascades to next debt
      }
    }
  }

  const payoffDate = new Date();
  payoffDate.setMonth(payoffDate.getMonth() + month);

  return {
    strategy,
    payoffDate,
    totalInterestPaid: round(totalInterest, 2),
    totalPaid: round(totalPaid, 2),
    monthlySchedule: schedule,
  };
}

// ──────────────────────────────────────
// SAVINGS GOAL PROJECTOR
// ──────────────────────────────────────

export function projectSavingsGoal(
  currentAmount: number,
  monthlyContrib: number,
  annualReturnRate: number,
  targetAmount: number
): { monthsToGoal: number; projectedDate: Date; amountAtTarget: number } {
  const monthlyRate = annualReturnRate / 12;
  let balance = currentAmount;
  let months = 0;

  while (balance < targetAmount && months < 1200) {
    balance = balance * (1 + monthlyRate) + monthlyContrib;
    months++;
  }

  const projectedDate = new Date();
  projectedDate.setMonth(projectedDate.getMonth() + months);

  return { monthsToGoal: months, projectedDate, amountAtTarget: round(balance, 2) };
}

// ──────────────────────────────────────
// NET WORTH
// ──────────────────────────────────────

export function calculateNetWorth(
  assets: Array<{ amount: number; type: string }>,
  liabilities: Array<{ amount: number; type: string }>
): { netWorth: number; totalAssets: number; totalLiabilities: number } {
  const totalAssets = round(assets.reduce((s, a) => s + a.amount, 0), 2);
  const totalLiabilities = round(liabilities.reduce((s, l) => s + l.amount, 0), 2);
  return { netWorth: round(totalAssets - totalLiabilities, 2), totalAssets, totalLiabilities };
}

// ──────────────────────────────────────
// TAX ESTIMATOR
// ──────────────────────────────────────

interface TaxBracket {
  min: number;
  max: number | null;
  rate: number;
}

const US_BRACKETS_2024_SINGLE: TaxBracket[] = [
  { min: 0, max: 11600, rate: 0.10 },
  { min: 11600, max: 47150, rate: 0.12 },
  { min: 47150, max: 100525, rate: 0.22 },
  { min: 100525, max: 191950, rate: 0.24 },
  { min: 191950, max: 243725, rate: 0.32 },
  { min: 243725, max: 609350, rate: 0.35 },
  { min: 609350, max: null, rate: 0.37 },
];

const CA_FEDERAL_BRACKETS_2024: TaxBracket[] = [
  { min: 0, max: 55867, rate: 0.15 },
  { min: 55867, max: 111733, rate: 0.205 },
  { min: 111733, max: 154906, rate: 0.26 },
  { min: 154906, max: 220000, rate: 0.29 },
  { min: 220000, max: null, rate: 0.33 },
];

function computeTaxFromBrackets(
  taxableIncome: number,
  brackets: TaxBracket[]
): { totalTax: number; marginalRate: number; bracketDetails: TaxEstimate['brackets'] } {
  let totalTax = 0;
  let marginalRate = brackets[0].rate;
  const bracketDetails: TaxEstimate['brackets'] = [];

  for (const bracket of brackets) {
    if (taxableIncome <= 0) break;
    const taxable = bracket.max
      ? Math.min(taxableIncome, bracket.max - bracket.min)
      : taxableIncome;
    const taxOwed = round(taxable * bracket.rate, 2);
    totalTax += taxOwed;
    taxableIncome -= taxable;
    marginalRate = bracket.rate;
    bracketDetails.push({ ...bracket, taxOwed });
  }

  return { totalTax: round(totalTax, 2), marginalRate, bracketDetails };
}

export function estimateTax(
  country: 'US' | 'CA',
  grossIncome: number,
  deductions = 0,
  taxYear = 2024
): TaxEstimate {
  const standardDeduction = country === 'US' ? 14600 : 0;
  const totalDeductions = Math.max(deductions, standardDeduction);
  const taxableIncome = Math.max(0, grossIncome - totalDeductions);

  const brackets = country === 'US' ? US_BRACKETS_2024_SINGLE : CA_FEDERAL_BRACKETS_2024;
  const { totalTax, marginalRate, bracketDetails } = computeTaxFromBrackets(taxableIncome, brackets);

  return {
    country,
    taxYear,
    grossIncome,
    taxableIncome,
    federalTax: totalTax,
    totalTax,
    effectiveRate: grossIncome > 0 ? round(totalTax / grossIncome, 4) : 0,
    marginalRate,
    afterTaxIncome: round(grossIncome - totalTax, 2),
    brackets: bracketDetails,
  };
}

// ──────────────────────────────────────
// MONTE CARLO RETIREMENT SIMULATION
// ──────────────────────────────────────

export function runMonteCarlo(params: {
  initialValue: number;
  annualContrib: number;
  targetYears: number;
  targetAmount?: number;
  meanReturn?: number;
  stdDevReturn?: number;
  runs?: number;
}): MonteCarloResult {
  const {
    initialValue,
    annualContrib,
    targetYears,
    targetAmount,
    meanReturn = 0.07,
    stdDevReturn = 0.15,
    runs = 10000,
  } = params;

  const allPaths: number[][] = [];

  const normalRandom = (): number => {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  };

  for (let run = 0; run < runs; run++) {
    const path: number[] = [initialValue];
    let value = initialValue;
    for (let y = 1; y <= targetYears; y++) {
      const annualReturn = meanReturn + stdDevReturn * normalRandom();
      value = value * (1 + annualReturn) + annualContrib;
      path.push(round(Math.max(0, value), 2));
    }
    allPaths.push(path);
  }

  // Sort paths by final value to extract percentiles
  const finalValues = allPaths.map((p) => p[targetYears]).sort((a, b) => a - b);
  const p10Idx = Math.floor(runs * 0.1);
  const p50Idx = Math.floor(runs * 0.5);
  const p90Idx = Math.floor(runs * 0.9);

  const pathAt = (pct: number) => allPaths[Math.floor(runs * pct)];
  const sortedByFinal = [...allPaths].sort((a, b) => a[targetYears] - b[targetYears]);

  const years = Array.from({ length: targetYears + 1 }, (_, i) => i);
  const p10Path = sortedByFinal[p10Idx];
  const p50Path = sortedByFinal[p50Idx];
  const p90Path = sortedByFinal[p90Idx];

  const successCount = targetAmount
    ? finalValues.filter((v) => v >= targetAmount).length
    : runs;

  return {
    percentile10: p10Path,
    percentile50: p50Path,
    percentile90: p90Path,
    years,
    probabilityOfSuccess: round(successCount / runs, 4),
    medianFinalValue: round(finalValues[p50Idx], 2),
  };
}

// ──────────────────────────────────────
// PORTFOLIO METRICS
// ──────────────────────────────────────

export function calculateSharpeRatio(
  returns: number[],   // monthly return decimals
  riskFreeRate = 0.04  // annual
): number {
  if (returns.length < 2) return 0;
  const monthlyRfr = riskFreeRate / 12;
  const excess = returns.map((r) => r - monthlyRfr);
  const mean = excess.reduce((s, r) => s + r, 0) / excess.length;
  const variance = excess.reduce((s, r) => s + (r - mean) ** 2, 0) / (excess.length - 1);
  const stdDev = Math.sqrt(variance);
  return stdDev === 0 ? 0 : round((mean / stdDev) * Math.sqrt(12), 4); // annualised
}

export function calculateMaxDrawdown(values: number[]): number {
  let peak = values[0];
  let maxDD = 0;
  for (const v of values) {
    if (v > peak) peak = v;
    const dd = (peak - v) / peak;
    if (dd > maxDD) maxDD = dd;
  }
  return round(maxDD, 4);
}

export function calculateVolatility(returns: number[]): number {
  if (returns.length < 2) return 0;
  const mean = returns.reduce((s, r) => s + r, 0) / returns.length;
  const variance = returns.reduce((s, r) => s + (r - mean) ** 2, 0) / (returns.length - 1);
  return round(Math.sqrt(variance) * Math.sqrt(12), 4); // annualised
}

// ──────────────────────────────────────
// DCF VALUATION
// ──────────────────────────────────────

export interface DCFInput {
  revenues: number[];         // projected revenues by year
  ebitdaMargin: number;       // e.g. 0.25
  taxRate: number;            // e.g. 0.21
  capexPct: number;           // capex as % of revenue
  nwcChangePct: number;       // NWC change as % of revenue
  wacc: number;               // weighted average cost of capital
  terminalGrowthRate: number; // perpetuity growth rate
  sharesOutstanding?: number;
  netDebt?: number;
}

export interface DCFResult {
  fcfsByYear: number[];
  pvFCFs: number[];
  terminalValue: number;
  pvTerminalValue: number;
  enterpriseValue: number;
  equityValue?: number;
  intrinsicValuePerShare?: number;
}

export function calculateDCF(input: DCFInput): DCFResult {
  const { revenues, ebitdaMargin, taxRate, capexPct, nwcChangePct, wacc, terminalGrowthRate, sharesOutstanding, netDebt = 0 } = input;

  const fcfsByYear = revenues.map((rev) => {
    const ebitda = rev * ebitdaMargin;
    const nopat = ebitda * (1 - taxRate);
    const capex = rev * capexPct;
    const nwcChange = rev * nwcChangePct;
    return round(nopat - capex - nwcChange, 2);
  });

  const pvFCFs = fcfsByYear.map((fcf, i) => round(fcf / (1 + wacc) ** (i + 1), 2));
  const lastFCF = fcfsByYear[fcfsByYear.length - 1];
  const terminalValue = round((lastFCF * (1 + terminalGrowthRate)) / (wacc - terminalGrowthRate), 2);
  const pvTerminalValue = round(terminalValue / (1 + wacc) ** fcfsByYear.length, 2);
  const enterpriseValue = round(pvFCFs.reduce((s, v) => s + v, 0) + pvTerminalValue, 2);
  const equityValue = sharesOutstanding !== undefined ? round(enterpriseValue - netDebt, 2) : undefined;
  const intrinsicValuePerShare =
    equityValue !== undefined && sharesOutstanding
      ? round(equityValue / sharesOutstanding, 2)
      : undefined;

  return { fcfsByYear, pvFCFs, terminalValue, pvTerminalValue, enterpriseValue, equityValue, intrinsicValuePerShare };
}

// ──────────────────────────────────────
// OPTIONS P&L
// ──────────────────────────────────────

export function optionPayoff(
  type: 'call' | 'put',
  position: 'long' | 'short',
  strike: number,
  premium: number,
  stockPrices: number[]
): number[] {
  return stockPrices.map((s) => {
    const intrinsic = type === 'call' ? Math.max(0, s - strike) : Math.max(0, strike - s);
    const gross = intrinsic - premium;
    return round(position === 'long' ? gross : -gross, 2);
  });
}

// ──────────────────────────────────────
// CURRENCY & FORMATTING
// ──────────────────────────────────────

export function formatCurrency(amount: number, currency: string = 'USD', locale = 'en-US'): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount);
}

export function formatPercent(ratio: number, dp = 2): string {
  return `${(ratio * 100).toFixed(dp)}%`;
}
