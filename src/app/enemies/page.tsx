'use client';

import { useState } from 'react';
import { enemies, type Enemy, type EnemyAction } from '@/lib/game-data';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skull, Dice1, Dice2, Dice3, Dice4, Dice5, Dice6, Heart, Shield, Zap, Swords, AlertTriangle } from 'lucide-react';

const diceIcons = [Dice1, Dice2, Dice3, Dice4, Dice5, Dice6];

function DiceDisplay({ value, rolling }: { value: number; rolling: boolean }) {
  const Icon = diceIcons[value - 1];
  return (
    <div className={cn(
      'flex h-16 w-16 items-center justify-center rounded-xl border-2 font-display text-3xl font-bold',
      rolling ? 'animate-dice-bounce border-sonic-purple bg-sonic-purple/20 text-sonic-purple' :
      'border-sonic-purple/40 bg-sonic-purple/10 text-sonic-purple'
    )}>
      <Icon className="h-10 w-10" />
    </div>
  );
}

function ActionBadge({ action }: { action: EnemyAction }) {
  const config: Record<string, { color: string; bg: string; label: string }> = {
    attack: { color: 'text-red-400', bg: 'bg-red-500/10', label: '攻击' },
    attack_debuff: { color: 'text-purple-400', bg: 'bg-purple-500/10', label: '攻击+Debuff' },
    buff: { color: 'text-blue-400', bg: 'bg-blue-500/10', label: '增益' },
    aoe: { color: 'text-orange-400', bg: 'bg-orange-500/10', label: '群体' },
    special: { color: 'text-yellow-400', bg: 'bg-yellow-500/10', label: '特殊' },
    summon: { color: 'text-pink-400', bg: 'bg-pink-500/10', label: '召唤' },
  };
  const c = config[action.type] ?? config.attack;
  return (
    <Badge className={cn('text-[10px] h-5', c.color, c.bg, 'border-transparent')}>
      {c.label}
    </Badge>
  );
}

