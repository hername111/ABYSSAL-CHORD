'use client';

import { useState } from 'react';
import { zhongLvCards, cardTypeConfig, archetypeConfig, targetConfig, type Card, type CardType, type CardArchetype } from '@/lib/cards';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Card as UICard, CardContent, CardHeader } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sparkles, Sword, Shield, Zap, ChevronRight } from 'lucide-react';

// 带数量的卡牌接口
interface CardWithCount {
  card: Card;
  count: number;
}

// 辅助函数：聚合卡牌数据，去重并计数
function aggregateCards(cards: Card[]): CardWithCount[] {
  const cardMap = new Map<string, CardWithCount>();
  
  cards.forEach(card => {
    const key = card.name; // 使用卡牌的名称作为唯一标识，这样同名卡牌会被合并
    if (cardMap.has(key)) {
      const existing = cardMap.get(key)!;
      cardMap.set(key, { ...existing, count: existing.count + 1 });
    } else {
      cardMap.set(key, { card, count: 1 });
    }
  });
  
  return Array.from(cardMap.values());
}

// 数量角标组件
function CountBadge({ count }: { count: number }) {
  return (
    <div className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-sonic-purple text-white font-display text-xs font-bold shadow-lg shadow-purple-500/30 z-10">
      x{count}
    </div>
  );
}

const typeIcons: Record<CardType, React.ReactNode> = {
  attack: <Sword className="h-3.5 w-3.5" />,
  skill: <Shield className="h-3.5 w-3.5" />,
  ability: <Sparkles className="h-3.5 w-3.5" />,
};

function CostBadge({ cost }: { cost: number }) {
  return (
    <div className={cn(
      'flex h-8 w-8 items-center justify-center rounded-full font-display text-lg font-bold',
      cost === 0 ? 'bg-gray-500/30 text-gray-300' :
      cost === 1 ? 'bg-blue-500/20 text-blue-300' :
      cost === 2 ? 'bg-purple-500/20 text-purple-300' :
      'bg-yellow-500/20 text-yellow-300'
    )}>
      {cost}
    </div>
  );
}

