// ═══════════════════════════════════════════════════════════════
// Financial Calculation Unit Tests
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest';
import {
  round,
  pmt,
  fvCalc,
  calculateMortgage,
  calculateDebtPayoff,
  projectSavingsGoal,
  calculateNetWorth,
  estimateTax,
  runMonteCarlo,
  calculateDCF,
  calculateSharpeRatio,
  calculateMaxDrawdown,
  calculateVolatility,
  optionPayoff,
  formatCurrency,
  formatPercent,
} from './finance';

// ──────────────────────────────────────
// HELPERS
// ──────────────────────────────────────

describe('round', () => {
  it('rounds to 2 decimal places by default', () => {
    expect(round(1.005)).toBe(1.01);
    expect(round(3.14159)).toBe(3.14);
  });

  it('rounds to specified decimal places', () => {
    expect(round(3.14159, 4)).toBe(3.1416);
    expect(round(100.1234, 0)).toBe(100);
  });
});

describe('pmt', () => {
  it('calculates monthly payment for $200k mortgage at 6% for 30 years', () => {
    const monthlyRate = 0.06 / 12;
    const nper = 30 * 12;
    const result = -pmt(monthlyRate, nper, 200000);
    expect(result).toBeCloseTo(1199.1, 0);
  });

  it('returns correct payment with zero rate', () => {
    const result = -pmt(0, 12, 1200);
    expect(result).toBe(100);
  });
});

describe('fvCalc', () => {
  it('calculates future value of $1000/month for 10 years at 7%', () => {
    const fv = -fvCalc(0.07 / 12, 120, 1000, 0);
    expect(fv).toBeGreaterThan(173_000);
    expect(fv).toBeLessThan(175_000);
  });
});

// ──────────────────────────────────────
// MORTGAGE
// ──────────────────────────────────────

describe('calculateMortgage', () => {
  it('calculates correct monthly payment', () => {
    const result = calculateMortgage({ principal: 300000, annualRate: 0.065, termYears: 25 });
    expect(result.monthlyPayment).toBeCloseTo(2019, 0);
  });

  it('total interest is positive', () => {
    const result = calculateMortgage({ principal: 300000, annualRate: 0.065, termYears: 25 });
    expect(result.totalInterest).toBeGreaterThan(0);
  });

  it('extra payment reduces payoff months', () => {
    const standard = calculateMortgage({ principal: 300000, annualRate: 0.065, termYears: 25 });
    const withExtra = calculateMortgage({ principal: 300000, annualRate: 0.065, termYears: 25, extraMonthlyPayment: 500 });
    expect(withExtra.payoffMonths).toBeLessThan(standard.payoffMonths);
    expect(withExtra.totalInterest).toBeLessThan(standard.totalInterest);
  });

  it('schedule starts with correct balance', () => {
    const result = calculateMortgage({ principal: 100000, annualRate: 0.06, termYears: 30 });
    expect(result.schedule[0].balance).toBeLessThan(100000);
    expect(result.schedule[result.schedule.length - 1].balance).toBe(0);
  });

  it('total payment ≈ principal + total interest', () => {
    const result = calculateMortgage({ principal: 200000, annualRate: 0.05, termYears: 20 });
    expect(Math.abs(result.totalPayment - (200000 + result.totalInterest))).toBeLessThan(5);
  });
});

// ──────────────────────────────────────
// DEBT PAYOFF
// ──────────────────────────────────────

describe('calculateDebtPayoff', () => {
  const debts = [
    { id: '1', name: 'Credit Card', balance: 5000, interestRate: 0.199, minimumPayment: 100 },
    { id: '2', name: 'Student Loan', balance: 15000, interestRate: 0.065, minimumPayment: 200 },
  ];

  it('snowball pays smallest balance first', () => {
    const result = calculateDebtPayoff(debts, 200, 'SNOWBALL');
    expect(result.strategy).toBe('SNOWBALL');
    const firstDebtPaid = result.monthlySchedule.find(
      (r) => r.debtId === '1' && r.remainingBalance === 0
    );
    expect(firstDebtPaid).toBeDefined();
  });

  it('avalanche pays highest rate first', () => {
    const result = calculateDebtPayoff(debts, 200, 'AVALANCHE');
    expect(result.strategy).toBe('AVALANCHE');
  });

  it('avalanche costs less total interest than snowball', () => {
    const snowball = calculateDebtPayoff(debts, 0, 'SNOWBALL');
    const avalanche = calculateDebtPayoff(debts, 0, 'AVALANCHE');
    expect(avalanche.totalInterestPaid).toBeLessThanOrEqual(snowball.totalInterestPaid);
  });

  it('returns payoff date in the future', () => {
    const result = calculateDebtPayoff(debts, 0, 'SNOWBALL');
    expect(result.payoffDate.getTime()).toBeGreaterThan(Date.now());
  });
});

