// ═══════════════════════════════════════════════════════════════
// Statistics Utilities
// ═══════════════════════════════════════════════════════════════

import { DescriptiveStats, RegressionResult, HypothesisTestResult } from '../types';
import { round } from './finance';

// ──────────────────────────────────────
// DESCRIPTIVE STATISTICS
// ──────────────────────────────────────

export function descriptiveStats(data: number[]): DescriptiveStats {
  if (data.length === 0) throw new Error('Empty dataset');
  const sorted = [...data].sort((a, b) => a - b);
  const n = data.length;

  const mean = data.reduce((s, v) => s + v, 0) / n;

  const median =
    n % 2 === 0
      ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
      : sorted[Math.floor(n / 2)];

  // mode (may be multi-modal)
  const freq: Record<number, number> = {};
  for (const v of data) freq[v] = (freq[v] ?? 0) + 1;
  const maxFreq = Math.max(...Object.values(freq));
  const mode = Object.entries(freq)
    .filter(([, f]) => f === maxFreq)
    .map(([v]) => Number(v));

  const variance =
    n > 1
      ? data.reduce((s, v) => s + (v - mean) ** 2, 0) / (n - 1)
      : 0;
  const stdDev = Math.sqrt(variance);

  // Skewness (Fisher-Pearson)
  const skewness =
    stdDev === 0
      ? 0
      : (data.reduce((s, v) => s + ((v - mean) / stdDev) ** 3, 0) / n);

  // Excess kurtosis
  const kurtosis =
    stdDev === 0
      ? 0
      : data.reduce((s, v) => s + ((v - mean) / stdDev) ** 4, 0) / n - 3;

  const q1 = quantile(sorted, 0.25);
  const q3 = quantile(sorted, 0.75);

  return {
    count: n,
    mean: round(mean, 6),
    median: round(median, 6),
    mode,
    variance: round(variance, 6),
    stdDev: round(stdDev, 6),
    min: sorted[0],
    max: sorted[n - 1],
    range: round(sorted[n - 1] - sorted[0], 6),
    skewness: round(skewness, 6),
    kurtosis: round(kurtosis, 6),
    q1: round(q1, 6),
    q3: round(q3, 6),
    iqr: round(q3 - q1, 6),
    percentiles: {
      '5': round(quantile(sorted, 0.05), 6),
      '10': round(quantile(sorted, 0.1), 6),
      '25': round(q1, 6),
      '75': round(q3, 6),
      '90': round(quantile(sorted, 0.9), 6),
      '95': round(quantile(sorted, 0.95), 6),
    },
  };
}

export function quantile(sorted: number[], q: number): number {
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sorted[base + 1] !== undefined) {
    return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
  }
  return sorted[base];
}

// ──────────────────────────────────────
// CORRELATION & COVARIANCE
// ──────────────────────────────────────

export function pearsonCorrelation(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length < 2) throw new Error('Arrays must have equal length ≥ 2');
  const n = x.length;
  const meanX = x.reduce((s, v) => s + v, 0) / n;
  const meanY = y.reduce((s, v) => s + v, 0) / n;
  const num = x.reduce((s, xi, i) => s + (xi - meanX) * (y[i] - meanY), 0);
  const denX = Math.sqrt(x.reduce((s, xi) => s + (xi - meanX) ** 2, 0));
  const denY = Math.sqrt(y.reduce((s, yi) => s + (yi - meanY) ** 2, 0));
  if (denX === 0 || denY === 0) return 0;
  return round(num / (denX * denY), 6);
}

// ──────────────────────────────────────
// SIMPLE LINEAR REGRESSION
// ──────────────────────────────────────

