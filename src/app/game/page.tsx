'use client';

import { useState, useCallback } from 'react';
import { getPollutionLevel, pollutionLevels, type Enemy, type EnemyAction } from '@/lib/game-data';
import { enemies } from '@/lib/game-data';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Swords, Shield, Heart, Zap, Skull, Dice1, Dice2, Dice3, Dice4, Dice5, Dice6,
  ChevronRight, RotateCcw, Minus, Plus, AlertTriangle, Wind
} from 'lucide-react';

type Phase = 'start' | 'enemy_intent' | 'player_action' | 'enemy_resolve' | 'end';

const phaseConfig: Record<Phase, { label: string; labelEn: string; description: string }> = {
  start: { label: '回合开始', labelEn: 'Start Phase', description: '触发"回合开始时"效果，声爆结算，抽取手牌' },
  enemy_intent: { label: '怪物意图', labelEn: 'Enemy Intent', description: '为每个畸变体掷骰，公开其本回合行动' },
  player_action: { label: '玩家行动', labelEn: 'Player Action', description: '玩家依次打出卡牌、调谐或使用遗物' },
  enemy_resolve: { label: '怪物结算', labelEn: 'Enemy Resolve', description: '按顺序结算怪物行动' },
  end: { label: '回合结束', labelEn: 'End Phase', description: '触发"回合结束时"效果，污染度+1，弃牌重置' },
};

const phaseOrder: Phase[] = ['start', 'enemy_intent', 'player_action', 'enemy_resolve', 'end'];

const diceIcons = [Dice1, Dice2, Dice3, Dice4, Dice5, Dice6];

