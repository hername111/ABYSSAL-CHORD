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
} from "lucide-react";
import { Card, CardType, CardTarget, INITIAL_HAND_CARDS } from "@/lib/cards";
import { getPollutionLevel, pollutionLevels } from "@/lib/game-data";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// 带唯一实例 ID 的卡牌类型
interface CardWithUid extends Card {
  uid: string;
}

// 全局常量
const MAX_HAND_SIZE = 6; // 手牌上限严格限制为 6 张
const DRAW_PER_TURN = 2; // 每回合固定抽取的张数

// 敌人意图类型枚举
type IntentType = "ATTACK" | "DEFEND" | "BUFF" | "DEBUFF";

// 状态效果类型
type StatusEffectType = "VULNERABLE" | "WEAK" | "POISON" | "STRENGTH" | "THORN";

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

// 简化的敌人行为类型
type SimpleEnemyBehavior = {
  type: "attack" | "defend" | "buff";
  value: number;
  description: string;
  intentType: IntentType;
};

// 随机获取敌人意图
const getSimpleEnemyIntention = (): SimpleEnemyBehavior => {
  const roll = Math.floor(Math.random() * 6) + 1;
  if (roll <= 3) {
    return {
      type: "attack",
      value: 6 + Math.floor(Math.random() * 5),
      description: "准备冲撞攻击",
      intentType: "ATTACK",
    };
  } else if (roll === 4) {
    return {
      type: "buff",
      value: 10,
      description: "积蓄污染能量",
      intentType: "BUFF",
    };
  } else {
    return {
      type: "defend",
      value: 8,
      description: "进入防御姿态",
      intentType: "DEFEND",
    };
  }
};

