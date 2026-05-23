'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Swords, Library, Skull, Calculator, MessageSquare, Users, ChevronRight, Zap, Shield, AlertTriangle
} from 'lucide-react';

const features = [
  {
    href: '/characters',
    icon: <Users className="h-5 w-5" />,
    title: '调音师',
    desc: '角色档案与流派解析',
    color: 'text-sonic-purple',
    border: 'border-sonic-purple/30',
    bg: 'bg-sonic-purple/5',
  },
  {
    href: '/cards',
    icon: <Library className="h-5 w-5" />,
    title: '卡牌库',
    desc: '20张卡牌详情与Combo提示',
    color: 'text-armor-blue',
    border: 'border-armor-blue/30',
    bg: 'bg-armor-blue/5',
  },
  {
    href: '/enemies',
    icon: <Skull className="h-5 w-5" />,
    title: '畸变体图鉴',
    desc: '行为骰矩阵与Boss机制',
    color: 'text-danger-red',
    border: 'border-danger-red/30',
    bg: 'bg-danger-red/5',
  },
  {
    href: '/game',
    icon: <Swords className="h-5 w-5" />,
    title: '游戏主控台',
    desc: '污染刻度尺·回合SOP·状态追踪',
    color: 'text-gold',
    border: 'border-gold/30',
    bg: 'bg-gold/5',
  },
  {
    href: '/calculator',
    icon: <Calculator className="h-5 w-5" />,
    title: '伤害计算器',
    desc: '精确计算护甲抵扣与声爆结算',
    color: 'text-orange-400',
    border: 'border-orange-400/30',
    bg: 'bg-orange-400/5',
  },
  {
    href: '/agent',
    icon: <MessageSquare className="h-5 w-5" />,
    title: 'AI裁判',
    desc: '规则裁决·Combo计算·语音播报',
    color: 'text-purple-400',
    border: 'border-purple-400/30',
    bg: 'bg-purple-400/5',
  },
];

export default function HomePage() {
  return (
    <div className="min-h-[calc(100vh-56px)] flex flex-col">
      {/* Hero区域 */}
      <section className="relative flex flex-1 flex-col items-center justify-center px-4 py-16 text-center overflow-hidden">
        {/* 背景声波效果 */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full border border-sonic-purple/5 animate-sonic-pulse" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full border border-sonic-purple/3 animate-sonic-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] rounded-full border border-sonic-purple/2 animate-sonic-pulse" style={{ animationDelay: '2s' }} />
        </div>

        <div className="relative z-10">
          {/* 标题 */}
          <div className="mb-2">
            <span className="font-display text-sm tracking-[0.3em] text-sonic-purple/60 uppercase">
              Abyssal Chord
            </span>
          </div>
          <h1 className="font-display text-5xl md:text-7xl font-bold tracking-tight mb-4">
            <span className="text-foreground">深渊</span>
            <span className="text-sonic-purple">协奏</span>
          </h1>
          <p className="text-muted-foreground max-w-md mx-auto text-sm leading-relaxed mb-2">
            旧日回音撕裂大地，畸变体随污染刻度尺的攀升步步紧逼，
            你只有手中的声波卡牌和身旁的调音师同伴。
          </p>
          <p className="text-muted-foreground/60 text-xs mb-8">
            1-4人合作型DBG实体桌游 · 数字辅助系统
          </p>

          {/* 核心卖点 */}
          <div className="flex items-center justify-center gap-6 mb-8 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-purple-400" />
              <span>污染刻度尺</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5 text-blue-400" />
              <span>双流派构筑</span>
            </div>
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-red-400" />
              <span>AI裁判裁决</span>
            </div>
          </div>

          <Link href="/game">
            <Button
              className="bg-sonic-purple/20 text-sonic-purple hover:bg-sonic-purple/30 border border-sonic-purple/30 px-8 h-11 font-display text-sm tracking-wide"
            >
              <Swords className="h-4 w-4 mr-2" />
              进入游戏台
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
        </div>
      </section>

      {/* 功能入口 */}
      <section className="border-t border-white/5 bg-abyss-light/40 px-4 py-10">
        <div className="mx-auto max-w-4xl">
          <div className="text-center mb-6">
            <span className="text-xs text-muted-foreground font-display tracking-wider uppercase">
              System Modules
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <Link
                key={f.href}
                href={f.href}
                className={cn(
                  'group rounded-lg border p-4 transition-all duration-300',
                  'bg-abyss-light/60 hover:bg-abyss-light',
                  f.border,
                  'hover:shadow-[0_0_20px_rgba(139,92,246,0.1)]'
                )}
              >
                <div className={cn('mb-2', f.color)}>{f.icon}</div>
                <div className="text-sm font-medium text-foreground mb-0.5 group-hover:text-foreground transition-colors">
                  {f.title}
                </div>
                <div className="text-xs text-muted-foreground">{f.desc}</div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 底部 */}
      <footer className="border-t border-white/5 px-4 py-4">
        <div className="mx-auto max-w-4xl flex items-center justify-between text-[10px] text-muted-foreground/40">
          <span className="font-display">ABYSSAL CHORD v1.0</span>
          <span>深渊协奏 · 桌游数字辅助系统</span>
        </div>
      </footer>
    </div>
  );
}