export function linearRegression(x: number[], y: number[]): RegressionResult {
  if (x.length !== y.length || x.length < 2) throw new Error('Invalid data');
  const n = x.length;
  const meanX = x.reduce((s, v) => s + v, 0) / n;
  const meanY = y.reduce((s, v) => s + v, 0) / n;

  const ssXX = x.reduce((s, xi) => s + (xi - meanX) ** 2, 0);
  const ssXY = x.reduce((s, xi, i) => s + (xi - meanX) * (y[i] - meanY), 0);
  const ssYY = y.reduce((s, yi) => s + (yi - meanY) ** 2, 0);

  const slope = ssXX === 0 ? 0 : ssXY / ssXX;
  const intercept = meanY - slope * meanX;

  const yHat = x.map((xi) => slope * xi + intercept);
  const sse = y.reduce((s, yi, i) => s + (yi - yHat[i]) ** 2, 0);
  const rSquared = ssYY === 0 ? 1 : round(1 - sse / ssYY, 6);
  const adjustedRSquared = round(1 - ((1 - rSquared) * (n - 1)) / (n - 2), 6);

  // Standard error of slope
  const mse = n > 2 ? sse / (n - 2) : 0;
  const seSlope = ssXX === 0 ? 0 : Math.sqrt(mse / ssXX);
  const tStat = seSlope === 0 ? 0 : slope / seSlope;
  const pValue = round(2 * (1 - tDistCDF(Math.abs(tStat), n - 2)), 6);
  const fStatistic = mse === 0 ? 0 : round((ssYY - sse) / mse, 4);

  return {
    type: 'linear',
    coefficients: [round(slope, 6)],
    intercept: round(intercept, 6),
    rSquared,
    adjustedRSquared,
    pValues: [round(pValue, 6)],
    standardErrors: [round(seSlope, 6)],
    fStatistic,
  };
}

// ──────────────────────────────────────
// T-TEST (one-sample, two-sample, paired)
// ──────────────────────────────────────

export function oneSampleTTest(
  sample: number[],
  populationMean: number,
  alpha = 0.05
): HypothesisTestResult {
  const n = sample.length;
  const stats = descriptiveStats(sample);
  const se = stats.stdDev / Math.sqrt(n);
  const t = se === 0 ? 0 : (stats.mean - populationMean) / se;
  const df = n - 1;
  const pValue = round(2 * (1 - tDistCDF(Math.abs(t), df)), 6);

  return {
    testType: 'One-Sample T-Test',
    statistic: round(t, 4),
    pValue,
    degreesOfFreedom: df,
    rejectNull: pValue < alpha,
    interpretation: buildTTestInterpretation(pValue, alpha, populationMean, stats.mean, 'one-sample'),
  };
}

export function twoSampleTTest(
  sampleA: number[],
  sampleB: number[],
  alpha = 0.05
): HypothesisTestResult {
  const statsA = descriptiveStats(sampleA);
  const statsB = descriptiveStats(sampleB);
  const nA = sampleA.length;
  const nB = sampleB.length;

  // Welch's t-test (unequal variances)
  const se = Math.sqrt(statsA.variance / nA + statsB.variance / nB);
  const t = se === 0 ? 0 : (statsA.mean - statsB.mean) / se;

  // Welch-Satterthwaite df
  const df = round(
    (statsA.variance / nA + statsB.variance / nB) ** 2 /
    ((statsA.variance / nA) ** 2 / (nA - 1) + (statsB.variance / nB) ** 2 / (nB - 1)),
    0
  );

  const pValue = round(2 * (1 - tDistCDF(Math.abs(t), df)), 6);

  return {
    testType: "Welch's Two-Sample T-Test",
    statistic: round(t, 4),
    pValue,
    degreesOfFreedom: df,
    rejectNull: pValue < alpha,
    interpretation: buildTTestInterpretation(pValue, alpha, statsB.mean, statsA.mean, 'two-sample'),
  };
}

// ──────────────────────────────────────
// CHI-SQUARE GOODNESS OF FIT
// ──────────────────────────────────────

export function chiSquareGoodnessOfFit(
  observed: number[],
  expected: number[],
  alpha = 0.05
): HypothesisTestResult {
  if (observed.length !== expected.length) throw new Error('Arrays must match in length');
  const chi2 = observed.reduce((s, o, i) => {
    const e = expected[i];
    return e === 0 ? s : s + (o - e) ** 2 / e;
  }, 0);
  const df = observed.length - 1;
  const pValue = round(1 - chi2CDF(chi2, df), 6);

  return {
    testType: 'Chi-Square Goodness-of-Fit',
    statistic: round(chi2, 4),
    pValue,
    degreesOfFreedom: df,
    rejectNull: pValue < alpha,
    interpretation:
      pValue < alpha
        ? `p = ${pValue} < α = ${alpha}: Reject H₀. The observed distribution significantly differs from expected.`
        : `p = ${pValue} ≥ α = ${alpha}: Fail to reject H₀. No significant difference from expected distribution.`,
  };
}