// 污染刻度尺组件
const PollutionScale = ({ level }: { level: number }) => {
  const getPollutionColor = (lvl: number) => {
    if (lvl < 25) return "from-purify-green to-purify-green/60";
    if (lvl < 50) return "from-yellow-500 to-orange-500";
    if (lvl < 75) return "from-orange-500 to-danger-red";
    return "from-danger-red to-sonic-purple";
  };

  // 获取当前阶段配置
  const currentPhase = getPollutionLevel(level);
  
  // 获取阶段效果描述
  const getPhaseEffectDescription = (phase: typeof pollutionLevels[0]) => {
    const effects: string[] = [];
    if (phase.damageBonus > 0) effects.push(`伤害 +${phase.damageBonus}`);
    if (phase.armorPerTurn > 0) effects.push(`敌人护甲 +${phase.armorPerTurn}`);
    if (phase.playerPiercingDmg > 0) effects.push(`穿透伤害 -${phase.playerPiercingDmg}`);
    return effects.length > 0 ? effects.join("，") : "稳定期，无额外效果";
  };

  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div 
      className="fixed top-4 right-8 z-50"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {/* 极简主界面 UI */}
      <div className="bg-black/70 backdrop-blur-md p-4 rounded-xl border border-sonic-purple/30 shadow-lg">
        <div className="flex items-center gap-2 mb-2">
          <Skull className="w-4 h-4 text-sonic-purple" />
          <span className="text-sm font-bold text-slate-200">污染刻度尺</span>
        </div>
        <div className="w-40 h-4 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
          <motion.div
            className={cn("h-full bg-gradient-to-r", getPollutionColor(level))}
            initial={{ width: 0 }}
            animate={{ width: `${level}%` }}
            transition={{ duration: 1 }}
          />
        </div>
        <div className="flex justify-between items-center mt-1">
          <span className="text-xs font-bold text-slate-200">{level}%</span>
        </div>
        
        {/* 当前阶段信息 - 带有发光边框 */}
        <div className={cn(
          "mt-2 text-xs px-3 py-2 rounded-lg border",
          currentPhase.bgColor.replace('bg-', 'border-').replace('500', '600'),
          "bg-opacity-20",
          "shadow-sm",
          currentPhase.bgColor.replace('bg-', 'shadow-').replace('500', '500/30')
        )}>
          <div className={cn("font-bold mb-1", currentPhase.color)}>
            {currentPhase.name}
          </div>
          <div className="text-slate-300">
            {getPhaseEffectDescription(currentPhase)}
          </div>
        </div>
      </div>

      {/* Hover Tooltip 悬浮详情框 */}
      <AnimatePresence>
        {showTooltip && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute right-0 top-full mt-2 w-64 bg-black/95 backdrop-blur-lg rounded-xl border border-sonic-purple/50 shadow-2xl p-4"
          >
            <div className="text-sm font-bold text-slate-200 mb-3">污染阶段详情</div>
            <div className="space-y-2">
              {pollutionLevels.map((phase, index) => {
                const isActive = level >= phase.range[0] && level <= phase.range[1];
                return (
                  <div 
                    key={index}
                    className={cn(
                      "text-xs px-3 py-2 rounded-lg",
                      isActive 
                        ? "bg-sonic-purple/20 border border-sonic-purple/50" 
                        : "bg-slate-800/50 border border-transparent"
                    )}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className={cn("font-bold", isActive ? phase.color : "text-slate-500")}>
                        {phase.name}
                      </span>
                      <span className="text-slate-400">
                        {phase.range[0]}-{phase.range[1]}
                      </span>
                    </div>
                    <div className="text-slate-400">
                      {getPhaseEffectDescription(phase)}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

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

// 敌人状态面板组件
const EnemyStatPanel = ({ 
  hp, 
  maxHp, 
  armor, 
  intentType, 
  intentValue 
}: { 
  hp: number;
  maxHp: number;
  armor: number;
  intentType: IntentType;
  intentValue: number;
}) => {
  const getIntentColor = () => {
    switch (intentType) {
      case "ATTACK": return "#ef4444";
      case "DEFEND": return "#3b82f6";
      case "BUFF": return "#a855f7";
      case "DEBUFF": return "#f97316";
      default: return "#ef4444";
    }
  };

  const getIntentText = () => {
    switch (intentType) {
      case "ATTACK": return `${intentValue} 伤害`;
      case "DEFEND": return `${intentValue} 护甲`;
      case "BUFF": return `污染 +${intentValue}`;
      case "DEBUFF": return `削弱玩家`;
      default: return `${intentValue} 伤害`;
    }
  };

  const intentColor = getIntentColor();

  return (
    <div className="w-48 space-y-2">
      {/* 意图指示器 */}
      <div className="bg-black/80 backdrop-blur-sm px-4 py-2 rounded-lg border border-sonic-purple/50">
        <div className="flex items-center gap-2">
          {intentType === "ATTACK" && <Swords className="w-5 h-5" style={{ color: intentColor }} />}
          {intentType === "DEFEND" && <Shield className="w-5 h-5" style={{ color: intentColor }} />}
          {intentType === "BUFF" && <Sparkles className="w-5 h-5" style={{ color: intentColor }} />}
          {intentType === "DEBUFF" && <TrendingDown className="w-5 h-5" style={{ color: intentColor }} />}
          <span className="text-sm text-slate-200">{getIntentText()}</span>
        </div>
      </div>

      {/* HP条 */}
      <StatBox 
        name="HP" 
        current={hp} 
        max={maxHp} 
        color="#ef4444" 
        showIcon={false}
      />
      
      {/* 护甲 */}
      {armor > 0 && (
        <StatBox 
          name="护甲" 
          current={armor} 
          color="#3b82f6" 
          icon={Shield}
        />
      )}
    </div>
  );
};

// 通用的实体状态面板组件 - 同时用于玩家和敌人
const EntityStatusPanel = ({
  entity,
  isEnemy = false,
  intentType,
  intentValue,
}: {
  entity: EntityState;
  isEnemy?: boolean;
  intentType?: IntentType;
  intentValue?: number;
}) => {
  // 获取状态效果的图标和颜色
  const getStatusEffectIcon = (type: StatusEffectType) => {
    switch (type) {
      case "VULNERABLE": return <Target className="w-4 h-4" />;
      case "WEAK": return <TrendingDown className="w-4 h-4" />;
      case "POISON": return <Skull className="w-4 h-4" />;
      case "STRENGTH": return <TrendingUp className="w-4 h-4" />;
      case "THORN": return <ShieldIcon className="w-4 h-4" />;
    }
  };

  const getStatusEffectColor = (type: StatusEffectType) => {
    switch (type) {
      case "VULNERABLE": return "text-yellow-400 bg-yellow-400/20 border-yellow-400/50";
      case "WEAK": return "text-blue-400 bg-blue-400/20 border-blue-400/50";
      case "POISON": return "text-green-400 bg-green-400/20 border-green-400/50";
      case "STRENGTH": return "text-red-400 bg-red-400/20 border-red-400/50";
      case "THORN": return "text-purple-400 bg-purple-400/20 border-purple-400/50";
    }
  };

  const getStatusEffectName = (type: StatusEffectType) => {
    switch (type) {
      case "VULNERABLE": return "易伤";
      case "WEAK": return "虚弱";
      case "POISON": return "中毒";
      case "STRENGTH": return "力量";
      case "THORN": return "荆棘";
    }
  };

  const getIntentColor = () => {
    switch (intentType) {
      case "ATTACK": return "#ef4444";
      case "DEFEND": return "#3b82f6";
      case "BUFF": return "#a855f7";
      case "DEBUFF": return "#f97316";
      default: return "#ef4444";
    }
  };

  const getIntentText = () => {
    switch (intentType) {
      case "ATTACK": return `${intentValue} 伤害`;
      case "DEFEND": return `${intentValue} 护甲`;
      case "BUFF": return `污染 +${intentValue}`;
      case "DEBUFF": return `削弱玩家`;
      default: return `${intentValue} 伤害`;
    }
  };

  const allStatusEffects = [...entity.buffs, ...entity.debuffs];

  return (
    <div className="w-48 space-y-2">
      {/* 敌人意图指示器 - 仅敌人显示 */}
      {isEnemy && intentType && (
        <div className="bg-black/80 backdrop-blur-sm px-4 py-2 rounded-lg border border-sonic-purple/50">
          <div className="flex items-center gap-2">
            {intentType === "ATTACK" && <Swords className="w-5 h-5" style={{ color: getIntentColor() }} />}
            {intentType === "DEFEND" && <Shield className="w-5 h-5" style={{ color: getIntentColor() }} />}
            {intentType === "BUFF" && <Sparkles className="w-5 h-5" style={{ color: getIntentColor() }} />}
            {intentType === "DEBUFF" && <TrendingDown className="w-5 h-5" style={{ color: getIntentColor() }} />}
            <span className="text-sm text-slate-200">{getIntentText()}</span>
          </div>
        </div>
      )}

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

// 伤害数字组件
const DamageNumber = ({ damage, x, y, color }: { damage: number; x: number; y: number; color: string }) => {
  return (
    <motion.div
      className={cn(
        "absolute font-black text-4xl drop-shadow-lg pointer-events-none z-50",
        color
      )}
      style={{ left: x, top: y }}
      initial={{ opacity: 1, y: 0, scale: 1 }}
      animate={{ opacity: 0, y: -60, scale: 1.3 }}
      transition={{ duration: 1, ease: "easeOut" }}
    >
      -{damage}
    </motion.div>
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
  pollutionLevel
}: { 
  card: CardWithUid; 
  index: number; 
  total: number; 
  isSelected: boolean; 
  onSelect: (uid: string) => void;
  canPlay: boolean;
  pollutionLevel: number;
}) => {
  const getBorderColor = (type: CardType) => {
    switch (type) {
      case "attack": return "border-danger-red/70";
      case "skill": return "border-armor-blue/70";
      case "ability": return "border-gold/70";
      default: return "border-slate-600";
    }
  };

  const getBgColor = (type: CardType) => {
    switch (type) {
      case "attack": return "from-card-darker to-red-900/50";
      case "skill": return "from-card-darker to-blue-900/50";
      case "ability": return "from-card-darker to-yellow-900/50";
      default: return "from-card-darker to-slate-80";
    }
  };

  // 动态渲染卡牌效果文本，显示污染加成伤害和污染增减
  const getDynamicEffect = () => {
    let effect = card.effect;
    
    // 如果是攻击牌且有基础伤害，动态计算污染加成
    if (card.type === "attack" && card.baseDamage) {
      const baseDamage = card.baseDamage;
      const finalDamage = Math.floor(baseDamage * (1 + (pollutionLevel / 100)));
      const pollutionBonus = finalDamage - baseDamage;
      
      if (pollutionBonus > 0) {
        // 替换原效果中的伤害数值
        effect = effect.replace(/造成\s*\d+\s*点伤害/, `造成 ${finalDamage} 点伤害（包含+${pollutionBonus}污染加成）`);
      }
    }
    
    // 如果有专门的 pollutionModifier 字段，动态显示污染增减
    if (card.pollutionModifier && card.pollutionModifier !== 0) {
      if (card.pollutionModifier < 0) {
        // 降低污染度
        effect = effect.replace(/降低\s*\d+\s*点污染度/, `降低 ${Math.abs(card.pollutionModifier)} 点污染度`);
      } else if (card.pollutionModifier > 0) {
        // 增加污染度
        effect = effect.replace(/增加\s*\d+\s*点污染度/, `增加 ${card.pollutionModifier} 点污染度`);
      }
    }
    
    return effect;
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
        "w-32 h-44 rounded-xl border-2 bg-gradient-to-br shadow-lg",
        getBgColor(card.type),
        getBorderColor(card.type),
        isSelected && "ring-4 ring-sonic-purple/60 shadow-xl shadow-sonic-purple/30"
      )}>
        {/* 费用 */}
        <div className="absolute -top-2 -left-2 w-8 h-8 bg-sonic-purple rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg border-2 border-sonic-purple/50">
          {card.cost}
        </div>
        
        {/* 卡牌内容 */}
        <div className="p-3 h-full flex flex-col">
          <h3 className="text-sm font-bold text-slate-100 mb-1 truncate">
            {card.name}
          </h3>
          <p className="text-xs text-slate-400 mb-2">
            {card.target === "single" ? "单体" : card.target === "aoe" ? "群体" : "自身"}
          </p>
          <div className="flex-1 text-xs text-slate-300 leading-relaxed">
            {getDynamicEffect()}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// 打牌图标效果组件
const CardPlayEffect = ({ 
  type, 
  onComplete 
}: { 
  type: string; 
  onComplete: () => void; 
}) => {
  return (
    <motion.div
      className="fixed left-1/2 bottom-1/4 -translate-x-1/2 z-50 pointer-events-none"
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: [0, 1, 0], scale: [0.5, 1.5, 0.5] }}
      transition={{ duration: 0.5 }}
      onAnimationComplete={onComplete}
    >
      {type === "attack" ? (
        <Sword className="w-24 h-24 text-danger-red drop-shadow-[0_0_20px_rgba(239,68,68,0.6)]" />
      ) : (
        <ShieldIcon className="w-24 h-24 text-armor-blue drop-shadow-[0_0_20px_rgba(59,130,246,0.6)]" />
      )}
    </motion.div>
  );
};

export default function BattleArena() {
  // 使用 useRef 来管理 uid 计数器，确保每次组件重新渲染时 uid 都是一致的
  const uidCounterRef = useRef(0);
  
  // 为卡牌数组添加 uid 的辅助函数
  const addUidsToCards = (cards: Card[]): CardWithUid[] => {
    return cards.map(card => {
      uidCounterRef.current++;
      return { ...card, uid: `${card.id}_${uidCounterRef.current}` };
    });
  };
  
  // 游戏状态
  const [turn, setTurn] = useState(1);
  const [pollutionLevel, setPollutionLevel] = useState(0);
  
  // 玩家实体状态
  const [playerState, setPlayerState] = useState<EntityState>({
    hp: 80,
    maxHp: 80,
    armor: 0,
    buffs: [],
    debuffs: []
  });
  const [playerAp, setPlayerAp] = useState(3);
  const [playerMaxAp] = useState(3);
  
  // 敌人实体状态
  const [enemyState, setEnemyState] = useState<EntityState>({
    hp: 50,
    maxHp: 50,
    armor: 0,
    buffs: [],
    debuffs: []
  });
  const [hand, setHand] = useState<CardWithUid[]>(
    addUidsToCards(INITIAL_HAND_CARDS)
  );
  const [selectedCardUid, setSelectedCardUid] = useState<string | null>(null);
  const [currentIntention, setCurrentIntention] = useState<SimpleEnemyBehavior>(getSimpleEnemyIntention());
  const [isProcessing, setIsProcessing] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  
  // 动画状态
  const [isAttacking, setIsAttacking] = useState(false);
  const [isDefending, setIsDefending] = useState(false);
  const [isEnemyHit, setIsEnemyHit] = useState(false);
  const [isPlayerHit, setIsPlayerHit] = useState(false);
  const [isEnemyCharging, setIsEnemyCharging] = useState(false);
  const [showSonicWave, setShowSonicWave] = useState(false);
  const [showRedFlash, setShowRedFlash] = useState(false);
  const [damageNumbers, setDamageNumbers] = useState<Array<{ id: number; damage: number; x: number; y: number; color: string }>>([]);
  const [showCardPlayEffect, setShowCardPlayEffect] = useState<{ show: boolean; type: "attack" | "skill" }>({ show: false, type: "attack" });
  // 敌人动画状态：idle(待机), attack(攻击), defend(防御), buff(强化), hit(受击)
  const [enemyAnimationState, setEnemyAnimationState] = useState<"idle" | "attack" | "defend" | "buff" | "hit">("idle");
  
  // AI裁判消息
  const [dialogMessages, setDialogMessages] = useState<Array<{ id: number; text: string; isTyping: boolean }>>([]);
  
  // 倒计时状态
  const [timeLeft, setTimeLeft] = useState(30);
  
  // 牌库、弃牌堆和游戏结束状态
  const [deck, setDeck] = useState<CardWithUid[]>(
    addUidsToCards([...INITIAL_HAND_CARDS, ...INITIAL_HAND_CARDS, ...INITIAL_HAND_CARDS])
  );
  const [discardPile, setDiscardPile] = useState<CardWithUid[]>([]);
  const [gameOver, setGameOver] = useState(false);
  const [gameResult, setGameResult] = useState<'victory' | 'defeat' | null>(null);
  
  // 中间提示状态
  const [showHint, setShowHint] = useState(true);
  const [showEnergyWarning, setShowEnergyWarning] = useState(false);
  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false);
  
  const router = useRouter();
  
  // 倒计时逻辑
  useEffect(() => {
    if (isProcessing) return;
    
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setShowTimeoutWarning(true);
          // 2秒后自动隐藏警告并结束回合
          setTimeout(() => {
            setShowTimeoutWarning(false);
            handleEndTurn();
          }, 2000);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [isProcessing, turn]);
  
  // 重置倒计时
  const resetTimer = () => {
    setTimeLeft(30);
  };

  // 抽牌与爆牌逻辑 - 逐张抽，满手牌烧毁
  const drawCard = (amount: number) => {
    let currentDeck = [...deck];
    let currentHand = [...hand];
    let currentDiscard = [...discardPile];
    
    for (let i = 0; i < amount; i++) {
      // 如果牌库空了，将弃牌堆洗入抽牌堆
      if (currentDeck.length === 0) {
        if (currentDiscard.length === 0) {
          // 牌库和弃牌堆都空了，无法继续抽牌
          break;
        }
        // 将弃牌堆洗入抽牌堆
        currentDeck = [...currentDiscard].sort(() => Math.random() - 0.5);
        currentDiscard = [];
      }
      
      // 从牌库中抽一张牌
      const randomIndex = Math.floor(Math.random() * currentDeck.length);
      const drawnCard = currentDeck.splice(randomIndex, 1)[0];
      
      // 检查当前手牌数量
      if (currentHand.length < MAX_HAND_SIZE) {
        // 手牌未满，加入手牌
        currentHand.push(drawnCard);
      } else {
        // 爆牌惩罚：卡牌直接进入弃牌堆
        currentDiscard.push(drawnCard);
        // 可以在这里添加爆牌的视觉特效逻辑
      }
    }
    
    // 更新状态
    setDeck(currentDeck);
    setHand(currentHand);
    setDiscardPile(currentDiscard);
  };

  // 统一的伤害与护甲结算函数 - 严格按照4步执行
  const takeDamage = (target: "player" | "enemy", amount: number, isPiercing: boolean = false) => {
    if (target === "player") {
      setPlayerState(prev => {
        // 第1步：获取目标当前的护甲值
        const targetArmor = isPiercing ? 0 : prev.armor;
        
        // 第2步：计算穿透护甲后的实际伤害
        const trueDamage = isPiercing ? amount : Math.max(0, amount - targetArmor);
        
        // 第3步：更新目标护甲值（穿透伤害不消耗护甲）
        const newArmor = isPiercing ? prev.armor : Math.max(0, targetArmor - amount);
        
        // 第4步：更新目标生命值
        const newHp = Math.max(0, prev.hp - trueDamage);
        
        // 生死判定
        setTimeout(() => {
          if (newHp <= 0) {
            setGameOver(true);
            setGameResult('defeat');
          }
        }, 100);
        
        return { ...prev, hp: newHp, armor: newArmor };
      });
    } else {
      setEnemyState(prev => {
        // 第1步：获取目标当前的护甲值
        const targetArmor = isPiercing ? 0 : prev.armor;
        
        // 第2步：计算穿透护甲后的实际伤害
        const trueDamage = isPiercing ? amount : Math.max(0, amount - targetArmor);
        
        // 第3步：更新目标护甲值（穿透伤害不消耗护甲）
        const newArmor = isPiercing ? prev.armor : Math.max(0, targetArmor - amount);
        
        // 第4步：更新目标生命值
        const newHp = Math.max(0, prev.hp - trueDamage);
        
        // 生死判定
        setTimeout(() => {
          if (newHp <= 0) {
            setGameOver(true);
            setGameResult('victory');
          }
        }, 100);
        
        return { ...prev, hp: newHp, armor: newArmor };
      });
    }
  };

  // 回合开始逻辑
  const startTurn = () => {
    // 恢复玩家的能量值至满状态
    setPlayerAp(playerMaxAp);
    // 隐藏警告提示
    setShowEnergyWarning(false);
    setShowTimeoutWarning(false);
    // 自动调用抽牌进行回合初的固定摸牌
    drawCard(DRAW_PER_TURN);
  };

  // 生死判定
  const checkGameOver = () => {
    if (playerState.hp <= 0) {
      setGameOver(true);
      setGameResult('defeat');
    } else if (enemyState.hp <= 0) {
      setGameOver(true);
      setGameResult('victory');
    }
  };

  // 重新挑战
  const handleRestart = () => {
    // 重置 uid 计数器
    uidCounterRef.current = 0;
    
    // 重置所有状态
    setTurn(1);
    setPollutionLevel(0);
    setPlayerState({
      hp: 80,
      maxHp: 80,
      armor: 0,
      buffs: [],
      debuffs: []
    });
    setPlayerAp(3);
    setEnemyState({
      hp: 50,
      maxHp: 50,
      armor: 0,
      buffs: [],
      debuffs: []
    });
    setHand(addUidsToCards(INITIAL_HAND_CARDS));
    setSelectedCardUid(null);
    setCurrentIntention(getSimpleEnemyIntention());
    setIsProcessing(false);
    setDeck(
      addUidsToCards([...INITIAL_HAND_CARDS, ...INITIAL_HAND_CARDS, ...INITIAL_HAND_CARDS])
    );
    setDiscardPile([]);
    setGameOver(false);
    setGameResult(null);
    setTimeLeft(30);
    setDialogMessages([]);
    setDamageNumbers([]);
    setShowHint(true);
    setShowEnergyWarning(false);
    setShowTimeoutWarning(false);
  };

  // 选择卡牌
  const handleCardSelect = (uid: string) => {
    if (isProcessing) return;
    
    // 找到对应的卡牌
    const card = hand.find(c => c.uid === uid);
    if (!card) return;
    
    // 如果点击的是已经选中的卡牌，取消选中
    if (selectedCardUid === uid) {
      setSelectedCardUid(null);
      setShowHint(true);
      setShowEnergyWarning(false);
      return;
    }
    
    // 检查是否有足够的 AP
    if (card.cost > playerAp) {
      setShowEnergyWarning(true);
      setShowHint(false);
      setSelectedCardUid(null);
      // 2秒后自动隐藏警告
      setTimeout(() => {
        setShowEnergyWarning(false);
      }, 2000);
      return;
    }
    
    setSelectedCardUid(uid);
    setShowHint(false);
    setShowEnergyWarning(false);
  };
  
  // 打出卡牌 - 结构化卡牌效果路由
  const handlePlayCard = () => {
    if (!selectedCardUid || isProcessing) return;
    
    // 通过 uid 找到对应的卡牌
    const selectedCard = hand.find(c => c.uid === selectedCardUid);
    if (!selectedCard || selectedCard.cost > playerAp) return;
    
    setIsProcessing(true);
    setPlayerAp(prev => prev - selectedCard.cost);
    resetTimer();
    
    // 显示打牌图标效果
    const effectType = selectedCard.type === "attack" ? "attack" : "skill";
    setShowCardPlayEffect({ show: true, type: effectType });
    
    // ========== 结构化卡牌效果路由 ==========
    let aiMessage = "";
    let totalDamage = 0;
    let armorGain = 0;
    
    // 统一的伤害计算方法 - 只保留固定数值加成
    const calculateActualDamage = (baseDamage: number, globalPollution: number) => {
      // 获取当前阶段配置
      const phaseConfig = getPollutionLevel(globalPollution);
      
      // 核心机制：只应用阶段固定数值伤害增益
      const finalDamage = baseDamage + phaseConfig.damageBonus;
      
      return finalDamage;
    };
    
    // 1. 只使用阶段固定数值加成
    const baseDamage = selectedCard.baseDamage || 0;
    // 必须且只能使用统一的伤害计算方法
    const phaseConfig = getPollutionLevel(pollutionLevel);
    const finalDamage = calculateActualDamage(baseDamage, pollutionLevel);
    
    // 2. 处理护甲获得
    armorGain = selectedCard.baseArmor || 0;
    
    // 3. 强制落实污染度增减 - 使用专门的 pollutionModifier 字段
    const pollutionModifier = selectedCard.pollutionModifier || 0;
    
    // 构建AI消息
    if (selectedCard.type === "attack" && finalDamage > 0) {
      const parts: string[] = [];
      parts.push(`基础伤害 ${baseDamage} 点`);
      if (phaseConfig.damageBonus > 0) parts.push(`阶段增益 ${phaseConfig.damageBonus} 点`);
      
      aiMessage = `你打出了【${selectedCard.name}】，${parts.join('，')}，总计造成 ${finalDamage} 点伤害！`;
      totalDamage = finalDamage;
    } else if (selectedCard.type === "skill") {
      const parts: string[] = [];
      if (armorGain > 0) parts.push(`获得 ${armorGain} 点护甲`);
      if (pollutionModifier < 0) parts.push(`降低 ${Math.abs(pollutionModifier)} 点污染度`);
      if (pollutionModifier > 0) parts.push(`增加 ${pollutionModifier} 点污染度`);
      aiMessage = `你使用了【${selectedCard.name}】，${parts.join('，')}！`;
    } else {
      aiMessage = `你使用了【${selectedCard.name}】！`;
    }
    
    // AI裁判台词
    const msg = { id: Date.now(), text: aiMessage, isTyping: true };
    setDialogMessages(prev => [...prev, msg]);
    
    // 根据卡牌类型触发动画和效果
    if (selectedCard.type === "attack" && totalDamage > 0) {
      setIsAttacking(true);
      setTimeout(() => setShowSonicWave(true), 150);
      setTimeout(() => setIsEnemyHit(true), 300);
      
      // 伤害数字
      setTimeout(() => {
        setDamageNumbers(prev => [...prev, { id: Date.now(), damage: totalDamage, x: 200, y: 250, color: "text-danger-red" }]);
        
        // 必须且只能将经过加成后的 finalDamage 传入 takeDamage 扣血函数中
        takeDamage("enemy", totalDamage);
        
        setTimeout(() => setIsEnemyHit(false), 500);
        setTimeout(() => setShowSonicWave(false), 500);
        setTimeout(() => setIsAttacking(false), 600);
        setTimeout(() => {
          setDialogMessages(prev => prev.map(m => m.id === msg.id ? { ...m, isTyping: false } : m));
        }, 800);
      }, 300);
    } else if (selectedCard.type === "skill") {
      setIsDefending(true);
      
      setTimeout(() => {
        // 应用护甲效果
        if (armorGain > 0) {
          setPlayerState(prev => ({ ...prev, armor: prev.armor + armorGain }));
        }
        
        // 强制落实污染度增减 - 必须立刻触发UI更新
        if (pollutionModifier !== 0) {
          setPollutionLevel(prev => Math.min(100, Math.max(0, prev + pollutionModifier)));
        }
        
        setTimeout(() => setIsDefending(false), 600);
        setTimeout(() => {
          setDialogMessages(prev => prev.map(m => m.id === msg.id ? { ...m, isTyping: false } : m));
        }, 800);
      }, 300);
    }
    
    // 移除打出的手牌
    setHand(prev => prev.filter(c => c.uid !== selectedCardUid));
    setSelectedCardUid(null);
    
    setTimeout(() => {
      setIsProcessing(false);
    }, 1000);
  };
  
  // 结束回合 - 完整的视觉闭环
  const handleEndTurn = async () => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    setSelectedCardUid(null);
    setShowHint(false);
    resetTimer();
    
    try {
      // 获取当前阶段配置
      const phaseConfig = getPollutionLevel(pollutionLevel);
      
      // 回合开始：应用阶段增益
      if (phaseConfig.armorPerTurn > 0) {
        setEnemyState(prev => ({ ...prev, armor: prev.armor + phaseConfig.armorPerTurn }));
      }
      
      // 玩家受到穿透伤害
      if (phaseConfig.playerPiercingDmg > 0) {
        takeDamage("player", phaseConfig.playerPiercingDmg, true);
      }
      
      // 根据敌人意图类型触发对应的动画
      let actionText = "";
      let actionMsgText = "";
      
      switch (currentIntention.intentType) {
        case "ATTACK":
          actionText = "嘶鸣游荡者正在蓄力...";
          actionMsgText = "嘶鸣游荡者向你发起了猛烈冲撞！";
          setEnemyAnimationState("attack");
          break;
        case "DEFEND":
          actionText = "嘶鸣游荡者正在构建声学护盾...";
          actionMsgText = "嘶鸣游荡者进入防御姿态！";
          setEnemyAnimationState("defend");
          break;
        case "BUFF":
        case "DEBUFF":
          actionText = "嘶鸣游荡者正在积蓄污染能量...";
          actionMsgText = "嘶鸣游荡者的能量在涌动！";
          setEnemyAnimationState("buff");
          break;
      }
      
      const chargingMsg = { id: Date.now(), text: actionText, isTyping: true };
      setDialogMessages(prev => [...prev, chargingMsg]);
      
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // 根据意图类型执行对应操作
      if (currentIntention.type === "attack") {
        setShowRedFlash(true);
        setIsPlayerHit(true);
        
        const attackMsg = { id: Date.now() + 1, text: actionMsgText, isTyping: true };
        setDialogMessages(prev => [...prev, attackMsg]);
        
        // 统一的伤害计算方法 - 只保留固定数值加成
        const calculateActualDamage = (baseDamage: number, globalPollution: number) => {
          // 获取当前阶段配置
          const phaseConfig = getPollutionLevel(globalPollution);
          
          // 核心机制：只应用阶段固定数值伤害增益
          const finalDamage = baseDamage + phaseConfig.damageBonus;
          
          return finalDamage;
        };
        
        const baseEnemyDamage = currentIntention.value;
        const finalEnemyDamage = calculateActualDamage(baseEnemyDamage, pollutionLevel);
        const enemyPhaseConfig = getPollutionLevel(pollutionLevel);
        
        await new Promise(resolve => setTimeout(resolve, 200));
        setShowRedFlash(false);
        
        // 第三步：数值更新
        await new Promise(resolve => setTimeout(resolve, 300));
        
        if (finalEnemyDamage > 0) {
          setDamageNumbers(prev => [...prev, { id: Date.now(), damage: finalEnemyDamage, x: 100, y: 400, color: "text-danger-red" }]);
          
          // 使用统一的伤害结算函数
          takeDamage("player", finalEnemyDamage);
        }
        
        setTimeout(() => setIsPlayerHit(false), 500);
        
        // 完成打字效果
        setTimeout(() => {
          setDialogMessages(prev => prev.map(m => 
            m.id === chargingMsg.id || m.id === attackMsg.id ? { ...m, isTyping: false } : m
          ));
        }, 800);
      } else if (currentIntention.type === "defend") {
        // 敌人加甲
        const defendMsg = { id: Date.now() + 1, text: actionMsgText, isTyping: true };
        setDialogMessages(prev => [...prev, defendMsg]);
        
        await new Promise(resolve => setTimeout(resolve, 400));
        
        setEnemyState(prev => ({ ...prev, armor: prev.armor + currentIntention.value }));
        
        // 完成打字效果
        setTimeout(() => {
          setDialogMessages(prev => prev.map(m => 
            m.id === chargingMsg.id || m.id === defendMsg.id ? { ...m, isTyping: false } : m
          ));
        }, 800);
      } else if (currentIntention.type === "buff") {
        // 敌人强化 - 增加污染度
        const buffMsg = { id: Date.now() + 1, text: actionMsgText, isTyping: true };
        setDialogMessages(prev => [...prev, buffMsg]);
        
        // 实际增加污染度
        await new Promise(resolve => setTimeout(resolve, 400));
        setPollutionLevel(prev => Math.min(100, prev + currentIntention.value));
        
        // 完成打字效果
        setTimeout(() => {
          setDialogMessages(prev => prev.map(m => 
            m.id === chargingMsg.id || m.id === buffMsg.id ? { ...m, isTyping: false } : m
          ));
        }, 800);
      }
      
      // 重置回合 - 不清空手牌
      setTurn(prev => prev + 1);
      // 仅重置本回合护甲（易碎护甲）
      setPlayerState(prev => ({ ...prev, armor: 0 }));
      setCurrentIntention(getSimpleEnemyIntention());
      setPollutionLevel(prev => Math.min(100, prev + 5));
      
      // 回合开始：恢复能量并固定摸牌
      startTurn();
      
    } finally {
      setIsProcessing(false);
      // 新回合开始时显示提示
      setTimeout(() => {
        setShowHint(true);
      }, 300);
    }
  };

  return (
    <div className="min-h-screen bg-abyss text-slate-200 relative overflow-hidden pb-32">
      {/* 背景声波动画 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-sonic-purple/10 rounded-full animate-pulse" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-sonic-purple/5 rounded-full animate-pulse delay-1000" />
      </div>

      {/* 左上角退出按钮 */}
      <div className="fixed top-6 left-6 z-50">
        <div
          onClick={() => setShowExitConfirm(true)}
          className="w-12 h-12 bg-red-500/20 hover:bg-red-500/40 border border-red-500/50 rounded-full flex items-center justify-center cursor-pointer transition-all"
        >
          <DoorOpen className="w-6 h-6 text-red-400" />
        </div>
      </div>

      {/* 污染刻度尺 */}
      <PollutionScale level={pollutionLevel} />

      {/* 全屏红色闪电动画 */}
      <AnimatePresence>
        {showRedFlash && (
          <motion.div
            className="fixed inset-0 bg-danger-red/40 z-[100] pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.8, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          />
        )}
      </AnimatePresence>

      {/* 伤害数字 */}
      {damageNumbers.map(dn => (
        <DamageNumber
          key={dn.id}
          damage={dn.damage}
          x={dn.x}
          y={dn.y}
          color={dn.color}
        />
      ))}

      {/* 玩家角色 - 固定在左侧底部 */}
      <div className="fixed bottom-1/4 left-10 z-30">
        <motion.div
          className="relative"
          animate={isPlayerHit ? { x: [0, -10, 10, -10, 10, 0] } : {}}
          transition={{ duration: 0.4 }}
        >
          {/* 人物身体 */}
          <div className="w-20 h-32 bg-gradient-to-b from-slate-700 to-slate-900 rounded-t-3xl rounded-b-lg shadow-2xl relative">
            {/* 头部 */}
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 w-12 h-12 bg-gradient-to-b from-slate-600 to-slate-800 rounded-full" />
          </div>
          
          {/* 武器 - 声波巨剑 */}
          <motion.div
            className="absolute -right-12 top-4 origin-left"
            animate={isAttacking ? {
              rotate: [0, -30, 45, 0],
              transition: { duration: 0.4 }
            } : {}}
          >
            <div className="w-4 h-24 bg-gradient-to-r from-sonic-purple to-sonic-purple/50 rounded-full shadow-[0_0_15px_rgba(139,92,246,0.8)]" />
          </motion.div>
          
          {/* 防御动画 */}
          <AnimatePresence>
            {isDefending && (
              <motion.div
                className="absolute inset-0 -m-8"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1.2, opacity: [0, 0.8, 0] }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.6 }}
              >
                <div className="w-full h-full rounded-full border-4 border-armor-blue/60 shadow-[0_0_30px_rgba(59,130,246,0.6)]" />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
        
        {/* 玩家状态条 */}
        <div className="mt-4 w-64">
          <EntityStatusPanel entity={playerState} />
          
          {/* AP条 */}
          <div className="mt-2">
            <StatBox 
              name="AP" 
              current={playerAp} 
              max={playerMaxAp} 
              color="#8b5cf6" 
              icon={Zap}
            />
          </div>
        </div>
      </div>

      {/* 敌人角色 - 固定在右侧顶部 */}
      <div className="fixed top-1/4 right-8 z-30">
        <motion.div
          className="relative"
          animate={{
            // 待机状态：轻微上下浮动
            y: enemyAnimationState === "idle" 
              ? [0, -3, 0, 3, 0]
              // 攻击状态：向左冲刺
              : enemyAnimationState === "attack"
              ? [0, -30, 0]
              // 防御状态：轻微放大
              : enemyAnimationState === "defend"
              ? [0, 5, 0]
              // 强化状态：上下浮动
              : enemyAnimationState === "buff"
              ? [0, 10, 0, -10, 0]
              // 受击状态：震动
              : enemyAnimationState === "hit"
              ? [0, -8, 0, -4, 0]
              : 0,
            x: enemyAnimationState === "attack"
              ? [0, -60, 0]
              : 0,
            scale: enemyAnimationState === "defend"
              ? [1, 1.2, 1]
              : enemyAnimationState === "buff"
              ? [1, 1.1, 1]
              : enemyAnimationState === "hit"
              ? [1, 0.9, 1]
              : 1,
          }}
          transition={{
            // 待机动画：3秒循环
            duration: enemyAnimationState === "idle" ? 3 : 0.4,
            // 只有待机是无限循环，其他都是单次
            repeat: enemyAnimationState === "idle" ? Infinity : 0,
            ease: enemyAnimationState === "idle" ? "easeInOut" : "easeOut",
          }}
          // 动画完成后回到待机状态
          onAnimationComplete={() => {
            if (enemyAnimationState !== "idle") {
              setEnemyAnimationState("idle");
            }
          }}
          style={
            currentIntention.intentType === "DEFEND"
              ? { 
                  boxShadow: "0 0 50px rgba(59, 130, 246, 0.8), 0 0 80px rgba(59, 130, 246, 0.4)",
                  filter: "brightness(1.2)",
                }
              : currentIntention.intentType === "BUFF" || currentIntention.intentType === "DEBUFF"
              ? {
                  filter: "drop-shadow(0 0 25px rgba(168, 85, 247, 0.9)) brightness(1.3)",
                }
              : currentIntention.intentType === "ATTACK" && isEnemyCharging
              ? {
                  filter: "brightness(1.5) contrast(1.2)",
                }
              : {}
          }
        >
          {/* 敌人身体 */}
          <div 
            className={cn(
              "w-24 h-36 bg-gradient-to-b from-sonic-purple/80 to-slate-900 rounded-t-full rounded-b-2xl shadow-2xl transition-all duration-300 relative overflow-hidden",
              currentIntention.intentType === "DEFEND" && "shadow-[0_0_50px_rgba(59,130,246,0.8)]",
              (currentIntention.intentType === "BUFF" || currentIntention.intentType === "DEBUFF") && "shadow-[0_0_50px_rgba(168,85,247,0.8)]",
              currentIntention.intentType === "ATTACK" && isEnemyCharging && "shadow-[0_0_40px_rgba(239,68,68,0.7)]"
            )}
          >
            {/* 防御护盾效果 */}
            {currentIntention.intentType === "DEFEND" && (
              <div className="absolute inset-0 bg-blue-500/20 animate-pulse rounded-t-full rounded-b-2xl" />
            )}
            {/* 强化/施法效果 */}
            {(currentIntention.intentType === "BUFF" || currentIntention.intentType === "DEBUFF") && (
              <div className="absolute inset-0 bg-purple-500/30 animate-pulse rounded-t-full rounded-b-2xl" />
            )}
            {/* 攻击效果 */}
            {currentIntention.intentType === "ATTACK" && isEnemyCharging && (
              <div className="absolute inset-0 bg-red-500/20 animate-pulse rounded-t-full rounded-b-2xl" />
            )}
            
            {/* 眼睛 */}
            <div className="absolute top-8 left-1/2 -translate-x-1/2 flex gap-3 z-10">
              <div 
                className={cn(
                  "w-4 h-4 rounded-full shadow-lg transition-all duration-200",
                  currentIntention.intentType === "ATTACK" 
                    ? "bg-danger-red animate-pulse shadow-[0_0_15px_rgba(239,68,68,1)] scale-125"
                    : currentIntention.intentType === "DEFEND"
                    ? "bg-blue-400 animate-pulse shadow-[0_0_15px_rgba(59,130,246,1)]"
                    : "bg-danger-red animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.8)]"
                )} 
              />
              <div 
                className={cn(
                  "w-4 h-4 rounded-full shadow-lg transition-all duration-200",
                  currentIntention.intentType === "ATTACK" 
                    ? "bg-danger-red animate-pulse shadow-[0_0_15px_rgba(239,68,68,1)] scale-125"
                    : currentIntention.intentType === "DEFEND"
                    ? "bg-blue-400 animate-pulse shadow-[0_0_15px_rgba(59,130,246,1)]"
                    : "bg-danger-red animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.8)]"
                )}
                style={{ animationDelay: "300ms" }}
              />
            </div>
            
            {/* 嘴巴 - 攻击时张开 */}
            {currentIntention.intentType === "ATTACK" && isEnemyCharging && (
              <div className="absolute top-20 left-1/2 -translate-x-1/2 w-8 h-6 bg-red-900 rounded-b-full border-2 border-red-500 shadow-lg">
                <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-1">
                  <div className="w-1.5 h-2 bg-white rounded-t-sm" />
                  <div className="w-1.5 h-2 bg-white rounded-t-sm" />
                </div>
              </div>
            )}
          </div>
          
          {/* 敌人状态面板 - 使用通用的 EntityStatusPanel */}
          <div className="absolute -bottom-44 left-[35%]">
            <EntityStatusPanel 
              entity={enemyState} 
              isEnemy={true}
              intentType={currentIntention.intentType}
              intentValue={currentIntention.value}
            />
          </div>
        </motion.div>
      </div>

      {/* 声波特效 */}
      <AnimatePresence>
        {showSonicWave && (
          <motion.div
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-40 pointer-events-none"
            initial={{ x: -200, opacity: 0, scale: 0.5 }}
            animate={{ x: 200, opacity: [0, 1, 0], scale: [0.5, 1.5, 0.5] }}
            transition={{ duration: 0.4 }}
          >
            <div className="w-32 h-8 bg-gradient-to-r from-transparent via-sonic-purple to-transparent rounded-full blur-sm" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* 打牌图标效果 */}
      <AnimatePresence>
        {showCardPlayEffect.show && (
          <CardPlayEffect
            type={showCardPlayEffect.type}
            onComplete={() => setShowCardPlayEffect({ show: false, type: "attack" })}
          />
        )}
      </AnimatePresence>

      {/* AI裁判区 - 左侧边抽屉式 */}
      <div className="fixed left-4 top-[30%] z-30">
        <div className="group">
          {/* 收起状态 - 只显示图标 */}
          <div className="bg-black/70 backdrop-blur-md p-3 rounded-xl border border-sonic-purple/30 cursor-pointer hover:border-sonic-purple/60 transition-all">
            <BookOpen className="w-5 h-5 text-sonic-purple" />
          </div>
          
          {/* 展开状态 - 显示完整面板 */}
          <div className="absolute left-full top-0 ml-2 hidden group-hover:block">
            <div className="bg-black/80 backdrop-blur-md p-4 rounded-xl border border-sonic-purple/30 w-64 shadow-2xl">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-10 h-10 bg-sonic-purple rounded-full flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-white" />
                </div>
                <span className="font-bold text-lg text-slate-200">AI 裁判</span>
              </div>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {dialogMessages.slice(-4).map(msg => (
                  <div key={msg.id} className="text-sm text-slate-300">
                    {msg.isTyping ? (
                      <span className="animate-pulse">{msg.text}</span>
                    ) : (
                      msg.text
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 中间提示 - 出牌阶段或必须结束回合时显示 */}
      <AnimatePresence>
        {showHint && !gameOver && (
          <motion.div
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[60] pointer-events-none"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.3 }}
          >
            <div className="bg-black/80 backdrop-blur-md px-8 py-4 rounded-xl border border-sonic-purple/40 shadow-2xl shadow-sonic-purple/30">
              <p className="text-xl font-bold text-sonic-purple text-center">
                选择卡牌进行出牌，或点击「结束回合」
              </p>
              <p className="text-sm text-slate-400 text-center mt-1">
                点击卡牌可以选中，再次点击可以取消
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* 体力不够警告提示 */}
      <AnimatePresence>
        {showEnergyWarning && !gameOver && (
          <motion.div
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[70]"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <div className="bg-black/90 backdrop-blur-md px-8 py-5 rounded-xl border border-danger-red/60 shadow-2xl shadow-danger-red/40">
              <p className="text-xl font-bold text-danger-red text-center">
                ⚠️ 体力不足！
              </p>
              <p className="text-sm text-slate-300 text-center mt-2">
                请选择其他卡牌或点击「结束回合」
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* 倒计时强制结束警告提示 */}
      <AnimatePresence>
        {showTimeoutWarning && !gameOver && (
          <motion.div
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[70]"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <div className="bg-black/90 backdrop-blur-md px-8 py-5 rounded-xl border border-sonic-purple/60 shadow-2xl shadow-sonic-purple/40">
              <p className="text-xl font-bold text-sonic-purple text-center">
                ⏰ 时间到！
              </p>
              <p className="text-sm text-slate-300 text-center mt-2">
                强制结束回合...
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 手牌容器 - 动态扇形布局 */}
      <div className="fixed bottom-[180px] left-1/2 -translate-x-1/2 flex justify-center items-end h-72 z-40">
        <div className="relative flex items-end justify-center -space-x-12" style={{ transformOrigin: "bottom center" }}>
          {hand.map((card, index) => (
            <div
              key={card.uid}
              className="relative"
              style={{ transformOrigin: "bottom center" }}
            >
              <HandCard
                card={card}
                index={index}
                total={hand.length}
                isSelected={selectedCardUid === card.uid}
                onSelect={handleCardSelect}
                canPlay={card.cost <= playerAp && !isProcessing}
                pollutionLevel={pollutionLevel}
              />
            </div>
          ))}
        </div>
      </div>

      {/* 底部中控台 - 时间进度条在最底部，按钮悬浮在手牌区右上方 */}
      <div className="fixed bottom-0 left-0 right-0 z-50">
        {/* 时间进度条 - 平铺吸附在屏幕最底部 */}
        <div className="h-12 bg-black/60 backdrop-blur-sm border-t border-slate-800">
          <div className="container mx-auto px-4 h-full flex items-center">
            <div className="flex-1 max-w-2xl mx-auto">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-slate-300">回合时间</span>
                <span className={cn(
                  "text-xs font-bold",
                  timeLeft > 10 ? "text-sonic-purple" : "text-danger-red animate-pulse"
                )}>
                  {timeLeft}秒
                </span>
              </div>
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <motion.div
                  className={cn(
                    "h-full transition-all",
                    timeLeft > 10 ? "bg-gradient-to-r from-sonic-purple to-sonic-purple/70" : "bg-gradient-to-r from-danger-red to-danger-red/70"
                  )}
                  initial={{ width: "100%" }}
                  animate={{ width: `${(timeLeft / 30) * 100}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>
          </div>
        </div>
        
        {/* 操作按钮 - 悬浮在手牌区右上方 */}
        <div className="fixed right-8 bottom-32 z-50 flex flex-col gap-3">
          {/* 使用卡牌按钮 */}
          <AnimatePresence>
            {selectedCardUid && !gameOver && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: 20 }}
                onClick={handlePlayCard}
                disabled={(() => {
                  const card = hand.find(c => c.uid === selectedCardUid);
                  return !card || card.cost > playerAp || isProcessing;
                })()}
                className="px-12 py-6 text-2xl font-extrabold tracking-widest bg-purple-600 hover:bg-purple-500 text-white rounded-xl shadow-[0_0_25px_rgba(147,51,234,0.7)] hover:shadow-[0_0_35px_rgba(147,51,234,0.9)] transition-all transform hover:scale-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                使用卡牌
              </motion.button>
            )}
          </AnimatePresence>
          
          {/* 结束回合按钮 */}
          <button
            onClick={handleEndTurn}
            disabled={isProcessing || gameOver}
            className="px-10 py-4 text-xl font-extrabold tracking-widest bg-sonic-purple hover:bg-sonic-purple/90 text-white rounded-xl shadow-[0_0_20px_rgba(139,92,246,0.6)] hover:shadow-[0_0_30px_rgba(139,92,246,0.8)] transition-all transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            结束回合
          </button>
        </div>
      </div>

      {/* 游戏结束弹窗 */}
      <AnimatePresence>
        {gameOver && (
          <motion.div
            className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-black/95 backdrop-blur-xl p-12 rounded-2xl border-2 border-sonic-purple/50 shadow-2xl text-center max-w-md"
              initial={{ scale: 0.8, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
            >
              <motion.div
                className="text-6xl font-black mb-6"
                style={{
                  color: gameResult === 'victory' ? '#22c55e' : '#ef4444',
                  textShadow: `0 0 30px ${gameResult === 'victory' ? 'rgba(34,197,94,0.6)' : 'rgba(239,68,68,0.6)'}`
                }}
                initial={{ scale: 0.5 }}
                animate={{ scale: 1.2 }}
                transition={{ type: "spring", delay: 0.2 }}
              >
                {gameResult === 'victory' ? '胜利！' : '败北...'}
              </motion.div>
              
              <p className="text-slate-300 mb-8 text-lg">
                {gameResult === 'victory' 
                  ? '你成功净化了这只畸变体！' 
                  : '你被旧日回音吞噬了...'}
              </p>
              
              <div className="flex gap-4 justify-center">
                <Button
                  onClick={handleRestart}
                  className="px-8 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg shadow-lg transition-all hover:scale-105"
                >
                  重新挑战
                </Button>
                <Button
                  onClick={() => router.push('/')}
                  className="px-8 py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-lg shadow-lg transition-all hover:scale-105"
                >
                  返回主菜单
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 退出确认弹窗 */}
      <AnimatePresence>
        {showExitConfirm && (
          <motion.div
            className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="bg-black/95 backdrop-blur-xl p-8 rounded-2xl border border-slate-700 shadow-2xl">
              <h3 className="text-xl font-bold text-slate-200 mb-4">确认退出？</h3>
              <p className="text-slate-400 mb-6">退出战斗后，当前进度将不会保存。</p>
              <div className="flex gap-4 justify-end">
                <Button
                  onClick={() => setShowExitConfirm(false)}
                  className="bg-slate-700 hover:bg-slate-600"
                >
                  继续战斗
                </Button>
                <Button
                  onClick={() => router.push('/')}
                  className="bg-danger-red hover:bg-danger-red/90"
                >
                  确认退出
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
