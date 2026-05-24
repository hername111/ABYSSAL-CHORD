'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Skull, Shield, Users, User, Play, RotateCcw, Target, ChevronRight, Trophy, Gamepad2, Layers, Clock, MessageSquare, DoorOpen, Zap, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardType, CardTarget, INITIAL_HAND_CARDS, zhongLvCards } from '@/lib/cards';
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
          <p className="text-sm text-slate-500">{isEnemy ? "畸变体" : "调音师"}</p>
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
        <div className="mt-1 relative">
          <div 
            className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-slate-800/50 border border-slate-700/50 cursor-pointer hover:bg-slate-800 transition-colors"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
          >
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                {uniqueAbilities.slice(0, 3).map((ability, idx) => {
                  const { iconColor } = getAbilityInfo(ability.id as AbilityType);
                  const dotColors: Record<string, string> = {
                    "text-armor-blue": "#3b82f6",
                    "text-sonic-purple": "#8b5cf6",
                    "text-danger-red": "#ef4444",
                    "text-gold": "#eab308"
                  };
                  return (
                    <div 
                      key={ability.id}
                      className={cn(
                        "w-5 h-5 rounded-full border-2 border-slate-900 flex items-center justify-center",
                        iconColor
                      )}
                      style={{ 
                        backgroundColor: dotColors[iconColor] || "#64748b",
                        zIndex: uniqueAbilities.length - idx
                      }}
                    >
                      {ability.count > 1 && (
                        <span className="text-xs font-bold text-white drop-shadow-md">x{ability.count}</span>
                      )}
                    </div>
                  );
                })}
              </div>
              <span className="text-sm text-slate-300 font-semibold">
                {uniqueAbilities.length} 个能力
              </span>
            </div>
            <ChevronDown className="w-4 h-4 text-slate-500" />
          </div>
          
          {/* 永久能力Tooltip */}
          {showTooltip && (
            <div className="absolute bottom-full left-0 mb-2 w-64 p-3 rounded-xl border border-slate-700/50 bg-slate-900/95 backdrop-blur-md z-50 shadow-xl">
              <div className="space-y-2">
                {uniqueAbilities.map((ability) => {
                  const { displayName, displayDesc, iconColor } = getAbilityInfo(ability.id as AbilityType);
                  const dotColors: Record<string, string> = {
                    "text-armor-blue": "#3b82f6",
                    "text-sonic-purple": "#8b5cf6",
                    "text-danger-red": "#ef4444",
                    "text-gold": "#eab308"
                  };
                  return (
                    <div key={ability.id} className="flex items-start gap-2 p-2 rounded-lg bg-slate-800/50">
                      <div 
                        className="w-3 h-3 rounded-full mt-1.5 flex-shrink-0"
                        style={{ backgroundColor: dotColors[iconColor] || "#64748b" }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-200">{displayName}</span>
                          {ability.count > 1 && (
                            <Badge variant="secondary" className="text-xs bg-slate-700 text-slate-300">x{ability.count}</Badge>
                          )}
                        </div>
                        <p className="text-sm text-slate-400 mt-0.5">{displayDesc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="absolute -bottom-2 left-6 w-4 h-4 bg-slate-900/95 border-r border-b border-slate-700/50 rotate-45" />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default function MultiplayerBattle() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const roomId = searchParams?.get('roomId');
  const playerId = searchParams?.get('playerId');
  const playerName = searchParams?.get('playerName');
  
  // 判断是否是真实的联机模式（有真实roomId和playerId）
  const isRealMultiplayer = roomId && playerId && roomId !== 'undefined' && playerId !== 'undefined' && roomId.length > 0 && playerId.length > 0;
  
  // ========== 状态定义（使用本地模拟数据） ==========
  const [gamePhase, setGamePhase] = useState<'playing' | 'ended'>('playing');
  
  // 玩家1状态
  const [player1Hp, setPlayer1Hp] = useState(80);
  const [player1Armor, setPlayer1Armor] = useState(0);
  const [player1Ap, setPlayer1Ap] = useState(3);
  const [player1Hand, setPlayer1Hand] = useState<Card[]>([...INITIAL_HAND_CARDS]);
  const [player1Deck, setPlayer1Deck] = useState<Card[]>([...zhongLvCards].filter(card => !INITIAL_HAND_CARDS.find(init => init.id === card.id)));
  const [player1Discard, setPlayer1Discard] = useState<Card[]>([]);
  const [player1ActiveAbilities, setPlayer1ActiveAbilities] = useState<Array<{ id: AbilityType; name: string }>>([
    { id: 'FREQUENCY_ANCHOR', name: '频率锚定' },
    { id: 'FREQUENCY_ANCHOR', name: '频率锚定' }
  ]);
  
  // 玩家2状态
  const [player2Hp, setPlayer2Hp] = useState(80);
  const [player2Armor, setPlayer2Armor] = useState(0);
  const [player2Ap, setPlayer2Ap] = useState(3);
  const [player2Hand, setPlayer2Hand] = useState<Card[]>([...INITIAL_HAND_CARDS]);
  const [player2Deck, setPlayer2Deck] = useState<Card[]>([...zhongLvCards].filter(card => !INITIAL_HAND_CARDS.find(init => init.id === card.id)));
  const [player2Discard, setPlayer2Discard] = useState<Card[]>([]);
  
  // 游戏状态
  const [currentPlayer, setCurrentPlayer] = useState<1 | 2>(1);
  const [turnNumber, setTurnNumber] = useState(1);
  const [turnTimeLeft, setTurnTimeLeft] = useState(TURN_TIME_LIMIT);
  const [pollutionLevel, setPollutionLevel] = useState(0);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [targetPlayer, setTargetPlayer] = useState<1 | 2 | null>(null);
  const [dialogMessages, setDialogMessages] = useState<Array<{ id: number; role: 'user' | 'assistant'; content: string; isTyping?: boolean }>>([
    { id: 1, role: 'assistant', content: '欢迎来到深渊协奏！选择一张卡牌开始你的回合。' }
  ]);
  
  // 回合倒计时
  useEffect(() => {
    if (gamePhase !== 'playing') return;
    
    const timer = setInterval(() => {
      setTurnTimeLeft(prev => {
        if (prev <= 1) {
          // 时间到，切换回合
          handleEndTurn();
          return TURN_TIME_LIMIT;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [gamePhase, currentPlayer]);
  
  // 抽牌函数
  const drawCards = (count: number, player: 1 | 2) => {
    const setHand = player === 1 ? setPlayer1Hand : setPlayer2Hand;
    const setDeck = player === 1 ? setPlayer1Deck : setPlayer2Deck;
    const setDiscard = player === 1 ? setPlayer1Discard : setPlayer2Discard;
    const currentDeck = player === 1 ? [...player1Deck] : [...player2Deck];
    const currentHand = player === 1 ? [...player1Hand] : [...player2Hand];
    
    const currentHandSize = currentHand.length;
    const cardsToDraw = Math.min(count, MAX_HAND_SIZE - currentHandSize);
    
    if (cardsToDraw <= 0) return;
    
    let newDeck = [...currentDeck];
    const drawnCards: Card[] = [];
    
    for (let i = 0; i < cardsToDraw; i++) {
      if (newDeck.length === 0) {
        // 牌库空了，洗牌弃牌堆
        setDiscard(discard => {
          newDeck = [...discard].sort(() => Math.random() - 0.5);
          return [];
        });
      }
      
      if (newDeck.length > 0) {
        const card = newDeck.shift()!;
        drawnCards.push(card);
      }
    }
    
    setDeck(newDeck);
    setHand([...currentHand, ...drawnCards]);
  };
  
  // 处理出牌
  const handlePlayCard = (card: Card) => {
    if (!selectedCard) {
      // 第一次选择卡牌
      if (currentPlayer === 1 && card.cost > player1Ap) return;
      if (currentPlayer === 2 && card.cost > player2Ap) return;
      
      setSelectedCard(card);
      setTargetPlayer(null);
    } else if (selectedCard.id === card.id) {
      // 取消选择
      setSelectedCard(null);
      setTargetPlayer(null);
    } else {
      // 重新选择
      if (currentPlayer === 1 && card.cost > player1Ap) return;
      if (currentPlayer === 2 && card.cost > player2Ap) return;
      
      setSelectedCard(card);
      setTargetPlayer(null);
    }
  };
  
  // 处理选择目标
  const handleSelectTarget = (target: 1 | 2) => {
    if (!selectedCard) return;
    setTargetPlayer(target);
  };
  
  // 执行出牌
  const executePlay = () => {
    if (!selectedCard || (selectedCard.target === 'single' && !targetPlayer)) return;
    
    // 消耗AP
    if (currentPlayer === 1) {
      setPlayer1Ap(prev => prev - selectedCard.cost);
      setPlayer1Hand(prev => prev.filter(c => c.id !== selectedCard.id));
      setPlayer1Discard(prev => [...prev, selectedCard]);
    } else {
      setPlayer2Ap(prev => prev - selectedCard.cost);
      setPlayer2Hand(prev => prev.filter(c => c.id !== selectedCard.id));
      setPlayer2Discard(prev => [...prev, selectedCard]);
    }
    
    // 处理卡牌效果
    if (selectedCard.type === 'attack' && selectedCard.baseDamage) {
      const damage = selectedCard.baseDamage;
      const target = targetPlayer || (currentPlayer === 1 ? 2 : 1);
      
      if (target === 1) {
        // 对玩家1造成伤害
        const trueDamage = Math.max(0, damage - player1Armor);
        const armorConsumed = Math.min(player1Armor, damage);
        
        if (armorConsumed > 0) {
          setPlayer1Armor(prev => Math.max(0, prev - damage));
        }
        if (trueDamage > 0) {
          setPlayer1Hp(prev => Math.max(0, prev - trueDamage));
        }
      } else {
        // 对玩家2造成伤害
        const trueDamage = Math.max(0, damage - player2Armor);
        const armorConsumed = Math.min(player2Armor, damage);
        
        if (armorConsumed > 0) {
          setPlayer2Armor(prev => Math.max(0, prev - damage));
        }
        if (trueDamage > 0) {
          setPlayer2Hp(prev => Math.max(0, prev - trueDamage));
        }
      }
    } else if (selectedCard.type === 'skill' && selectedCard.baseArmor) {
      // 获得护甲
      if (currentPlayer === 1) {
        setPlayer1Armor(prev => prev + selectedCard.baseArmor!);
      } else {
        setPlayer2Armor(prev => prev + selectedCard.baseArmor!);
      }
    } else if (selectedCard.type === 'ability') {
      // 激活能力
      const abilityId = selectedCard.id as AbilityType;
      if (currentPlayer === 1) {
        setPlayer1ActiveAbilities(prev => [...prev, { id: abilityId, name: selectedCard.name }]);
      }
    }
    
    // 重置选择
    setSelectedCard(null);
    setTargetPlayer(null);
  };
  
  // 结束回合
  const handleEndTurn = () => {
    // 抽牌
    const nextPlayer = currentPlayer === 1 ? 2 : 1;
    drawCards(DRAW_PER_TURN, nextPlayer);
    
    // 切换玩家
    setCurrentPlayer(nextPlayer);
    
    // 重置AP
    if (nextPlayer === 1) {
      setPlayer1Ap(3);
    } else {
      setPlayer2Ap(3);
    }
    
    // 重置时间
    setTurnTimeLeft(TURN_TIME_LIMIT);
    
    // 增加回合数
    setTurnNumber(prev => prev + 1);
  };
  
  // 返回房间
  const handleReturnToLobby = () => {
    router.push('/lobby');
  };
  
  // 当前回合的玩家
  const isMyTurn = currentPlayer === 1;
  
  // 回合提示文字
  const turnHint = isMyTurn 
    ? '选择卡牌进行出牌，或点击「结束回合」' 
    : '等待对手出牌...';
  
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-slate-200 overflow-hidden relative">
      {/* 背景声波动画 */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-gradient-to-r from-sonic-purple/5 via-transparent to-sonic-purple/5 animate-pulse" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-gradient-to-r from-sonic-purple/8 via-transparent to-sonic-purple/8 animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-gradient-to-r from-sonic-purple/10 via-transparent to-sonic-purple/10 animate-pulse" style={{ animationDelay: '2s' }} />
      </div>
      
      {/* 左上角退出按钮 */}
      <button 
        onClick={handleReturnToLobby}
        className="fixed top-6 left-6 z-50 p-3 rounded-full bg-slate-900/80 hover:bg-slate-800 transition-colors border border-slate-700/50 group"
      >
        <DoorOpen className="w-6 h-6 text-slate-400 group-hover:text-slate-200" />
      </button>
      
      {/* 顶部：对手玩家 */}
      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-40">
        <EntityStatusPanel 
          name={playerName || '对手'}
          hp={player2Hp}
          maxHp={80}
          armor={player2Armor}
          ap={0}
          maxAp={0}
          isEnemy={true}
        />
      </div>
      
      {/* 左侧：预留 - 战斗日志 */}
      <div className="fixed top-24 left-6 z-30 w-72">
        {/* 预留位置 */}
      </div>
      
      {/* 右侧：预留 - 抽牌堆/弃牌堆 */}
      <div className="fixed top-24 right-6 z-30 w-72">
        {/* 预留位置 */}
      </div>
      
      {/* 中央：提示与交互区 */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
        <div className="text-center">
          <h2 className="text-3xl font-bold font-['Rajdhani'] text-sonic-purple mb-2">
            回合 {turnNumber}
          </h2>
          <p className="text-xl text-slate-400 mb-4">{turnHint}</p>
        </div>
      </div>
      
      {/* 左下角：玩家状态 */}
      <div className="fixed bottom-40 left-6 z-40">
        <EntityStatusPanel 
          name="你"
          hp={player1Hp}
          maxHp={80}
          armor={player1Armor}
          ap={player1Ap}
          maxAp={3}
          activeAbilities={player1ActiveAbilities}
        />
      </div>
      
      {/* 底部：手牌区域 */}
      <div className="fixed bottom-0 left-0 right-0 z-40">
        {/* 回合倒计时 */}
        <div className="absolute bottom-56 left-1/2 -translate-x-1/2 w-96">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-300 font-bold font-['Rajdhani']">回合时间</span>
            <span className={cn(
              "font-bold font-['Rajdhani'] text-xl",
              turnTimeLeft <= 10 ? "text-danger-red animate-pulse" : "text-sonic-purple"
            )}>
              {turnTimeLeft}秒
            </span>
          </div>
          <Progress 
            value={(turnTimeLeft / TURN_TIME_LIMIT) * 100} 
            className={cn(
              "h-3",
              turnTimeLeft <= 10 ? "bg-danger-red/20" : "bg-slate-800"
            )}
          />
        </div>
        
        <div className="bg-gradient-to-t from-slate-900 via-slate-900/95 to-transparent pt-24 pb-8">
          <div className="max-w-6xl mx-auto px-8">
            <div className="flex items-end justify-center gap-[-24px] mb-8 min-h-[220px]">
              {player1Hand.map((card, idx) => {
                const isSelected = selectedCard?.id === card.id;
                const isDisabled = currentPlayer !== 1 || (card.cost > player1Ap);
                const canPlay = !isDisabled;
                
                // 根据卡牌类型确定颜色
                const typeColors = {
                  attack: { bg: 'from-red-950/90 to-red-900/80', border: 'border-red-500/60', label: 'text-red-400' },
                  skill: { bg: 'from-blue-950/90 to-blue-900/80', border: 'border-blue-500/60', label: 'text-blue-400' },
                  ability: { bg: 'from-purple-950/90 to-purple-900/80', border: 'border-gold/60', label: 'text-gold' }
                }[card.type];
                
                return (
                  <motion.div
                    key={card.id}
                    initial={{ y: 100, opacity: 0, rotate: -5 + (idx % 2 ? 10 : -10) }}
                    animate={{ 
                      y: isSelected ? -32 : 0, 
                      opacity: 1, 
                      rotate: 0,
                      scale: isSelected ? 1.05 : 1,
                      zIndex: isSelected ? 50 : idx
                    }}
                    whileHover={canPlay ? { y: -16, scale: 1.08, zIndex: 60 } : {}}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className="relative"
                  >
                    <CardUI 
                      onClick={() => canPlay && handlePlayCard(card)}
                      className={cn(
                        "w-44 h-56 rounded-2xl border-4 bg-gradient-to-br p-4 cursor-pointer transition-all select-none overflow-hidden relative group",
                        typeColors.bg,
                        typeColors.border,
                        isSelected && "ring-4 ring-sonic-purple/50 shadow-[0_0_40px_rgba(139,92,246,0.3)]",
                        isDisabled && "opacity-50 cursor-not-allowed grayscale"
                      )}
                    >
                      {/* 卡背纹理 */}
                      <div className="absolute inset-0 opacity-20" style={{
                        backgroundImage: `repeating-linear-gradient(
                          45deg,
                          transparent,
                          transparent 4px,
                          rgba(255,255,255,0.03) 4px,
                          rgba(255,255,255,0.03) 8px
                        )`
                      }} />
                      
                      {/* AP消耗角标 */}
                      <div className="absolute top-3 left-3 w-10 h-10 rounded-full bg-slate-900/80 border-2 border-slate-700/50 flex items-center justify-center z-10">
                        <span className="text-xl font-black font-['Rajdhani'] text-sonic-purple">{card.cost}</span>
                      </div>
                      
                      {/* 内容 */}
                      <div className="relative z-10 h-full flex flex-col pt-12">
                        {/* 卡牌名称 */}
                        <h3 className="font-bold font-['Rajdhani'] text-xl text-slate-100 leading-tight mb-2 drop-shadow-lg">
                          {card.name}
                        </h3>
                        
                        {/* 类型标签 */}
                        <Badge variant="secondary" className={cn("w-fit mb-auto px-3 py-1 bg-slate-900/80 border border-slate-700/50", typeColors.label)}>
                          {card.type === 'attack' ? '攻击' : card.type === 'skill' ? '技能' : '能力'}
                        </Badge>
                        
                        {/* 效果描述 */}
                        <p className="text-sm text-slate-300 mt-3 leading-relaxed">
                          {card.effect}
                        </p>
                      </div>
                    </CardUI>
                  </motion.div>
                );
              })}
            </div>
            
            {/* 操作按钮 */}
            <div className="flex items-center justify-center gap-6">
              {/* 出牌按钮 */}
              {selectedCard && (
                <Button 
                  onClick={executePlay}
                  disabled={selectedCard.target === 'single' && !targetPlayer}
                  className="bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-500 hover:to-emerald-400 text-white font-bold text-xl px-12 py-6 rounded-2xl shadow-[0_0_40px_rgba(34,197,94,0.3)] transition-all hover:scale-105"
                  size="lg"
                >
                  <Target className="w-6 h-6 mr-2" />
                  {selectedCard.target === 'single' ? (
                    targetPlayer ? `出牌 → ${targetPlayer === 1 ? '你' : '对手'}` : '选择目标'
                  ) : '出牌'}
                </Button>
              )}
              
              {/* 结束回合按钮 */}
              <Button 
                onClick={handleEndTurn}
                disabled={!isMyTurn}
                className="bg-gradient-to-r from-sonic-purple to-violet-500 hover:from-violet-500 hover:to-sonic-purple text-white font-bold text-xl px-12 py-6 rounded-2xl shadow-[0_0_40px_rgba(139,92,246,0.3)] transition-all hover:scale-105"
                size="lg"
              >
                <ChevronRight className="w-6 h-6 mr-2" />
                结束回合
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
