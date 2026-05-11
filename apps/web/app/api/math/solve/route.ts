// ═══════════════════════════════════════════════════════════════
// POST /api/math/solve — OCR + Claude solver endpoint
// ═══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { solveMathWithClaude } from '@solvesphere/api/services/claude';
import { extractLatexFromImage } from '@solvesphere/api/services/mathpix';
import { solveMathSchema } from '@solvesphere/shared';
import { prisma } from '@solvesphere/api';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();

    // If image provided, run OCR first
    let latex = body.latex as string;
    if (!latex && body.imageBase64) {
      const ocrResult = await extractLatexFromImage(body.imageBase64);
      latex = ocrResult.latex;
    }

    const parsed = solveMathSchema.safeParse({ ...body, latex });
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }

    // Check free tier scan limit
    await checkScanLimit(user.id);

    const solution = await solveMathWithClaude(latex);

    // Increment scan counter
    const today = new Date(); today.setHours(0, 0, 0, 0);
    await prisma.userProfile.upsert({
      where: { userId: user.id },
      create: { userId: user.id, mathScansToday: 1, scanResetDate: today },
      update: { mathScansToday: { increment: 1 } },
    });

    return NextResponse.json(solution);
  } catch (err: any) {
    const status = err.message?.includes('limit') ? 429 : 500;
    return NextResponse.json({ error: err.message ?? 'Internal error' }, { status });
  }
}

async function checkScanLimit(userId: string) {
  const [profile, sub] = await Promise.all([
    prisma.userProfile.findUnique({ where: { userId } }),
    prisma.subscription.findUnique({ where: { userId } }),
  ]);
  if (sub?.tier !== 'FREE') return;
  if (!profile) return;

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const lastReset = new Date(profile.scanResetDate); lastReset.setHours(0, 0, 0, 0);
  const scansToday = lastReset.getTime() < today.getTime() ? 0 : profile.mathScansToday;

  if (scansToday >= 10) {
    throw new Error('Free tier limit reached (10 scans/day). Upgrade to Pro for unlimited scans.');
  }
}