export default function GamePage() {
  // 污染度
  const [pollution, setPollution] = useState(0);
  // 回合数
  const [round, setRound] = useState(1);
  // 当前阶段
  const [phase, setPhase] = useState<Phase>('start');
  // 玩家状态
  const [playerHp, setPlayerHp] = useState(80);
  const [playerMaxHp] = useState(80);
  const [playerArmor, setPlayerArmor] = useState(0);
  const [playerSonicBoom, setPlayerSonicBoom] = useState(0);
  const [playerAp, setPlayerAp] = useState(3);
  // 掷骰
  const [diceResults, setDiceResults] = useState<Record<string, { value: number; action: EnemyAction | null }>>({});
  const [rollingEnemy, setRollingEnemy] = useState<string | null>(null);
  // 场上敌人
  const [activeEnemies, setActiveEnemies] = useState<Enemy[]>([enemies[0]]);

  const currentPollutionLevel = getPollutionLevel(pollution);
  const phaseIndex = phaseOrder.indexOf(phase);

  const nextPhase = useCallback(() => {
    const nextIdx = phaseIndex + 1;
    if (nextIdx >= phaseOrder.length) {
      // 新回合
      setPhase('start');
      setRound(r => r + 1);
      setPlayerArmor(0);
      setPlayerAp(3);
      setDiceResults({});
      // 污染度自然增长
      setPollution(p => Math.min(30, p + 1));
      // 声爆伤害结算
      if (playerSonicBoom > 0) {
        setPlayerHp(hp => Math.max(0, hp - playerSonicBoom));
      }
      // 污染等级穿透伤害
      if (currentPollutionLevel.playerPiercingDmg > 0) {
        setPlayerHp(hp => Math.max(0, hp - currentPollutionLevel.playerPiercingDmg));
      }
    } else {
      setPhase(phaseOrder[nextIdx]);
    }
  }, [phaseIndex, playerSonicBoom, currentPollutionLevel.playerPiercingDmg]);

  const rollForEnemy = useCallback((enemy: Enemy) => {
    setRollingEnemy(enemy.id);
    const actions = enemy.isBoss ? (enemy.actions) : enemy.actions;
    setTimeout(() => {
      const value = Math.floor(Math.random() * 6) + 1;
      const action = actions.find(a => value >= a.diceRange[0] && value <= a.diceRange[1]) ?? null;
      setDiceResults(prev => ({ ...prev, [enemy.id]: { value, action } }));
      setRollingEnemy(null);
    }, 500);
  }, []);

  const resetGame = useCallback(() => {
    setPollution(0);
    setRound(1);
    setPhase('start');
    setPlayerHp(80);
    setPlayerArmor(0);
    setPlayerSonicBoom(0);
    setPlayerAp(3);
    setDiceResults({});
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-wide">
            <span className="text-sonic-purple">COMMAND</span> CENTER
          </h1>
          <p className="text-xs text-muted-foreground">游戏主控台 · 深渊协奏</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="text-xs border-white/10 text-muted-foreground hover:text-foreground"
          onClick={resetGame}
        >
          <RotateCcw className="h-3 w-3 mr-1" /> 重置游戏
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* 左侧：回合进度 + 玩家状态 */}
        <div className="space-y-4">
          {/* 回合与阶段 */}
          <Card className="border-sonic-purple/20 bg-abyss-light/80">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">回合</span>
                <span className="font-display text-2xl font-bold text-sonic-purple">{round}</span>
              </div>

              {/* 阶段进度 */}
              <div className="space-y-1.5">
                {phaseOrder.map((p, i) => {
                  const conf = phaseConfig[p];
                  const isActive = p === phase;
                  const isDone = i < phaseIndex;
                  return (
                    <div
                      key={p}
                      className={cn(
                        'flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs transition-all',
                        isActive ? 'bg-sonic-purple/15 border border-sonic-purple/30' :
                        isDone ? 'bg-white/5 text-muted-foreground/50' :
                        'text-muted-foreground/40'
                      )}
                    >
                      <div className={cn(
                        'flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-display font-bold',
                        isActive ? 'bg-sonic-purple text-white' :
                        isDone ? 'bg-green-500/30 text-green-400' :
                        'bg-white/10 text-muted-foreground/40'
                      )}>
                        {isDone ? '✓' : i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={cn('font-medium', isActive && 'text-sonic-purple-light')}>{conf.label}</div>
                        {isActive && <div className="text-[10px] text-muted-foreground truncate">{conf.description}</div>}
                      </div>
                      {isActive && <ChevronRight className="h-3 w-3 text-sonic-purple" />}
                    </div>
                  );
                })}
              </div>

              <Button
                onClick={nextPhase}
                className="w-full bg-sonic-purple/20 text-sonic-purple hover:bg-sonic-purple/30 border border-sonic-purple/30"
                size="sm"
              >
                下一阶段 <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </CardContent>
          </Card>

          {/* 玩家状态 */}
          <Card className="border-sonic-purple/20 bg-abyss-light/80">
            <CardContent className="p-4 space-y-3">
              <div className="text-xs font-medium text-sonic-purple mb-1">钟律 · 重装和弦师</div>

              {/* 生命值 */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="flex items-center gap-1 text-red-400">
                    <Heart className="h-3 w-3" /> 生命值
                  </span>
                  <span className="font-display font-bold">
                    <span className={cn(playerHp <= 20 ? 'text-red-400' : 'text-foreground')}>{playerHp}</span>
                    <span className="text-muted-foreground">/{playerMaxHp}</span>
                  </span>
                </div>
                <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-500',
                      playerHp > 40 ? 'bg-green-500' :
                      playerHp > 20 ? 'bg-yellow-500' :
                      'bg-red-500'
                    )}
                    style={{ width: `${(playerHp / playerMaxHp) * 100}%` }}
                  />
                </div>
              </div>

              {/* 护甲 & 行动力 */}
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-2 text-center">
                  <div className="text-[10px] text-blue-400 mb-0.5">护甲</div>
                  <div className="flex items-center justify-center gap-1">
                    <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-blue-400" onClick={() => setPlayerArmor(a => Math.max(0, a - 1))}>
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="font-display text-xl font-bold text-blue-400">{playerArmor}</span>
                    <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-blue-400" onClick={() => setPlayerArmor(a => a + 1)}>
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <div className="rounded-lg bg-purple-500/10 border border-purple-500/20 p-2 text-center">
                  <div className="text-[10px] text-purple-400 mb-0.5">行动力</div>
                  <div className="flex items-center justify-center gap-1">
                    <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-purple-400" onClick={() => setPlayerAp(a => Math.max(0, a - 1))}>
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="font-display text-xl font-bold text-purple-400">{playerAp}</span>
                    <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-purple-400" onClick={() => setPlayerAp(a => a + 1)}>
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* 声爆 */}
              <div className="rounded-lg bg-purple-500/5 border border-purple-500/10 p-2">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 text-xs text-purple-400">
                    <Zap className="h-3 w-3" /> 声爆 Debuff
                  </span>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-purple-400" onClick={() => setPlayerSonicBoom(s => Math.max(0, s - 1))}>
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="font-display text-lg font-bold text-purple-400">{playerSonicBoom}</span>
                    <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-purple-400" onClick={() => setPlayerSonicBoom(s => s + 1)}>
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                {playerSonicBoom > 0 && (
                  <div className="text-[10px] text-muted-foreground mt-1">
                    回合结束受到 {playerSonicBoom} 点穿透伤害
                  </div>
                )}
              </div>

              {/* 快捷操作 */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-[10px] h-7 border-blue-500/20 text-blue-400"
                  onClick={() => setPlayerArmor(a => a + 5)}
                >
                  <Shield className="h-3 w-3 mr-1" /> +5护甲
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-[10px] h-7 border-green-500/20 text-green-400"
                  onClick={() => setPollution(p => Math.max(0, p - 1))}
                >
                  <Wind className="h-3 w-3 mr-1" /> 调谐-1
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 中间：污染刻度尺 */}
        <div className="space-y-4">
          <Card className="border-sonic-purple/20 bg-abyss-light/80">
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-sonic-purple">污染刻度尺</span>
                <Badge className={cn('text-[10px]', currentPollutionLevel.color, 'bg-white/5 border-transparent')}>
                  {currentPollutionLevel.name} · {currentPollutionLevel.nameEn}
                </Badge>
              </div>

              {/* 刻度尺可视化 */}
              <div className="relative">
                {/* 背景条 */}
                <div className="h-8 rounded-lg overflow-hidden relative">
                  <div className="absolute inset-0 pollution-gradient opacity-30" />
                  {/* 填充 */}
                  <div
                    className="absolute left-0 top-0 h-full pollution-gradient opacity-70 transition-all duration-500"
                    style={{ width: `${(pollution / 30) * 100}%` }}
                  />
                  {/* 刻度线 */}
                  {[5, 12, 20, 28].map(tick => (
                    <div
                      key={tick}
                      className="absolute top-0 h-full w-px bg-white/30"
                      style={{ left: `${(tick / 30) * 100}%` }}
                    />
                  ))}
                  {/* 当前位置指示器 */}
                  <div
                    className="absolute top-0 h-full w-1 bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)] transition-all duration-500"
                    style={{ left: `${(pollution / 30) * 100}%` }}
                  />
                </div>
                {/* 刻度数字 */}
                <div className="flex justify-between mt-1">
                  <span className="text-[10px] text-muted-foreground font-display">0</span>
                  <span className="text-[10px] text-muted-foreground font-display">30</span>
                </div>
              </div>

              {/* 当前污染度大数字 */}
              <div className="text-center">
                <span className={cn('font-display text-5xl font-bold', currentPollutionLevel.color)}>
                  {pollution}
                </span>
                <span className="text-muted-foreground text-sm"> / 30</span>
              </div>

              {/* 污染度增减 */}
              <div className="flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0 border-white/10 text-muted-foreground"
                  onClick={() => setPollution(p => Math.max(0, p - 1))}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0 border-white/10 text-muted-foreground"
                  onClick={() => setPollution(p => Math.max(0, p - 3))}
                >
                  -3
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0 border-white/10 text-muted-foreground"
                  onClick={() => setPollution(p => Math.min(30, p + 1))}
                >
                  <Plus className="h-3 w-3" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0 border-white/10 text-muted-foreground"
                  onClick={() => setPollution(p => Math.min(30, p + 3))}
                >
                  +3
                </Button>
              </div>

              <Separator className="bg-white/5" />

              {/* 污染等级效果表 */}
              <div className="space-y-1.5">
                <div className="text-[10px] text-muted-foreground font-medium">等级效果</div>
                {pollutionLevels.map((level, i) => {
                  const isActive = pollution >= level.range[0] && pollution <= level.range[1];
                  return (
                    <div
                      key={i}
                      className={cn(
                        'rounded-md px-2.5 py-1.5 text-[10px] transition-all',
                        isActive ? 'bg-white/5 border border-white/10' : 'opacity-40'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className={cn('font-medium', level.color)}>
                          {level.name} ({level.range[0]}-{level.range[1]})
                        </span>
                      </div>
                      <div className="text-muted-foreground mt-0.5">
                        伤害+{level.damageBonus}
                        {level.armorPerTurn > 0 && ` · 护甲+${level.armorPerTurn}/回合`}
                        {level.playerPiercingDmg > 0 && ` · 玩家受${level.playerPiercingDmg}穿透/回合`}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 终焉和弦警告 */}
              {pollution >= 28 && (
                <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-3 animate-glow-breathe">
                  <div className="flex items-center gap-2 text-xs text-red-400">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="font-medium">
                      {pollution >= 29 ? '终焉和弦！若下回合结束仍为30，游戏失败！' : '即将进入终焉和弦！'}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 右侧：怪物区域 */}
        <div className="space-y-4">
          {activeEnemies.map(enemy => (
            <EnemyPanel
              key={enemy.id}
              enemy={enemy}
              diceResult={diceResults[enemy.id]}
              isRolling={rollingEnemy === enemy.id}
              onRoll={() => rollForEnemy(enemy)}
              pollutionBonus={currentPollutionLevel.damageBonus}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function EnemyPanel({
  enemy,
  diceResult,
  isRolling,
  onRoll,
  pollutionBonus,
}: {
  enemy: Enemy;
  diceResult?: { value: number; action: EnemyAction | null };
  isRolling: boolean;
  onRoll: () => void;
  pollutionBonus: number;
}) {
  const DiceIcon = diceResult ? diceIcons[diceResult.value - 1] : null;

  return (
    <Card className={cn(
      'border-sonic-purple/20 bg-abyss-light/80',
      enemy.isBoss && 'border-gold/20'
    )}>
      <div className={cn(
        'h-0.5',
        enemy.isBoss ? 'bg-gold/50' : 'bg-danger-red/40'
      )} />
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className={cn('font-display text-sm font-bold', enemy.isBoss ? 'text-gold' : 'text-danger-red')}>
              {enemy.name}
            </h3>
            <p className="text-[10px] text-muted-foreground font-display">{enemy.nameEn}</p>
          </div>
          {pollutionBonus > 0 && (
            <Badge className="bg-danger-red/20 text-danger-red border-danger-red/30 text-[10px] h-5">
              <Swords className="h-2.5 w-2.5 mr-0.5" /> 伤害+{pollutionBonus}
            </Badge>
          )}
        </div>

        {/* 掷骰 */}
        <div className="flex items-center gap-3">
          <Button
            onClick={onRoll}
            disabled={isRolling}
            variant="outline"
            size="sm"
            className={cn(
              'text-xs',
              enemy.isBoss
                ? 'border-gold/30 text-gold hover:bg-gold/10'
                : 'border-danger-red/30 text-danger-red hover:bg-danger-red/10'
            )}
          >
            <Skull className="h-3 w-3 mr-1" />
            {isRolling ? '掷骰中...' : '掷 1d6'}
          </Button>
          {diceResult && DiceIcon && (
            <div className={cn(
              'flex h-10 w-10 items-center justify-center rounded-lg border font-display text-xl font-bold',
              isRolling ? 'animate-dice-bounce border-sonic-purple bg-sonic-purple/20 text-sonic-purple' :
              'border-sonic-purple/30 bg-sonic-purple/10 text-sonic-purple'
            )}>
              <DiceIcon className="h-6 w-6" />
            </div>
          )}
        </div>

        {/* 掷骰结果 */}
        {diceResult?.action && !isRolling && (
          <div className="rounded-lg border border-sonic-purple/30 bg-sonic-purple/5 p-3">
            <div className="text-xs font-medium text-sonic-purple mb-1">
              {diceResult.action.name}
              <span className="text-[10px] text-muted-foreground ml-1">{diceResult.action.nameEn}</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{diceResult.action.effect}</p>
            {pollutionBonus > 0 && diceResult.action.damage && (
              <div className="mt-1.5 text-[10px] text-danger-red">
                污染加成：{diceResult.action.damage} → {diceResult.action.damage + pollutionBonus} 伤害
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