function EnemyCard({ enemy }: { enemy: Enemy }) {
  const [diceValue, setDiceValue] = useState<number | null>(null);
  const [rolling, setRolling] = useState(false);
  const [isPhase2, setIsPhase2] = useState(false);

  const currentActions = isPhase2 && enemy.phase2Actions ? enemy.phase2Actions : enemy.actions;

  const rollDice = () => {
    setRolling(true);
    setDiceValue(null);
    const interval = setInterval(() => {
      setDiceValue(Math.floor(Math.random() * 6) + 1);
    }, 80);
    setTimeout(() => {
      clearInterval(interval);
      const result = Math.floor(Math.random() * 6) + 1;
      setDiceValue(result);
      setRolling(false);
    }, 600);
  };

  const matchedAction = diceValue
    ? currentActions.find(a => diceValue >= a.diceRange[0] && diceValue <= a.diceRange[1])
    : null;

  return (
    <Card className={cn(
      'border-sonic-purple/20 bg-abyss-light/80 overflow-hidden',
      enemy.isBoss && 'border-gold/30'
    )}>
      {/* 顶部渐变条 */}
      <div className={cn(
        'h-1',
        enemy.isBoss
          ? 'bg-gradient-to-r from-gold/60 via-danger-red/60 to-gold/60'
          : 'bg-gradient-to-r from-danger-red/40 via-sonic-purple/40 to-danger-red/40'
      )} />

      <CardContent className="p-5 space-y-4">
        {/* 敌人标题 */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              {enemy.isBoss && <Swords className="h-4 w-4 text-gold" />}
              <h3 className="font-display text-xl font-bold text-foreground">{enemy.name}</h3>
            </div>
            <p className="text-xs text-sonic-purple font-display">{enemy.nameEn}</p>
          </div>
          {enemy.isBoss && (
            <Badge className="bg-gold/20 text-gold border-gold/30 text-[10px] h-5">
              BOSS
            </Badge>
          )}
        </div>

        {/* 生命值 */}
        <div className="flex items-center gap-2">
          <Heart className="h-4 w-4 text-red-400" />
          <span className="text-xs text-muted-foreground">HP:</span>
          <div className="flex items-center gap-1 font-display">
            {enemy.hpRange.map((hp, i) => (
              <span key={i} className={cn(
                'text-sm font-bold',
                i === 0 ? 'text-green-400' :
                i === 1 ? 'text-yellow-400' :
                i === 2 ? 'text-orange-400' :
                'text-red-400'
              )}>
                {hp}{i < 3 ? '/' : ''}
              </span>
            ))}
          </div>
          <span className="text-[10px] text-muted-foreground">(1人/2人/3人/4人)</span>
        </div>

        {/* 背景 */}
        <p className="text-xs text-muted-foreground leading-relaxed">{enemy.lore}</p>

        {/* Boss 二阶段切换 */}
        {enemy.isBoss && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className={cn(
                'text-xs h-7',
                isPhase2
                  ? 'bg-danger-red/20 text-danger-red border-danger-red/30'
                  : 'bg-abyss text-muted-foreground border-white/10'
              )}
              onClick={() => setIsPhase2(!isPhase2)}
            >
              <AlertTriangle className="h-3 w-3 mr-1" />
              {isPhase2 ? '二阶段：咏叹调' : '一阶段'}
            </Button>
          </div>
        )}

        {/* 二阶段演出描述 */}
        {enemy.isBoss && isPhase2 && enemy.phase2Effect && (
          <div className="rounded-lg bg-danger-red/5 border border-danger-red/20 p-3">
            <div className="text-xs font-medium text-danger-red mb-1">转阶段效果</div>
            <p className="text-xs text-muted-foreground leading-relaxed">{enemy.phase2Effect}</p>
          </div>
        )}

        <Separator className="bg-white/5" />

        {/* 行为骰矩阵 */}
        <div>
          <div className="text-xs font-medium text-sonic-purple mb-3">行为骰矩阵 (1d6)</div>
          <div className="space-y-2">
            {currentActions.map((action, i) => (
              <div
                key={i}
                className={cn(
                  'rounded-lg border p-2.5 transition-all',
                  matchedAction === action
                    ? 'border-sonic-purple/50 bg-sonic-purple/10'
                    : 'border-white/5 bg-abyss/40'
                )}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-[10px] h-5 font-display font-bold border-sonic-purple/30 text-sonic-purple">
                    {action.diceRange[0] === action.diceRange[1]
                      ? action.diceRange[0]
                      : `${action.diceRange[0]}-${action.diceRange[1]}`
                    }
                  </Badge>
                  <span className="text-sm font-medium text-foreground">{action.name}</span>
                  <span className="text-[10px] text-muted-foreground font-display">{action.nameEn}</span>
                  <ActionBadge action={action} />
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed pl-7">{action.effect}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 掷骰区 */}
        <Separator className="bg-white/5" />
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="text-xs font-medium text-sonic-purple mb-2">掷骰模拟</div>
            <Button
              onClick={rollDice}
              disabled={rolling}
              className="bg-sonic-purple/20 text-sonic-purple hover:bg-sonic-purple/30 border border-sonic-purple/30"
              size="sm"
            >
              <Skull className="h-3.5 w-3.5 mr-1.5" />
              {rolling ? '掷骰中...' : '掷 1d6'}
            </Button>
          </div>
          {diceValue && (
            <div className="flex flex-col items-center gap-2">
              <DiceDisplay value={diceValue} rolling={rolling} />
              {matchedAction && !rolling && (
                <div className="text-center">
                  <div className="text-xs font-medium text-sonic-purple">{matchedAction.name}</div>
                  <div className="text-[10px] text-muted-foreground max-w-48">{matchedAction.effect}</div>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function EnemiesPage() {
  const regularEnemies = enemies.filter(e => !e.isBoss);
  const boss = enemies.find(e => e.isBoss);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold tracking-wide">
          <span className="text-sonic-purple">ABERRATIONS</span> — 畸变体图鉴
        </h1>
        <p className="text-muted-foreground mt-1">第一章：回响裂谷</p>
      </div>

      <div className="space-y-6">
        {/* 普通畸变体 */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Skull className="h-4 w-4 text-danger-red" />
            <span className="text-sm font-medium text-danger-red">普通畸变体</span>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {regularEnemies.map(enemy => (
              <EnemyCard key={enemy.id} enemy={enemy} />
            ))}
          </div>
        </div>

        {/* Boss */}
        {boss && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Swords className="h-4 w-4 text-gold" />
              <span className="text-sm font-medium text-gold">关底首领</span>
            </div>
            <EnemyCard enemy={boss} />
          </div>
        )}
      </div>
    </div>
  );
}
