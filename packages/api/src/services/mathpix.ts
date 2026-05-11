// ═══════════════════════════════════════════════════════════════
// Mathpix OCR Service (free tier: 1000 req/month)
// Falls back to OpenAI Vision if Mathpix fails
// ═══════════════════════════════════════════════════════════════

import axios from 'axios';
import OpenAI from 'openai';

// ──────────────────────────────────────
// MATHPIX
// ──────────────────────────────────────

export interface MathpixResult {
  latex: string;
  confidence: number;
  source: 'mathpix' | 'openai';
}

export async function extractLatexFromImage(imageBase64: string): Promise<MathpixResult> {
  try {
    return await extractWithMathpix(imageBase64);
  } catch (err) {
    console.warn('[Mathpix] Failed, falling back to OpenAI Vision:', (err as Error).message);
    return extractWithOpenAI(imageBase64);
  }
}

async function extractWithMathpix(imageBase64: string): Promise<MathpixResult> {
  const response = await axios.post(
    'https://api.mathpix.com/v3/text',
    {
      src: `data:image/jpeg;base64,${imageBase64}`,
      formats: ['latex_simplified', 'text'],
      data_options: {
        include_latex: true,
        include_text: true,
      },
    },
    {
      headers: {
        'app_id': process.env.MATHPIX_APP_ID ?? '',
        'app_key': process.env.MATHPIX_APP_KEY ?? '',
        'Content-Type': 'application/json',
      },
      timeout: 15000,
    }
  );

  const latex = response.data.latex_simplified || response.data.text || '';
  const confidence = response.data.confidence ?? 0.9;

  if (!latex) throw new Error('Mathpix returned empty LaTeX');

  return { latex, confidence, source: 'mathpix' };
}

async function extractWithOpenAI(imageBase64: string): Promise<MathpixResult> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: { url: `data:image/jpeg;base64,${imageBase64}` },
          },
          {
            type: 'text',
            text: 'Extract the mathematical expression from this image and return ONLY the LaTeX representation. No explanation, no markdown, just the raw LaTeX.',
          },
        ],
      },
    ],
  });

  const latex = response.choices[0]?.message?.content ?? '';
  if (!latex) throw new Error('OpenAI returned empty response');

  return { latex: latex.trim(), confidence: 0.75, source: 'openai' };
}

// ──────────────────────────────────────
// TABLE OCR (for statistics module)
// ──────────────────────────────────────

export interface TableData {
  columns: string[];
  rows: number[][];
}

export async function extractTableFromImage(imageBase64: string): Promise<TableData> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    max_tokens: 2048,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: { url: `data:image/jpeg;base64,${imageBase64}` },
          },
          {
            type: 'text',
            text: `Extract the data table from this image. Return ONLY valid JSON (no markdown):
{
  "columns": ["col1", "col2", ...],
  "rows": [[1.0, 2.5, ...], ...]
}
Numeric values only in rows. If a cell is missing, use null.`,
          },
        ],
      },
    ],
  });

  const raw = response.choices[0]?.message?.content ?? '{"columns":[],"rows":[]}';
  try {
    return JSON.parse(raw);
  } catch {
    return { columns: [], rows: [] };
  }
}
