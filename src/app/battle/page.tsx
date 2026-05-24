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
  MessageSquare,
  Send,
  Trash2,
} from "lucide-react";
import { Card, CardType, CardTarget, INITIAL_HAND_CARDS, zhongLvCards } from "@/lib/cards";
import { getPollutionLevel, pollutionLevels } from "@/lib/game-data";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card as UICard, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useBGM } from "@/hooks/useBGM";
import { useSoundEffects } from "@/hooks/useSoundEffects";

// 带唯一实例 ID 的卡牌类型
interface CardWithUid extends Card {
  uid: string;
}

// 全局常量
const MAX_HAND_SIZE = 6; // 手牌上限严格限制为 6 张
const DRAW_PER_TURN = 2; // 每回合固定抽取的张数

// 敌人意图类型枚举
type IntentType = "ATTACK" | "DEFEND" | "BUFF" | "DEBUFF";

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
      case "SONIC_BOOM": return "text-purple-500 bg-purple-500/20 border-purple-500/50";
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

// 伤害数字组件 - 简化版，在实体内部渲染
const DamageNumber = ({ 
  amount, 
  type, 
  index = 0
}: { 
  amount: number; 
  type: 'HP' | 'ARMOR'; 
  index?: number;
}) => {
  const color = type === 'ARMOR' ? "text-armor-blue" : "text-danger-red";
  const verticalOffset = index * 35;
  
  return (
    <motion.div
      className={cn(
        "absolute font-black text-4xl drop-shadow-lg pointer-events-none z-50 flex items-center gap-2",
        color
      )}
      style={{ top: verticalOffset, left: "50%", transform: "translateX(-50%)" }}
      initial={{ opacity: 1, y: 0, scale: 1 }}
      animate={{ opacity: 0, y: -60, scale: 1.3 }}
      transition={{ duration: 1, ease: "easeOut", delay: index * 0.1 }}
    >
      {type === 'ARMOR' && (
        <span className="text-2xl">🛡️</span>
      )}
      -{amount}
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
      default: return "from-card-darker to-slate-80";
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

// 全局飘字ID计数器
let popupIdCounter = 0;

// 独立的浮动文本生成器函数
const createAddFloatingText = (setFloatingNumbers: React.Dispatch<React.SetStateAction<Array<{ id: string; amount: number; type: 'HP' | 'ARMOR'; target: 'PLAYER' | 'ENEMY' }>>>) => {
  return (target: 'PLAYER' | 'ENEMY', amount: number, type: 'HP' | 'ARMOR') => {
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

export default function BattleArena() {
  // 播放单人模式背景音乐
  useBGM("/sounds/bgm_single.mp3");
  const { 
    playNormalAttack, 
    playFreezeAbility, 
    playShieldBlock, 
    playRealAttack, 
    playEeeee, 
    playVictory, 
    playFail 
  } = useSoundEffects();
  
  // 用于避免重复播放游戏结束音效
  const hasPlayedEndSoundRef = useRef(false);

  // ========== AI裁判对话框状态 ==========
  const [showAgentDialog, setShowAgentDialog] = useState(false);
  const [agentMessages, setAgentMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [agentInput, setAgentInput] = useState('');
  const [isAgentLoading, setIsAgentLoading] = useState(false);
  const agentScrollRef = useRef<HTMLDivElement>(null);
  const agentAbortRef = useRef<AbortController | null>(null);

  // ========== AI裁判发送消息功能 ==========
  const sendAgentMessage = async (text: string) => {
    if (!text.trim() || isAgentLoading) return;

    const userMessage = { role: 'user' as const, content: text.trim() };
    const newMessages = [...agentMessages, userMessage];
    setAgentMessages(newMessages);
    setAgentInput('');
    setIsAgentLoading(true);

    const assistantMessage = { role: 'assistant' as const, content: '' };
    setAgentMessages([...newMessages, assistantMessage]);

    const abortController = new AbortController();
    agentAbortRef.current = abortController;

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
                setAgentMessages(prev => {
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
        setAgentMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: 'assistant', content: '连接异常，请重新尝试。' };
          return updated;
        });
      }
    } finally {
      setIsAgentLoading(false);
      agentAbortRef.current = null;
      setTimeout(() => {
        agentScrollRef.current?.scrollTo({ top: agentScrollRef.current.scrollHeight, behavior: 'smooth' });
      }, 100);
    }
  };

  const clearAgentChat = () => {
    if (agentAbortRef.current) agentAbortRef.current.abort();
    setAgentMessages([]);
    setIsAgentLoading(false);
  };

  const handleAgentKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendAgentMessage(agentInput);
    }
  };

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
  // 测试牌组：包含所有新添加的卡牌类型（和重新挑战时一致）
  const testDeck: Card[] = [
    // 基础牌（保持适量）
    zhongLvCards[0],  // 重频打击
    zhongLvCards[1],  // 重频打击
    zhongLvCards[4],  // 声学壁垒
    zhongLvCards[5],  // 声学壁垒
    zhongLvCards[8],  // 稳频调谐
    zhongLvCards[9],  // 余音震击
    
    // 低频堡垒流技能牌
    zhongLvCards[10], // 共振壁垒
    zhongLvCards[11], // 谐波叠加
    zhongLvCards[12], // 次声崩塌
    
    // 过载冲击流技能牌
    zhongLvCards[13], // 过载轰鸣
    zhongLvCards[14], // 反馈回路
    zhongLvCards[15], // 断弦极限
    
    // 全部能力牌
    zhongLvCards[16], // 频率锚定
    zhongLvCards[17], // 低频共振
    zhongLvCards[18], // 痛觉回响
    zhongLvCards[19], // 终末定音
    
    // 再补充一些基础牌保证卡组大小
    zhongLvCards[0],  // 重频打击
    zhongLvCards[1],  // 重频打击
    zhongLvCards[4],  // 声学壁垒
    zhongLvCards[5],  // 声学壁垒
  ];
  
  // 初始牌库 = 完整牌库 - 初始手牌
  const initialDeck = testDeck.filter(card => !INITIAL_HAND_CARDS.includes(card));
  
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
  const [isUsingAbility, setIsUsingAbility] = useState(false);
  const [isEnemyHit, setIsEnemyHit] = useState(false);
  const [isPlayerHit, setIsPlayerHit] = useState(false);
  const [isEnemyCharging, setIsEnemyCharging] = useState(false);
  const [showSonicWave, setShowSonicWave] = useState(false);
  const [showRedFlash, setShowRedFlash] = useState(false);
  const [showCardPlayEffect, setShowCardPlayEffect] = useState<{ show: boolean; type: "attack" | "skill" }>({ show: false, type: "attack" });
  
  // 飘字状态 - 单一数据源，统一管理所有飘字
  type FloatingNumber = { id: string; amount: number; type: 'HP' | 'ARMOR'; target: 'PLAYER' | 'ENEMY' };
  const [floatingNumbers, setFloatingNumbers] = useState<FloatingNumber[]>([]);
  
  // 创建独立的浮动文本生成器实例
  const addFloatingText = createAddFloatingText(setFloatingNumbers);
  // 敌人动画状态：idle(待机), attack(攻击), defend(防御), buff(强化), hit(受击)
  const [enemyAnimationState, setEnemyAnimationState] = useState<"idle" | "attack" | "defend" | "buff" | "hit">("idle");
  
  // AI裁判消息
  const [dialogMessages, setDialogMessages] = useState<Array<{ id: number; text: string; isTyping: boolean }>>([]);
  
  // 倒计时状态
  const [timeLeft, setTimeLeft] = useState(30);
  
  // 牌库、弃牌堆和游戏结束状态
  const [deck, setDeck] = useState<CardWithUid[]>(
    addUidsToCards(initialDeck)
  );
  const [discardPile, setDiscardPile] = useState<CardWithUid[]>([]);
  const [gameOver, setGameOver] = useState(false);
  const [gameResult, setGameResult] = useState<'victory' | 'defeat' | null>(null);
  
  // 中间提示状态
  const [showHint, setShowHint] = useState(true);
  const [showEnergyWarning, setShowEnergyWarning] = useState(false);
  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false);
  
  // 新卡牌效果状态
  const [cardsPlayedThisTurn, setCardsPlayedThisTurn] = useState(0);
  const [selfDamageThisTurn, setSelfDamageThisTurn] = useState(0);
  const [activeAbilities, setActiveAbilities] = useState<ActiveAbility[]>([]);
  const [angerBonus, setAngerBonus] = useState(0);
  
  // 谐波叠加效果：本回合是否已激活
  const [harmonicStackActive, setHarmonicStackActive] = useState(false);
  
  // 本回合获得的护甲总数（用于低频共振能力）
  const [armorGainedThisTurn, setArmorGainedThisTurn] = useState(0);
  
  // 反馈回路效果：本回合是否已受到过自伤
  const [hasTakenSelfDamageThisTurn, setHasTakenSelfDamageThisTurn] = useState(false);
  // 反馈回路效果：是否可以免费再打一次
  const [freeSecondAttackAvailable, setFreeSecondAttackAvailable] = useState(false);
  // 断弦极限效果：下一张攻击牌伤害加成
  const [nextAttackDamageBonus, setNextAttackDamageBonus] = useState(0);
  
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
  
  // 监听游戏结束，播放对应音效
  useEffect(() => {
    if (gameOver && gameResult && !hasPlayedEndSoundRef.current) {
      hasPlayedEndSoundRef.current = true;
      if (gameResult === 'victory') {
        playVictory();
      } else {
        playFail();
      }
    }
  }, [gameOver, gameResult, playVictory, playFail]);
  
  // 重置倒计时
  const resetTimer = () => {
    setTimeLeft(30);
  };

  // AI裁判消息辅助函数
  const addJudgeMessage = (text: string, typing: boolean = false) => {
    // 检查是否是重复消息
    setDialogMessages(prev => {
      const lastMessage = prev[prev.length - 1];
      if (lastMessage && lastMessage.text === text) {
        return prev; // 跳过重复消息
      }
      return [...prev, { id: Date.now(), text, isTyping: typing }];
    });
    if (typing) {
      setTimeout(() => {
        setDialogMessages(prev => prev.map(msg => 
          msg.isTyping ? { ...msg, isTyping: false } : msg
        ));
      }, 500);
    }
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

  // 统一的伤害与护甲结算函数 - 彻底重构，单一数据源
  const takeDamage = (target: "player" | "enemy", amount: number, isPiercing: boolean = false) => {
    // 获取当前状态用于计算
    const currentState = target === "player" ? playerState : enemyState;
    
    // 记录受击前的护甲值，用于音效判断
    const armorBeforeHit = isPiercing ? 0 : currentState.armor;
    
    // 第1步：护甲抵御计算
    const targetArmor = armorBeforeHit;
    
    // 第2步：计算穿透护甲后的真实伤害
    const trueDamage = isPiercing ? amount : Math.max(0, amount - targetArmor);
    
    // 第3步：计算消耗的护甲值
    const armorConsumed = isPiercing ? 0 : Math.min(targetArmor, amount);
    
    // 第4步：计算新的护甲值（穿透伤害不消耗护甲）
    const newArmor = isPiercing ? currentState.armor : Math.max(0, targetArmor - amount);
    
    // 第5步：计算新的生命值
    const newHp = Math.max(0, currentState.hp - trueDamage);
    
    // 第6步：处理飘字（使用独立的浮动文本生成器）- 在同一层级执行，不嵌套
    const targetType = target === "player" ? 'PLAYER' : 'ENEMY';
    
    // 如果有护甲消耗，添加ARMOR类型的飘字
    if (armorConsumed > 0) {
      addFloatingText(targetType, armorConsumed, 'ARMOR');
    }
    
    // 如果有真实伤害，添加HP类型的飘字
    if (trueDamage > 0) {
      addFloatingText(targetType, trueDamage, 'HP');
    }
    
    // 第7步：更新状态 - 在同一层级执行，不嵌套
    if (target === "player") {
      setPlayerState(prev => ({ ...prev, hp: newHp, armor: newArmor }));
    } else {
      setEnemyState(prev => ({ ...prev, hp: newHp, armor: newArmor }));
    }
    
    // 第8步：播放伤害音效（只有玩家受伤时才播放）
    if (amount > 0 && target === "player") {
      if (armorBeforeHit >= amount) {
        // 完全抵挡：伤害被护甲全额吸收
        playShieldBlock();
      } else if (armorBeforeHit > 0 && armorBeforeHit < amount) {
        // 破甲重击：击穿护甲并造成生命值伤害
        playRealAttack();
      } else if (armorBeforeHit === 0) {
        // 直接受损：没有护甲，直接承受伤害
        playEeeee();
      }
    }
    
    // 第9步：生死判定 - 在同一层级执行，不嵌套
    const isPlayer = target === "player";
    setTimeout(() => {
      if (newHp <= 0) {
        setGameOver(true);
        setGameResult(isPlayer ? 'defeat' : 'victory');
      }
    }, 100);
  };
  
  // ========== 获得护甲检查点 ==========
  // 专门处理玩家获得护甲的函数，包含触发器
  const gainArmor = (amount: number) => {
    if (amount <= 0) return;
    
    // 1. 先更新玩家护甲
    setPlayerState(prev => ({ ...prev, armor: prev.armor + amount }));
    
    // 2. 更新本回合获得的护甲总数
    setArmorGainedThisTurn(prev => prev + amount);
    
    // 3. 添加AI裁判说明
    addJudgeMessage(`你获得了 ${amount} 点护甲！`);
    
    // 3. ========== "获得护甲"检查点 ==========
    // 遍历持久化能力列表，检查是否有对应的能力需要触发
    activeAbilities.forEach(ability => {
      const config = abilityConfig[ability.id];
      
      // 低频共振：每获得5点护甲时，对随机一个敌人造成3点声波伤害
      if (ability.id === "LOW_FREQUENCY_RESONANCE" && config.armorThreshold && config.damagePerThreshold) {
        const totalArmorGained = armorGainedThisTurn + amount;
        const oldThresholds = Math.floor(armorGainedThisTurn / config.armorThreshold);
        const newThresholds = Math.floor(totalArmorGained / config.armorThreshold);
        
        if (newThresholds > oldThresholds) {
          const timesToTrigger = newThresholds - oldThresholds;
          for (let i = 0; i < timesToTrigger; i++) {
            takeDamage("enemy", config.damagePerThreshold);
          }
        }
      }
    });
  };
  
  // ========== 受到自伤检查点 ==========
  // 专门处理玩家受到自伤的函数，包含触发器
  const takeSelfDamage = (amount: number) => {
    if (amount <= 0) return;
    
    // 1. 先造成自伤
    takeDamage("player", amount);
    
    // 2. 更新本回合自伤累加器
    setSelfDamageThisTurn(prev => prev + amount);
    // 3. 标记本回合已受到过自伤
    setHasTakenSelfDamageThisTurn(true);
    
    // 4. 添加AI裁判说明
    addJudgeMessage(`你受到了 ${amount} 点自伤！`);
    
    // 3. ========== "受到自伤"检查点 ==========
    // 遍历持久化能力列表，检查是否有对应的能力需要触发
    activeAbilities.forEach(ability => {
      const config = abilityConfig[ability.id];
      
      // 痛觉回响：每受到1点来自自身卡牌的伤害，下一张攻击牌伤害+1（最多叠加至+8）
      if (ability.id === "PAIN_ECHO") {
        const bonusPerPoint = config.selfDamageBonusPerPoint!;
        const maxBonus = config.maxBonus!;
        setAngerBonus(prev => Math.min(maxBonus, prev + amount * bonusPerPoint));
      }
    });
  };

  // 回合开始逻辑
  const startTurn = () => {
    // 恢复玩家的能量值至满状态
    setPlayerAp(playerMaxAp);
    // 隐藏警告提示
    setShowEnergyWarning(false);
    setShowTimeoutWarning(false);
    
    // 重置本回合累加器
    setCardsPlayedThisTurn(0);
    setSelfDamageThisTurn(0);
    setArmorGainedThisTurn(0);
    setHasTakenSelfDamageThisTurn(false);
    setFreeSecondAttackAvailable(false);
    setNextAttackDamageBonus(0);
    setHarmonicStackActive(false);
    
    // ========== "回合开始"检查点 ==========
    // 遍历持久化能力列表，如果有对应的能力，则自动执行后台操作
    activeAbilities.forEach(ability => {
      const config = abilityConfig[ability.id];
      
      // 频率锚定：每回合开始时获得3点护甲
      if (ability.id === "FREQUENCY_ANCHOR" && config.armorPerTurn) {
        gainArmor(config.armorPerTurn);
      }
    });
    
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
    // ========== 测试牌组：包含所有新添加的卡牌类型 ==========
    const testDeck: Card[] = [
      // 基础牌（保持适量）
      zhongLvCards[0],  // 重频打击
      zhongLvCards[1],  // 重频打击
      zhongLvCards[4],  // 声学壁垒
      zhongLvCards[5],  // 声学壁垒
      zhongLvCards[8],  // 稳频调谐
      zhongLvCards[9],  // 余音震击
      
      // 低频堡垒流技能牌
      zhongLvCards[10], // 共振壁垒
      zhongLvCards[11], // 谐波叠加
      zhongLvCards[12], // 次声崩塌
      
      // 过载冲击流技能牌
      zhongLvCards[13], // 过载轰鸣
      zhongLvCards[14], // 反馈回路
      zhongLvCards[15], // 断弦极限
      
      // 全部能力牌
      zhongLvCards[16], // 频率锚定
      zhongLvCards[17], // 低频共振
      zhongLvCards[18], // 痛觉回响
      zhongLvCards[19], // 终末定音
      
      // 再补充一些基础牌保证卡组大小
      zhongLvCards[0],  // 重频打击
      zhongLvCards[1],  // 重频打击
      zhongLvCards[4],  // 声学壁垒
      zhongLvCards[5],  // 声学壁垒
    ];
    
    setDeck(addUidsToCards(testDeck));
    setDiscardPile([]);
    setGameOver(false);
    setGameResult(null);
    setTimeLeft(30);
    setDialogMessages([]);
    setFloatingNumbers([]);
    setShowHint(true);
    setShowEnergyWarning(false);
    setShowTimeoutWarning(false);
    
    // 重置永久能力
    setActiveAbilities([]);
    // 重置本回合累加器
    setCardsPlayedThisTurn(0);
    setSelfDamageThisTurn(0);
    setArmorGainedThisTurn(0);
    setHasTakenSelfDamageThisTurn(false);
    setFreeSecondAttackAvailable(false);
    setNextAttackDamageBonus(0);
    setHarmonicStackActive(false);
    setAngerBonus(0);
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
    
    // 增加本回合出牌计数
    setCardsPlayedThisTurn(prev => prev + 1);
    
    // 反馈回路：如果可以免费再打一次，则不消耗行动力
    if (freeSecondAttackAvailable) {
      // 使用免费再打一次，不消耗行动力
      setFreeSecondAttackAvailable(false);
    } else {
      // 正常消耗行动力
      setPlayerAp(prev => prev - selectedCard.cost);
    }
    resetTimer();
    
    // 显示打牌图标效果
    const effectType = selectedCard.type === "attack" ? "attack" : "skill";
    setShowCardPlayEffect({ show: true, type: effectType });
    
    // 播放出牌音效
    if (selectedCard.type === "attack") {
      playNormalAttack();
    } else {
      playFreezeAbility();
    }
    
    // ========== 结构化卡牌效果路由 ==========
    let aiMessage = "";
    let totalDamage = 0;
    let armorGain = 0;
    let selfDamageAmount = selectedCard.selfDamage || 0;
    
    // 统一的伤害计算方法 - 只保留固定数值加成
    const calculateActualDamage = (baseDamage: number, globalPollution: number) => {
      // 获取当前阶段配置
      const phaseConfig = getPollutionLevel(globalPollution);
      
      // 核心机制：只应用阶段固定数值伤害增益 + 愤怒加成 + 断弦极限加成
      let finalDamage = baseDamage + phaseConfig.damageBonus + nextAttackDamageBonus;
      
      // 添加终末定音的低血量伤害加成
      const hasFinalTuning = activeAbilities.find(a => a.id === "FINAL_TUNING");
      if (hasFinalTuning && playerState.hp <= abilityConfig.FINAL_TUNING.lowHpThreshold!) {
        finalDamage += abilityConfig.FINAL_TUNING.lowHpDamageBonus!;
      }
      
      return finalDamage;
    };
    
    // 特殊卡牌逻辑：次声崩塌
    let isInfrasonicCollapse = selectedCard.id === 'zl-fortress-03';
    // 特殊卡牌逻辑：谐波叠加
    let isHarmonicStack = selectedCard.id === 'zl-fortress-02';
    // 特殊卡牌逻辑：共振壁垒
    let isResonanceBulwark = selectedCard.id === 'zl-fortress-01';
    // 特殊卡牌逻辑：反馈回路
    let isFeedbackLoop = selectedCard.id === 'zl-overload-02';
    // 特殊卡牌逻辑：断弦极限
    let isBrokenStringLimit = selectedCard.id === 'zl-overload-03';
    
    let infrasonicDamage = 0;
    let armorLost = 0;
    let baseDamage = 0;
    let finalDamage = 0;
    let phaseConfig = getPollutionLevel(pollutionLevel);
    armorGain = 0;
    let pollutionModifier = 0;
    
    // 共振壁垒：溢出伤害
    let resonanceOverflowDamage = 0;
    let resonanceArmorThreshold = 20;
    
    // 1. 处理特殊卡牌逻辑
    if (isInfrasonicCollapse) {
      // 造成伤害等于你当前护甲值的 50%（向下取整）
      infrasonicDamage = Math.floor(playerState.armor * 0.5);
      // 失去一半护甲（向下取整）
      armorLost = Math.floor(playerState.armor * 0.5);
      
      // 应用阶段加成
      infrasonicDamage += phaseConfig.damageBonus;
      
      aiMessage = `你打出了【${selectedCard.name}】，当前护甲 ${playerState.armor} 点，造成 ${infrasonicDamage} 点伤害，失去 ${armorLost} 点护甲！`;
      totalDamage = infrasonicDamage;
    } else if (isHarmonicStack) {
      // ========== 谐波叠加 ==========
      // 获得3点护甲。你本回合每打出一张牌，再获得2点护甲。
      const baseArmorGain = 3;
      armorGain = baseArmorGain;
      
      // 激活谐波叠加效果
      setHarmonicStackActive(true);
      
      aiMessage = `你使用了【${selectedCard.name}】，获得 ${armorGain} 点护甲！本回合后续每打出一张牌，再获得2点护甲！`;
    } else if (isResonanceBulwark) {
      // ========== 共振壁垒 ==========
      // 获得14点护甲。若本回合你的护甲总量超过20点，对全体敌人造成等同于溢出值的声波伤害。
      const baseArmorGain = 14;
      armorGain = baseArmorGain;
      
      // 计算获得护甲后的总护甲
      const totalArmorAfterGain = playerState.armor + armorGain;
      
      // 检测是否超过阈值
      if (totalArmorAfterGain > resonanceArmorThreshold) {
        resonanceOverflowDamage = totalArmorAfterGain - resonanceArmorThreshold;
      }
      
      const parts: string[] = [];
      parts.push(`获得 ${armorGain} 点护甲`);
      if (resonanceOverflowDamage > 0) {
        parts.push(`护甲溢出 ${resonanceOverflowDamage} 点，转化为群体伤害！`);
      }
      aiMessage = `你使用了【${selectedCard.name}】，${parts.join('，')}！`;
    } else if (isFeedbackLoop) {
      // ========== 反馈回路 ==========
      // 造成4点伤害。若本回合已受到过自身卡牌的伤害，此牌伤害翻倍（8点），并可以不消耗行动力再打出一次（须从手牌中打出第二次，第二次不翻倍）。
      baseDamage = selectedCard.baseDamage || 0;
      
      // 检查是否本回合已受到过自伤
      let damageMultiplier = 1;
      if (hasTakenSelfDamageThisTurn) {
        damageMultiplier = 2;
      }
      
      finalDamage = calculateActualDamage(baseDamage * damageMultiplier, pollutionLevel);
      
      const parts: string[] = [];
      parts.push(`基础伤害 ${baseDamage} 点`);
      if (hasTakenSelfDamageThisTurn) {
        parts.push(`条件满足！伤害翻倍至 ${finalDamage} 点`);
        // 标记可以免费再打一次
        setFreeSecondAttackAvailable(true);
      }
      if (phaseConfig.damageBonus > 0) parts.push(`阶段增益 ${phaseConfig.damageBonus} 点`);
      if (nextAttackDamageBonus > 0) parts.push(`断弦极限加成 ${nextAttackDamageBonus} 点`);
      
      aiMessage = `你打出了【${selectedCard.name}】，${parts.join('，')}！`;
      totalDamage = finalDamage;
      
      // 断弦极限：使用后清零
      if (nextAttackDamageBonus > 0) {
        setNextAttackDamageBonus(0);
      }
    } else if (isBrokenStringLimit) {
      // ========== 断弦极限 ==========
      // 失去10点生命值。获得2点行动力。本回合你打出的下一张攻击牌伤害+10。
      const hpLoss = 10;
      const apGain = 2;
      const damageBonus = 10;
      
      // 1. 失去10点生命值（造成穿透伤害）
      takeDamage("player", hpLoss, true);
      
      // 2. 获得2点行动力
      setPlayerAp(prev => Math.min(playerMaxAp + 2, prev + apGain));
      
      // 3. 设置下一张攻击牌伤害+10
      setNextAttackDamageBonus(damageBonus);
      
      const parts: string[] = [];
      parts.push(`失去 ${hpLoss} 点生命值`);
      parts.push(`获得 ${apGain} 点行动力`);
      parts.push(`下一张攻击牌伤害 +${damageBonus}`);
      
      aiMessage = `你使用了【${selectedCard.name}】，${parts.join('，')}！`;
    } else {
      // 1. 只使用阶段固定数值加成
      baseDamage = selectedCard.baseDamage || 0;
      // 必须且只能使用统一的伤害计算方法
      finalDamage = calculateActualDamage(baseDamage, pollutionLevel);
      
      // 2. 处理护甲获得
      armorGain = selectedCard.baseArmor || 0;
      
      // 3. 强制落实污染度增减 - 使用专门的 pollutionModifier 字段
      pollutionModifier = selectedCard.pollutionModifier || 0;
      
      // 构建AI消息
      if (selectedCard.type === "attack" && finalDamage > 0) {
        const parts: string[] = [];
        parts.push(`基础伤害 ${baseDamage} 点`);
        if (phaseConfig.damageBonus > 0) parts.push(`阶段增益 ${phaseConfig.damageBonus} 点`);
        if (selfDamageAmount > 0) parts.push(`自伤 ${selfDamageAmount} 点`);
        
        aiMessage = `你打出了【${selectedCard.name}】，${parts.join('，')}，总计造成 ${finalDamage} 点伤害！`;
        totalDamage = finalDamage;
      } else if (selectedCard.type === "skill") {
        const parts: string[] = [];
        if (armorGain > 0) parts.push(`获得 ${armorGain} 点护甲`);
        if (pollutionModifier < 0) parts.push(`降低 ${Math.abs(pollutionModifier)} 点污染度`);
        if (pollutionModifier > 0) parts.push(`增加 ${pollutionModifier} 点污染度`);
        if (selfDamageAmount > 0) parts.push(`自伤 ${selfDamageAmount} 点`);
        aiMessage = `你使用了【${selectedCard.name}】，${parts.join('，')}！`;
      } else if (selectedCard.type === "ability") {
        // 能力牌：直接激活永久效果
        aiMessage = `你激活了【${selectedCard.name}】，能力将永久生效！`;
      } else {
        aiMessage = `你使用了【${selectedCard.name}】！`;
      }
    }
    
    // ========== 谐波叠加：后续打出卡牌时加护甲 ==========
    // 如果谐波叠加已激活，且当前打出的不是谐波叠加本身，则获得2点护甲
    let harmonicBonusArmor = 0;
    if (harmonicStackActive && !isHarmonicStack) {
      harmonicBonusArmor = 2;
      
      // 添加AI裁判说明
      aiMessage += `【谐波叠加】触发！额外获得 ${harmonicBonusArmor} 点护甲！`;
    }
    
    // AI裁判台词
    const msg = { id: Date.now(), text: aiMessage, isTyping: true };
    setDialogMessages(prev => [...prev, msg]);
    
    // 4. 处理声爆效果
    const sonicBoomStacks = selectedCard.sonicBoom || 0;
    if (sonicBoomStacks > 0 && selectedCard.type === "attack") {
      setEnemyState(prev => {
        const existingSonicBoom = prev.debuffs.find(d => d.type === "SONIC_BOOM");
        const newDebuffs = prev.debuffs.filter(d => d.type !== "SONIC_BOOM");
        return {
          ...prev,
          debuffs: [
            ...newDebuffs,
            { type: "SONIC_BOOM", stacks: (existingSonicBoom?.stacks || 0) + sonicBoomStacks }
          ]
        };
      });
    }
    
    // 根据卡牌类型触发动画和效果
    if (selectedCard.type === "attack" && totalDamage > 0) {
      setIsAttacking(true);
      setTimeout(() => setShowSonicWave(true), 150);
      setTimeout(() => setIsEnemyHit(true), 300);
      
      // 伤害数字 - 现在由takeDamage函数处理，不需要再单独设置
      setTimeout(() => {
        // 添加愤怒加成到最终伤害
        const finalDamageWithBonus = totalDamage + angerBonus;
        
        // 必须且只能将经过加成后的 finalDamage 传入 takeDamage 扣血函数中
        takeDamage("enemy", finalDamageWithBonus);
        
        // 攻击结束后清零愤怒加成
        setAngerBonus(0);
        
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
        // 应用护甲效果 - 使用新的gainArmor函数，包含"获得护甲"检查点
        if (armorGain > 0) {
          gainArmor(armorGain);
        }
        
        // 强制落实污染度增减 - 必须立刻触发UI更新
        if (pollutionModifier !== 0) {
          setPollutionLevel(prev => Math.min(100, Math.max(0, prev + pollutionModifier)));
        }
        
        setTimeout(() => setIsDefending(false), 600);
        setTimeout(() => {
          setDialogMessages(prev => prev.map(m => m.id === msg.id ? { ...m, isTyping: false } : m));
        }, 800);
        
        // ========== 共振壁垒：溢出伤害处理 ==========
        if (isResonanceBulwark && resonanceOverflowDamage > 0) {
          setTimeout(() => {
            // 对敌人造成溢出伤害 - 飘字由takeDamage函数处理
            takeDamage("enemy", resonanceOverflowDamage);
          }, 400);
        }
      }, 300);
    }
    
    // ========== 处理自伤 ==========
    if (selfDamageAmount > 0) {
      takeSelfDamage(selfDamageAmount);
    }
    
    // ========== 处理能力牌激活 ==========
    let isAbilityCard = selectedCard.type === "ability";
    if (isAbilityCard) {
      setIsUsingAbility(true);
      
      // 根据卡牌id映射到AbilityType
      let abilityType: AbilityType | null = null;
      
      switch (selectedCard.id) {
        case "zl-ability-01":
          abilityType = "FREQUENCY_ANCHOR";
          break;
        case "zl-ability-02":
          abilityType = "LOW_FREQUENCY_RESONANCE";
          break;
        case "zl-ability-03":
          abilityType = "PAIN_ECHO";
          break;
        case "zl-ability-04":
          abilityType = "FINAL_TUNING";
          break;
      }
      
      // 激活能力（如果还没有激活过）
      if (abilityType && !activeAbilities.find(a => a.id === abilityType)) {
        setActiveAbilities(prev => [...prev, { id: abilityType, cardId: selectedCard.id }]);
      }
      
      setTimeout(() => setIsUsingAbility(false), 600);
    }
    
    // ========== 应用谐波叠加护甲 ==========
    // 无论什么类型的牌，只要谐波叠加激活就加护甲
    if (harmonicBonusArmor > 0) {
      gainArmor(harmonicBonusArmor);
    }
    
    // 移除打出的手牌，并加入弃牌堆（除非是消耗牌或能力牌）
    // 能力牌永远被消耗，不进入弃牌堆
    if (!selectedCard.exhaust && !isAbilityCard) {
      setDiscardPile(prev => [...prev, selectedCard]);
    }
    setHand(prev => prev.filter(c => c.uid !== selectedCardUid));
    setSelectedCardUid(null);
    
    // 次声崩塌：失去一半护甲
    if (isInfrasonicCollapse && armorLost > 0) {
      setPlayerState(prev => ({ ...prev, armor: Math.max(0, prev.armor - armorLost) }));
    }
    
    // 添加AI裁判解释
    if (aiMessage) {
      addJudgeMessage(aiMessage);
    }
    
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
      
      // 结算声爆伤害（每层2点）
      const sonicBoomEffect = enemyState.debuffs.find(d => d.type === "SONIC_BOOM");
      if (sonicBoomEffect && sonicBoomEffect.stacks > 0) {
        const sonicBoomDamage = sonicBoomEffect.stacks * 2;
        takeDamage("enemy", sonicBoomDamage);
        // 清除声爆状态
        setEnemyState(prev => ({
          ...prev,
          debuffs: prev.debuffs.filter(d => d.type !== "SONIC_BOOM")
        }));
        // 添加声爆伤害消息
        const sonicBoomMsg = { id: Date.now() + 100, text: `声爆效果触发！造成 ${sonicBoomDamage} 点伤害！`, isTyping: true };
        setDialogMessages(prev => [...prev, sonicBoomMsg]);
      }
      
      // 根据敌人意图类型触发对应的动画
      let actionText = "";
      let actionMsgText = "";
      
      switch (currentIntention.intentType) {
        case "ATTACK":
          actionText = "嘶鸣游荡者正在蓄力...";
          actionMsgText = `嘶鸣游荡者向你发起了猛烈冲撞！造成 ${currentIntention.value} 点伤害！`;
          setEnemyAnimationState("attack");
          break;
        case "DEFEND":
          actionText = "嘶鸣游荡者正在构建声学护盾...";
          actionMsgText = `嘶鸣游荡者进入防御姿态，获得了 ${currentIntention.value} 点护盾！`;
          setEnemyAnimationState("defend");
          break;
        case "BUFF":
        case "DEBUFF":
          actionText = "嘶鸣游荡者正在积蓄污染能量...";
          actionMsgText = `嘶鸣游荡者的能量在涌动！污染度增加了 ${currentIntention.value}！`;
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
          // 使用统一的伤害结算函数 - 飘字由takeDamage函数处理
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
      
      // ========== "回合结束"检查点 ==========
      // 终末定音：当生命值降至20以下时，每回合结束受到2点穿透伤害
      const hasFinalTuning = activeAbilities.find(a => a.id === "FINAL_TUNING");
      if (hasFinalTuning && playerState.hp <= abilityConfig.FINAL_TUNING.lowHpThreshold!) {
        takeDamage("player", abilityConfig.FINAL_TUNING.lowHpDotDamage!, true);
        // 添加终末定音伤害消息
        const finalTuningMsg = { id: Date.now() + 200, text: `终末定音触发！受到 ${abilityConfig.FINAL_TUNING.lowHpDotDamage} 点穿透伤害！`, isTyping: true };
        setDialogMessages(prev => [...prev, finalTuningMsg]);
      }
      
      // 结束回合：将手牌加入弃牌堆（除了保留牌）
      const cardsToDiscard = hand.filter(c => !c.retain);
      const cardsToKeep = hand.filter(c => c.retain);
      setDiscardPile(prev => [...prev, ...cardsToDiscard]);
      setHand(cardsToKeep);
      
      // 重置回合
      setTurn(prev => prev + 1);
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



      {/* 玩家角色 - 固定在左侧底部 */}
      <div className="fixed bottom-1/4 left-10 z-30">
        <motion.div
          className="relative"
          animate={isPlayerHit ? { x: [0, -10, 10, -10, 10, 0] } : isUsingAbility ? {
            scale: [1, 1.1, 1],
            transition: { duration: 0.5 }
          } : {}}
          transition={{ duration: 0.4 }}
        >
          {/* 玩家飘字 - 在角色上方 */}
          <div className="absolute -top-20 left-0 right-0 flex justify-center">
            {floatingNumbers
              .filter(fn => fn.target === 'PLAYER')
              .map((fn, index) => (
                <DamageNumber
                  key={fn.id}
                  amount={fn.amount}
                  type={fn.type}
                  index={index}
                />
              ))}
          </div>
          
          {/* 能力牌发光效果 */}
          <AnimatePresence>
            {isUsingAbility && (
              <motion.div
                className="absolute inset-0 -m-12"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1.5, opacity: [0, 0.6, 0] }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.6 }}
              >
                <div className="w-full h-full rounded-full border-4 border-sonic-purple/60 shadow-[0_0_40px_rgba(139,92,246,0.8)]" />
              </motion.div>
            )}
          </AnimatePresence>
          {/* 人物身体 */}
          <div className="w-20 h-32 bg-gradient-to-b from-slate-700 to-slate-900 rounded-t-3xl rounded-b-lg shadow-2xl relative">
            {/* 头部 */}
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 w-12 h-12 bg-gradient-to-b from-slate-600 to-slate-800 rounded-full relative">
              {/* 眼睛 */}
              <div className="absolute top-4 left-2 w-2 h-2 bg-white rounded-full shadow-[0_0_4px_rgba(255,255,255,0.8)]" />
              <div className="absolute top-4 right-2 w-2 h-2 bg-white rounded-full shadow-[0_0_4px_rgba(255,255,255,0.8)]" />
            </div>
          </div>
          
          {/* 武器 - 声波巨剑 */}
          <motion.div
            className="absolute -right-6 top-4 origin-left"
            animate={isAttacking ? {
              rotate: [0, -30, 45, 0],
              transition: { duration: 0.4 }
            } : isDefending ? {
              rotate: [0, 15, 0],
              transition: { duration: 0.3 }
            } : {}}
          >
            {/* 剑的形状 */}
            <div className="relative">
              {/* 剑身 */}
              <div className="w-3 h-28 bg-gradient-to-r from-sonic-purple to-sonic-purple/50 shadow-[0_0_15px_rgba(139,92,246,0.8)]" />
              {/* 剑尖 */}
              <div className="absolute -top-2 left-0 border-l-[6px] border-r-[6px] border-b-[12px] border-l-transparent border-r-transparent border-b-sonic-purple" />
            </div>
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
          <div className="mt-2 w-48">
            <StatBox 
              name="AP" 
              current={playerAp} 
              max={playerMaxAp} 
              color="#8b5cf6" 
              icon={Zap}
            />
          </div>
          
          {/* 永久属性加成显示 */}
          {activeAbilities.length > 0 && (
            <div className="mt-3 w-64 group relative">
              <div className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">永久能力</div>
              
              {/* 紧凑显示格 */}
              <div className="flex items-center gap-2 bg-slate-800/60 px-3 py-2 rounded-lg border border-slate-700/50 cursor-default">
                <div className="flex -space-x-1">
                  {(() => {
                    // 统计能力叠加次数
                    const abilityCounts: Record<string, number> = {};
                    activeAbilities.forEach(a => {
                      abilityCounts[a.id] = (abilityCounts[a.id] || 0) + 1;
                    });
                    
                    return Object.entries(abilityCounts).map(([id, count]) => {
                      let iconColor = "";
                      switch (id as AbilityType) {
                        case "FREQUENCY_ANCHOR": iconColor = "bg-armor-blue"; break;
                        case "LOW_FREQUENCY_RESONANCE": iconColor = "bg-sonic-purple"; break;
                        case "PAIN_ECHO": iconColor = "bg-danger-red"; break;
                        case "FINAL_TUNING": iconColor = "bg-gold"; break;
                      }
                      
                      return (
                        <div key={id} className="relative">
                          <div className={cn("w-3 h-3 rounded-full border border-slate-600", iconColor)} />
                          {count > 1 && (
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-slate-900 rounded-full flex items-center justify-center">
                              <span className="text-[8px] font-bold text-white">x{count}</span>
                            </div>
                          )}
                        </div>
                      );
                    });
                  })()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-slate-200">
                    {activeAbilities.length} 个能力
                  </div>
                </div>
                <div className="text-slate-500 text-xs">
                  ▼
                </div>
              </div>
              
              {/* 鼠标悬停时的详细tooltip */}
              <div className="absolute bottom-full left-0 mb-2 w-72 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                <div className="bg-slate-900/95 backdrop-blur-sm rounded-xl border border-slate-700/70 p-3 shadow-2xl">
                  <div className="space-y-2">
                    {(() => {
                      // 统计能力叠加次数
                      const abilityCounts: Record<string, number> = {};
                      activeAbilities.forEach(a => {
                        abilityCounts[a.id] = (abilityCounts[a.id] || 0) + 1;
                      });
                      
                      return Object.entries(abilityCounts).map(([id, count]) => {
                        const config = abilityConfig[id as AbilityType];
                        let displayName = "";
                        let displayDesc = "";
                        let iconColor = "";
                        
                        switch (id as AbilityType) {
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
                        
                        return (
                          <div 
                            key={id}
                            className="flex items-center gap-2 bg-slate-800/40 px-3 py-2 rounded-lg border border-slate-700/30"
                          >
                            <div className={cn("w-2 h-2 rounded-full bg-current", iconColor)} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-200 truncate">{displayName}</span>
                                {count > 1 && (
                                  <span className="text-[10px] font-bold text-sonic-purple bg-sonic-purple/10 px-1.5 py-0.5 rounded">
                                    x{count}
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-400 truncate">{displayDesc}</div>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
                {/* 小箭头 */}
                <div className="absolute -bottom-1 left-6 w-2 h-2 bg-slate-900/95 border-r border-b border-slate-700/70 transform rotate-45" />
              </div>
            </div>
          )}
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
          {/* 敌人飘字 - 在角色左上角 */}
          <div className="absolute -top-4 -left-32">
            {floatingNumbers
              .filter(fn => fn.target === 'ENEMY')
              .map((fn, index) => (
                <DamageNumber
                  key={fn.id}
                  amount={fn.amount}
                  type={fn.type}
                  index={index}
                />
              ))}
          </div>
          
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
          <div className="absolute -bottom-44 left-0 -translate-x-20">
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

      {/* ========== AI裁判对话框 ========== */}
      <AnimatePresence>
        {showAgentDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm"
            onClick={() => setShowAgentDialog(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-3xl mx-4"
            >
              <UICard className="border-sonic-purple/20 bg-abyss-light/95">
                <div className="flex items-center justify-between p-4 border-b border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-sonic-purple rounded-full flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="font-bold text-lg text-slate-200">
                        <span className="text-sonic-purple">AI</span> 裁判
                      </h2>
                      <p className="text-xs text-muted-foreground">深渊协奏 · AI裁判助手</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs border-white/10 text-muted-foreground hover:text-foreground"
                      onClick={clearAgentChat}
                    >
                      <Trash2 className="h-3 w-3 mr-1" /> 清空对话
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs border-white/10 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowAgentDialog(false)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                {/* 对话区域 */}
                <CardContent className="p-0">
                  <div
                    ref={agentScrollRef}
                    className="h-[400px] overflow-y-auto p-4 space-y-4"
                  >
                    {agentMessages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-center">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-sonic-purple/10 mb-4">
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
                      agentMessages.map((msg, i) => (
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
                            {msg.role === 'assistant' && msg.content === '' && isAgentLoading && (
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
                        value={agentInput}
                        onChange={(e) => setAgentInput(e.target.value)}
                        onKeyDown={handleAgentKeyDown}
                        placeholder="输入规则问题或战斗场景..."
                        disabled={isAgentLoading}
                        className="bg-abyss border-white/10 text-sm placeholder:text-muted-foreground/40"
                      />
                      <Button
                        onClick={() => sendAgentMessage(agentInput)}
                        disabled={isAgentLoading || !agentInput.trim()}
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
                </CardContent>
              </UICard>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI裁判区 - 鼠标悬停展开，点击打开对话框 */}
      <div 
        className="fixed left-6 top-24 z-30 group"
      >
        {/* 提示图标 - 点击打开对话框 */}
        <div 
          className="w-12 h-12 bg-sonic-purple rounded-full flex items-center justify-center mb-2 shadow-lg group-hover:scale-110 transition-transform cursor-pointer"
          onClick={() => setShowAgentDialog(true)}
        >
          <MessageSquare className="w-6 h-6 text-white" />
        </div>
        
        {/* 展开面板 */}
        <div className="opacity-0 -translate-x-full group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
          <div className="bg-black/85 backdrop-blur-md p-4 rounded-xl border border-sonic-purple/30 w-72 shadow-2xl">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-10 h-10 bg-sonic-purple rounded-full flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-lg text-slate-200">AI 裁判</span>
            </div>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {[...dialogMessages].reverse().slice(0, 6).map(msg => (
                <div key={msg.id} className="text-sm text-slate-300 border-l-2 border-sonic-purple/50 pl-2">
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

      {/* 中间提示 - 出牌阶段或必须结束回合时显示 */}
      <AnimatePresence>
        {showHint && !gameOver && (
          <motion.div
            className="fixed top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-[60] pointer-events-none"
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
        <div className="relative flex items-end justify-center -space-x-6" style={{ transformOrigin: "bottom center" }}>
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
