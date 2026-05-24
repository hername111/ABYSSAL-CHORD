'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Skull, Shield, Users, User, Play, RotateCcw, Target, ChevronRight, Trophy, Gamepad2, Layers, Clock, MessageSquare, DoorOpen, Zap, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, INITIAL_HAND_CARDS, zhongLvCards } from '@/lib/cards';
import { Button } from '@/components/ui/button';
import { Card as CardUI } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

// 能力类型
type AbilityType = 'FREQUENCY_ANCHOR' | 'LOW_FREQUENCY_RESONANCE' | 'PAIN_ECHO' | 'FINAL_TUNING';

// 能力配置
const abilityConfig: Record<AbilityType, {
  armorPerTurn?: number;
  armorThreshold?: number;
  damagePerThreshold?: number;
  selfDamageBonusPerPoint?: number;
  maxBonus?: number;
  lowHpThreshold?: number;
  lowHpDamageBonus?: number;
  lowHpDotDamage?: number;
}> = {
  FREQUENCY_ANCHOR: {
    armorPerTurn: 3,
  },
  LOW_FREQUENCY_RESONANCE: {
    armorThreshold: 5,
    damagePerThreshold: 3,
  },
  PAIN_ECHO: {
    selfDamageBonusPerPoint: 1,
    maxBonus: 8,
  },
  FINAL_TUNING: {
    lowHpThreshold: 20,
    lowHpDamageBonus: 5,
    lowHpDotDamage: 2,
  },
};

// 常量定义
const MAX_HAND_SIZE = 6; // 手牌上限严格限制为6张
const TURN_TIME_LIMIT = 30; // 回合时间限制
const DRAW_PER_TURN = 2; // 每回合固定抽取的张数
const INITIAL_HAND_COUNT = 5; // 初始手牌数量

// 污染度等级
const pollutionLevels = [
  { level: 0, name: "寂静期", color: "#22c55e", damageBonus: 0, armorPerTurn: 0, playerPiercingDmg: 0, description: "稳定期，无额外效果" },
  { level: 20, name: "回响期", color: "#eab308", damageBonus: 0, armorPerTurn: 2, playerPiercingDmg: 0, description: "敌人每回合+2护甲" },
  { level: 40, name: "共鸣期", color: "#f97316", damageBonus: 2, armorPerTurn: 3, playerPiercingDmg: 0, description: "伤害+2，敌人每回合+3护甲" },
  { level: 60, name: "震颤期", color: "#ef4444", damageBonus: 4, armorPerTurn: 5, playerPiercingDmg: 1, description: "伤害+4，敌人每回合+5护甲，你受到的伤害-1（最少0）" },
  { level: 80, name: "崩塌期", color: "#a855f7", damageBonus: 6, armorPerTurn: 8, playerPiercingDmg: 2, description: "伤害+6，敌人每回合+8护甲，你受到的伤害-2（最少0）" },
  { level: 100, name: "湮灭期", color: "#7c3aed", damageBonus: 10, armorPerTurn: 10, playerPiercingDmg: 3, description: "伤害+10，敌人每回合+10护甲，你受到的伤害-3（最少0）" },
];

// 获取当前污染等级
const getPollutionLevel = (level: number) => {
  return pollutionLevels.reduce((acc, curr) => level >= curr.level ? curr : acc, pollutionLevels[0]);
};

// 小工具组件
const StatBox = ({ name, value, color, maxValue, icon: Icon }: { 
  name: string; 
  value: number; 
  color: string; 
  maxValue?: number; 
  icon?: any; 
}) => (
  <div className="flex flex-col gap-1">
    <div className="flex items-center gap-2 text-sm text-slate-400">
      {Icon && <Icon className="w-4 h-4" />}
      {name}
    </div>
    <div className="text-2xl font-bold font-['Rajdhani']" style={{ color }}>
      {maxValue ? `${value}/${maxValue}` : value}
    </div>
    {maxValue && (
      <Progress value={(value / maxValue) * 100} className="h-2" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }} />
    )}
  </div>
);

