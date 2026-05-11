'use client';

import { useState, useRef, useCallback } from 'react';
import { Camera, Upload, Loader2, ChevronRight, Star, Trash2, RotateCcw } from 'lucide-react';
import dynamic from 'next/dynamic';

// KaTeX loaded dynamically to avoid SSR issues
const MathRenderer = dynamic(() => import('@/components/math/MathRenderer'), { ssr: false });
const GraphPlotter = dynamic(() => import('@/components/math/GraphPlotter'), { ssr: false });

interface SolutionStep {
  step: number;
  expression: string;
  rule: string;
  explanation: string;
}

interface Solution {
  subject: string;
  steps: SolutionStep[];
  finalAnswer: string;
  graphData?: { expression: string; title?: string } | null;
  solveTimeMs?: number;
}

export default function MathPage() {
  const [mode, setMode] = useState<'upload' | 'type'>('upload');
  const [latexInput, setLatexInput] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [solution, setSolution] = useState<Solution | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [revealedSteps, setRevealedSteps] = useState<number>(0);
  const [animatedMode, setAnimatedMode] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = (e.target?.result as string).split(',')[1];
      setImagePreview(e.target?.result as string);
      setLatexInput(''); // will be filled after OCR
      // In production: call OCR endpoint first
      setLatexInput('x^2 + 5x + 6 = 0'); // demo
    };
    reader.readAsDataURL(file);
  }, []);

  const handleSolve = async () => {
    if (!latexInput.trim()) { setError('Please enter or capture a math problem.'); return; }
    setError('');
    setLoading(true);
    setSolution(null);
    setRevealedSteps(0);

    try {
      const res = await fetch('/api/math/solve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latex: latexInput }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setSolution(data);
      if (animatedMode) {
        setRevealedSteps(0);
        // Reveal steps one by one
        for (let i = 1; i <= data.steps.length; i++) {
          await new Promise((r) => setTimeout(r, 800));
          setRevealedSteps(i);
        }
      } else {
        setRevealedSteps(data.steps.length);
      }
    } catch (err: any) {
      setError(err.message ?? 'Failed to solve. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Math Solver</h1>
          <p className="text-muted-foreground text-sm">Snap, type, or upload any math problem</p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Animated</span>
          <button
            onClick={() => setAnimatedMode(!animatedMode)}
            className={`relative h-6 w-11 rounded-full transition-colors ${animatedMode ? 'bg-brand-500' : 'bg-muted'}`}
          >
            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${animatedMode ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </button>
        </div>
      </div>

      {/* Input Panel */}
      <div className="rounded-2xl border bg-card p-6">
        {/* Mode Tabs */}
        <div className="mb-5 flex gap-2">
          {(['upload', 'type'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${mode === m ? 'bg-brand-500 text-white' : 'hover:bg-muted'}`}
            >
              {m === 'upload' ? '📷 Camera / Upload' : '⌨️ Type LaTeX'}
            </button>
          ))}
        </div>

        {mode === 'upload' ? (
          <div>
            {imagePreview ? (
              <div className="relative">
                <img src={imagePreview} alt="Math problem" className="max-h-48 rounded-lg object-contain" />
                <button
                  onClick={() => { setImagePreview(null); setLatexInput(''); }}
                  className="absolute right-2 top-2 rounded-full bg-black/50 p-1 text-white hover:bg-black/70"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                className="flex h-36 w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed hover:border-brand-400 hover:bg-brand-50 dark:hover:bg-brand-950/30 transition-colors"
              >
                <div className="rounded-2xl bg-brand-100 p-3 dark:bg-brand-900">
                  <Camera className="h-8 w-8 text-brand-500" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium">Drag & drop or click to upload</p>
                  <p className="text-xs text-muted-foreground">Supports handwritten & printed math</p>
                </div>
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])}
            />
            {imagePreview && latexInput && (
              <div className="mt-3 rounded-lg bg-muted p-3 text-sm">
                <p className="text-xs text-muted-foreground mb-1">Extracted LaTeX:</p>
                <code className="font-mono">{latexInput}</code>
              </div>
            )}
          </div>
        ) : (
          <div>
            <label className="mb-1.5 block text-sm font-medium">LaTeX Expression</label>
            <textarea
              value={latexInput}
              onChange={(e) => setLatexInput(e.target.value)}
              className="h-24 w-full resize-none rounded-lg border bg-background px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="e.g. x^2 + 5x + 6 = 0  or  \int_0^1 x^2 dx"
            />
            {latexInput && (
              <div className="mt-2 rounded-lg bg-muted p-3 text-center text-sm">
                <p className="text-xs text-muted-foreground mb-1">Preview:</p>
                <MathRenderer latex={latexInput} display />
              </div>
            )}
          </div>
        )}

        {/* Quick examples */}
        <div className="mt-3 flex flex-wrap gap-2">
          {['x^2 + 5x + 6 = 0', '\\frac{d}{dx}[x^3 + 2x]', '\\int_0^{\\pi} \\sin(x)dx', '\\begin{pmatrix}1&2\\\\3&4\\end{pmatrix}'].map((ex) => (
            <button
              key={ex}
              onClick={() => { setMode('type'); setLatexInput(ex); }}
              className="rounded-md bg-muted px-2 py-1 font-mono text-xs hover:bg-brand-100 dark:hover:bg-brand-900 transition-colors"
            >
              {ex}
            </button>
          ))}
        </div>

        {error && <p className="mt-3 text-sm text-red-500">{error}</p>}

        <button
          onClick={handleSolve}
          disabled={loading || !latexInput}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 py-3.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50 transition-colors"
        >
          {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Solving…</> : '🧠 Solve Step-by-Step'}
        </button>
      </div>

      {/* Solution */}
      {solution && (
        <div className="rounded-2xl border bg-card p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="rounded-lg bg-brand-100 px-2.5 py-1 text-xs font-medium text-brand-700 dark:bg-brand-900 dark:text-brand-300">
                {solution.subject}
              </span>
              {solution.solveTimeMs && (
                <span className="text-xs text-muted-foreground">{(solution.solveTimeMs / 1000).toFixed(1)}s</span>
              )}
            </div>
            <div className="flex gap-2">
              <button className="rounded-lg p-2 hover:bg-muted" title="Favorite">
                <Star className="h-4 w-4" />
              </button>
              <button onClick={() => setSolution(null)} className="rounded-lg p-2 hover:bg-muted" title="Clear">
                <RotateCcw className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Steps */}
          <div className="space-y-3">
            <h3 className="font-semibold">Solution Steps</h3>
            {solution.steps.slice(0, revealedSteps).map((step, i) => (
              <div key={step.step} className="math-step-enter flex gap-3 rounded-xl bg-muted/50 p-4" style={{ animationDelay: `${i * 50}ms` }}>
                <span className="flex-shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-brand-500 text-xs font-bold text-white">
                  {step.step}
                </span>
                <div className="space-y-1.5 min-w-0">
                  <MathRenderer latex={step.expression} display />
                  <p className="text-xs font-medium text-brand-600 dark:text-brand-400">Rule: {step.rule}</p>
                  <p className="text-xs text-muted-foreground">{step.explanation}</p>
                </div>
              </div>
            ))}
            {animatedMode && revealedSteps < solution.steps.length && (
              <button
                onClick={() => setRevealedSteps((v) => Math.min(v + 1, solution.steps.length))}
                className="flex items-center gap-1 text-sm text-brand-500 hover:underline"
              >
                <ChevronRight className="h-4 w-4" /> Next step
              </button>
            )}
          </div>

          {/* Final Answer */}
          {revealedSteps >= solution.steps.length && (
            <div className="rounded-xl border-2 border-brand-200 bg-brand-50 p-4 dark:border-brand-800 dark:bg-brand-950">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-brand-600">Final Answer</p>
              <div className="text-center text-xl">
                <MathRenderer latex={solution.finalAnswer} display />
              </div>
            </div>
          )}

          {/* Graph */}
          {solution.graphData && revealedSteps >= solution.steps.length && (
            <div>
              <h3 className="mb-3 font-semibold">Graph</h3>
              <GraphPlotter expression={solution.graphData.expression} title={solution.graphData.title} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
