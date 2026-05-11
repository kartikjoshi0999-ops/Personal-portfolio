'use client';

import { useEffect, useRef } from 'react';
import katex from 'katex';

interface MathRendererProps {
  latex: string;
  display?: boolean;
  className?: string;
}

export default function MathRenderer({ latex, display = false, className = '' }: MathRendererProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    try {
      katex.render(latex, ref.current, {
        displayMode: display,
        throwOnError: false,
        errorColor: '#ef4444',
        trust: false,
        strict: 'warn',
      });
    } catch {
      if (ref.current) ref.current.textContent = latex;
    }
  }, [latex, display]);

  return (
    <div
      ref={ref}
      className={`overflow-x-auto ${display ? 'my-2' : 'inline'} ${className}`}
      aria-label={`Math: ${latex}`}
    />
  );
}