// 玩家状态面板组件
const EntityStatusPanel = ({ 
  name, hp, maxHp, armor, ap, maxAp, activeAbilities, isEnemy = false 
}: { 
  name: string; 
  hp: number; 
  maxHp: number; 
  armor: number; 
  ap: number; 
  maxAp: number; 
  activeAbilities?: Array<{ id: AbilityType; name: string }>;
  isEnemy?: boolean; 
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  
  // 获取能力名称和效果描述
  const getAbilityInfo = (id: AbilityType) => {
    const config = abilityConfig[id];
    let displayName = "";
    let displayDesc = "";
    let iconColor = "";
    
    switch (id) {
      case "FREQUENCY_ANCHOR":
        displayName = "频率锚定";
        displayDesc = `每回合+${config.armorPerTurn}护甲`;
        iconColor = "text-armor-blue";
        break;
      case "LOW_FREQUENCY_RESONANCE":
        displayName = "低频共振";
        displayDesc = `每${config.armorThreshold}护甲→${config.damagePerThreshold}伤害`;
        iconColor = "text-sonic-purple";
        break;
      case "PAIN_ECHO":
        displayName = "痛觉回响";
        displayDesc = `自伤1→+${config.selfDamageBonusPerPoint}伤害(最多+${config.maxBonus})`;
        iconColor = "text-danger-red";
        break;
      case "FINAL_TUNING":
        displayName = "终末定音";
        displayDesc = `≤${config.lowHpThreshold}HP时+${config.lowHpDamageBonus}伤害/${config.lowHpDotDamage}DOT`;
        iconColor = "text-gold";
        break;
    }
    
    return { displayName, displayDesc, iconColor };
  };
  
  // 统计能力叠加次数
  const abilityCounts = (activeAbilities || []).reduce((acc, ability) => {
    acc[ability.id] = (acc[ability.id] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  // 去重后的能力列表
  const uniqueAbilities = Array.from(new Set((activeAbilities || []).map(a => a.id))).map(id => {
    const ability = (activeAbilities || []).find(a => a.id === id)!;
    return { ...ability, count: abilityCounts[id] || 1 };
  });
  
  return (
    <div className={cn(
      "flex flex-col gap-3 p-4 rounded-xl border border-slate-700/50 bg-slate-900/80 backdrop-blur-sm",
      isEnemy ? "w-64" : "w-64"
    )}>
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center border-2 border-slate-700">
          {isEnemy ? <Skull className="w-6 h-6 text-slate-400" /> : <User className="w-6 h-6 text-slate-400" />}
        </div>
        <div>
          <h3 className="font-bold font-['Rajdhani'] text-lg text-slate-200">{name}</h3>
          <p className="text-sm text-slate-500">调音师</p>
        </div>
      </div>
      
      <div className="space-y-2">
        {/* HP条 */}
        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-sm">
            <span className="text-red-400 font-['Rajdhani'] font-bold">HP</span>
            <span className="text-slate-300 font-['Rajdhani'] font-bold">{hp}/{maxHp}</span>
          </div>
          <div className="h-4 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
            <div 
              className="h-full bg-gradient-to-r from-red-600 to-red-400 transition-all duration-300"
              style={{ width: `${(hp / maxHp) * 100}%` }}
            />
          </div>
        </div>
        
        {/* 护甲（如果有）*/}
        {armor > 0 && (
          <div className="flex items-center gap-2 text-armor-blue">
            <Shield className="w-4 h-4" />
            <span className="font-['Rajdhani'] font-bold">{armor} 护甲</span>
          </div>
        )}
        
        {/* AP条 - 只显示玩家的 */}
        {!isEnemy && (
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-sm">
              <span className="text-sonic-purple font-['Rajdhani'] font-bold flex items-center gap-1">
                <Zap className="w-4 h-4" />
                AP
              </span>
              <span className="text-slate-300 font-['Rajdhani'] font-bold">{ap}/{maxAp}</span>
            </div>
            <div className="h-4 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
              <div 
                className="h-full bg-gradient-to-r from-sonic-purple to-violet-400 transition-all duration-300"
                style={{ width: `${(ap / maxAp) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>
      
      {/* 永久能力显示 - 只显示玩家的 */}
      {!isEnemy && uniqueAbilities.length > 0 && (
        <div className="mt-2">
          {/* 紧凑显示格 */}
          <div 
            className="relative group"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
          >
            <div className="flex items-center gap-2 p-2 bg-slate-800/50 rounded-lg cursor-pointer hover:bg-slate-700/50 transition-colors">
              <div className="flex -space-x-2">
                {uniqueAbilities.slice(0, 3).map((ability, i) => {
                  const { iconColor } = getAbilityInfo(ability.id as AbilityType);
                  return (
                    <div 
                      key={ability.id}
                      className={cn(
                        "w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold border-2 border-slate-900",
                        iconColor.replace('text-', 'bg-').replace('-blue', '-blue/80').replace('-purple', '-purple/80').replace('-red', '-red/80').replace('-gold', '-yellow/80')
                      )}
                      style={{ zIndex: uniqueAbilities.length - i }}
                    >
                      {ability.count > 1 && ability.count}
                    </div>
                  );
                })}
              </div>
              <span className="text-sm font-bold text-slate-300 font-['Rajdhani']">
                {uniqueAbilities.length} 个能力
              </span>
              <ChevronDown className="w-4 h-4 text-slate-500 ml-auto" />
            </div>
            
            {/* 展开Tooltip */}
            {showTooltip && (
              <div className="absolute bottom-full left-0 mb-2 w-72 bg-slate-900/95 backdrop-blur-sm border border-slate-700/50 rounded-xl p-3 shadow-xl z-50">
                <div className="space-y-2">
                  {uniqueAbilities.map((ability) => {
                    const { displayName, displayDesc, iconColor } = getAbilityInfo(ability.id as AbilityType);
                    return (
                      <div key={ability.id} className="flex items-start gap-3 p-2 rounded-lg bg-slate-800/50">
                        <div className={cn(
                          "w-3 h-3 rounded-full mt-1 flex-shrink-0",
                          iconColor.replace('text-', 'bg-')
                        )} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-200 font-['Rajdhani']">
                              {displayName}
                            </span>
                            {ability.count > 1 && (
                              <Badge variant="secondary" className="text-xs bg-slate-700">
                                x{ability.count}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 mt-1">
                            {displayDesc}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {/* 小箭头 */}
                <div className="absolute -bottom-2 left-8 w-0 h-0 border-l-8 border-r-8 border-t-8 border-transparent border-t-slate-700/50" />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// 主组件
export default function MultiplayerBattle() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roomId = searchParams.get('roomId');
  const playerId = searchParams.get('playerId');
  const playerName = searchParams.get('playerName');

  // 游戏状态
  const [gamePhase, setGamePhase] = useState<'playing' | 'ended'>('playing');
  const [winner, setWinner] = useState<'p1' | 'p2' | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<'p1' | 'p2'>('p1');
  const [turnCount, setTurnCount] = useState(1);
  const [turnTime, setTurnTime] = useState(TURN_TIME_LIMIT);

  // 玩家1状态
  const [p1Hp, setP1Hp] = useState(80);
  const [p1MaxHp] = useState(80);
  const [p1Armor, setP1Armor] = useState(0);
  const [p1Ap, setP1Ap] = useState(3);
  const [p1MaxAp] = useState(3);
  const [p1Hand, setP1Hand] = useState<Array<Card & { uid: string }>>([]);
  const [p1Deck, setP1Deck] = useState<Card[]>([]);
  const [p1Discard, setP1Discard] = useState<Card[]>([]);
  const [p1ActiveAbilities, setP1ActiveAbilities] = useState<Array<{ id: AbilityType; name: string }>>([]);
  const [p1Contamination, setP1Contamination] = useState(0);

  // 玩家2状态
  const [p2Hp, setP2Hp] = useState(80);
  const [p2MaxHp] = useState(80);
  const [p2Armor, setP2Armor] = useState(0);
  const [p2Ap, setP2Ap] = useState(3);
  const [p2MaxAp] = useState(3);
  const [p2Hand, setP2Hand] = useState<Array<Card & { uid: string }>>([]);
  const [p2Deck, setP2Deck] = useState<Card[]>([]);
  const [p2Discard, setP2Discard] = useState<Card[]>([]);
  const [p2ActiveAbilities, setP2ActiveAbilities] = useState<Array<{ id: AbilityType; name: string }>>([]);
  const [p2Contamination, setP2Contamination] = useState(0);

  // 选择状态
  const [selectedCard, setSelectedCard] = useState<(Card & { uid: string }) | null>(null);

  // 当前玩家的便捷访问
  const getCurrentPlayerHand = () => currentPlayer === 'p1' ? p1Hand : p2Hand;
  const getCurrentPlayerDeck = () => currentPlayer === 'p1' ? p1Deck : p2Deck;
  const getCurrentPlayerDiscard = () => currentPlayer === 'p1' ? p1Discard : p2Discard;
  const getCurrentPlayerAp = () => currentPlayer === 'p1' ? p1Ap : p2Ap;
  const getCurrentPlayerActiveAbilities = () => currentPlayer === 'p1' ? p1ActiveAbilities : p2ActiveAbilities;
  const getCurrentPlayerContamination = () => currentPlayer === 'p1' ? p1Contamination : p2Contamination;

  const getEnemyHand = () => currentPlayer === 'p1' ? p2Hand : p1Hand;
  const getEnemyHp = () => currentPlayer === 'p1' ? p2Hp : p1Hp;
  const getEnemyMaxHp = () => currentPlayer === 'p1' ? p2MaxHp : p1MaxHp;
  const getEnemyArmor = () => currentPlayer === 'p1' ? p2Armor : p1Armor;
  const getEnemyActiveAbilities = () => currentPlayer === 'p1' ? p2ActiveAbilities : p1ActiveAbilities;

  // 初始化游戏
  useEffect(() => {
    initializeGame();
  }, []);

  // 回合倒计时
  useEffect(() => {
    if (gamePhase !== 'playing') return;

    const timer = setInterval(() => {
      setTurnTime(prev => {
        if (prev <= 1) {
          handleEndTurn();
          return TURN_TIME_LIMIT;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gamePhase, currentPlayer]);

  // 初始化游戏
  const initializeGame = () => {
    // 创建两个玩家的牌库
    const p1InitialDeck = [...zhongLvCards];
    const p2InitialDeck = [...zhongLvCards];
    
    // 洗牌
    const shuffleDeck = (deck: Card[]) => {
      const shuffled = [...deck];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    };

    const p1Shuffled = shuffleDeck(p1InitialDeck);
    const p2Shuffled = shuffleDeck(p2InitialDeck);

    // 抽初始手牌
    const drawCardsFromDeck = (deck: Card[], count: number) => {
      const drawn = deck.slice(0, count).map(card => ({
        ...card,
        uid: `${card.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      }));
      const remaining = deck.slice(count);
      return { drawn, remaining };
    };

    const p1Draw = drawCardsFromDeck(p1Shuffled, INITIAL_HAND_COUNT);
    const p2Draw = drawCardsFromDeck(p2Shuffled, INITIAL_HAND_COUNT);

    // 设置状态
    setP1Deck(p1Draw.remaining);
    setP1Hand(p1Draw.drawn);
    setP1Discard([]);
    
    setP2Deck(p2Draw.remaining);
    setP2Hand(p2Draw.drawn);
    setP2Discard([]);
    
    setGamePhase('playing');
    setCurrentPlayer('p1');
    setTurnCount(1);
    setTurnTime(TURN_TIME_LIMIT);
  };

  // 抽牌
  const drawCards = (count: number) => {
    const setHand = currentPlayer === 'p1' ? setP1Hand : setP2Hand;
    const setDeck = currentPlayer === 'p1' ? setP1Deck : setP2Deck;
    const setDiscard = currentPlayer === 'p1' ? setP1Discard : setP2Discard;
    
    const currentDeck = getCurrentPlayerDeck();
    const currentHand = getCurrentPlayerHand();
    const currentDiscard = getCurrentPlayerDiscard();

    setDeck(prevDeck => {
      let deck = [...prevDeck];
      let discard = [...currentDiscard];
      let hand = [...currentHand];
      let cardsToDraw = count;

      for (let i = 0; i < cardsToDraw; i++) {
        if (hand.length >= MAX_HAND_SIZE) break;

        if (deck.length === 0) {
          if (discard.length === 0) break;
          
          const shuffledDiscard = [...discard];
          for (let j = shuffledDiscard.length - 1; j > 0; j--) {
            const k = Math.floor(Math.random() * (j + 1));
            [shuffledDiscard[j], shuffledDiscard[k]] = [shuffledDiscard[k], shuffledDiscard[j]];
          }
          deck = shuffledDiscard;
          discard = [];
        }

        if (deck.length > 0) {
          const card = deck.shift()!;
          hand.push({
            ...card,
            uid: `${card.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          });
        }
      }

      setHand(hand);
      setDiscard(discard);
      return deck;
    });
  };

  // 计算实际伤害
  const calculateActualDamage = (baseDamage: number, attackerActiveAbilities: Array<{ id: AbilityType; name: string }>) => {
    let damage = baseDamage;
    
    const hasFinalTuning = attackerActiveAbilities.some(a => a.id === 'FINAL_TUNING');
    const attackerHp = currentPlayer === 'p1' ? p1Hp : p2Hp;
    
    if (hasFinalTuning && attackerHp <= abilityConfig.FINAL_TUNING.lowHpThreshold!) {
      damage += abilityConfig.FINAL_TUNING.lowHpDamageBonus!;
    }
    
    const painEchoCount = attackerActiveAbilities.filter(a => a.id === 'PAIN_ECHO').length;
    if (painEchoCount > 0) {
      // 简化处理
    }
    
    return damage;
  };

  // 处理伤害
  const takeDamage = (target: 'p1' | 'p2', amount: number) => {
    const setHp = target === 'p1' ? setP1Hp : setP2Hp;
    const setArmor = target === 'p1' ? setP1Armor : setP2Armor;
    const currentHp = target === 'p1' ? p1Hp : p2Hp;
    const currentArmor = target === 'p1' ? p1Armor : p2Armor;

    let armor = currentArmor;
    let trueDamage = amount;

    if (armor > 0) {
      if (armor >= trueDamage) {
        armor -= trueDamage;
        trueDamage = 0;
      } else {
        trueDamage -= armor;
        armor = 0;
      }
    }

    setArmor(armor);
    const newHp = Math.max(0, currentHp - trueDamage);
    setHp(newHp);
    
    if (newHp <= 0) {
      setGamePhase('ended');
      setWinner(target === 'p1' ? 'p2' : 'p1');
    }
  };

  // 处理选牌
  const handleSelectCard = (card: Card & { uid: string }) => {
    if (gamePhase !== 'playing') return;
    
    if (selectedCard?.uid === card.uid) {
      setSelectedCard(null);
    } else {
      setSelectedCard(card);
    }
  };

  // 处理出牌
  const handlePlayCard = () => {
    if (!selectedCard || gamePhase !== 'playing') return;

    const currentPlayerAp = getCurrentPlayerAp();
    
    if (currentPlayerAp < selectedCard.cost) {
      return;
    }

    const setHand = currentPlayer === 'p1' ? setP1Hand : setP2Hand;
    const setAp = currentPlayer === 'p1' ? setP1Ap : setP2Ap;
    const setDiscard = currentPlayer === 'p1' ? setP1Discard : setP2Discard;
    const setActiveAbilities = currentPlayer === 'p1' ? setP1ActiveAbilities : setP2ActiveAbilities;
    const setContamination = currentPlayer === 'p1' ? setP1Contamination : setP2Contamination;
    const setArmor = currentPlayer === 'p1' ? setP1Armor : setP2Armor;

    const currentHand = getCurrentPlayerHand();
    const currentDiscard = getCurrentPlayerDiscard();
    const currentActiveAbilities = getCurrentPlayerActiveAbilities();

    // 消耗AP
    setAp(prev => prev - selectedCard.cost);

    // 执行卡牌效果
    if (selectedCard.baseDamage) {
      const damage = calculateActualDamage(selectedCard.baseDamage, currentActiveAbilities);
      const targetPlayer = currentPlayer === 'p1' ? 'p2' : 'p1';
      takeDamage(targetPlayer, damage);
    }

    if (selectedCard.baseArmor !== undefined) {
      setArmor(prev => prev + selectedCard.baseArmor!);
    }

    if (selectedCard.selfDamage !== undefined) {
      takeDamage(currentPlayer, selectedCard.selfDamage);
    }

    const pollutionMod = selectedCard.pollutionModifier;
    if (pollutionMod !== undefined && pollutionMod > 0) {
      setContamination(prev => Math.min(100, prev + pollutionMod));
    }

    if (pollutionMod !== undefined && pollutionMod < 0) {
      setContamination(prev => Math.max(0, prev + pollutionMod));
    }

    if (selectedCard.type === 'ability') {
      const abilityId = selectedCard.id as AbilityType;
      setActiveAbilities(prev => [...prev, { id: abilityId, name: selectedCard.name }]);
    }

    // 从手牌移除并弃牌
    const newHand = currentHand.filter(card => card.uid !== selectedCard.uid);
    setHand(newHand);
    setDiscard(prev => [...prev, selectedCard]);

    setSelectedCard(null);
  };

  // 结束回合
  const handleEndTurn = () => {
    if (gamePhase !== 'playing') return;

    const currentPlayerActiveAbilities = getCurrentPlayerActiveAbilities();
    const currentPlayerContamination = getCurrentPlayerContamination();

    const setArmor = currentPlayer === 'p1' ? setP1Armor : setP2Armor;
    const setContamination = currentPlayer === 'p1' ? setP1Contamination : setP2Contamination;
    const currentArmor = currentPlayer === 'p1' ? p1Armor : p2Armor;
    const currentHp = currentPlayer === 'p1' ? p1Hp : p2Hp;

    // 频率锚定效果
    const hasFrequencyAnchor = currentPlayerActiveAbilities.some(a => a.id === 'FREQUENCY_ANCHOR');
    if (hasFrequencyAnchor) {
      setArmor(prev => prev + abilityConfig.FREQUENCY_ANCHOR.armorPerTurn!);
    }

    // 终末定音DOT效果
    const hasFinalTuning = currentPlayerActiveAbilities.some(a => a.id === 'FINAL_TUNING');
    if (hasFinalTuning && currentHp <= abilityConfig.FINAL_TUNING.lowHpThreshold!) {
      takeDamage(currentPlayer, abilityConfig.FINAL_TUNING.lowHpDotDamage!);
    }

    // 切换玩家
    setCurrentPlayer(prev => prev === 'p1' ? 'p2' : 'p1');
    setTurnCount(prev => prev + 1);
    setTurnTime(TURN_TIME_LIMIT);

    // 恢复AP
    const setAp = currentPlayer === 'p1' ? setP2Ap : setP1Ap;
    const maxAp = currentPlayer === 'p1' ? p2MaxAp : p1MaxAp;
    setAp(maxAp);

    // 抽新牌
    setTimeout(() => {
      drawCards(DRAW_PER_TURN);
    }, 100);
  };

  // 重新开始
  const handleRestart = () => {
    setSelectedCard(null);
    setP1Hp(p1MaxHp);
    setP1Armor(0);
    setP1Ap(p1MaxAp);
    setP2Hp(p2MaxHp);
    setP2Armor(0);
    setP2Ap(p2MaxAp);
    setP1ActiveAbilities([]);
    setP2ActiveAbilities([]);
    setP1Contamination(0);
    setP2Contamination(0);
    initializeGame();
  };

  if (gamePhase === 'ended') {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold font-['Rajdhani'] text-slate-200 mb-4">
            游戏结束
          </h1>
          <p className="text-2xl font-['Rajdhani'] text-sonic-purple mb-8">
            {winner === 'p1' ? '玩家1' : '玩家2'} 获胜！
          </p>
          <div className="flex gap-4 justify-center">
            <Button onClick={handleRestart} className="bg-sonic-purple hover:bg-violet-500">
              <RotateCcw className="w-5 h-5 mr-2" />
              再来一局
            </Button>
            <Button onClick={() => router.push('/')} variant="secondary">
              <DoorOpen className="w-5 h-5 mr-2" />
              返回主页
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const currentPlayerHand = getCurrentPlayerHand();
  const currentPlayerAp = getCurrentPlayerAp();
  const currentPlayerActiveAbilities = getCurrentPlayerActiveAbilities();
  const currentPlayerContamination = getCurrentPlayerContamination();
  const enemyHand = getEnemyHand();
  const enemyHp = getEnemyHp();
  const enemyMaxHp = getEnemyMaxHp();
  const enemyArmor = getEnemyArmor();
  const enemyActiveAbilities = getEnemyActiveAbilities();

  const currentPlayerPollutionLevel = getPollutionLevel(currentPlayerContamination);

  return (
    <div className="min-h-screen bg-[#0a0a0f] relative overflow-hidden">
      {/* 背景声波效果 */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-gradient-to-r from-sonic-purple/10 via-transparent to-transparent animate-pulse" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-gradient-to-r from-transparent via-sonic-purple/5 to-transparent animate-pulse delay-1000" />
      </div>

      <div className="relative z-20 p-8 h-screen flex flex-col">
        {/* 返回按钮 */}
        <div className="absolute top-8 left-8 z-50">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/')}
            className="w-16 h-16 rounded-full bg-slate-900/80 hover:bg-slate-800/80 border-2 border-slate-700/50 text-slate-300 hover:text-white"
          >
            <DoorOpen className="w-8 h-8" />
          </Button>
        </div>

        {/* 顶部：对手玩家 */}
        <div className="flex justify-center items-start pt-8">
          <EntityStatusPanel
            name={currentPlayer === 'p1' ? '玩家2' : '玩家1'}
            hp={enemyHp}
            maxHp={enemyMaxHp}
            armor={enemyArmor}
            ap={0}
            maxAp={0}
            activeAbilities={enemyActiveAbilities}
            isEnemy={true}
          />
        </div>

        {/* 中央区域：提示信息 */}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            {selectedCard ? (
              <div className="space-y-4">
                <h2 className="text-2xl font-bold font-['Rajdhani'] text-sonic-purple">
                  已选择: {selectedCard.name}
                </h2>
                <div className="flex gap-4 justify-center">
                  <Button
                    onClick={handlePlayCard}
                    disabled={currentPlayerAp < selectedCard.cost}
                    className="bg-gradient-to-r from-green-600 to-green-400 hover:from-green-500 hover:to-green-300 text-white font-bold text-xl px-12 py-6 rounded-2xl shadow-lg shadow-green-500/30"
                  >
                    <Play className="w-6 h-6 mr-2" />
                    出牌
                  </Button>
                  <Button
                    onClick={() => setSelectedCard(null)}
                    variant="secondary"
                    className="text-xl px-8 py-6 rounded-2xl"
                  >
                    取消
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <h2 className="text-3xl font-bold font-['Rajdhani'] text-slate-300">
                  {currentPlayer === 'p1' ? '玩家1' : '玩家2'} 的回合
                </h2>
                <p className="text-xl text-slate-500">
                  选择卡牌进行出牌，或点击「结束回合」
                </p>
                <p className="text-lg text-slate-600">
                  点击卡牌可以选中，再次点击可以取消
                </p>
              </div>
            )}
          </div>
        </div>

        {/* 底部：手牌 + 结束回合按钮 + 倒计时 */}
        <div className="pb-8">
          {/* 回合倒计时 */}
          <div className="flex justify-center mb-4">
            <div className="w-96">
              <div className="flex justify-between items-center mb-2">
                <span className="text-slate-400 font-bold font-['Rajdhani']">回合时间</span>
                <span className={cn(
                  "font-bold font-['Rajdhani'] text-xl",
                  turnTime <= 10 ? "text-red-400 animate-pulse" : "text-sonic-purple"
                )}>
                  {turnTime}秒
                </span>
              </div>
              <Progress 
                value={(turnTime / TURN_TIME_LIMIT) * 100} 
                className="h-3"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.1)',
                }}
              />
            </div>
          </div>

          <div className="flex items-end justify-between gap-8">
            {/* 左下角：玩家自己 */}
            <div className="flex-shrink-0">
              <EntityStatusPanel
                name={currentPlayer === 'p1' ? '玩家1' : '玩家2'}
                hp={currentPlayer === 'p1' ? p1Hp : p2Hp}
                maxHp={currentPlayer === 'p1' ? p1MaxHp : p2MaxHp}
                armor={currentPlayer === 'p1' ? p1Armor : p2Armor}
                ap={currentPlayerAp}
                maxAp={currentPlayer === 'p1' ? p1MaxAp : p2MaxAp}
                activeAbilities={currentPlayerActiveAbilities}
                isEnemy={false}
              />
            </div>

            {/* 中央：手牌 */}
            <div className="flex-1 flex justify-center items-end">
              <div className="flex items-end gap-[-24px]">
                {currentPlayerHand.map((card, index) => {
                  const isSelected = selectedCard?.uid === card.uid;
                  const canAfford = currentPlayerAp >= card.cost;
                  
                  let borderColor = "border-slate-700";
                  let bgColor = "bg-slate-900/90";
                  
                  if (card.type === "attack") {
                    borderColor = isSelected ? "border-red-400" : "border-red-900/50";
                    bgColor = isSelected ? "bg-red-950/90" : "bg-slate-900/90";
                  } else if (card.type === "skill") {
                    borderColor = isSelected ? "border-blue-400" : "border-blue-900/50";
                    bgColor = isSelected ? "bg-blue-950/90" : "bg-slate-900/90";
                  } else if (card.type === "ability") {
                    borderColor = isSelected ? "border-yellow-400" : "border-yellow-900/50";
                    bgColor = isSelected ? "bg-yellow-950/90" : "bg-slate-900/90";
                  }

                  return (
                    <motion.div
                      key={card.uid}
                      initial={{ y: 100, opacity: 0, rotate: -5 }}
                      animate={{ 
                        y: isSelected ? -24 : 0, 
                        opacity: 1, 
                        rotate: isSelected ? 0 : (index - currentPlayerHand.length / 2) * 2,
                        zIndex: isSelected ? 50 : index
                      }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      className="flex-shrink-0"
                      style={{
                        marginLeft: index > 0 ? "-32px" : "0",
                      }}
                    >
                      <CardUI
                        className={cn(
                          "w-44 h-56 cursor-pointer transition-all duration-200 border-4 rounded-2xl overflow-hidden flex flex-col",
                          borderColor,
                          bgColor,
                          isSelected && "shadow-xl shadow-sonic-purple/30 scale-110",
                          !isSelected && "hover:-translate-y-2 hover:shadow-lg hover:shadow-sonic-purple/20",
                          !canAfford && !isSelected && "opacity-50"
                        )}
                        onClick={() => handleSelectCard(card)}
                      >
                        {/* 卡牌头部 */}
                        <div className="flex justify-between items-start p-3">
                          <div className={cn(
                            "w-12 h-12 rounded-full flex items-center justify-center text-2xl font-bold font-['Rajdhani'] border-2",
                            card.type === "attack" ? "bg-red-500 border-red-300 text-white" :
                            card.type === "skill" ? "bg-blue-500 border-blue-300 text-white" :
                            "bg-yellow-500 border-yellow-300 text-black"
                          )}>
                            {card.cost}
                          </div>
                          
                          {card.type === "ability" && (
                            <Badge className="bg-yellow-500 text-black font-bold font-['Rajdhani']">
                              能力
                            </Badge>
                          )}
                        </div>

                        {/* 卡牌名称 */}
                        <div className="px-4">
                          <h3 className="text-xl font-bold font-['Rajdhani'] text-slate-100">
                            {card.name}
                          </h3>
                          <p className="text-sm text-slate-400 mt-1">
                            {card.type === "attack" && "单体"}
                            {card.type === "skill" && "自身"}
                            {card.type === "ability" && "永久"}
                          </p>
                        </div>

                        {/* 卡牌效果 */}
                        <div className="flex-1 flex items-center justify-center p-4">
                          <p className="text-lg text-slate-300 text-center leading-relaxed">
                            {card.effect}
                          </p>
                        </div>

                        {/* 卡牌底部 */}
                        <div className="p-3 flex justify-between items-center border-t border-slate-700/30">
                          <span className={cn(
                            "font-bold font-['Rajdhani'] text-sm",
                            card.type === "attack" ? "text-red-400" :
                            card.type === "skill" ? "text-blue-400" :
                            "text-yellow-400"
                          )}>
                            {card.type === "attack" ? "攻击" :
                             card.type === "skill" ? "技能" : "能力"}
                          </span>
                          
                          {card.baseDamage && (
                            <span className="text-red-400 font-bold font-['Rajdhani'] flex items-center gap-1">
                              <Target className="w-4 h-4" />
                              {card.baseDamage}
                            </span>
                          )}
                        </div>
                      </CardUI>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* 右下角：结束回合按钮 */}
            <div className="flex-shrink-0">
              <Button
                onClick={handleEndTurn}
                className="bg-gradient-to-r from-sonic-purple to-violet-500 hover:from-sonic-purple hover:to-violet-400 text-white font-bold text-2xl px-12 py-8 rounded-3xl shadow-xl shadow-sonic-purple/40 transition-all hover:scale-105"
                size="lg"
              >
                <ChevronRight className="w-8 h-8 mr-2" />
                结束回合
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
