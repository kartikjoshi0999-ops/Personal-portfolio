'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, MessageCircle, Trash2, Paperclip } from 'lucide-react';
import dynamic from 'next/dynamic';

const MathRenderer = dynamic(() => import('@/components/math/MathRenderer'), { ssr: false });

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: Date;
}

const SUGGESTED = [
  "Why did my food spending jump last month?",
  "Solve \\int_0^1 x^2 dx step by step",
  "Build me a 7-day meal-prep budget under $80",
  "Explain the difference between Sharpe ratio and Sortino ratio",
  "How do I calculate my tax-advantaged room (RRSP/401k)?",
  "What is p-value and when should I reject the null hypothesis?",
];

function renderContent(text: string) {
  const parts = text.split(/(\$\$[\s\S]*?\$\$|\$[\s\S]*?\$)/g);
  return parts.map((part, i) => {
    if (part.startsWith('$$') && part.endsWith('$$')) {
      return <MathRenderer key={i} latex={part.slice(2, -2)} display />;
    }
    if (part.startsWith('$') && part.endsWith('$') && part.length > 2) {
      return <MathRenderer key={i} latex={part.slice(1, -1)} />;
    }
    return <span key={i}>{part}</span>;
  });
}

export default function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text = input) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    setInput('');

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: trimmed,
      createdAt: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    const assistantMsg: Message = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: '',
      createdAt: new Date(),
    };
    setMessages((prev) => [...prev, assistantMsg]);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed, conversationId }),
      });

      if (!res.body) throw new Error('No response body');
      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        for (const line of chunk.split('\n')) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.text) {
                setMessages((prev) => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  if (last.role === 'assistant') {
                    updated[updated.length - 1] = { ...last, content: last.content + data.text };
                  }
                  return updated;
                });
              }
              if (data.conversationId && !conversationId) {
                setConversationId(data.conversationId);
              }
            } catch { /* non-JSON line */ }
          }
        }
      }
    } catch (err: any) {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          ...updated[updated.length - 1],
          content: `Error: ${err.message}`,
        };
        return updated;
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b pb-4 mb-4">
        <div className="flex items-center gap-2">
          <div className="rounded-xl bg-brand-500 p-2">
            <MessageCircle className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold">AI Assistant</h1>
            <p className="text-xs text-muted-foreground">Powered by Claude · Math, Finance & More</p>
          </div>
        </div>
        {messages.length > 0 && (
          <button
            onClick={() => { setMessages([]); setConversationId(undefined); }}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <Trash2 className="h-4 w-4" /> New chat
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-6 py-12">
            <div className="rounded-2xl bg-brand-50 dark:bg-brand-950 p-5">
              <MessageCircle className="h-10 w-10 text-brand-500" />
            </div>
            <div className="text-center">
              <h2 className="text-xl font-bold">Ask me anything</h2>
              <p className="text-sm text-muted-foreground mt-1">Math problems, financial advice, stats — I'm here to help</p>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 w-full max-w-2xl">
              {SUGGESTED.map((s) => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  className="rounded-xl border bg-card px-4 py-3 text-left text-sm hover:bg-muted hover:border-brand-300 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div className={`h-8 w-8 flex-shrink-0 rounded-full flex items-center justify-center text-xs font-bold ${msg.role === 'user' ? 'bg-brand-500 text-white' : 'bg-muted'}`}>
              {msg.role === 'user' ? 'U' : '🤖'}
            </div>
            <div
              className={`max-w-3xl rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-brand-500 text-white rounded-tr-sm'
                  : 'bg-card border rounded-tl-sm'
              }`}
            >
              {msg.role === 'assistant' ? renderContent(msg.content) : msg.content}
              {msg.role === 'assistant' && msg.content === '' && loading && (
                <span className="inline-flex gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="mt-4 rounded-2xl border bg-card p-3">
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about math, finance, or anything… (Shift+Enter for new line)"
            className="flex-1 resize-none bg-transparent text-sm focus:outline-none min-h-[44px] max-h-40"
            rows={1}
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading}
            className="flex-shrink-0 rounded-xl bg-brand-500 p-2.5 text-white hover:bg-brand-600 disabled:opacity-50 transition-colors"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground text-center">
          SolveSphere AI can make mistakes. Verify important financial decisions.
        </p>
      </div>
    </div>
  );
}
