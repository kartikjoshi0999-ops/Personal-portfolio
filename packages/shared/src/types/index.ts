// ═══════════════════════════════════════════════════════════════
// SolveSphere AI — Shared TypeScript Types
// ═══════════════════════════════════════════════════════════════

// ──────────────────────────────────────
// ENUMS (mirrors Prisma schema)
// ──────────────────────────────────────

export type SubscriptionTier = 'FREE' | 'PRO' | 'LIFETIME';
export type Currency = 'USD' | 'CAD' | 'EUR' | 'GBP' | 'AUD' | 'JPY' | 'CHF' | 'INR';
export type UseCase = 'STUDENT' | 'PROFESSIONAL' | 'INVESTOR' | 'ALL';
export type RiskProfile = 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE';
export type TransactionType = 'INCOME' | 'EXPENSE' | 'TRANSFER';
export type AssetClass = 'STOCK' | 'ETF' | 'MUTUAL_FUND' | 'BOND' | 'CRYPTO' | 'REAL_ESTATE' | 'COMMODITY' | 'CASH' | 'OTHER';
export type MathSubject = 'ARITHMETIC' | 'ALGEBRA' | 'CALCULUS' | 'TRIGONOMETRY' | 'STATISTICS' | 'LINEAR_ALGEBRA' | 'DIFFERENTIAL_EQUATIONS' | 'COMPLEX_NUMBERS' | 'MATRICES' | 'NUMBER_THEORY' | 'GEOMETRY' | 'OTHER';
export type GoalType = 'EMERGENCY_FUND' | 'DOWN_PAYMENT' | 'RETIREMENT' | 'VACATION' | 'EDUCATION' | 'VEHICLE' | 'WEDDING' | 'BUSINESS' | 'DEBT_PAYOFF' | 'CUSTOM';
export type DebtType = 'CREDIT_CARD' | 'STUDENT_LOAN' | 'AUTO_LOAN' | 'PERSONAL_LOAN' | 'MORTGAGE' | 'MEDICAL' | 'OTHER';
export type DebtStrategy = 'SNOWBALL' | 'AVALANCHE';
export type AccountType = 'CHECKING' | 'SAVINGS' | 'CREDIT_CARD' | 'INVESTMENT' | 'CRYPTO' | 'LOAN' | 'MORTGAGE' | 'OTHER';

export type TransactionCategory =
  | 'FOOD_DINING' | 'TRANSPORT' | 'RENT_MORTGAGE' | 'UTILITIES'
  | 'HEALTHCARE' | 'ENTERTAINMENT' | 'SHOPPING' | 'EDUCATION'
  | 'TRAVEL' | 'PERSONAL_CARE' | 'INVESTMENTS' | 'SAVINGS'
  | 'INSURANCE' | 'TAXES' | 'SUBSCRIPTIONS' | 'GIFTS_DONATIONS'
  | 'BUSINESS' | 'INCOME_SALARY' | 'INCOME_FREELANCE'
  | 'INCOME_DIVIDENDS' | 'INCOME_OTHER' | 'TRANSFER' | 'OTHER';

// ──────────────────────────────────────
// MATH SOLVER
// ──────────────────────────────────────

export interface SolutionStep {
  step: number;
  expression: string;      // LaTeX
  rule: string;            // e.g. "Power Rule", "Distributive Property"
  explanation: string;     // plain-English explanation
}

export interface MathSolution {
  latex: string;
  subject: MathSubject;
  steps: SolutionStep[];
  finalAnswer: string;     // LaTeX
  graphData?: PlotlyConfig | null;
  solveTimeMs?: number;
}

export interface MathProblemRecord {
  id: string;
  userId: string;
  imageUrl?: string | null;
  latex: string;
  subject: MathSubject;
  tags: string[];
  solutionSteps: SolutionStep[];
  finalAnswer: string;
  graphData?: PlotlyConfig | null;
  difficulty?: number | null;
  isFavorited: boolean;
  createdAt: Date;
}

export interface PlotlyConfig {
  type: 'scatter' | 'surface' | 'bar';
  x?: number[];
  y?: number[];
  z?: number[][];
  expression?: string;    // for Desmos embed
  title?: string;
  xLabel?: string;
  yLabel?: string;
}

// ──────────────────────────────────────
// STATISTICS
// ──────────────────────────────────────

