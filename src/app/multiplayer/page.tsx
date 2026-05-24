"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  X,
  Shield,
  Zap,
  Skull,
  Swords,
  ChevronRight,
  Sword,
  Shield as ShieldIcon,
  Settings,
  DoorOpen,
  TrendingUp,
  TrendingDown,
  Sparkles,
  Target,
  User,
} from "lucide-react";
import { Card, CardType, CardTarget, INITIAL_HAND_CARDS, zhongLvCards } from "@/lib/cards";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// 带唯一实例 ID 的卡牌类型
interface CardWithUid extends Card {
  uid: string;
}

// 全局常量
const MAX_HAND_SIZE = 6; // 手牌上限严格限制为 6 张
const DRAW_PER_TURN = 2; // 每回合固定抽取的张数

// 能力类型枚举
type AbilityType = "FREQUENCY_ANCHOR" | "LOW_FREQUENCY_RESONANCE" | "PAIN_ECHO" | "FINAL_TUNING";

// 能力接口
interface ActiveAbility {
  id: AbilityType;
  cardId: string;
}

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

// 状态效果类型
type StatusEffectType = "VULNERABLE" | "WEAK" | "POISON" | "STRENGTH" | "THORN" | "SONIC_BOOM";

interface StatusEffect {
  type: StatusEffectType;
  stacks: number;
}

// 实体状态类型
interface EntityState {
  hp: number;
  maxHp: number;
  armor: number;
  buffs: StatusEffect[];
  debuffs: StatusEffect[];
}