function CardItem({ card, count }: { card: Card; count?: number }) {
  const typeConf = cardTypeConfig[card.type];
  const archConf = archetypeConfig[card.archetype];
  const targetConf = targetConfig[card.target];

  return (
    <Dialog>
      <DialogTrigger asChild>
        <div className={cn(
          'card-hover cursor-pointer rounded-lg border p-3 transition-all relative',
          typeConf.borderColor,
          'bg-abyss-light/80 hover:bg-abyss-light'
        )}>
          {/* 数量角标 */}
          {count !== undefined && count > 1 && (
            <CountBadge count={count} />
          )}
          <div className="flex items-start gap-3">
            <CostBadge cost={card.cost} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className={cn('font-medium text-sm', typeConf.color)}>
                  {card.name}
                </span>
                <span className="text-xs text-muted-foreground font-display">
                  {card.nameEn}
                </span>
              </div>
              <div className="flex items-center gap-1.5 mb-2">
                <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0 h-5', typeConf.color, typeConf.bg, typeConf.borderColor)}>
                  {typeIcons[card.type]}
                  {typeConf.label}
                </Badge>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 text-muted-foreground border-white/10">
                  {archConf.label}
                </Badge>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 text-muted-foreground border-white/10">
                  {targetConf.icon} {targetConf.label}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2">{card.effect}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground/50 flex-shrink-0 mt-1" />
          </div>
        </div>
      </DialogTrigger>
      <DialogContent className="bg-abyss border-sonic-purple/20 max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <CostBadge cost={card.cost} />
            <div>
              <div className={cn('text-lg', typeConf.color)}>{card.name}</div>
              <div className="text-xs text-muted-foreground font-display">{card.nameEn}</div>
            </div>
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="flex items-center gap-2">
            <Badge className={cn(typeConf.color, typeConf.bg, typeConf.borderColor)}>
              {typeIcons[card.type]}
              {typeConf.label}
            </Badge>
            <Badge variant="outline" className="text-muted-foreground border-white/10">
              {archConf.label}
            </Badge>
            <Badge variant="outline" className="text-muted-foreground border-white/10">
              目标: {targetConf.icon} {targetConf.label}
            </Badge>
          </div>

          <div className="rounded-md bg-abyss/60 border border-white/5 p-3">
            <div className="text-xs text-muted-foreground mb-1 font-medium">效果</div>
            <p className="text-sm leading-relaxed">{card.effect}</p>
          </div>

          {/* 数值面板 */}
          <div className="grid grid-cols-3 gap-2">
            {card.baseDamage !== undefined && (
              <div className="rounded-md bg-red-500/10 border border-red-500/20 p-2 text-center">
                <div className="text-[10px] text-red-400 mb-0.5">基础伤害</div>
                <div className="font-display text-xl font-bold text-red-400">{card.baseDamage}</div>
              </div>
            )}
            {card.baseArmor !== undefined && (
              <div className="rounded-md bg-blue-500/10 border border-blue-500/20 p-2 text-center">
                <div className="text-[10px] text-blue-400 mb-0.5">护甲</div>
                <div className="font-display text-xl font-bold text-blue-400">{card.baseArmor}</div>
              </div>
            )}
            {card.selfDamage !== undefined && (
              <div className="rounded-md bg-orange-500/10 border border-orange-500/20 p-2 text-center">
                <div className="text-[10px] text-orange-400 mb-0.5">自身伤害</div>
                <div className="font-display text-xl font-bold text-orange-400">{card.selfDamage}</div>
              </div>
            )}
            {card.sonicBoom !== undefined && (
              <div className="rounded-md bg-purple-500/10 border border-purple-500/20 p-2 text-center">
                <div className="text-[10px] text-purple-400 mb-0.5">声爆层数</div>
                <div className="font-display text-xl font-bold text-purple-400">{card.sonicBoom}</div>
              </div>
            )}
            {card.purification !== undefined && (
              <div className="rounded-md bg-green-500/10 border border-green-500/20 p-2 text-center">
                <div className="text-[10px] text-green-400 mb-0.5">净化度</div>
                <div className="font-display text-xl font-bold text-green-400">-{card.purification}</div>
              </div>
            )}
            {card.pollutionCost !== undefined && (
              <div className="rounded-md bg-red-500/10 border border-red-500/20 p-2 text-center">
                <div className="text-[10px] text-red-400 mb-0.5">污染增加</div>
                <div className="font-display text-xl font-bold text-red-400">+{card.pollutionCost}</div>
              </div>
            )}
          </div>

          <div className="rounded-md bg-sonic-purple/5 border border-sonic-purple/10 p-3">
            <div className="text-xs text-sonic-purple mb-1 font-medium flex items-center gap-1">
              <Zap className="h-3 w-3" /> 设计思路
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{card.designNote}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function CardsPage() {
  const [typeFilter, setTypeFilter] = useState<CardType | 'all'>('all');
  const [archFilter, setArchFilter] = useState<CardArchetype | 'all'>('all');

  const filteredCards = zhongLvCards.filter(card => {
    if (typeFilter !== 'all' && card.type !== typeFilter) return false;
    if (archFilter !== 'all' && card.archetype !== archFilter) return false;
    return true;
  });

  // 使用去重和计数后的卡牌
  const aggregatedBasicCards = aggregateCards(filteredCards.filter(c => c.archetype === 'basic'));
  const aggregatedFortressCards = aggregateCards(filteredCards.filter(c => c.archetype === 'fortress'));
  const aggregatedOverloadCards = aggregateCards(filteredCards.filter(c => c.archetype === 'overload'));

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* 页面标题 */}
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold tracking-wide">
          <span className="text-sonic-purple">CARD</span> LIBRARY
        </h1>
        <p className="text-muted-foreground mt-1">钟律 · 重装和弦师 — 20 张专属卡牌</p>
      </div>

      {/* 筛选器 */}
      <div className="mb-6 space-y-3">
        <div>
          <div className="text-xs text-muted-foreground mb-2">卡牌类型</div>
          <Tabs value={typeFilter} onValueChange={(v) => setTypeFilter(v as CardType | 'all')}>
            <TabsList className="bg-abyss-light border border-white/5">
              <TabsTrigger value="all" className="text-xs">全部</TabsTrigger>
              <TabsTrigger value="attack" className="text-xs text-red-400">攻击</TabsTrigger>
              <TabsTrigger value="skill" className="text-xs text-blue-400">技能</TabsTrigger>
              <TabsTrigger value="ability" className="text-xs text-purple-400">能力</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <div>
          <div className="text-xs text-muted-foreground mb-2">流派</div>
          <Tabs value={archFilter} onValueChange={(v) => setArchFilter(v as CardArchetype | 'all')}>
            <TabsList className="bg-abyss-light border border-white/5">
              <TabsTrigger value="all" className="text-xs">全部</TabsTrigger>
              <TabsTrigger value="basic" className="text-xs text-slate-400">基础</TabsTrigger>
              <TabsTrigger value="fortress" className="text-xs text-blue-400">低频堡垒</TabsTrigger>
              <TabsTrigger value="overload" className="text-xs text-red-400">过载冲击</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* 卡牌统计 */}
      <div className="mb-6 flex items-center gap-4 text-xs text-muted-foreground">
        <span>显示 {filteredCards.length} / {zhongLvCards.length} 张</span>
        <span>·</span>
        <span>1 AP = 5 伤害 / 5 护甲（基准线）</span>
      </div>

      {/* 卡牌列表 */}
      <ScrollArea className="h-[calc(100vh-280px)]">
        <div className="space-y-6">
          {aggregatedBasicCards.length > 0 && (
            <Section title="基础牌" subtitle="构建牌库循环的基石" cards={aggregatedBasicCards} />
          )}
          {aggregatedFortressCards.length > 0 && (
            <Section title="低频堡垒流" subtitle="以守为攻，护甲溢出化为杀招" cards={aggregatedFortressCards} />
          )}
          {aggregatedOverloadCards.length > 0 && (
            <Section title="过载冲击流" subtitle="血线换杀线，极限爆发" cards={aggregatedOverloadCards} />
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function Section({ title, subtitle, cards }: { title: string; subtitle: string; cards: CardWithCount[] }) {
  return (
    <div>
      <div className="mb-3 flex items-baseline gap-3">
        <h2 className="font-display text-lg font-semibold text-foreground">{title}</h2>
        <span className="text-xs text-muted-foreground">{subtitle}</span>
        <Badge variant="outline" className="text-[10px] h-5 text-muted-foreground border-white/10">
          {cards.length} 种
        </Badge>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(({ card, count }, i) => (
          <CardItem key={`${card.id}-${i}`} card={card} count={count} />
        ))}
      </div>
    </div>
  );
}
