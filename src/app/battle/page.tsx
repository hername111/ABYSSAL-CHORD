"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart,
  Shield,
  Zap,
  Skull,
  RotateCcw,
  X,
  Sword,
  Shield as ShieldIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, zhongLvCards } from "@/lib/cards";
import { cn } from "@/lib/utils";
import Link from "next/link";

// 简化的敌人行为类型
interface SimpleEnemyBehavior {
  description: string;
  damage?: number;
  armor?: number;
  pollution?: number;
  sonicBlast?: number;
}

// 获取敌人意图的简化函数
function getSimpleEnemyIntention(): SimpleEnemyBehavior {
  const roll = Math.floor(Math.random() * 6) + 1;
  const behaviors: SimpleEnemyBehavior[] = [
    { description: "次声冲撞 - 造成 6 点伤害", damage: 6 },
    { description: "次声冲撞 - 造成 6 点伤害", damage: 6 },
    { description: "撕裂嘶鸣 - 造成 4 点伤害，附加 2 层声爆", damage: 4, sonicBlast: 2 },
    { description: "声波蓄积 - 获得 8 点护甲，污染度 +1", armor: 8, pollution: 1 },
    { description: "共振增幅 - 本回合伤害 +3", damage: 9 },
    { description: "低频感染 - 全体造成 3 点伤害，附加 1 层声爆", damage: 3, sonicBlast: 1 },
  ];
  return behaviors[roll - 1];
}

// 使用真实卡牌数据，选取前 6 张
const INITIAL_HAND_CARDS: Card[] = zhongLvCards.slice(0, 6);

// 污染刻度尺组件
const PollutionScale = ({ current = 0 }: { current: number }) => {
  const getPollutionColor = (value: number) => {
    if (value <= 5) return "from-purify-green to-purify-green/50";
    if (value <= 12) return "from-yellow-500 to-yellow-500/50";
    if (value <= 20) return "from-orange-500 to-orange-500/50";
    if (value <= 28) return "from-danger-red to-danger-red/50";
    return "from-sonic-purple to-sonic-purple/50";
  };

  const getPollutionLevel = (value: number) => {
    if (value <= 5) return "寂静期";
    if (value <= 12) return "低鸣期";
    if (value <= 20) return "共振期";
    if (value <= 28) return "咆哮期";
    return "终焉和弦";
  };

  return (
    <div className="flex items-center gap-3 bg-card-darker/80 rounded-lg p-3 border border-slate-700/50">
      <div className="flex flex-col">
        <span className="text-xs text-slate-400 font-medium">污染刻度尺</span>
        <span className="text-lg font-bold text-sonic-purple">
          {current} / 30
        </span>
      </div>
      <div className="w-48 h-4 bg-slate-800 rounded-full overflow-hidden relative">
        <div
          className={cn(
            "h-full bg-gradient-to-r transition-all duration-500",
            getPollutionColor(current)
          )}
          style={{ width: `${(current / 30) * 100}%` }}
        />
        {current >= 20 && (
          <motion.div
            className="absolute inset-0 bg-danger-red/20"
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
        )}
      </div>
      <span className="text-sm font-medium text-slate-300">
        {getPollutionLevel(current)}
      </span>
    </div>
  );
};

// 伤害数字飘出组件
const DamageNumber = ({ 
  damage, 
  x, 
  y, 
  color = "text-danger-red" 
}: { 
  damage: number; 
  x: number; 
  y: number; 
  color?: string; 
}) => {
  return (
    <motion.div
      className={cn("absolute text-3xl font-black", color)}
      initial={{ 
        opacity: 0, 
        y: y, 
        x: x, 
        scale: 0.8 
      }}
      animate={{ 
        opacity: [0, 1, 0], 
        y: y - 80, 
        scale: [0.8, 1.4, 1] 
      }}
      transition={{ duration: 0.8, ease: "easeOut" }}
    >
      -{damage}
    </motion.div>
  );
};

