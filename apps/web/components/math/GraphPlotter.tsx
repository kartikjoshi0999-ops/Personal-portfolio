'use client';

import { useEffect, useRef } from 'react';

interface GraphPlotterProps {
  expression: string;   // e.g. "y = x^2 + 5*x + 6"
  title?: string;
  width?: number;
  height?: number;
}

export default function GraphPlotter({ expression, title, width = 600, height = 350 }: GraphPlotterProps) {
  const plotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!plotRef.current || !expression) return;

    const Plotly = (window as any).Plotly;
    if (!Plotly) return;

    // Parse expression: extract "y = f(x)" pattern
    const match = expression.match(/y\s*=\s*(.+)/i);
    const fStr = match ? match[1] : expression;

    const xVals: number[] = [];
    const yVals: number[] = [];
    for (let x = -10; x <= 10; x += 0.05) {
      try {
        // Safe eval for simple expressions
        const y = safeEval(fStr, x);
        if (isFinite(y) && Math.abs(y) < 1e6) {
          xVals.push(Math.round(x * 1000) / 1000);
          yVals.push(Math.round(y * 1000) / 1000);
        }
      } catch { /* skip */ }
    }

    Plotly.newPlot(
      plotRef.current,
      [{ x: xVals, y: yVals, type: 'scatter', mode: 'lines', line: { color: '#2563eb', width: 2.5 }, name: expression }],
      {
        title: { text: title ?? expression, font: { size: 13 } },
        xaxis: { zeroline: true, zerolinecolor: '#94a3b8', gridcolor: '#e2e8f0', title: 'x' },
        yaxis: { zeroline: true, zerolinecolor: '#94a3b8', gridcolor: '#e2e8f0', title: 'y' },
        margin: { t: 40, r: 20, b: 40, l: 50 },
        paper_bgcolor: 'transparent',
        plot_bgcolor: 'transparent',
        font: { family: 'system-ui, sans-serif', size: 11 },
      },
      { responsive: true, displayModeBar: false }
    );
  }, [expression, title]);

  return (
    <div className="rounded-xl border bg-white dark:bg-card overflow-hidden">
      <script src="https://cdn.plot.ly/plotly-basic-3.0.1.min.js" async />
      <div ref={plotRef} style={{ width: '100%', height }} />
    </div>
  );
}

function safeEval(expr: string, x: number): number {
  const sanitized = expr
    .replace(/\^/g, '**')
    .replace(/sin/g, 'Math.sin')
    .replace(/cos/g, 'Math.cos')
    .replace(/tan/g, 'Math.tan')
    .replace(/sqrt/g, 'Math.sqrt')
    .replace(/log/g, 'Math.log')
    .replace(/exp/g, 'Math.exp')
    .replace(/abs/g, 'Math.abs')
    .replace(/pi/gi, 'Math.PI')
    .replace(/e(?![a-z])/g, 'Math.E');
  // eslint-disable-next-line no-new-func
  return new Function('x', `"use strict"; return (${sanitized});`)(x);
}
