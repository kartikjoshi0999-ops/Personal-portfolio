// ═══════════════════════════════════════════════════════════════
// Anthropic Claude API Service
// Model: claude-sonnet-4-5 (free-tier friendly, production-ready)
// ═══════════════════════════════════════════════════════════════

import Anthropic from '@anthropic-ai/sdk';
import { MathSolution, SolutionStep, MathSubject, UserContext } from '@solvesphere/shared';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = 'claude-sonnet-4-5';

// ──────────────────────────────────────
// MATH SOLVER
// ──────────────────────────────────────

const MATH_SYSTEM_PROMPT = `You are an expert mathematics tutor inside SolveSphere AI.
When given a LaTeX math expression, solve it step-by-step with crystal-clear explanations.

Rules:
1. Return ONLY valid JSON — no markdown fences, no extra text.
2. Every intermediate step must be shown.
3. Each step must include: the transformed expression (LaTeX), the rule used, and a plain-English explanation.
4. Classify the subject area.
5. If an equation can be graphed (function of x), include graphData.

JSON schema:
{
  "subject": "ALGEBRA" | "CALCULUS" | "TRIGONOMETRY" | "STATISTICS" | "LINEAR_ALGEBRA" | "ARITHMETIC" | "DIFFERENTIAL_EQUATIONS" | "COMPLEX_NUMBERS" | "MATRICES" | "GEOMETRY" | "OTHER",
  "steps": [
    { "step": 1, "expression": "<LaTeX>", "rule": "Rule name", "explanation": "Plain English" }
  ],
  "finalAnswer": "<LaTeX answer>",
  "graphData": null | { "expression": "y = ...", "title": "Graph title", "xLabel": "x", "yLabel": "y" }
}`;

