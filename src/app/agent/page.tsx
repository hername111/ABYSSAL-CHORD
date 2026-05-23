'use client';

import { useState, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  MessageSquare, Send, Sparkles, Zap, Shield, Swords, BookOpen, Trash2
} from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const quickQuestions = [
  { icon: <Zap className="h-3 w-3" />, label: '痛觉回响和断弦极限怎么互动？', question: '痛觉回响能力牌说受到自身卡牌伤害时增伤，断弦极限让我失去10点生命，这算不算受到伤害？' },
  { icon: <Shield className="h-3 w-3" />, label: '护甲和穿透怎么结算？', question: '当我方有护甲而怪物使用穿透攻击时，伤害到底如何结算先后顺序？' },
  { icon: <Swords className="h-3 w-3" />, label: '过载轰鸣+反馈回路伤害计算', question: '钟律打出过载轰鸣后紧接着打反馈回路，场上有痛觉回响能力牌，总伤害是多少？请分步计算。' },
  { icon: <BookOpen className="h-3 w-3" />, label: '污染度到达终焉和弦怎么办？', question: '污染度到了29-30终焉和弦，我们还有什么补救措施？怎么避免游戏失败？' },
];

export default function AgentPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: text.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    const assistantMessage: Message = { role: 'assistant', content: '' };
    setMessages([...newMessages, assistantMessage]);

    const abortController = new AbortController();
    abortRef.current = abortController;

    try {
      const chatHistory = newMessages.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

      const response = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: chatHistory }),
        signal: abortController.signal,
      });

      if (!response.ok) throw new Error('请求失败');

      const reader = response.body?.getReader();
      if (!reader) throw new Error('无法读取响应');

      const decoder = new TextDecoder();
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') break;
            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                accumulated += parsed.content;
                setMessages(prev => {
                  const updated = [...prev];
                  updated[updated.length - 1] = { role: 'assistant', content: accumulated };
                  return updated;
                });
              }
            } catch {
              // skip non-JSON lines
            }
          }
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: 'assistant', content: '连接异常，请重新尝试。' };
          return updated;
        });
      }
    } finally {
      setIsLoading(false);
      abortRef.current = null;
      setTimeout(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
      }, 100);
    }
  }, [messages, isLoading]);

  const clearChat = useCallback(() => {
    if (abortRef.current) abortRef.current.abort();
    setMessages([]);
    setIsLoading(false);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }, [input, sendMessage]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-wide">
            <span className="text-sonic-purple">AI</span> JUDGE
          </h1>
          <p className="text-muted-foreground mt-1">深渊协奏 · AI裁判助手</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="text-xs border-white/10 text-muted-foreground hover:text-foreground"
          onClick={clearChat}
        >
          <Trash2 className="h-3 w-3 mr-1" /> 清空对话
        </Button>
      </div>

      {/* 快捷问题 */}
      {messages.length === 0 && (
        <div className="mb-6 space-y-3">
          <div className="text-xs text-muted-foreground">快速提问</div>
          <div className="grid gap-2 sm:grid-cols-2">
            {quickQuestions.map((q, i) => (
              <button
                key={i}
                onClick={() => sendMessage(q.question)}
                className="flex items-start gap-2 rounded-lg border border-sonic-purple/20 bg-abyss-light/60 p-3 text-left text-xs text-muted-foreground hover:border-sonic-purple/40 hover:text-foreground transition-all"
              >
                <span className="text-sonic-purple mt-0.5 flex-shrink-0">{q.icon}</span>
                <span>{q.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 对话区域 */}
      <Card className="border-sonic-purple/20 bg-abyss-light/80">
        <div
          ref={scrollRef}
          className="h-[calc(100vh-320px)] min-h-[300px] overflow-y-auto p-4 space-y-4"
        >
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-sonic-purple/10 mb-4 animate-glow-breathe">
                <Sparkles className="h-8 w-8 text-sonic-purple" />
              </div>
              <div className="text-sm text-muted-foreground">
                向AI裁判提问规则争议、伤害计算或策略建议
              </div>
              <div className="text-[10px] text-muted-foreground/50 mt-1">
                深渊协奏全规则知识库已加载
              </div>
            </div>
          ) : (
            messages.map((msg, i) => (
              <div
                key={i}
                className={cn(
                  'flex gap-3',
                  msg.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                {msg.role === 'assistant' && (
                  <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-sonic-purple/20">
                    <Sparkles className="h-3.5 w-3.5 text-sonic-purple" />
                  </div>
                )}
                <div
                  className={cn(
                    'max-w-[80%] rounded-lg px-3 py-2 text-sm leading-relaxed',
                    msg.role === 'user'
                      ? 'bg-sonic-purple/20 text-foreground'
                      : 'bg-abyss/60 border border-white/5 text-muted-foreground'
                  )}
                >
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                  {msg.role === 'assistant' && msg.content === '' && isLoading && (
                    <div className="flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-sonic-purple animate-pulse" />
                      <span className="h-1.5 w-1.5 rounded-full bg-sonic-purple animate-pulse delay-100" />
                      <span className="h-1.5 w-1.5 rounded-full bg-sonic-purple animate-pulse delay-200" />
                    </div>
                  )}
                </div>
                {msg.role === 'user' && (
                  <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-white/10">
                    <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* 输入框 */}
        <div className="border-t border-white/5 p-3">
          <div className="flex items-center gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入规则问题或战斗场景..."
              disabled={isLoading}
              className="bg-abyss border-white/10 text-sm placeholder:text-muted-foreground/40"
            />
            <Button
              onClick={() => sendMessage(input)}
              disabled={isLoading || !input.trim()}
              className="bg-sonic-purple/20 text-sonic-purple hover:bg-sonic-purple/30 border border-sonic-purple/30"
              size="sm"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <Badge className="text-[10px] h-5 bg-sonic-purple/10 text-sonic-purple/60 border-sonic-purple/20">
              深渊协奏 v1.0 规则库
            </Badge>
            <Badge className="text-[10px] h-5 bg-white/5 text-muted-foreground/40 border-white/10">
              流式响应
            </Badge>
          </div>
        </div>
      </Card>
    </div>
  );
}
