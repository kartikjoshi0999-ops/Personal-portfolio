// ═══════════════════════════════════════════════════════════════
// Zod validators shared across web and mobile
// ═══════════════════════════════════════════════════════════════

import { z } from 'zod';

// ──────────────────────────────────────
// COMMON
// ──────────────────────────────────────

export const currencySchema = z.enum(['USD', 'CAD', 'EUR', 'GBP', 'AUD', 'JPY', 'CHF', 'INR']);
export const subscriptionTierSchema = z.enum(['FREE', 'PRO', 'LIFETIME']);

// ──────────────────────────────────────
// AUTH
// ──────────────────────────────────────

export const signUpSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  displayName: z.string().min(2).max(50).optional(),
});

export const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// ──────────────────────────────────────
// ONBOARDING
// ──────────────────────────────────────

export const onboardingSchema = z.object({
  useCase: z.enum(['STUDENT', 'PROFESSIONAL', 'INVESTOR', 'ALL']),
  riskProfile: z.enum(['CONSERVATIVE', 'MODERATE', 'AGGRESSIVE']),
  currency: currencySchema,
  country: z.string().length(2),
  linkPlaid: z.boolean().optional(),
});

// ──────────────────────────────────────
// MATH SOLVER
// ──────────────────────────────────────

export const solveMathSchema = z.object({
  latex: z.string().min(1, 'LaTeX expression required').max(5000),
  imageBase64: z.string().optional(),
  subject: z.enum([
    'ARITHMETIC', 'ALGEBRA', 'CALCULUS', 'TRIGONOMETRY', 'STATISTICS',
    'LINEAR_ALGEBRA', 'DIFFERENTIAL_EQUATIONS', 'COMPLEX_NUMBERS',
    'MATRICES', 'NUMBER_THEORY', 'GEOMETRY', 'OTHER'
  ]).optional(),
  generateGraph: z.boolean().default(false),
});

export const saveMathProblemSchema = z.object({
  latex: z.string().min(1),
  subject: z.string(),
  solutionSteps: z.array(z.object({
    step: z.number(),
    expression: z.string(),
    rule: z.string(),
    explanation: z.string(),
  })),
  finalAnswer: z.string(),
  imageUrl: z.string().url().optional(),
  graphData: z.record(z.unknown()).optional(),
  tags: z.array(z.string()).default([]),
});

// ──────────────────────────────────────
// TRANSACTIONS
// ──────────────────────────────────────

export const createTransactionSchema = z.object({
  type: z.enum(['INCOME', 'EXPENSE', 'TRANSFER']),
  category: z.string(),
  merchant: z.string().optional(),
  description: z.string().optional(),
  amount: z.number().positive(),
  currency: currencySchema.default('USD'),
  date: z.string().datetime().or(z.date()),
  accountId: z.string().uuid().optional(),
  notes: z.string().max(500).optional(),
});

export const updateTransactionSchema = createTransactionSchema.partial().extend({
  id: z.string().uuid(),
});

// ──────────────────────────────────────
// BUDGET
// ──────────────────────────────────────

export const createBudgetSchema = z.object({
  name: z.string().min(1).max(100),
  period: z.enum(['weekly', 'monthly', 'yearly']).default('monthly'),
  startDate: z.string().datetime().or(z.date()),
  currency: currencySchema.default('USD'),
  categories: z.array(z.object({
    category: z.string(),
    limitAmount: z.number().positive(),
    alertAt: z.number().min(0).max(1).default(0.8),
  })),
});

// ──────────────────────────────────────
// PORTFOLIO
// ──────────────────────────────────────

export const createPortfolioSchema = z.object({
  name: z.string().min(1).max(100),
  currency: currencySchema.default('USD'),
  targetAllocation: z.record(z.number().min(0).max(100)).optional(),
});