// 可复用的属性面板组件
const StatBox = ({ 
  name, 
  current, 
  max, 
  color, 
  icon: Icon, 
  showIcon = true 
}: { 
  name: string;
  current: number;
  max?: number;
  color: string;
  icon?: React.ElementType;
  showIcon?: boolean;
}) => (
  <div className="bg-black/70 p-2 rounded-lg backdrop-blur border border-slate-700/50">
    <div className="flex items-center gap-2 mb-1">
      {showIcon && Icon && <Icon className="w-3 h-3" style={{ color }} />}
      <span className="text-xs font-bold" style={{ color }}>{name}</span>
      {max !== undefined && (
        <span className="text-xs text-slate-300">{current}/{max}</span>
      )}
      {max === undefined && (
        <span className="text-xs" style={{ color }}>{current}</span>
      )}
    </div>
    {max !== undefined && (
      <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
        <motion.div
          className="h-full"
          style={{ 
            background: `linear-gradient(to right, ${color}, ${color}cc)` 
          }}
          initial={{ width: "100%" }}
          animate={{ width: `${(current / max) * 100}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>
    )}
  </div>
);

// 通用的实体状态面板组件 - 同时用于玩家和敌人
const EntityStatusPanel = ({
  entity,
  isEnemy = false,
  playerName = "玩家",
}: {
  entity: EntityState;
  isEnemy?: boolean;
  playerName?: string;
}) => {
  // 获取状态效果的图标和颜色
  const getStatusEffectIcon = (type: StatusEffectType) => {
    switch (type) {
      case "VULNERABLE": return <Target className="w-4 h-4" />;
      case "WEAK": return <TrendingDown className="w-4 h-4" />;
      case "POISON": return <Skull className="w-4 h-4" />;
      case "STRENGTH": return <TrendingUp className="w-4 h-4" />;
      case "THORN": return <ShieldIcon className="w-4 h-4" />;
      case "SONIC_BOOM": return <Sparkles className="w-4 h-4" />;
    }
  };

  const getStatusEffectColor = (type: StatusEffectType) => {
    switch (type) {
      case "VULNERABLE": return "text-yellow-400 bg-yellow-400/20 border-yellow-400/50";
      case "WEAK": return "text-blue-400 bg-blue-400/20 border-blue-400/50";
      case "POISON": return "text-green-400 bg-green-400/20 border-green-400/50";
      case "STRENGTH": return "text-red-400 bg-red-400/20 border-red-400/50";
      case "THORN": return "text-purple-400 bg-purple-400/20 border-purple-400/50";
      case "SONIC_BOOM": return "text-sonic-purple bg-sonic-purple/20 border-sonic-purple/50";
    }
  };

  const getStatusEffectName = (type: StatusEffectType) => {
    switch (type) {
      case "VULNERABLE": return "易伤";
      case "WEAK": return "虚弱";
      case "POISON": return "中毒";
      case "STRENGTH": return "力量";
      case "THORN": return "荆棘";
      case "SONIC_BOOM": return "声爆";
    }
  };

  const allStatusEffects = [...entity.buffs, ...entity.debuffs];

  return (
    <div className="w-48 space-y-2">
      {/* 玩家名称 */}
      <div className="flex items-center gap-2 mb-2">
        {isEnemy ? (
          <Skull className="w-5 h-5 text-slate-400" />
        ) : (
          <User className="w-5 h-5 text-slate-400" />
        )}
        <span className="font-bold text-slate-200 font-['Rajdhani']">{playerName}</span>
      </div>

      {/* HP条 - 前面叠加护甲 */}
      <div className="space-y-1">
        {/* 护甲显示 - 如果有护甲，显示在HP条上方 */}
        {entity.armor > 0 && (
          <div className="flex items-center gap-2 bg-blue-500/20 px-2 py-1 rounded-lg border border-blue-500/50">
            <Shield className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-bold text-blue-400">{entity.armor}</span>
          </div>
        )}

        {/* HP条 */}
        <StatBox 
          name="HP" 
          current={entity.hp} 
          max={entity.maxHp} 
          color="#ef4444" 
          showIcon={false}
        />
      </div>

      {/* 状态栏 - buffs 和 debuffs */}
      {allStatusEffects.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {allStatusEffects.map((effect, index) => (
            <div 
              key={`${effect.type}-${index}`}
              className={cn(
                "flex items-center gap-1 px-2 py-1 rounded-md border text-xs",
                getStatusEffectColor(effect.type)
              )}
              title={`${getStatusEffectName(effect.type)} x${effect.stacks}`}
            >
              {getStatusEffectIcon(effect.type)}
              <span>x{effect.stacks}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// 手牌组件 - 平行排列版本
const HandCard = ({ 
  card, 
  index, 
  total, 
  isSelected, 
  onSelect, 
  canPlay,
}: { 
  card: CardWithUid; 
  index: number; 
  total: number; 
  isSelected: boolean; 
  onSelect: (uid: string) => void;
  canPlay: boolean;
}) => {
  const getBorderColor = (type: CardType) => {
    switch (type) {
      case "attack": return "border-danger-red/80";
      case "skill": return "border-armor-blue/80";
      case "ability": return "border-gold/80";
      default: return "border-slate-600";
    }
  };

  const getBgColor = (type: CardType) => {
    switch (type) {
      case "attack": return "from-red-950/80 to-red-900/60";
      case "skill": return "from-blue-950/80 to-blue-900/60";
      case "ability": return "from-yellow-950/80 to-yellow-900/60";
      default: return "from-slate-900/80 to-slate-800/60";
    }
  };

  const getTypeLabel = (type: CardType) => {
    switch (type) {
      case "attack": return "攻击";
      case "skill": return "技能";
      case "ability": return "能力";
      default: return "基础";
    }
  };

  const getTypeLabelColor = (type: CardType) => {
    switch (type) {
      case "attack": return "bg-danger-red text-white";
      case "skill": return "bg-armor-blue text-white";
      case "ability": return "bg-gold text-black";
      default: return "bg-slate-600 text-white";
    }
  };

  return (
    <motion.div
      className={cn(
        "relative cursor-pointer",
        !canPlay && "opacity-50 cursor-not-allowed"
      )}
      initial={{ y: 100, opacity: 0 }}
      animate={{
        y: isSelected ? -40 : 0,
        scale: isSelected ? 1.15 : 1,
        opacity: 1,
        zIndex: isSelected ? 999 : index,
      }}
      whileHover={{
        y: isSelected ? -40 : -20,
        scale: isSelected ? 1.15 : 1.08,
        zIndex: 999,
      }}
      onClick={() => onSelect(card.uid)}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 20,
        duration: 0.2,
      }}
    >
      <div className={cn(
        "w-44 h-60 rounded-xl border-3 bg-gradient-to-br shadow-lg",
        getBgColor(card.type),
        getBorderColor(card.type),
        isSelected && "ring-4 ring-sonic-purple/60 shadow-xl shadow-sonic-purple/30"
      )}>
        {/* 费用 */}
        <div className="absolute -top-2 -left-2 w-10 h-10 bg-sonic-purple rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg border-2 border-sonic-purple/50">
          {card.cost}
        </div>
        
        {/* 类型标签 */}
        <div className={cn(
          "absolute -bottom-2 -left-2 px-3 py-1 rounded-lg text-xs font-bold shadow-lg",
          getTypeLabelColor(card.type)
        )}>
          {getTypeLabel(card.type)}
        </div>
        
        {/* 卡牌内容 */}
        <div className="p-4 h-full flex flex-col">
          <h3 className="text-lg font-bold text-slate-100 mb-2 truncate">
            {card.name}
          </h3>
          <p className="text-sm text-slate-400 mb-3">
            {card.target === "single" ? "单体" : card.target === "aoe" ? "群体" : "自身"}
          </p>
          <div className="flex-1 text-sm text-slate-300 leading-relaxed overflow-y-auto">
            {card.effect}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// 全局飘字ID计数器
let popupIdCounter = 0;

// 独立的浮动文本生成器函数
const createAddFloatingText = (setFloatingNumbers: React.Dispatch<React.SetStateAction<Array<{ id: string; amount: number; type: 'HP' | 'ARMOR'; target: 'PLAYER1' | 'PLAYER2' }>>>) => {
  return (target: 'PLAYER1' | 'PLAYER2', amount: number, type: 'HP' | 'ARMOR') => {
    // 生成唯一ID
    const uniqueId = `popup_${Date.now()}_${popupIdCounter++}`;
    
    // 使用函数式更新添加飘字
    setFloatingNumbers(prev => [...prev, {
      id: uniqueId,
      amount,
      type,
      target
    }]);
    
    // 1000ms后清理这个飘字
    setTimeout(() => {
      setFloatingNumbers(prev => prev.filter(popup => popup.id !== uniqueId));
    }, 1000);
  };
};

export default function MultiplayerBattle() {
  // 使用 useRef 来管理 uid 计数器，确保每次组件重新渲染时 uid 都是一致的
  const uidCounterRef = useRef(0);
  
  // 为卡牌数组添加 uid 的辅助函数
  const addUidsToCards = (cards: Card[]): CardWithUid[] => {
    return cards.map(card => {
      uidCounterRef.current++;
      return { ...card, uid: `${card.id}_${uidCounterRef.current}` };
    });
  };
  
  const router = useRouter();
  
  // 游戏状态
  const [turn, setTurn] = useState(1);
  const [currentPlayer, setCurrentPlayer] = useState<'PLAYER1' | 'PLAYER2'>('PLAYER1');
  
  // 玩家1实体状态
  const [player1State, setPlayer1State] = useState<EntityState>({
    hp: 80,
    maxHp: 80,
    armor: 0,
    buffs: [],
    debuffs: []
  });
  const [player1Ap, setPlayer1Ap] = useState(3);
  const [player1MaxAp] = useState(3);
  const [player1ActiveAbilities, setPlayer1ActiveAbilities] = useState<ActiveAbility[]>([]);
  const [player1Hand, setPlayer1Hand] = useState<CardWithUid[]>([]);
  const [player1Deck, setPlayer1Deck] = useState<Card[]>([]);
  const [player1Discard, setPlayer1Discard] = useState<Card[]>([]);
  
  // 玩家2实体状态
  const [player2State, setPlayer2State] = useState<EntityState>({
    hp: 80,
    maxHp: 80,
    armor: 0,
    buffs: [],
    debuffs: []
  });
  const [player2Ap, setPlayer2Ap] = useState(3);
  const [player2MaxAp] = useState(3);
  const [player2ActiveAbilities, setPlayer2ActiveAbilities] = useState<ActiveAbility[]>([]);
  const [player2Hand, setPlayer2Hand] = useState<CardWithUid[]>([]);
  const [player2Deck, setPlayer2Deck] = useState<Card[]>([]);
  const [player2Discard, setPlayer2Discard] = useState<Card[]>([]);
  
  // 初始化游戏
  useEffect(() => {
    // 洗牌
    const shuffleDeck = (deck: Card[]) => {
      const shuffled = [...deck];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    };
    
    const p1DeckShuffled = shuffleDeck([...zhongLvCards]);
    const p2DeckShuffled = shuffleDeck([...zhongLvCards]);
    
    const p1Hand = addUidsToCards(p1DeckShuffled.slice(0, 5));
    const p2Hand = addUidsToCards(p2DeckShuffled.slice(0, 5));
    
    setPlayer1Deck(p1DeckShuffled.slice(5));
    setPlayer1Hand(p1Hand);
    setPlayer1Discard([]);
    
    setPlayer2Deck(p2DeckShuffled.slice(5));
    setPlayer2Hand(p2Hand);
    setPlayer2Discard([]);
  }, []);
  
  // 当前玩家相关
  const [selectedCardUid, setSelectedCardUid] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // 动画状态
  const [isAttacking, setIsAttacking] = useState(false);
  
  // 飘字状态 - 单一数据源，统一管理所有飘字
  type FloatingNumber = { id: string; amount: number; type: 'HP' | 'ARMOR'; target: 'PLAYER1' | 'PLAYER2' };
  const [floatingNumbers, setFloatingNumbers] = useState<FloatingNumber[]>([]);
  
  // 创建独立的浮动文本生成器实例
  const addFloatingText = createAddFloatingText(setFloatingNumbers);
  
  // 回合倒计时
  const [turnTime, setTurnTime] = useState(30);
  
  useEffect(() => {
    if (isProcessing) return;
    
    const timer = setInterval(() => {
      setTurnTime(prev => {
        if (prev <= 1) {
          handleEndTurn();
          return 30;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [isProcessing, currentPlayer]);
  
  // 获取当前玩家的便捷访问
  const getCurrentHand = () => currentPlayer === 'PLAYER1' ? player1Hand : player2Hand;
  const getCurrentAp = () => currentPlayer === 'PLAYER1' ? player1Ap : player2Ap;
  const getCurrentMaxAp = () => currentPlayer === 'PLAYER1' ? player1MaxAp : player2MaxAp;
  const getCurrentState = () => currentPlayer === 'PLAYER1' ? player1State : player2State;
  const getCurrentActiveAbilities = () => currentPlayer === 'PLAYER1' ? player1ActiveAbilities : player2ActiveAbilities;
  
  const getEnemyState = () => currentPlayer === 'PLAYER1' ? player2State : player1State;
  const getEnemyHand = () => currentPlayer === 'PLAYER1' ? player2Hand : player1Hand;
  
  // 处理伤害
  const takeDamage = (target: 'PLAYER1' | 'PLAYER2', amount: number) => {
    const setState = target === 'PLAYER1' ? setPlayer1State : setPlayer2State;
    const currentState = target === 'PLAYER1' ? player1State : player2State;
    
    setState(prev => {
      let armor = prev.armor;
      let trueDamage = amount;
      
      if (armor > 0) {
        if (armor >= trueDamage) {
          addFloatingText(target, trueDamage, 'ARMOR');
          armor -= trueDamage;
          trueDamage = 0;
        } else {
          addFloatingText(target, armor, 'ARMOR');
          trueDamage -= armor;
          armor = 0;
        }
      }
      
      if (trueDamage > 0) {
        addFloatingText(target, trueDamage, 'HP');
      }
      
      const newHp = Math.max(0, prev.hp - trueDamage);
      
      return {
        ...prev,
        hp: newHp,
        armor,
      };
    });
  };
  
  // 处理选牌
  const handleSelectCard = (uid: string) => {
    if (isProcessing) return;
    
    if (selectedCardUid === uid) {
      setSelectedCardUid(null);
    } else {
      setSelectedCardUid(uid);
    }
  };
  
  // 抽牌
  const drawCards = (count: number, forPlayer: 'PLAYER1' | 'PLAYER2') => {
    const setHand = forPlayer === 'PLAYER1' ? setPlayer1Hand : setPlayer2Hand;
    const setDeck = forPlayer === 'PLAYER1' ? setPlayer1Deck : setPlayer2Deck;
    const setDiscard = forPlayer === 'PLAYER1' ? setPlayer1Discard : setPlayer2Discard;
    
    const currentDeck = forPlayer === 'PLAYER1' ? player1Deck : player2Deck;
    const currentHand = forPlayer === 'PLAYER1' ? player1Hand : player2Hand;
    const currentDiscard = forPlayer === 'PLAYER1' ? player1Discard : player2Discard;
    
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
  
  // 处理出牌
  const handlePlayCard = async () => {
    if (!selectedCardUid || isProcessing) return;
    
    const currentHand = getCurrentHand();
    const card = currentHand.find(c => c.uid === selectedCardUid);
    if (!card) return;
    
    const currentAp = getCurrentAp();
    if (currentAp < card.cost) return;
    
    setIsProcessing(true);
    
    // 消耗AP
    const setAp = currentPlayer === 'PLAYER1' ? setPlayer1Ap : setPlayer2Ap;
    setAp(prev => prev - card.cost);
    
    // 从手牌移除
    const setHand = currentPlayer === 'PLAYER1' ? setPlayer1Hand : setPlayer2Hand;
    const setDiscard = currentPlayer === 'PLAYER1' ? setPlayer1Discard : setPlayer2Discard;
    setHand(prev => prev.filter(c => c.uid !== selectedCardUid));
    setDiscard(prev => [...prev, card]);
    
    // 执行卡牌效果
    const setState = currentPlayer === 'PLAYER1' ? setPlayer1State : setPlayer2State;
    const setActiveAbilities = currentPlayer === 'PLAYER1' ? setPlayer1ActiveAbilities : setPlayer2ActiveAbilities;
    const enemyPlayer = currentPlayer === 'PLAYER1' ? 'PLAYER2' : 'PLAYER1';
    
    // 伤害
    if (card.baseDamage) {
      if (card.type === 'attack') {
        setIsAttacking(true);
        await new Promise(r => setTimeout(r, 500));
        takeDamage(enemyPlayer, card.baseDamage);
        setIsAttacking(false);
      }
    }
    
    // 护甲
    if (card.baseArmor !== undefined) {
      setState(prev => ({
        ...prev,
        armor: prev.armor + card.baseArmor!,
      }));
    }
    
    // 自伤
    if (card.selfDamage) {
      takeDamage(currentPlayer, card.selfDamage);
    }
    
    // 能力牌
    if (card.type === 'ability') {
      const abilityId = card.id as AbilityType;
      setActiveAbilities(prev => [...prev, { id: abilityId, cardId: card.id }]);
    }
    
    setSelectedCardUid(null);
    setIsProcessing(false);
  };
  
  // 结束回合
  const handleEndTurn = () => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    
    // 当前玩家的回合结束效果
    const currentActiveAbilities = getCurrentActiveAbilities();
    const setState = currentPlayer === 'PLAYER1' ? setPlayer1State : setPlayer2State;
    const currentState = getCurrentState();
    
    // 频率锚定效果
    const hasFrequencyAnchor = currentActiveAbilities.some(a => a.id === 'FREQUENCY_ANCHOR');
    if (hasFrequencyAnchor) {
      setState(prev => ({
        ...prev,
        armor: prev.armor + abilityConfig.FREQUENCY_ANCHOR.armorPerTurn!,
      }));
    }
    
    // 终末定音DOT效果
    const hasFinalTuning = currentActiveAbilities.some(a => a.id === 'FINAL_TUNING');
    if (hasFinalTuning && currentState.hp <= abilityConfig.FINAL_TUNING.lowHpThreshold!) {
      takeDamage(currentPlayer, abilityConfig.FINAL_TUNING.lowHpDotDamage!);
    }
    
    // 切换玩家
    const nextPlayer = currentPlayer === 'PLAYER1' ? 'PLAYER2' : 'PLAYER1';
    setCurrentPlayer(nextPlayer);
    setTurn(prev => prev + 1);
    setTurnTime(30);
    
    // 恢复AP
    const setNextAp = nextPlayer === 'PLAYER1' ? setPlayer1Ap : setPlayer2Ap;
    const nextMaxAp = nextPlayer === 'PLAYER1' ? player1MaxAp : player2MaxAp;
    setNextAp(nextMaxAp);
    
    // 抽新牌
    setTimeout(() => {
      drawCards(DRAW_PER_TURN, nextPlayer);
      setIsProcessing(false);
    }, 300);
    
    setSelectedCardUid(null);
  };
  
  // 重新开始
  const handleRestart = () => {
    // 重置所有状态
    setPlayer1State({
      hp: 80,
      maxHp: 80,
      armor: 0,
      buffs: [],
      debuffs: []
    });
    setPlayer1Ap(3);
    setPlayer1ActiveAbilities([]);
    
    setPlayer2State({
      hp: 80,
      maxHp: 80,
      armor: 0,
      buffs: [],
      debuffs: []
    });
    setPlayer2Ap(3);
    setPlayer2ActiveAbilities([]);
    
    setTurn(1);
    setCurrentPlayer('PLAYER1');
    setSelectedCardUid(null);
    setTurnTime(30);
    
    // 重新初始化牌组
    const shuffleDeck = (deck: Card[]) => {
      const shuffled = [...deck];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    };
    
    const p1DeckShuffled = shuffleDeck([...zhongLvCards]);
    const p2DeckShuffled = shuffleDeck([...zhongLvCards]);
    
    const p1Hand = addUidsToCards(p1DeckShuffled.slice(0, 5));
    const p2Hand = addUidsToCards(p2DeckShuffled.slice(0, 5));
    
    setPlayer1Deck(p1DeckShuffled.slice(5));
    setPlayer1Hand(p1Hand);
    setPlayer1Discard([]);
    
    setPlayer2Deck(p2DeckShuffled.slice(5));
    setPlayer2Hand(p2Hand);
    setPlayer2Discard([]);
  };
  
  // 检查游戏结束
  useEffect(() => {
    if (player1State.hp <= 0 || player2State.hp <= 0) {
      // 游戏结束
    }
  }, [player1State.hp, player2State.hp]);
  
  const currentHand = getCurrentHand();
  const currentAp = getCurrentAp();
  const currentMaxAp = getCurrentMaxAp();
  const selectedCard = currentHand.find(c => c.uid === selectedCardUid);
  const canPlaySelected = selectedCard && currentAp >= selectedCard.cost;
  
  if (player1State.hp <= 0 || player2State.hp <= 0) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold font-['Rajdhani'] text-slate-200 mb-4">
            游戏结束
          </h1>
          <p className="text-2xl font-['Rajdhani'] text-sonic-purple mb-8">
            {player1State.hp <= 0 ? '玩家2' : '玩家1'} 获胜！
          </p>
          <div className="flex gap-4 justify-center">
            <Button onClick={handleRestart} className="bg-sonic-purple hover:bg-violet-500">
              再来一局
            </Button>
            <Button onClick={() => router.push('/')} variant="secondary">
              返回主页
            </Button>
          </div>
        </div>
      </div>
    );
  }
  
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

        {/* 顶部：玩家2（对手） */}
        <div className="flex justify-center items-start pt-8">
          <div className="relative">
            <EntityStatusPanel
              entity={player2State}
              isEnemy={currentPlayer !== 'PLAYER2'}
              playerName="玩家2"
            />
            {/* 玩家2的飘字 */}
            {floatingNumbers
              .filter(n => n.target === 'PLAYER2')
              .map((number, index) => (
                <motion.div
                  key={number.id}
                  className={cn(
                    "absolute font-black text-4xl drop-shadow-lg pointer-events-none z-50",
                    number.type === 'ARMOR' ? "text-armor-blue" : "text-danger-red"
                  )}
                  style={{ top: index * 35, left: "50%", transform: "translateX(-50%)" }}
                  initial={{ opacity: 1, y: 0, scale: 1 }}
                  animate={{ opacity: 0, y: -60, scale: 1.3 }}
                  transition={{ duration: 1, ease: "easeOut", delay: index * 0.1 }}
                >
                  {number.type === 'ARMOR' && (
                    <span className="text-2xl">🛡️</span>
                  )}
                  -{number.amount}
                </motion.div>
              ))}
          </div>
        </div>

        {/* 中央区域：回合信息 + 操作按钮 */}
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <h2 className="text-3xl font-bold font-['Rajdhani'] text-slate-300">
            {currentPlayer === 'PLAYER1' ? '玩家1' : '玩家2'} 的回合
          </h2>
          
          <div className="text-xl text-slate-500">
            回合 {turn} · 剩余 {turnTime} 秒
          </div>
          
          {selectedCard ? (
            <div className="space-y-4">
              <p className="text-lg text-sonic-purple font-bold">
                已选择: {selectedCard.name}
              </p>
              <div className="flex gap-4">
                <Button
                  onClick={handlePlayCard}
                  disabled={!canPlaySelected || isProcessing}
                  className="bg-gradient-to-r from-green-600 to-green-400 hover:from-green-500 hover:to-green-300 text-white font-bold text-xl px-8 py-4 rounded-xl shadow-lg shadow-green-500/30"
                >
                  出牌
                </Button>
                <Button
                  onClick={() => setSelectedCardUid(null)}
                  variant="secondary"
                  className="text-xl px-8 py-4 rounded-xl"
                >
                  取消
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2 text-center">
              <p className="text-xl text-slate-500">
                选择卡牌进行出牌，或点击「结束回合」
              </p>
            </div>
          )}
          
          {!selectedCard && (
            <Button
              onClick={handleEndTurn}
              disabled={isProcessing}
              className="bg-gradient-to-r from-sonic-purple to-violet-500 hover:from-sonic-purple hover:to-violet-400 text-white font-bold text-xl px-12 py-6 rounded-2xl shadow-xl shadow-sonic-purple/40 transition-all hover:scale-105"
            >
              结束回合
            </Button>
          )}
        </div>

        {/* 底部：当前玩家状态 + 手牌 */}
        <div className="pb-8">
          <div className="flex items-end justify-between gap-8">
            {/* 左下角：当前玩家 */}
            <div className="flex-shrink-0 relative">
              <EntityStatusPanel
                entity={currentPlayer === 'PLAYER1' ? player1State : player2State}
                isEnemy={false}
                playerName={currentPlayer === 'PLAYER1' ? '玩家1' : '玩家2'}
              />
              
              {/* AP显示 */}
              <div className="mt-2 bg-black/70 p-2 rounded-lg backdrop-blur border border-slate-700/50">
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="w-3 h-3 text-sonic-purple" />
                  <span className="text-xs font-bold text-sonic-purple">AP</span>
                  <span className="text-xs text-slate-300">{currentAp}/{currentMaxAp}</span>
                </div>
                <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-sonic-purple to-violet-400"
                    initial={{ width: "100%" }}
                    animate={{ width: `${(currentAp / currentMaxAp) * 100}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>
              
              {/* 玩家1的飘字 */}
              {floatingNumbers
                .filter(n => n.target === (currentPlayer === 'PLAYER1' ? 'PLAYER1' : 'PLAYER2'))
                .map((number, index) => (
                  <motion.div
                    key={number.id}
                    className={cn(
                      "absolute font-black text-4xl drop-shadow-lg pointer-events-none z-50",
                      number.type === 'ARMOR' ? "text-armor-blue" : "text-danger-red"
                    )}
                    style={{ top: index * 35, left: "50%", transform: "translateX(-50%)" }}
                    initial={{ opacity: 1, y: 0, scale: 1 }}
                    animate={{ opacity: 0, y: -60, scale: 1.3 }}
                    transition={{ duration: 1, ease: "easeOut", delay: index * 0.1 }}
                  >
                    {number.type === 'ARMOR' && (
                      <span className="text-2xl">🛡️</span>
                    )}
                    -{number.amount}
                  </motion.div>
                ))}
            </div>

            {/* 中央：手牌 */}
            <div className="flex-1 flex justify-center items-end">
              <div className="flex items-end gap-[-24px]">
                {currentHand.map((card, index) => (
                  <HandCard
                    key={card.uid}
                    card={card}
                    index={index}
                    total={currentHand.length}
                    isSelected={selectedCardUid === card.uid}
                    onSelect={handleSelectCard}
                    canPlay={currentAp >= card.cost}
                  />
                ))}
              </div>
            </div>

            {/* 右下角：占位，保持平衡 */}
            <div className="flex-shrink-0 w-48" />
          </div>
        </div>
      </div>
    </div>
  );
}
