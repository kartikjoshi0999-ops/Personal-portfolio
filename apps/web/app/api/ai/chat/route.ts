// ═══════════════════════════════════════════════════════════════
// POST /api/ai/chat — streaming AI chat endpoint
// ═══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@solvesphere/api';

export const runtime = 'nodejs';
export const maxDuration = 60;

const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { message, conversationId, context = 'general' } = await req.json();
  if (!message?.trim()) return NextResponse.json({ error: 'Message required' }, { status: 400 });

  // Rate limit free tier
  const sub = await prisma.subscription.findUnique({ where: { userId: user.id } });
  if (sub?.tier === 'FREE') {
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const count = await prisma.aIMessage.count({
      where: { conversation: { userId: user.id }, role: 'user', createdAt: { gte: todayStart } },
    });
    if (count >= 20) {
      return NextResponse.json({ error: 'Daily limit reached. Upgrade to Pro for unlimited AI chat.' }, { status: 429 });
    }
  }

  // Get conversation history
  let convoId = conversationId;
  if (!convoId) {
    const convo = await prisma.aIConversation.create({ data: { userId: user.id, context } });
    convoId = convo.id;
  }

  const history = await prisma.aIMessage.findMany({
    where: { conversationId: convoId },
    orderBy: { createdAt: 'asc' },
    take: 20,
  });

  // Save user message
  await prisma.aIMessage.create({ data: { conversationId: convoId, role: 'user', content: message } });

  // Stream response from Claude
  const encoder = new TextEncoder();
  let fullResponse = '';

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const claudeStream = claude.messages.stream({
          model: 'claude-sonnet-4-5',
          max_tokens: 2048,
          system: `You are the SolveSphere AI assistant — an expert in mathematics, statistics, and personal finance. Be concise, friendly, and actionable. Use LaTeX for math ($$...$$). Use currency symbols ($, €, etc.) appropriately.`,
          messages: [
            ...history.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
            { role: 'user', content: message },
          ],
        });

        for await (const event of claudeStream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            const text = event.delta.text;
            fullResponse += text;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
          }
        }

        // Save assistant response
        await prisma.aIMessage.create({
          data: { conversationId: convoId, role: 'assistant', content: fullResponse, model: 'claude-sonnet-4-5' },
        });

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, conversationId: convoId })}\n\n`));
        controller.close();
      } catch (err: any) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: err.message })}\n\n`));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