// ──────────────────────────────────────
// DISTRIBUTION CDFs (approximations)
// ──────────────────────────────────────

function normalCDF(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989422820 * Math.exp(-z * z / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.7814779 + t * (-1.8212560 + t * 1.3302744))));
  return z > 0 ? 1 - p : p;
}

function tDistCDF(t: number, df: number): number {
  // Abramowitz & Stegun approximation
  const x = df / (df + t * t);
  return 1 - 0.5 * incompleteBeta(x, df / 2, 0.5);
}

function chi2CDF(x: number, df: number): number {
  return gammaIncomplete(df / 2, x / 2);
}

function incompleteBeta(x: number, a: number, b: number): number {
  // Continued fraction approximation
  if (x < 0 || x > 1) return NaN;
  if (x === 0) return 0;
  if (x === 1) return 1;
  const lnBeta = lgamma(a) + lgamma(b) - lgamma(a + b);
  const coeff = Math.exp(a * Math.log(x) + b * Math.log(1 - x) - lnBeta) / a;
  return coeff * betaCF(x, a, b);
}

function betaCF(x: number, a: number, b: number): number {
  const maxIter = 200;
  const eps = 3e-7;
  let c = 1, d = 1 - (a + b) * x / (a + 1);
  if (Math.abs(d) < 1e-30) d = 1e-30;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= maxIter; m++) {
    const m2 = 2 * m;
    let aa = m * (b - m) * x / ((a + m2 - 1) * (a + m2));
    d = 1 + aa * d; if (Math.abs(d) < 1e-30) d = 1e-30;
    c = 1 + aa / c; if (Math.abs(c) < 1e-30) c = 1e-30;
    d = 1 / d; h *= d * c;
    aa = -(a + m) * (a + b + m) * x / ((a + m2) * (a + m2 + 1));
    d = 1 + aa * d; if (Math.abs(d) < 1e-30) d = 1e-30;
    c = 1 + aa / c; if (Math.abs(c) < 1e-30) c = 1e-30;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < eps) break;
  }
  return h;
}

function lgamma(x: number): number {
  const c = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
  let y = x, tmp = x + 5.5;
  tmp -= (x + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015;
  for (const ci of c) { y++; ser += ci / y; }
  return -tmp + Math.log(2.5066282746310005 * ser / x);
}

function gammaIncomplete(a: number, x: number): number {
  if (x < 0) return 0;
  if (x === 0) return 0;
  if (x < a + 1) return gammaSeries(a, x);
  return 1 - gammaCF(a, x);
}

function gammaSeries(a: number, x: number): number {
  let sum = 1 / a, del = sum, ap = a;
  for (let n = 1; n <= 100; n++) {
    ap++; del *= x / ap; sum += del;
    if (Math.abs(del) < Math.abs(sum) * 3e-7) break;
  }
  return sum * Math.exp(-x + a * Math.log(x) - lgamma(a));
}

function gammaCF(a: number, x: number): number {
  let b = x + 1 - a, c = 1 / 1e-30, d = 1 / b, h = d;
  for (let i = 1; i <= 100; i++) {
    const an = -i * (i - a);
    b += 2; d = an * d + b; if (Math.abs(d) < 1e-30) d = 1e-30;
    c = b + an / c; if (Math.abs(c) < 1e-30) c = 1e-30;
    d = 1 / d; const del = d * c; h *= del;
    if (Math.abs(del - 1) < 3e-7) break;
  }
  return Math.exp(-x + a * Math.log(x) - lgamma(a)) * h;
}

// ──────────────────────────────────────
// HELPERS
// ──────────────────────────────────────

function buildTTestInterpretation(
  pValue: number,
  alpha: number,
  refMean: number,
  sampleMean: number,
  type: string
): string {
  const sig = pValue < alpha;
  return sig
    ? `p = ${pValue} < α = ${alpha}: Statistically significant difference. ${type === 'one-sample' ? `The sample mean (${round(sampleMean, 3)}) differs from the hypothesized mean (${refMean}).` : `The two groups have significantly different means.`}`
    : `p = ${pValue} ≥ α = ${alpha}: No statistically significant difference detected.`;
}