export const addHoldingSchema = z.object({
  portfolioId: z.string().uuid(),
  ticker: z.string().min(1).max(20).toUpperCase(),
  name: z.string().optional(),
  assetClass: z.enum(['STOCK', 'ETF', 'MUTUAL_FUND', 'BOND', 'CRYPTO', 'REAL_ESTATE', 'COMMODITY', 'CASH', 'OTHER']).default('STOCK'),
  shares: z.number().positive(),
  avgCost: z.number().positive(),
  currency: currencySchema.default('USD'),
});

// ──────────────────────────────────────
// SAVINGS GOAL
// ──────────────────────────────────────

export const createGoalSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['EMERGENCY_FUND', 'DOWN_PAYMENT', 'RETIREMENT', 'VACATION', 'EDUCATION', 'VEHICLE', 'WEDDING', 'BUSINESS', 'DEBT_PAYOFF', 'CUSTOM']),
  targetAmount: z.number().positive(),
  currentAmount: z.number().min(0).default(0),
  currency: currencySchema.default('USD'),
  targetDate: z.string().datetime().optional(),
  monthlyContrib: z.number().min(0).optional(),
});

// ──────────────────────────────────────
// DEBT
// ──────────────────────────────────────

export const createDebtSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['CREDIT_CARD', 'STUDENT_LOAN', 'AUTO_LOAN', 'PERSONAL_LOAN', 'MORTGAGE', 'MEDICAL', 'OTHER']),
  originalAmount: z.number().positive(),
  currentBalance: z.number().min(0),
  interestRate: z.number().min(0).max(1),   // 0.199 = 19.9%
  minimumPayment: z.number().positive(),
  currency: currencySchema.default('USD'),
  dueDate: z.number().int().min(1).max(31).optional(),
});

// ──────────────────────────────────────
// AI CHAT
// ──────────────────────────────────────

export const chatMessageSchema = z.object({
  conversationId: z.string().uuid().optional(),
  message: z.string().min(1).max(4000),
  context: z.enum(['general', 'math', 'finance', 'portfolio', 'budget']).default('general'),
  attachImageBase64: z.string().optional(),
});

// ──────────────────────────────────────
// STATISTICS
// ──────────────────────────────────────

export const createDatasetSchema = z.object({
  name: z.string().min(1).max(100),
  columns: z.array(z.string()),
  rows: z.array(z.array(z.number())),
  sourceType: z.enum(['manual', 'csv', 'photo']).default('manual'),
});

export const runAnalysisSchema = z.object({
  datasetId: z.string().uuid(),
  analysisType: z.enum(['descriptive', 't-test', 'two-sample-t', 'anova', 'chi-square', 'linear-regression', 'correlation']),
  config: z.record(z.unknown()).default({}),
});

// ──────────────────────────────────────
// ADVANCED FINANCE
// ──────────────────────────────────────

export const dcfSchema = z.object({
  revenues: z.array(z.number().positive()).min(1).max(10),
  ebitdaMargin: z.number().min(0).max(1),
  taxRate: z.number().min(0).max(1),
  capexPct: z.number().min(0).max(1),
  nwcChangePct: z.number(),
  wacc: z.number().min(0).max(1),
  terminalGrowthRate: z.number().min(0).max(0.1),
  sharesOutstanding: z.number().positive().optional(),
  netDebt: z.number().optional(),
});

export const mortgageSchema = z.object({
  principal: z.number().positive(),
  annualRate: z.number().min(0).max(0.5),
  termYears: z.number().int().positive().max(50),
  extraMonthlyPayment: z.number().min(0).default(0),
});

export const monteCarloSchema = z.object({
  initialValue: z.number().min(0),
  annualContrib: z.number().min(0),
  targetYears: z.number().int().positive().max(60),
  targetAmount: z.number().positive().optional(),
  meanReturn: z.number().min(-0.5).max(0.5).default(0.07),
  stdDevReturn: z.number().min(0).max(1).default(0.15),
});