export interface DescriptiveStats {
  count: number;
  mean: number;
  median: number;
  mode: number[];
  variance: number;
  stdDev: number;
  min: number;
  max: number;
  range: number;
  skewness: number;
  kurtosis: number;
  q1: number;
  q3: number;
  iqr: number;
  percentiles: Record<string, number>;    // "5" | "10" | "25" | "75" | "90" | "95"
}

export interface RegressionResult {
  type: 'linear' | 'multiple' | 'logistic';
  coefficients: number[];
  intercept: number;
  rSquared: number;
  adjustedRSquared: number;
  pValues: number[];
  standardErrors: number[];
  fStatistic: number;
  aic?: number;
  bic?: number;
}

export interface HypothesisTestResult {
  testType: string;
  statistic: number;
  pValue: number;
  degreesOfFreedom?: number;
  criticalValue?: number;
  confidenceInterval?: [number, number];
  rejectNull: boolean;
  interpretation: string;   // plain English
}

// ──────────────────────────────────────
// FINANCE — ACCOUNTS & TRANSACTIONS
// ──────────────────────────────────────

export interface NetWorthSnapshot {
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  asOfDate: Date;
  breakdown: {
    checking: number;
    savings: number;
    investments: number;
    crypto: number;
    realEstate: number;
    creditCards: number;
    loans: number;
    mortgage: number;
  };
}

export interface SpendingInsight {
  period: string;
  totalIncome: number;
  totalExpenses: number;
  savingsRate: number;
  topCategories: Array<{ category: TransactionCategory; amount: number; percentOfTotal: number }>;
  anomalies: Array<{ category: TransactionCategory; amount: number; avgAmount: number; delta: number }>;
  aiSummary: string;
}

// ──────────────────────────────────────
// PORTFOLIO ANALYTICS
// ──────────────────────────────────────

export interface PortfolioMetrics {
  totalValue: number;
  totalCost: number;
  totalGainLoss: number;
  totalGainLossPct: number;
  dayChange: number;
  dayChangePct: number;
  sharpeRatio?: number;
  beta?: number;
  maxDrawdown?: number;
  volatility?: number;
  dividendIncome?: number;
}

export interface AllocationSlice {
  label: string;
  value: number;       // current market value
  percent: number;
  targetPercent?: number;
  drift?: number;      // actual - target
}

export interface RebalanceTrade {
  ticker: string;
  name?: string;
  action: 'BUY' | 'SELL';
  shares: number;
  estimatedValue: number;
  reason: string;
}

export interface MonteCarloResult {
  percentile10: number[];    // portfolio value path at p10
  percentile50: number[];    // median path
  percentile90: number[];    // p90
  years: number[];
  probabilityOfSuccess: number;  // reaching goal
  medianFinalValue: number;
}

// ──────────────────────────────────────
// DEBT CALCULATORS
// ──────────────────────────────────────

export interface DebtPayoffSchedule {
  strategy: DebtStrategy;
  payoffDate: Date;
  totalInterestPaid: number;
  totalPaid: number;
  monthlySchedule: Array<{
    month: number;
    debtId: string;
    payment: number;
    principal: number;
    interest: number;
    remainingBalance: number;
  }>;
}

export interface AmortizationRow {
  period: number;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
  totalInterestPaid: number;
}

// ──────────────────────────────────────
// TAX
// ──────────────────────────────────────

export interface TaxEstimate {
  country: 'US' | 'CA';
  taxYear: number;
  grossIncome: number;
  taxableIncome: number;
  federalTax: number;
  stateTax?: number;      // US
  provincialTax?: number; // CA
  totalTax: number;
  effectiveRate: number;
  marginalRate: number;
  afterTaxIncome: number;
  brackets: Array<{ min: number; max: number | null; rate: number; taxOwed: number }>;
}

// ──────────────────────────────────────
// AI ASSISTANT
// ──────────────────────────────────════

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  metadata?: {
    chartData?: PlotlyConfig;
    tableData?: Record<string, unknown>[][];
    mathLatex?: string;
  };
  createdAt: Date;
}

export interface UserContext {
  netWorth?: number;
  monthlyIncome?: number;
  monthlyExpenses?: number;
  topSpendingCategories?: Array<{ category: string; amount: number }>;
  portfolioValue?: number;
  activeGoals?: Array<{ name: string; progress: number }>;
  subscriptionTier: SubscriptionTier;
  currency: Currency;
}

// ──────────────────────────────────────
// API RESPONSE WRAPPERS
// ──────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasNextPage: boolean;
}
