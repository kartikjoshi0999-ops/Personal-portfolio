// ═══════════════════════════════════════════════════════════════
// Statistics Unit Tests
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest';
import {
  descriptiveStats,
  pearsonCorrelation,
  linearRegression,
  oneSampleTTest,
  twoSampleTTest,
  chiSquareGoodnessOfFit,
  quantile,
} from './statistics';

// ──────────────────────────────────────
// DESCRIPTIVE STATISTICS
// ──────────────────────────────────────

describe('descriptiveStats', () => {
  const data = [4, 8, 15, 16, 23, 42];

  it('calculates count', () => {
    expect(descriptiveStats(data).count).toBe(6);
  });

  it('calculates mean', () => {
    expect(descriptiveStats(data).mean).toBeCloseTo(18, 1);
  });

  it('calculates median for even-length array', () => {
    expect(descriptiveStats([1, 2, 3, 4]).median).toBe(2.5);
  });

  it('calculates median for odd-length array', () => {
    expect(descriptiveStats([1, 2, 3]).median).toBe(2);
  });

  it('calculates mode', () => {
    const result = descriptiveStats([1, 2, 2, 3]);
    expect(result.mode).toContain(2);
  });

  it('calculates variance and stdDev', () => {
    const result = descriptiveStats([2, 4, 4, 4, 5, 5, 7, 9]);
    expect(result.mean).toBe(5);
    expect(result.variance).toBeCloseTo(4, 0);
    expect(result.stdDev).toBeCloseTo(2, 0);
  });

  it('calculates min, max, range', () => {
    const result = descriptiveStats(data);
    expect(result.min).toBe(4);
    expect(result.max).toBe(42);
    expect(result.range).toBe(38);
  });

  it('calculates quartiles and IQR', () => {
    const result = descriptiveStats([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(result.q1).toBeCloseTo(2.75, 1);
    expect(result.q3).toBeCloseTo(6.25, 1);
    expect(result.iqr).toBeCloseTo(3.5, 1);
  });

  it('throws for empty array', () => {
    expect(() => descriptiveStats([])).toThrow();
  });

  it('includes percentile keys', () => {
    const result = descriptiveStats(data);
    expect(result.percentiles).toHaveProperty('5');
    expect(result.percentiles).toHaveProperty('95');
  });
});

// ──────────────────────────────────────
// PEARSON CORRELATION
// ──────────────────────────────────────

describe('pearsonCorrelation', () => {
  it('returns 1 for perfectly correlated data', () => {
    const x = [1, 2, 3, 4, 5];
    const y = [2, 4, 6, 8, 10];
    expect(pearsonCorrelation(x, y)).toBeCloseTo(1, 5);
  });

  it('returns -1 for perfectly negatively correlated data', () => {
    const x = [1, 2, 3, 4, 5];
    const y = [10, 8, 6, 4, 2];
    expect(pearsonCorrelation(x, y)).toBeCloseTo(-1, 5);
  });

  it('returns near 0 for uncorrelated data', () => {
    const x = [1, 2, 3, 4, 5, 6];
    const y = [3, 1, 4, 1, 5, 2];
    expect(Math.abs(pearsonCorrelation(x, y))).toBeLessThan(0.5);
  });

  it('throws for unequal arrays', () => {
    expect(() => pearsonCorrelation([1, 2], [1, 2, 3])).toThrow();
  });
});

// ──────────────────────────────────────
// LINEAR REGRESSION
// ──────────────────────────────────────

describe('linearRegression', () => {
  const x = [1, 2, 3, 4, 5];
  const y = [2, 4, 5, 4, 5];

  it('returns type linear', () => {
    expect(linearRegression(x, y).type).toBe('linear');
  });

  it('perfect fit gives R² = 1', () => {
    const xPerfect = [1, 2, 3, 4, 5];
    const yPerfect = [2, 4, 6, 8, 10]; // y = 2x
    const result = linearRegression(xPerfect, yPerfect);
    expect(result.rSquared).toBeCloseTo(1, 5);
    expect(result.coefficients[0]).toBeCloseTo(2, 5); // slope = 2
    expect(result.intercept).toBeCloseTo(0, 5);
  });

  it('R² is between 0 and 1', () => {
    const result = linearRegression(x, y);
    expect(result.rSquared).toBeGreaterThanOrEqual(0);
    expect(result.rSquared).toBeLessThanOrEqual(1);
  });

  it('adjustedR² ≤ R²', () => {
    const result = linearRegression(x, y);
    expect(result.adjustedRSquared).toBeLessThanOrEqual(result.rSquared + 0.001);
  });

  it('throws for unequal arrays', () => {
    expect(() => linearRegression([1, 2], [1, 2, 3])).toThrow();
  });
});

// ──────────────────────────────────────
// ONE-SAMPLE T-TEST
// ──────────────────────────────────────

describe('oneSampleTTest', () => {
  it('correctly fails to reject null for matching mean', () => {
    // Data centered around 5 — should NOT reject H0: μ=5
    const data = [4.8, 5.1, 4.9, 5.2, 4.7, 5.3, 5.0, 4.9, 5.1, 4.8];
    const result = oneSampleTTest(data, 5);
    expect(result.rejectNull).toBe(false);
    expect(result.pValue).toBeGreaterThan(0.05);
  });

  it('correctly rejects null for distant mean', () => {
    const data = [10, 11, 10.5, 12, 9.5, 11.5, 10, 11, 10.5, 10.8];
    const result = oneSampleTTest(data, 5);
    expect(result.rejectNull).toBe(true);
    expect(result.pValue).toBeLessThan(0.001);
  });

  it('returns testType string', () => {
    const result = oneSampleTTest([1, 2, 3, 4, 5], 3);
    expect(result.testType).toContain('T-Test');
  });

  it('pValue is between 0 and 1', () => {
    const result = oneSampleTTest([1, 2, 3, 4, 5], 100);
    expect(result.pValue).toBeGreaterThanOrEqual(0);
    expect(result.pValue).toBeLessThanOrEqual(1);
  });
});

// ──────────────────────────────────────
// TWO-SAMPLE T-TEST
// ──────────────────────────────────────

describe('twoSampleTTest', () => {
  it('detects significant difference between groups', () => {
    const groupA = [10, 11, 12, 10.5, 11.5];
    const groupB = [20, 21, 22, 20.5, 21.5];
    const result = twoSampleTTest(groupA, groupB);
    expect(result.rejectNull).toBe(true);
    expect(result.pValue).toBeLessThan(0.001);
  });

  it('does not reject null for similar groups', () => {
    const groupA = [5.0, 5.1, 4.9, 5.2, 4.8];
    const groupB = [5.1, 4.9, 5.0, 5.1, 4.9];
    const result = twoSampleTTest(groupA, groupB);
    expect(result.rejectNull).toBe(false);
  });

  it('interpretation is a non-empty string', () => {
    const result = twoSampleTTest([1, 2, 3], [4, 5, 6]);
    expect(result.interpretation.length).toBeGreaterThan(0);
  });
});

// ──────────────────────────────────────
// CHI-SQUARE GOODNESS OF FIT
// ──────────────────────────────────────

describe('chiSquareGoodnessOfFit', () => {
  it('does not reject null when observed = expected', () => {
    const observed = [25, 25, 25, 25];
    const expected = [25, 25, 25, 25];
    const result = chiSquareGoodnessOfFit(observed, expected);
    expect(result.statistic).toBe(0);
    expect(result.rejectNull).toBe(false);
  });

  it('rejects null for clearly different distribution', () => {
    const observed = [90, 10, 0, 0];
    const expected = [25, 25, 25, 25];
    const result = chiSquareGoodnessOfFit(observed, expected);
    expect(result.rejectNull).toBe(true);
    expect(result.pValue).toBeLessThan(0.001);
  });

  it('throws for mismatched array lengths', () => {
    expect(() => chiSquareGoodnessOfFit([1, 2, 3], [1, 2])).toThrow();
  });

  it('degrees of freedom = n - 1', () => {
    const result = chiSquareGoodnessOfFit([10, 10, 10], [10, 10, 10]);
    expect(result.degreesOfFreedom).toBe(2);
  });
});

// ──────────────────────────────────────
// QUANTILE
// ──────────────────────────────────────

describe('quantile', () => {
  const sorted = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  it('Q50 is median', () => {
    expect(quantile(sorted, 0.5)).toBe(5.5);
  });

  it('Q0 is min', () => {
    expect(quantile(sorted, 0)).toBe(1);
  });

  it('Q100 is max', () => {
    expect(quantile(sorted, 1)).toBe(10);
  });
});
