'use client';

import { useState, useCallback } from 'react';
import { getPollutionLevel, pollutionLevels } from '@/lib/game-data';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  Calculator as CalcIcon, Swords, Shield, Zap, AlertTriangle,
  ChevronDown, ChevronUp, ArrowRight, Info
} from 'lucide-react';

interface CalcResult {
  step: string;
  value: number;
}

export default function CalculatorPage() {
  // 输入
  const [baseDamage, setBaseDamage] = useState(0);
  const [armor, setArmor] = useState(0);
  const [sonicBoomLayers, setSonicBoomLayers] = useState(0);
  const [pollutionLevel, setPollutionLevel] = useState(0);
  const [abilityBonus, setAbilityBonus] = useState(0);
  const [isPiercing, setIsPiercing] = useState(false);
  const [selfDamage, setSelfDamage] = useState(0);

  // 计算
  const calculate = useCallback(() => {
    const results: CalcResult[] = [];
    const pLevel = getPollutionLevel(pollutionLevel);

    // 1. 基础伤害
    results.push({ step: '基础伤害', value: baseDamage });

    // 2. 能力增伤
    let currentDamage = baseDamage + abilityBonus;
    if (abilityBonus > 0) {
      results.push({ step: `+能力增伤 (${abilityBonus})`, value: currentDamage });
    }

    // 3. 污染等级加成（仅对怪物攻击生效，此处玩家攻击不含此加成）
    // 但如果是怪物伤害计算，污染等级会给怪物加伤害
    // 这里做两种计算：玩家对怪物的伤害 & 怪物对玩家的伤害

    return results;
  }, [baseDamage, abilityBonus, armor, sonicBoomLayers, pollutionLevel, isPiercing, selfDamage]);

  // 玩家对怪物的伤害
  const playerToEnemyDamage = (() => {
    const pLevel = getPollutionLevel(pollutionLevel);
    const steps: CalcResult[] = [];
    let dmg = baseDamage + abilityBonus;

    steps.push({ step: '基础伤害', value: baseDamage });
    if (abilityBonus > 0) {
      steps.push({ step: `+能力增伤 (${abilityBonus})`, value: dmg });
    }
    steps.push({ step: '最终伤害', value: dmg });
    return { damage: dmg, steps };
  })();

  // 怪物对玩家的伤害
  const enemyToPlayerDamage = (() => {
    const pLevel = getPollutionLevel(pollutionLevel);
    const steps: CalcResult[] = [];
    let dmg = baseDamage + pLevel.damageBonus;

    steps.push({ step: '怪物基础伤害', value: baseDamage });
    if (pLevel.damageBonus > 0) {
      steps.push({ step: `+污染加成 (${pLevel.name} +${pLevel.damageBonus})`, value: dmg });
    }

    let actualDmg: number;
    if (isPiercing) {
      steps.push({ step: '穿透：跳过护甲', value: dmg });
      actualDmg = dmg;
    } else {
      const afterArmor = Math.max(0, dmg - armor);
      steps.push({ step: `-护甲抵扣 (${armor})`, value: Math.max(0, dmg - armor) });
      actualDmg = afterArmor;
    }

    steps.push({ step: '最终伤害', value: actualDmg });
    return { damage: actualDmg, steps };
  })();

  // 声爆伤害
  const sonicBoomDamage = sonicBoomLayers * 1;

  const [showPlayerCalc, setShowPlayerCalc] = useState(true);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold tracking-wide">
          <span className="text-sonic-purple">DAMAGE</span> CALCULATOR
        </h1>
        <p className="text-muted-foreground mt-1">精确计算伤害、护甲抵扣与声爆结算</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* 输入面板 */}
        <Card className="border-sonic-purple/20 bg-abyss-light/80">
          <CardContent className="p-4 space-y-4">
            <div className="text-xs font-medium text-sonic-purple">输入参数</div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                  <Swords className="h-3 w-3" /> 基础伤害值
                </label>
                <Input
                  type="number"
                  value={baseDamage}
                  onChange={(e) => setBaseDamage(Number(e.target.value) || 0)}
                  className="bg-abyss border-white/10 font-display text-lg"
                  min={0}
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                  <Shield className="h-3 w-3" /> 目标护甲值
                </label>
                <Input
                  type="number"
                  value={armor}
                  onChange={(e) => setArmor(Number(e.target.value) || 0)}
                  className="bg-abyss border-white/10 font-display text-lg"
                  min={0}
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                  <Zap className="h-3 w-3" /> 声爆层数
                </label>
                <Input
                  type="number"
                  value={sonicBoomLayers}
                  onChange={(e) => setSonicBoomLayers(Number(e.target.value) || 0)}
                  className="bg-abyss border-white/10 font-display text-lg"
                  min={0}
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                  当前污染度
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={pollutionLevel}
                    onChange={(e) => setPollutionLevel(Math.min(30, Math.max(0, Number(e.target.value) || 0)))}
                    className="bg-abyss border-white/10 font-display text-lg"
                    min={0}
                    max={30}
                  />
                  <Badge className={cn('text-[10px]', getPollutionLevel(pollutionLevel).color, 'bg-white/5 border-transparent whitespace-nowrap')}>
                    {getPollutionLevel(pollutionLevel).name}
                  </Badge>
                </div>
              </div>

              <div>
                <label className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                  能力增伤
                </label>
                <Input
                  type="number"
                  value={abilityBonus}
                  onChange={(e) => setAbilityBonus(Number(e.target.value) || 0)}
                  className="bg-abyss border-white/10 font-display text-lg"
                  min={0}
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                  自身卡牌伤害（如过载轰鸣）
                </label>
                <Input
                  type="number"
                  value={selfDamage}
                  onChange={(e) => setSelfDamage(Number(e.target.value) || 0)}
                  className="bg-abyss border-white/10 font-display text-lg"
                  min={0}
                />
              </div>

              <div className="flex items-center gap-3">
                <Button
                  variant={isPiercing ? 'default' : 'outline'}
                  size="sm"
                  className={cn(
                    'text-xs',
                    isPiercing ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' : 'border-white/10 text-muted-foreground'
                  )}
                  onClick={() => setIsPiercing(!isPiercing)}
                >
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  穿透伤害
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 计算结果面板 */}
        <div className="space-y-4">
          {/* 玩家→怪物 */}
          <Card className="border-red-500/20 bg-abyss-light/80">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-red-400 flex items-center gap-1">
                  <Swords className="h-3 w-3" /> 玩家 → 怪物
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 w-5 p-0 text-muted-foreground"
                  onClick={() => setShowPlayerCalc(!showPlayerCalc)}
                >
                  {showPlayerCalc ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </Button>
              </div>
              {showPlayerCalc && (
                <>
                  <div className="space-y-1.5">
                    {playerToEnemyDamage.steps.map((step, i) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">{step.step}</span>
                        <span className={cn(
                          'font-display font-bold',
                          i === playerToEnemyDamage.steps.length - 1 ? 'text-red-400 text-lg' : 'text-foreground'
                        )}>
                          {step.value}
                        </span>
                      </div>
                    ))}
                  </div>
                  <Separator className="bg-white/5" />
                  <div className="text-center">
                    <span className="text-xs text-muted-foreground">最终伤害</span>
                    <div className="font-display text-4xl font-bold text-red-400">{playerToEnemyDamage.damage}</div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* 怪物→玩家 */}
          <Card className="border-blue-500/20 bg-abyss-light/80">
            <CardContent className="p-4 space-y-3">
              <div className="text-xs font-medium text-blue-400 flex items-center gap-1">
                <Shield className="h-3 w-3" /> 怪物 → 玩家
              </div>
              <div className="space-y-1.5">
                {enemyToPlayerDamage.steps.map((step, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{step.step}</span>
                    <span className={cn(
                      'font-display font-bold',
                      i === enemyToPlayerDamage.steps.length - 1 ? 'text-blue-400 text-lg' : 'text-foreground'
                    )}>
                      {step.value}
                    </span>
                  </div>
                ))}
              </div>
              <Separator className="bg-white/5" />
              <div className="text-center">
                <span className="text-xs text-muted-foreground">玩家承受伤害</span>
                <div className="font-display text-4xl font-bold text-blue-400">{enemyToPlayerDamage.damage}</div>
                {isPiercing && (
                  <div className="text-[10px] text-orange-400 mt-1">穿透伤害：无视护甲</div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 声爆结算 */}
          {sonicBoomLayers > 0 && (
            <Card className="border-purple-500/20 bg-abyss-light/80">
              <CardContent className="p-4 space-y-2">
                <div className="text-xs font-medium text-purple-400 flex items-center gap-1">
                  <Zap className="h-3 w-3" /> 声爆回合结算
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {sonicBoomLayers} 层 × 1 穿透/层
                  </span>
                  <span className="font-display text-2xl font-bold text-purple-400">{sonicBoomDamage}</span>
                </div>
                <div className="text-[10px] text-muted-foreground">
                  声爆伤害为穿透伤害，不与护甲交互
                </div>
              </CardContent>
            </Card>
          )}

          {/* 自伤结算 */}
          {selfDamage > 0 && (
            <Card className="border-orange-500/20 bg-abyss-light/80">
              <CardContent className="p-4 space-y-2">
                <div className="text-xs font-medium text-orange-400 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> 自身卡牌伤害
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">触发痛觉回响</span>
                  <span className="font-display text-lg font-bold text-orange-400">+{Math.min(selfDamage, 8)} 增伤</span>
                </div>
                <div className="text-[10px] text-muted-foreground">
                  注意：&quot;失去生命&quot;（如断弦极限）不触发痛觉回响
                </div>
              </CardContent>
            </Card>
          )}

          {/* 术语提示 */}
          <Card className="border-white/5 bg-abyss-light/60">
            <CardContent className="p-4 space-y-2">
              <div className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Info className="h-3 w-3" /> 术语速查
              </div>
              <div className="space-y-1 text-[10px] text-muted-foreground">
                <div><span className="text-red-400">受到伤害</span>：有来源的伤害事件，触发触发器，被护甲抵扣</div>
                <div><span className="text-orange-400">穿透伤害</span>：有来源但跳过护甲，仍触发触发器</div>
                <div><span className="text-yellow-400">失去生命</span>：无来源的生命调整，不触发任何触发器，不被护甲抵扣</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
