// ═══════════════════════════════════════════════════════════════
// App-wide constants
// ═══════════════════════════════════════════════════════════════

export const APP_NAME = 'SolveSphere AI';
export const APP_VERSION = '1.0.0';

// Free tier limits
export const FREE_MATH_SCANS_PER_DAY = 10;
export const FREE_PORTFOLIOS = 1;
export const FREE_PORTFOLIO_HOLDINGS = 10;
export const FREE_BUDGETS = 1;
export const FREE_AI_MESSAGES_PER_DAY = 20;

// Pricing (USD)
export const PRICE_PRO_MONTHLY = 6.99;
export const PRICE_PRO_YEARLY = 59.0;
export const PRICE_LIFETIME = 149.0;

// Market data refresh intervals (ms)
export const PRICE_REFRESH_INTERVAL_MS = 60_000;        // 1 minute
export const PORTFOLIO_REFRESH_INTERVAL_MS = 300_000;   // 5 minutes

// Category labels (display)
export const CATEGORY_LABELS: Record<string, string> = {
  FOOD_DINING: 'Food & Dining',
  TRANSPORT: 'Transport',
  RENT_MORTGAGE: 'Rent/Mortgage',
  UTILITIES: 'Utilities',
  HEALTHCARE: 'Healthcare',
  ENTERTAINMENT: 'Entertainment',
  SHOPPING: 'Shopping',
  EDUCATION: 'Education',
  TRAVEL: 'Travel',
  PERSONAL_CARE: 'Personal Care',
  INVESTMENTS: 'Investments',
  SAVINGS: 'Savings',
  INSURANCE: 'Insurance',
  TAXES: 'Taxes',
  SUBSCRIPTIONS: 'Subscriptions',
  GIFTS_DONATIONS: 'Gifts & Donations',
  BUSINESS: 'Business',
  INCOME_SALARY: 'Salary',
  INCOME_FREELANCE: 'Freelance',
  INCOME_DIVIDENDS: 'Dividends',
  INCOME_OTHER: 'Other Income',
  TRANSFER: 'Transfer',
  OTHER: 'Other',
};

export const CATEGORY_ICONS: Record<string, string> = {
  FOOD_DINING: '🍔',
  TRANSPORT: '🚗',
  RENT_MORTGAGE: '🏠',
  UTILITIES: '💡',
  HEALTHCARE: '🏥',
  ENTERTAINMENT: '🎬',
  SHOPPING: '🛍️',
  EDUCATION: '📚',
  TRAVEL: '✈️',
  PERSONAL_CARE: '💇',
  INVESTMENTS: '📈',
  SAVINGS: '🐷',
  INSURANCE: '🛡️',
  TAXES: '🧾',
  SUBSCRIPTIONS: '📦',
  GIFTS_DONATIONS: '🎁',
  BUSINESS: '💼',
  INCOME_SALARY: '💰',
  INCOME_FREELANCE: '💻',
  INCOME_DIVIDENDS: '💵',
  INCOME_OTHER: '💸',
  TRANSFER: '🔄',
  OTHER: '📋',
};

// Claude model
export const DEFAULT_CLAUDE_MODEL = 'claude-sonnet-4-5';

// Supabase storage buckets
export const STORAGE_BUCKET_MATH = 'math-images';
export const STORAGE_BUCKET_RECEIPTS = 'receipt-images';
export const STORAGE_BUCKET_AVATARS = 'avatars';

// Regex
export const LATEX_DISPLAY_RE = /\$\$([\s\S]*?)\$\$/g;
export const LATEX_INLINE_RE = /\$([\s\S]*?)\$/g;

// Navigation
export const BOTTOM_NAV_TABS = ['home', 'scan', 'portfolio', 'budget', 'profile'] as const;
export type BottomNavTab = (typeof BOTTOM_NAV_TABS)[number];