// ──────────────────────────────────────
// SAVINGS GOAL
// ──────────────────────────────────────

describe('projectSavingsGoal', () => {
  it('reaches target in reasonable time', () => {
    const result = projectSavingsGoal(0, 500, 0.06, 10000);
    expect(result.monthsToGoal).toBeGreaterThan(0);
    expect(result.amountAtTarget).toBeGreaterThanOrEqual(10000);
  });

  it('already-funded goal returns 0 months', () => {
    const result = projectSavingsGoal(10001, 0, 0, 10000);
    expect(result.monthsToGoal).toBe(0);
  });
});

// ──────────────────────────────────────
// NET WORTH
// ──────────────────────────────────────

describe('calculateNetWorth', () => {
  it('calculates correctly', () => {
    const result = calculateNetWorth(
      [{ amount: 50000, type: 'savings' }, { amount: 30000, type: 'investment' }],
      [{ amount: 15000, type: 'credit_card' }, { amount: 200000, type: 'mortgage' }]
    );
    expect(result.totalAssets).toBe(80000);
    expect(result.totalLiabilities).toBe(215000);
    expect(result.netWorth).toBe(-135000);
  });

  it('handles all assets and no liabilities', () => {
    const result = calculateNetWorth([{ amount: 100000, type: 'savings' }], []);
    expect(result.netWorth).toBe(100000);
  });
});

// ──────────────────────────────────────
// TAX ESTIMATOR
// ──────────────────────────────────────

describe('estimateTax (US 2024)', () => {
  it('taxes $50k income correctly (single)', () => {
    const result = estimateTax('US', 50000);
    expect(result.totalTax).toBeGreaterThan(0);
    expect(result.effectiveRate).toBeLessThan(0.25);
    expect(result.afterTaxIncome).toBe(round(50000 - result.totalTax, 2));
  });

  it('marginal rate for $250k is 35%', () => {
    const result = estimateTax('US', 250000);
    expect(result.marginalRate).toBe(0.35);
  });

  it('zero income results in zero tax', () => {
    const result = estimateTax('US', 0);
    expect(result.totalTax).toBe(0);
  });

  it('Canadian tax brackets work', () => {
    const result = estimateTax('CA', 80000);
    expect(result.country).toBe('CA');
    expect(result.federalTax).toBeGreaterThan(0);
    expect(result.marginalRate).toBe(0.205);
  });

  it('higher income → higher effective rate', () => {
    const low = estimateTax('US', 40000);
    const high = estimateTax('US', 200000);
    expect(high.effectiveRate).toBeGreaterThan(low.effectiveRate);
  });
});

// ──────────────────────────────────────
// MONTE CARLO
// ──────────────────────────────────────

describe('runMonteCarlo', () => {
  it('returns correct number of data points', () => {
    const result = runMonteCarlo({ initialValue: 100000, annualContrib: 12000, targetYears: 30 });
    expect(result.years.length).toBe(31); // 0..30
    expect(result.percentile50.length).toBe(31);
  });

  it('median final value is positive', () => {
    const result = runMonteCarlo({ initialValue: 50000, annualContrib: 6000, targetYears: 20 });
    expect(result.medianFinalValue).toBeGreaterThan(0);
  });

  it('p90 >= p50 >= p10', () => {
    const result = runMonteCarlo({ initialValue: 100000, annualContrib: 12000, targetYears: 30, runs: 1000 });
    const lastYear = result.years.length - 1;
    expect(result.percentile90[lastYear]).toBeGreaterThanOrEqual(result.percentile50[lastYear]);
    expect(result.percentile50[lastYear]).toBeGreaterThanOrEqual(result.percentile10[lastYear]);
  });

  it('probability of success is between 0 and 1', () => {
    const result = runMonteCarlo({
      initialValue: 100000,
      annualContrib: 10000,
      targetYears: 30,
      targetAmount: 500000,
      runs: 1000,
    });
    expect(result.probabilityOfSuccess).toBeGreaterThanOrEqual(0);
    expect(result.probabilityOfSuccess).toBeLessThanOrEqual(1);
  });
});

// ──────────────────────────────────────
// DCF VALUATION
// ──────────────────────────────────────