// 声波特效组件
const SonicWaveEffect = ({ active }: { active: boolean }) => {
  if (!active) return null;

  return (
    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-20">
      {/* 主声波弧形 */}
      <motion.div
        className="absolute -top-8 -left-24 w-48 h-24 border-t-4 border-l-4 border-r-4 border-sonic-purple rounded-t-full"
        style={{ borderBottom: 0, borderRadius: "96px 96px 0 0" }}
        initial={{ opacity: 0, x: -100, scale: 0.5 }}
        animate={{ opacity: [0, 1, 0], x: [0, 150, 200], scale: [0.5, 1.2, 0.8] }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      />
      
      {/* 声波光晕 */}
      <motion.div
        className="absolute -top-8 -left-24 w-48 h-24 rounded-t-full"
        initial={{ opacity: 0, x: -100 }}
        animate={{ opacity: [0, 0.6, 0], x: [0, 150, 200] }}
        style={{ background: "radial-gradient(circle, rgba(139,92,246,0.4) 0%, transparent 70%)" }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      />
    </div>
  );
};

// 玩家状态条组件
const PlayerStatusBar = ({ 
  hp, 
  maxHp, 
  armor, 
  ap, 
  maxAp 
}: { 
  hp: number; 
  maxHp: number; 
  armor: number; 
  ap: number; 
  maxAp: number; 
}) => {
  return (
    <div className="flex flex-col gap-2 min-w-[200px]">
      {/* HP */}
      <div className="flex items-center gap-2">
        <Heart className="w-5 h-5 text-danger-red" />
        <div className="flex-1">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-slate-400">生命值</span>
            <span className="text-danger-red font-bold">{hp} / {maxHp}</span>
          </div>
          <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-danger-red to-danger-red/70 transition-all duration-500"
              style={{ width: `${(hp / maxHp) * 100}%` }}
            />
          </div>
        </div>
      </div>
      
      {/* Armor */}
      <div className="flex items-center gap-2">
        <Shield className="w-5 h-5 text-armor-blue" />
        <div className="flex-1">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-slate-400">护甲</span>
            <span className="text-armor-blue font-bold">{armor}</span>
          </div>
          <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-armor-blue to-armor-blue/70 transition-all duration-500"
              style={{ width: `${Math.min(100, (armor / 50) * 100)}%` }}
            />
          </div>
        </div>
      </div>
      
      {/* AP */}
      <div className="flex items-center gap-2">
        <Zap className="w-5 h-5 text-gold" />
        <div className="flex gap-1">
          {Array.from({ length: maxAp }).map((_, i) => (
            <div 
              key={i}
              className={cn(
                "w-6 h-6 rounded-full border-2 transition-all duration-300",
                i < ap 
                  ? "bg-gold border-gold shadow-lg shadow-gold/30" 
                  : "bg-transparent border-slate-600"
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

// 敌人状态条组件
const EnemyStatusBar = ({ 
  hp, 
  maxHp, 
  armor 
}: { 
  hp: number; 
  maxHp: number; 
  armor: number; 
}) => {
  return (
    <div className="flex flex-col gap-2 min-w-[250px]">
      <div className="flex items-center gap-2">
        <Skull className="w-5 h-5 text-danger-red" />
        <div className="flex-1">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-slate-400">嘶鸣游荡者</span>
            <span className="text-danger-red font-bold">{hp} / {maxHp}</span>
          </div>
          <div className="h-4 bg-slate-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-danger-red to-danger-red/70 transition-all duration-500"
              style={{ width: `${(hp / maxHp) * 100}%` }}
            />
          </div>
        </div>
      </div>
      {armor > 0 && (
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-armor-blue" />
          <span className="text-armor-blue font-medium">{armor} 护甲</span>
        </div>
      )}
    </div>
  );
};

// 玩家角色组件（定点锚定版本）
const PlayerCharacter = ({ 
  isAttacking, 
  isDefending 
}: { 
  isAttacking: boolean; 
  isDefending: boolean; 
}) => {
  return (
    <div className="relative">
      {/* 玩家身体 */}
      <motion.div
        className="relative"
        animate={{
          x: isAttacking ? [0, 30, 0] : 0,
          scale: isDefending ? [1, 1.15, 1] : 1,
        }}
        transition={{ duration: 0.6, ease: "easeInOut" }}
      >
        {/* 玩家躯干 */}
        <div className="w-20 h-32 bg-gradient-to-b from-sonic-purple to-sonic-purple/60 rounded-2xl shadow-xl shadow-sonic-purple/30 relative">
          {/* 玩家头部 */}
          <div className="absolute -top-8 left-1/2 -translate-x-1/2 w-12 h-12 bg-gradient-to-br from-slate-300 to-slate-500 rounded-full shadow-lg">
            {/* 简单的抽象人脸 */}
            <div className="absolute top-4 left-3 w-2 h-2 bg-abyss rounded-full" />
            <div className="absolute top-4 right-3 w-2 h-2 bg-abyss rounded-full" />
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-4 h-1 bg-abyss rounded-full" />
          </div>
          
          {/* 声波巨剑武器 */}
          <motion.div
            className="absolute -right-12 top-4"
            animate={isAttacking ? {
              rotate: [0, 45, -10, 0],
              x: [0, 15, 5, 0],
            } : {}}
            transition={{ duration: 0.6, ease: "easeInOut" }}
          >
            <div className="w-4 h-24 bg-gradient-to-b from-sonic-purple to-sonic-purple/40 rounded-full shadow-lg shadow-sonic-purple/40 transform -rotate-12" />
          </motion.div>
        </div>
        
        {/* 玩家阴影 */}
        <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-24 h-4 bg-black/40 rounded-full blur-sm" />
      </motion.div>
      
      {/* 防御光环 */}
      {isDefending && (
        <motion.div
          className="absolute inset-0 rounded-full border-4 border-armor-blue"
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: [0.5, 1.4, 1], opacity: [0, 0.8, 0.4, 0] }}
          transition={{ duration: 0.8 }}
        />
      )}
    </div>
  );
};

// 敌人角色组件（定点锚定版本）
const EnemyCharacter = ({ 
  isHit, 
  name 
}: { 
  isHit: boolean; 
  name: string; 
}) => {
  return (
    <div className="relative">
      <motion.div
        className="relative"
        animate={isHit ? {
          x: [0, 5, -5, 5, -5, 0],
          scale: [1, 1.08, 0.95, 1.05, 1],
        } : {}}
        transition={{ duration: 0.6 }}
      >
        {/* 敌人躯干 */}
        <div className="w-24 h-36 bg-gradient-to-b from-danger-red to-danger-red/60 rounded-2xl shadow-xl shadow-danger-red/30 relative">
          {/* 敌人头部 */}
          <div className="absolute -top-10 left-1/2 -translate-x-1/2">
            <div className="w-16 h-16 bg-gradient-to-br from-slate-700 to-slate-900 rounded-full shadow-lg relative">
              {/* 敌人眼睛 */}
              <div className="absolute top-5 left-4 w-3 h-3 bg-danger-red rounded-full animate-pulse" />
              <div className="absolute top-5 right-4 w-3 h-3 bg-danger-red rounded-full animate-pulse" />
              {/* 敌人嘴巴 */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-8 h-3 bg-abyss rounded-t-xl" />
              {/* 敌人尖牙 */}
              <div className="absolute bottom-3 left-5 w-1.5 h-4 bg-slate-200 rounded-b" />
              <div className="absolute bottom-3 right-5 w-1.5 h-4 bg-slate-200 rounded-b" />
            </div>
          </div>
          
          {/* 敌人手臂 */}
          <div className="absolute -left-6 top-6 w-8 h-16 bg-gradient-to-r from-danger-red/40 to-danger-red rounded-xl" />
          <div className="absolute -right-6 top-6 w-8 h-16 bg-gradient-to-l from-danger-red/40 to-danger-red rounded-xl" />
        </div>
        
        {/* 敌人阴影 */}
        <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-28 h-4 bg-black/40 rounded-full blur-sm" />
      </motion.div>
      
      {/* 受击红色闪红 */}
      {isHit && (
        <motion.div
          className="absolute inset-0 bg-danger-red/60 rounded-2xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 0.4 }}
        />
      )}
    </div>
  );
};

// 打字机效果组件
const TypewriterText = ({ text, isTyping }: { text: string; isTyping: boolean }) => {
  const [displayText, setDisplayText] = useState("");
  
  useEffect(() => {
    if (isTyping) {
      setDisplayText("");
      let index = 0;
      const interval = setInterval(() => {
        if (index < text.length) {
          setDisplayText(text.slice(0, index + 1));
          index++;
        } else {
          clearInterval(interval);
        }
      }, 30);
      return () => clearInterval(interval);
    } else {
      setDisplayText(text);
    }
  }, [text, isTyping]);
  
  return <span>{displayText}</span>;
};

// 手牌组件（扇形排列版）
const HandCard = ({ 
  card, 
  index, 
  total, 
  isSelected, 
  canPlay, 
  onSelect 
}: { 
  card: Card; 
  index: number; 
  total: number; 
  isSelected: boolean; 
  canPlay: boolean; 
  onSelect: (card: Card) => void; 
}) => {
  const middleIndex = Math.floor(total / 2);
  const distanceFromMiddle = index - middleIndex;
  const rotationAngle = distanceFromMiddle * 8;

  const getBorderColor = (type: string) => {
    switch (type) {
      case "attack": return "border-danger-red hover:shadow-danger-red/40";
      case "skill": return "border-armor-blue hover:shadow-armor-blue/40";
      case "ability": return "border-gold hover:shadow-gold/40";
      default: return "border-slate-600";
    }
  };

  const getBgColor = (type: string) => {
    switch (type) {
      case "attack": return "from-card-darker to-danger-red/20";
      case "skill": return "from-card-darker to-armor-blue/20";
      case "ability": return "from-card-darker to-gold/20";
      default: return "from-card-darker to-slate-800";
    }
  };

  return (
    <motion.div
      className={cn(
        "relative cursor-pointer transition-all duration-300",
        !canPlay && "opacity-50 cursor-not-allowed"
      )}
      style={{
        transformOrigin: "bottom center",
      }}
      initial={{ y: 100, opacity: 0, rotate: rotationAngle }}
      animate={{
        y: 0,
        opacity: 1,
        rotate: isSelected ? 0 : rotationAngle,
        scale: isSelected ? 1.15 : 1,
        zIndex: isSelected ? 50 : 20 + Math.abs(distanceFromMiddle),
      }}
      whileHover={canPlay ? {
        y: -32,
        scale: 1.1,
        zIndex: 50,
      } : {}}
      onClick={() => canPlay && onSelect(card)}
      transition={{
        type: "spring",
        stiffness: 100,
        damping: 15,
        delay: index * 0.1,
      }}
    >
      <div className={cn(
        "w-32 h-44 rounded-xl border-2 bg-gradient-to-br shadow-lg transition-all duration-300",
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
            {card.effect}
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
  // 游戏状态
  const [turn, setTurn] = useState(1);
  const [pollutionLevel, setPollutionLevel] = useState(0);
  const [playerHp, setPlayerHp] = useState(80);
  const [playerMaxHp] = useState(80);
  const [playerArmor, setPlayerArmor] = useState(0);
  const [playerAp, setPlayerAp] = useState(3);
  const [playerMaxAp] = useState(3);
  const [enemyHp, setEnemyHp] = useState(50);
  const [enemyMaxHp] = useState(50);
  const [enemyArmor, setEnemyArmor] = useState(0);
  const [hand, setHand] = useState<Card[]>(INITIAL_HAND_CARDS);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [currentIntention, setCurrentIntention] = useState<SimpleEnemyBehavior>(getSimpleEnemyIntention());
  const [isProcessing, setIsProcessing] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  
  // 动画状态
  const [isAttacking, setIsAttacking] = useState(false);
  const [isDefending, setIsDefending] = useState(false);
  const [isEnemyHit, setIsEnemyHit] = useState(false);
  const [showSonicWave, setShowSonicWave] = useState(false);
  const [damageNumbers, setDamageNumbers] = useState<Array<{ id: number; damage: number; x: number; y: number; color: string }>>([]);
  const [showCardPlayEffect, setShowCardPlayEffect] = useState<{ show: boolean; type: "attack" | "skill" }>({ show: false, type: "attack" });
  
  // AI裁判消息
  const [dialogMessages, setDialogMessages] = useState<Array<{ id: number; text: string; isTyping: boolean }>>([]);
  
  // 选择卡牌
  const handleCardSelect = (card: Card) => {
    if (isProcessing) return;
    setSelectedCard(card);
  };
  
  // 打出卡牌
  const handlePlayCard = () => {
    if (!selectedCard || selectedCard.cost > playerAp || isProcessing) return;
    
    setIsProcessing(true);
    setPlayerAp(prev => prev - selectedCard.cost);
    
    // 显示打牌图标效果
    const effectType = selectedCard.type === "attack" ? "attack" : "skill";
    setShowCardPlayEffect({ show: true, type: effectType });
    
    // 根据卡牌类型触发动画
    if (selectedCard.type === "attack") {
      setIsAttacking(true);
      setTimeout(() => setShowSonicWave(true), 150);
      setTimeout(() => setIsEnemyHit(true), 300);
      
      const damage = selectedCard.baseDamage || 5;
      
      // AI裁判台词
      const msg = { id: Date.now(), text: `你打出了【${selectedCard.name}】，造成了 ${damage} 点伤害！`, isTyping: true };
      setDialogMessages(prev => [...prev, msg]);
      
      // 伤害数字
      setTimeout(() => {
        setDamageNumbers(prev => [...prev, { id: Date.now(), damage, x: 200, y: 250, color: "text-danger-red" }]);
        setEnemyHp(prev => Math.max(0, prev - damage));
        setTimeout(() => setIsEnemyHit(false), 500);
        setTimeout(() => setShowSonicWave(false), 500);
        setTimeout(() => setIsAttacking(false), 600);
        setTimeout(() => {
          setDialogMessages(prev => prev.map(m => m.id === msg.id ? { ...m, isTyping: false } : m));
        }, 800);
      }, 300);
    } else if (selectedCard.type === "skill") {
      setIsDefending(true);
      
      const armor = selectedCard.baseArmor || 5;
      const msg = { id: Date.now(), text: `你打出了【${selectedCard.name}】，获得了 ${armor} 点护甲！`, isTyping: true };
      setDialogMessages(prev => [...prev, msg]);
      
      setTimeout(() => {
        setPlayerArmor(prev => prev + armor);
        setIsDefending(false);
        setDialogMessages(prev => prev.map(m => m.id === msg.id ? { ...m, isTyping: false } : m));
      }, 600);
    } else if (selectedCard.type === "ability") {
      const msg = { id: Date.now(), text: `你打出了【${selectedCard.name}】！能力激活！`, isTyping: true };
      setDialogMessages(prev => [...prev, msg]);
      setTimeout(() => {
        setDialogMessages(prev => prev.map(m => m.id === msg.id ? { ...m, isTyping: false } : m));
      }, 800);
    }

    setTimeout(() => {
      setIsProcessing(false);
    }, 800);
  };
  
  // 结束回合
  const handleEndTurn = () => {
    if (isProcessing) return;
    setIsProcessing(true);
    setSelectedCard(null);

    // 污染度+1
    setPollutionLevel(prev => Math.min(30, prev + 1));

    // 怪物行动
    const msg = { id: Date.now(), text: `嘶鸣游荡者使用了【${currentIntention.description}】！`, isTyping: true };
    setDialogMessages(prev => [...prev, msg]);

    // 怪物造成伤害
    if (currentIntention.damage) {
      const damage = currentIntention.damage;
      setPlayerHp(prev => Math.max(0, prev - damage));
      setDamageNumbers(prev => [...prev, { id: Date.now(), damage, x: 200, y: 250, color: "text-danger-red" }]);
    }

    // 下一回合
    setTimeout(() => {
      setDialogMessages(prev => prev.map(m => m.id === msg.id ? { ...m, isTyping: false } : m));
      setCurrentIntention(getSimpleEnemyIntention());
      setTurn(prev => prev + 1);
      setHand(INITIAL_HAND_CARDS);
      setPlayerAp(playerMaxAp);
      setIsProcessing(false);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-abyss via-abyss to-card-darker relative overflow-hidden">
      {/* 背景声波脉冲 */}
      <div className="absolute inset-0 opacity-20 z-0">
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-sonic-purple/30"
            initial={{ width: 0, height: 0, opacity: 0 }}
            animate={{
              width: [0, 300 + i * 150],
              height: [0, 300 + i * 150],
              opacity: [0, 0.2, 0],
            }}
            transition={{
              duration: 5,
              repeat: Infinity,
              delay: i * 1.5,
              ease: "easeOut",
            }}
          />
        ))}
      </div>

      {/* 左上角退出按钮 */}
      <div className="fixed top-6 left-6 z-40">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowExitConfirm(true)}
          className="text-slate-400 hover:text-slate-100 hover:bg-slate-800/50 transition-all duration-300 group"
        >
          <RotateCcw className="w-6 h-6 group-hover:rotate-[-20deg] transition-transform" />
        </Button>
      </div>

      {/* 顶部区域：污染刻度尺 */}
      <div className="fixed top-6 right-6 z-40">
        <PollutionScale current={pollutionLevel} />
      </div>

      {/* 敌人角色（定点锚定） */}
      <div className="fixed top-1/4 right-10 z-30">
        <EnemyStatusBar hp={enemyHp} maxHp={enemyMaxHp} armor={enemyArmor} />
        <div className="relative mt-4">
          <EnemyCharacter isHit={isEnemyHit} name="嘶鸣游荡者" />
          {/* 敌人意图指示器 */}
          <div className="absolute -top-20 left-1/2 -translate-x-1/2 bg-card-darker/90 backdrop-blur rounded-lg px-4 py-2 border border-slate-700/50">
            <p className="text-sm text-slate-300">
              {currentIntention.description}
            </p>
          </div>
        </div>
      </div>

      {/* 玩家角色（定点锚定） */}
      <div className="fixed bottom-1/4 left-10 z-30">
        <PlayerCharacter isAttacking={isAttacking} isDefending={isDefending} />
        <div className="mt-4">
          <PlayerStatusBar
            hp={playerHp}
            maxHp={playerMaxHp}
            armor={playerArmor}
            ap={playerAp}
            maxAp={playerMaxAp}
          />
        </div>
      </div>

      {/* 声波特效 */}
      <SonicWaveEffect active={showSonicWave} />

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

      {/* 打牌图标效果 */}
      <AnimatePresence>
        {showCardPlayEffect.show && (
          <CardPlayEffect
            type={showCardPlayEffect.type}
            onComplete={() => setShowCardPlayEffect({ show: false, type: "attack" })}
          />
        )}
      </AnimatePresence>

      {/* 底部手牌区 - 扇形排列 */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-t from-abyss via-abyss/95 to-transparent pt-16 pb-8">
        <div className="container mx-auto px-6">
          {/* 手牌扇形展示 */}
          <div className="relative bottom-[-50px] flex justify-center items-end h-64 z-50">
            {hand.map((card, index) => (
              <HandCard
                key={card.id}
                card={card}
                index={index}
                total={hand.length}
                isSelected={selectedCard?.id === card.id}
                canPlay={card.cost <= playerAp && !isProcessing}
                onSelect={handleCardSelect}
              />
            ))}
          </div>

          {/* 操作按钮 */}
          <div className="flex justify-center gap-4 mt-8">
            {selectedCard && (
              <Button
                onClick={handlePlayCard}
                disabled={isProcessing}
                className="px-8 py-6 bg-gradient-to-r from-sonic-purple to-sonic-purple/70 hover:from-sonic-purple/90 hover:to-sonic-purple/60 text-white font-bold rounded-xl shadow-lg shadow-sonic-purple/30 transition-all hover:scale-105 disabled:opacity-50"
              >
                使用卡牌
              </Button>
            )}
            <Button
              onClick={handleEndTurn}
              disabled={isProcessing}
              variant="secondary"
              className="px-6 py-6 font-bold rounded-xl"
            >
              结束回合
            </Button>
          </div>
        </div>
      </div>

      {/* AI裁判对话框 */}
      <div className="fixed bottom-48 left-6 z-40 w-80">
        <div className="bg-black/60 backdrop-blur-md rounded-xl border border-slate-700/50 p-4 max-h-40 overflow-y-auto">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 rounded-full bg-sonic-purple animate-pulse" />
            <span className="text-xs font-bold text-sonic-purple uppercase">AI裁判</span>
          </div>
          <div className="space-y-2">
            {dialogMessages.slice(-3).map(msg => (
              <p key={msg.id} className="text-sm text-slate-200">
                <TypewriterText text={msg.text} isTyping={msg.isTyping} />
                {msg.isTyping && (
                  <span className="inline-block w-2 h-4 bg-sonic-purple ml-1 animate-pulse" />
                )}
              </p>
            ))}
          </div>
        </div>
      </div>

      {/* 退出确认弹窗 */}
      <AnimatePresence>
        {showExitConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <motion.div
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowExitConfirm(false)}
            />
            <motion.div
              className="relative bg-card-darker border border-slate-700 rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ duration: 0.3 }}
            >
              <button
                onClick={() => setShowExitConfirm(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-200"
              >
                <X className="w-6 h-6" />
              </button>
              <h3 className="text-2xl font-bold text-slate-100 mb-4">
                确认退出？
              </h3>
              <p className="text-slate-400 mb-8">
                退出后当前进度将会丢失，确定要返回主菜单吗？
              </p>
              <div className="flex gap-4">
                <Button
                  variant="secondary"
                  className="flex-1 py-6"
                  onClick={() => setShowExitConfirm(false)}
                >
                  继续战斗
                </Button>
                <Link href="/" className="flex-1">
                  <Button className="w-full py-6 bg-danger-red hover:bg-danger-red/80">
                    退出
                  </Button>
                </Link>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