export async function solveMathWithClaude(latex: string): Promise<MathSolution> {
  const start = Date.now();

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    system: MATH_SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Solve this math problem step by step:\n\n$$${latex}$$`,
      },
    ],
  });

  const raw = response.content[0].type === 'text' ? response.content[0].text : '';

  let parsed: Omit<MathSolution, 'latex' | 'solveTimeMs'>;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // Fallback if Claude returns non-JSON
    parsed = {
      subject: 'OTHER',
      steps: [{ step: 1, expression: latex, rule: 'Direct evaluation', explanation: raw }],
      finalAnswer: raw,
      graphData: null,
    };
  }

  return {
    latex,
    subject: parsed.subject as MathSubject,
    steps: parsed.steps,
    finalAnswer: parsed.finalAnswer,
    graphData: parsed.graphData ?? null,
    solveTimeMs: Date.now() - start,
  };
}

// ──────────────────────────────────────
// RECEIPT OCR PARSER
// ──────────────────────────────────────

export interface ParsedReceipt {
  merchant?: string;
  date?: string;
  subtotal?: number;
  tax?: number;
  tip?: number;
  total?: number;
  currency?: string;
  lineItems?: Array<{ description: string; quantity?: number; unitPrice?: number; total: number }>;
  category?: string;
}

export async function parseReceiptWithClaude(
  imageBase64: string,
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp' = 'image/jpeg'
): Promise<ParsedReceipt> {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 2048,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mimeType, data: imageBase64 },
          },
          {
            type: 'text',
            text: `Extract all receipt data and return ONLY valid JSON (no markdown):
{
  "merchant": "string or null",
  "date": "YYYY-MM-DD or null",
  "subtotal": number_or_null,
  "tax": number_or_null,
  "tip": number_or_null,
  "total": number_or_null,
  "currency": "USD|CAD|EUR|... or null",
  "lineItems": [ { "description": "...", "quantity": number_or_null, "unitPrice": number_or_null, "total": number } ],
  "category": "FOOD_DINING|TRANSPORT|SHOPPING|UTILITIES|HEALTHCARE|ENTERTAINMENT|OTHER"
}`,
          },
        ],
      },
    ],
  });

  const raw = response.content[0].type === 'text' ? response.content[0].text : '{}';
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

// ──────────────────────────────────────
// SPENDING INSIGHTS
// ──────────────────────────────────────

export async function generateSpendingInsight(
  period: string,
  spendingData: Array<{ category: string; amount: number; prevAmount: number }>,
  income: number
): Promise<string> {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 800,
    messages: [
      {
        role: 'user',
        content: `Generate a concise, friendly spending insight for a personal finance app.

Period: ${period}
Income: $${income.toFixed(2)}
Spending by category (current vs previous period):
${spendingData.map((d) => `- ${d.category}: $${d.amount.toFixed(2)} (prev: $${d.prevAmount.toFixed(2)}, Δ${(((d.amount - d.prevAmount) / (d.prevAmount || 1)) * 100).toFixed(1)}%)`).join('\n')}

Write 3–4 sentences highlighting: top spending area, any unusual spikes (>20% increase), and one actionable savings tip. Be encouraging, not judgmental. Plain text only.`,
      },
    ],
  });

  return response.content[0].type === 'text' ? response.content[0].text : '';
}

// ──────────────────────────────────────
// AI ASSISTANT CHAT
// ──────────────────────────────────────

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function chatWithClaude(
  userMessage: string,
  history: ConversationMessage[],
  userContext: UserContext,
  context: string = 'general'
): Promise<string> {
  const systemPrompt = buildAssistantSystemPrompt(userContext, context);

  const messages: Anthropic.MessageParam[] = [
    ...history.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    { role: 'user', content: userMessage },
  ];

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 2048,
    system: systemPrompt,
    messages,
  });

  return response.content[0].type === 'text' ? response.content[0].text : '';
}

function buildAssistantSystemPrompt(ctx: UserContext, context: string): string {
  return `You are the SolveSphere AI assistant — an expert in mathematics, statistics, and personal finance.

USER CONTEXT:
- Currency: ${ctx.currency}
- Subscription: ${ctx.subscriptionTier}
${ctx.netWorth !== undefined ? `- Net worth: ${ctx.netWorth.toFixed(2)} ${ctx.currency}` : ''}
${ctx.monthlyIncome !== undefined ? `- Monthly income: ${ctx.monthlyIncome.toFixed(2)} ${ctx.currency}` : ''}
${ctx.monthlyExpenses !== undefined ? `- Monthly expenses: ${ctx.monthlyExpenses.toFixed(2)} ${ctx.currency}` : ''}
${ctx.portfolioValue !== undefined ? `- Portfolio value: ${ctx.portfolioValue.toFixed(2)} ${ctx.currency}` : ''}
${ctx.activeGoals?.length ? `- Active goals: ${ctx.activeGoals.map((g) => `${g.name} (${(g.progress * 100).toFixed(0)}%)`).join(', ')}` : ''}

CONTEXT MODE: ${context}

CAPABILITIES:
- Solve and explain math problems (present LaTeX wrapped in $$...$$)
- Analyze spending patterns and give personalized advice
- Explain financial concepts clearly
- Build financial projections and scenarios
- Interpret statistical results in plain English

RULES:
- Be concise and actionable
- Use the user's currency (${ctx.currency}) for all amounts
- Format large numbers with commas
- If asked to generate a chart, describe the data as JSON inside a code block labelled "chart-data"
- Never give specific investment advice; provide educational information only
- If the user's tier is FREE, gently mention Pro features when relevant`;
}

// ──────────────────────────────────────
// STATISTICS INTERPRETATION
// ──────────────────────────────────────

export async function interpretStatResults(
  analysisType: string,
  results: Record<string, unknown>
): Promise<string> {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 600,
    messages: [
      {
        role: 'user',
        content: `Interpret these statistical results in plain English for a non-statistician. Be concise (3–5 sentences).

Analysis: ${analysisType}
Results: ${JSON.stringify(results, null, 2)}`,
      },
    ],
  });

  return response.content[0].type === 'text' ? response.content[0].text : '';
}
