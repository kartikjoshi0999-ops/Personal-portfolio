import Link from 'next/link';
import {
  Camera, BarChart2, Wallet, TrendingUp,
  Brain, Shield, Zap, ArrowRight, Star
} from 'lucide-react';

const features = [
  { icon: Camera, title: 'Camera Math Solver', desc: 'Snap a photo of any math problem — handwritten or printed — and get step-by-step solutions powered by Claude AI.', color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-950' },
  { icon: BarChart2, title: 'Statistics Module', desc: 'Run t-tests, regression, ANOVA, and more. Get plain-English interpretations of complex statistical results.', color: 'text-violet-500', bg: 'bg-violet-50 dark:bg-violet-950' },
  { icon: Wallet, title: 'Budget & Expenses', desc: 'Scan receipts, link your bank via Plaid, and track spending with AI-powered categorization and weekly insights.', color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-950' },
  { icon: TrendingUp, title: 'Portfolio Manager', desc: 'Track stocks, ETFs, and crypto with live prices. Get rebalancing suggestions and AI analysis of your portfolio.', color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-950' },
  { icon: Brain, title: 'AI Assistant', desc: 'Ask anything — from "solve this integral" to "why did my food spending jump?" Your personal AI financial advisor.', color: 'text-pink-500', bg: 'bg-pink-50 dark:bg-pink-950' },
  { icon: Shield, title: 'Bank-Grade Security', desc: 'AES-256 encryption, biometric lock, Supabase Row-Level Security, and GDPR/PIPEDA compliance built-in.', color: 'text-slate-500', bg: 'bg-slate-50 dark:bg-slate-950' },
];

const plans = [
  { name: 'Free', price: '$0', period: '/month', features: ['10 math scans/day', '1 budget', '1 portfolio (≤10 holdings)', '20 AI messages/day', 'Basic statistics'], cta: 'Get Started', highlight: false },
  { name: 'Pro', price: '$6.99', period: '/month', features: ['Unlimited scans', 'Unlimited budgets', 'Unlimited portfolios', 'Unlimited AI chat', 'Monte Carlo simulation', 'PDF export reports', 'Priority OCR'], cta: 'Start Free Trial', highlight: true },
  { name: 'Lifetime', price: '$149', period: 'one-time', features: ['Everything in Pro', 'Forever access', 'All future features', 'Priority support'], cta: 'Buy Lifetime', highlight: false },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* NAV */}
      <nav className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <span className="text-xl font-bold text-brand-600">SolveSphere AI</span>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground">Sign in</Link>
            <Link href="/register" className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 transition-colors">
              Get Started Free
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="mx-auto max-w-7xl px-4 py-24 text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border bg-muted px-3 py-1 text-sm">
          <Zap className="h-3.5 w-3.5 text-brand-500" />
          <span>Powered by Claude AI + Mathpix OCR</span>
        </div>
        <h1 className="mb-6 text-5xl font-bold tracking-tight sm:text-7xl">
          Math & Finance{' '}
          <span className="bg-gradient-to-r from-brand-500 to-violet-600 bg-clip-text text-transparent">
            Solved by AI
          </span>
        </h1>
        <p className="mx-auto mb-10 max-w-2xl text-xl text-muted-foreground">
          The all-in-one intelligent assistant that solves complex math step-by-step and manages
          your entire financial life — budgets, investments, debt, and more.
        </p>
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link href="/register" className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-8 py-4 text-base font-semibold text-white shadow-lg hover:bg-brand-600 transition-all hover:shadow-brand-200">
            Start for Free <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/login" className="inline-flex items-center gap-2 rounded-xl border px-8 py-4 text-base font-medium hover:bg-muted transition-colors">
            View Demo
          </Link>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">No credit card required · Available on iOS, Android & Web</p>
      </section>

      {/* FEATURES */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <h2 className="mb-12 text-center text-3xl font-bold">Everything you need, powered by AI</h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="rounded-2xl border p-6 transition-all hover:shadow-md">
              <div className={`mb-4 inline-flex rounded-xl p-3 ${f.bg}`}>
                <f.icon className={`h-6 w-6 ${f.color}`} />
              </div>
              <h3 className="mb-2 text-lg font-semibold">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* PRICING */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <h2 className="mb-4 text-center text-3xl font-bold">Simple, transparent pricing</h2>
        <p className="mb-12 text-center text-muted-foreground">Start free. Upgrade when you need more.</p>
        <div className="grid gap-8 sm:grid-cols-3">
          {plans.map((plan) => (
            <div key={plan.name} className={`relative rounded-2xl border p-8 ${plan.highlight ? 'border-brand-500 ring-2 ring-brand-500 shadow-lg' : ''}`}>
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-brand-500 px-3 py-1 text-xs font-semibold text-white">
                    <Star className="h-3 w-3" /> Most Popular
                  </span>
                </div>
              )}
              <h3 className="text-xl font-bold">{plan.name}</h3>
              <div className="my-4">
                <span className="text-4xl font-bold">{plan.price}</span>
                <span className="text-muted-foreground">  {plan.period}</span>
              </div>
              <ul className="mb-8 space-y-2">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <span className="text-green-500">✓</span> {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/register"
                className={`block w-full rounded-lg py-3 text-center text-sm font-semibold transition-colors ${plan.highlight ? 'bg-brand-500 text-white hover:bg-brand-600' : 'border hover:bg-muted'}`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t">
        <div className="mx-auto max-w-7xl px-4 py-8 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} SolveSphere AI · <Link href="/privacy" className="hover:underline">Privacy</Link> · <Link href="/terms" className="hover:underline">Terms</Link></p>
        </div>
      </footer>
    </div>
  );
}