describe('calculateDCF', () => {
  const input = {
    revenues: [100e6, 120e6, 144e6, 172e6, 206e6],
    ebitdaMargin: 0.25,
    taxRate: 0.21,
    capexPct: 0.05,
    nwcChangePct: 0.02,
    wacc: 0.10,
    terminalGrowthRate: 0.03,
    sharesOutstanding: 10e6,
    netDebt: 50e6,
  };

  it('calculates positive enterprise value', () => {
    const result = calculateDCF(input);
    expect(result.enterpriseValue).toBeGreaterThan(0);
  });

  it('terminal value is positive', () => {
    const result = calculateDCF(input);
    expect(result.terminalValue).toBeGreaterThan(0);
    expect(result.pvTerminalValue).toBeGreaterThan(0);
  });

  it('intrinsic value per share is positive', () => {
    const result = calculateDCF(input);
    expect(result.intrinsicValuePerShare).toBeGreaterThan(0);
  });

  it('enterprise value > equity value when there is net debt', () => {
    const result = calculateDCF(input);
    expect(result.enterpriseValue).toBeGreaterThan(result.equityValue!);
  });
});

// ──────────────────────────────────────
// PORTFOLIO ANALYTICS
// ──────────────────────────────────────

describe('calculateSharpeRatio', () => {
  it('returns 0 for empty or single-element array', () => {
    expect(calculateSharpeRatio([])).toBe(0);
    expect(calculateSharpeRatio([0.01])).toBe(0);
  });

  it('returns higher value for consistent positive returns', () => {
    const goodReturns = Array(24).fill(0.01); // 1%/month consistently
    const badReturns = Array(12).fill(0.05).concat(Array(12).fill(-0.03)); // volatile
    expect(calculateSharpeRatio(goodReturns)).toBeGreaterThan(calculateSharpeRatio(badReturns));
  });
});

describe('calculateMaxDrawdown', () => {
  it('returns 0 for monotonically increasing values', () => {
    expect(calculateMaxDrawdown([100, 110, 120, 130])).toBe(0);
  });

  it('calculates correct drawdown for known scenario', () => {
    // Peak at 100, trough at 50 → 50% drawdown
    const result = calculateMaxDrawdown([100, 90, 80, 50, 60, 70]);
    expect(result).toBeCloseTo(0.5, 2);
  });
});

describe('calculateVolatility', () => {
  it('returns 0 for constant returns', () => {
    expect(calculateVolatility([0.01, 0.01, 0.01, 0.01, 0.01])).toBe(0);
  });

  it('returns higher value for more variable returns', () => {
    const stable = Array(12).fill(0.01);
    const volatile = [0.1, -0.05, 0.08, -0.04, 0.12, -0.06, 0.09, -0.03, 0.07, -0.05, 0.11, -0.07];
    expect(calculateVolatility(volatile)).toBeGreaterThan(calculateVolatility(stable));
  });
});

// ──────────────────────────────────────
// OPTIONS
// ──────────────────────────────────────

describe('optionPayoff', () => {
  const prices = [90, 95, 100, 105, 110];

  it('long call is profitable above strike + premium', () => {
    const payoffs = optionPayoff('call', 'long', 100, 5, prices);
    expect(payoffs[0]).toBe(-5); // at $90, OTM
    expect(payoffs[2]).toBe(-5); // at $100, at strike
    expect(payoffs[4]).toBe(5);  // at $110, ITM: 10 - 5
  });

  it('long put is profitable below strike - premium', () => {
    const payoffs = optionPayoff('put', 'long', 100, 3, prices);
    expect(payoffs[4]).toBe(-3); // at $110, OTM
    expect(payoffs[0]).toBe(7);  // at $90, ITM: 10 - 3
  });

  it('short call is mirror of long call', () => {
    const long = optionPayoff('call', 'long', 100, 5, prices);
    const short = optionPayoff('call', 'short', 100, 5, prices);
    long.forEach((v, i) => expect(short[i]).toBeCloseTo(-v, 5));
  });
});

// ──────────────────────────────────────
// FORMATTING
// ──────────────────────────────────────

describe('formatCurrency', () => {
  it('formats USD correctly', () => {
    expect(formatCurrency(1234.56)).toBe('$1,234.56');
  });

  it('formats CAD correctly', () => {
    expect(formatCurrency(1000, 'CAD', 'en-CA')).toContain('1,000');
  });
});

describe('formatPercent', () => {
  it('formats ratio as percent', () => {
    expect(formatPercent(0.1567)).toBe('15.67%');
    expect(formatPercent(0.1567, 1)).toBe('15.7%');
  });
});
