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

// 玩家角色实体
const PlayerCharacter = ({
  isAttacking,
  isDefending,
}: {
  isAttacking: boolean;
  isDefending: boolean;
}) => {
  return (
    <div className="relative">
      {/* 人物身体 */}
      <motion.div
        animate={
          isAttacking ? {
            x: [0, 30, 0]
          } : {}
        }
        transition={{ duration: 0.4 }}
      >
        {/* 身体底座/阴影 */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-24 h-5 bg-black/50 rounded-full blur-md" />
        
        {/* 身体躯干 */}
        <div className="relative">
          <div className="w-24 h-32 relative">
            {/* 身体躯干 */}
            <motion.div
              className="absolute bottom-4 left-1/2 -translate-x-1/2 w-16 h-20 bg-gradient-to-b from-sonic-purple/60 to-sonic-purple/30 rounded-lg border-2 border-sonic-purple/50 shadow-xl shadow-sonic-purple/20"
              animate={
                isDefending ? {
                  scale: [1, 1.15, 1]
                } : {}
              }
              transition={{ duration: 0.5 }}
            >
              {/* 头部 */}
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-10 h-10 bg-gradient-to-br from-sonic-purple/70 to-sonic-purple/40 rounded-full border border-sonic-purple/50" />
            </motion.div>

            {/* 声波巨剑武器 */}
            <motion.div
              className="absolute right-[-28px] bottom-12 origin-left"
              animate={
                isAttacking ? {
                  rotate: [0, 45, -10, 0],
                  x: [0, 8, 0],
                  y: [0, -10, 0]
                } : {}
              }
              transition={{ duration: 0.4, ease: "easeInOut" }}
            >
              <div className="relative">
                {/* 剑刃 */}
                <div className="w-4 h-20 bg-gradient-to-t from-sonic-purple/80 via-sonic-purple/40 to-sonic-purple/20 rounded-t-full" />
                {/* 剑刃发光效果 */}
                <div className="absolute inset-0 bg-sonic-purple/40 blur-md" />
              </div>
            </motion.div>
          </div>

          {/* 防御光环 */}
          {isDefending && (
            <motion.div
              className="absolute inset-0 rounded-full border-4 border-armor-blue"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: [0.5, 1.4, 1], opacity: [0.8, 0.4, 0] }}
              transition={{ duration: 0.6 }}
            />
          )}
        </div>
      </motion.div>
    </div>
  );
};

// 敌人角色实体
const EnemyCharacter = ({
  isHit,
  name,
}: {
  isHit: boolean;
  name: string;
}) => {
  return (
    <div className="relative">
      {/* 人物身体 */}
      <motion.div
        className={cn(
          "relative",
          isHit && "bg-danger-red/60"
        )}
        animate={
          isHit ? {
            x: [0, -8, 8, -8, 8, 0],
            y: [0, -4, 4, -4, 4, 0],
            scale: [1, 1.08, 0.95, 1.05, 1],
          } : {}
        }
        transition={{ duration: 0.5 }}
      >
        {/* 身体 */}
        <div className="w-24 h-32 relative">
          {/* 身体底座/阴影 */}
          <motion.div
            className="absolute bottom-0 left-1/2 -translate-x-1/2 w-20 h-4 bg-black/40 rounded-full blur-sm"
            animate={{ scale: isHit ? [1, 0.8, 1] : 1 }}
          />

          {/* 身体躯干 */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-16 h-20 bg-gradient-to-b from-danger-red/60 to-danger-red/30 rounded-lg border-2 border-danger-red/50 shadow-xl shadow-danger-red/20">
            {/* 头部 */}
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-10 h-10 bg-gradient-to-br from-danger-red/70 to-danger-red/40 rounded-full border border-danger-red/50 flex items-center justify-center">
              <Skull className="h-5 w-5 text-danger-red" />
            </div>
          </div>
        </div>
      </motion.div>
      <div className="text-center mt-2">
        <span className="text-sm font-bold text-slate-300">{name}</span>
      </div>
    </div>
  );
};

// 玩家状态条组件
const PlayerStatusBar = ({
  hp,
  maxHp,
  armor,
  ap,
  maxAp,
}: {
  hp: number;
  maxHp: number;
  armor: number;
  ap: number;
  maxAp: number;
}) => {
  const hpPercent = (hp / maxHp) * 100;
  const apPercent = (ap / maxAp) * 100;

  return (
    <div className="bg-card-darker/80 rounded-xl p-4 border border-slate-700/50 space-y-3 min-w-[200px]">
      {/* HP条 */}
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-sm">
          <Heart className="h-4 w-4 text-danger-red" />
          <span className="text-slate-300">
            {hp} / {maxHp} 生命
          </span>
          {armor > 0 && (
            <span className="text-armor-blue font-bold ml-2">
              {armor} 护甲
            </span>
          )}
        </div>
        <div className="h-4 bg-slate-800 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-danger-red to-danger-red/70"
            initial={{ width: "100%" }}
            animate={{ width: `${hpPercent}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>
      
      {/* AP条 */}
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-sm">
          <Zap className="h-4 w-4 text-sonic-purple" />
          <span className="text-slate-300">
            {ap} / {maxAp} 行动力
          </span>
        </div>
        <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-sonic-purple to-gold"
            initial={{ width: "100%" }}
            animate={{ width: `${apPercent}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>
    </div>
  );
};

// 怪物状态条组件
const EnemyStatusBar = ({ hp, maxHp, armor }: { hp: number; maxHp: number; armor: number }) => {
  const hpPercent = (hp / maxHp) * 100;

  return (
    <div className="flex flex-col gap-2 w-48">
      {/* HP条 */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-300">
            {hp} / {maxHp}
          </span>
          {armor > 0 && (
            <span className="text-sm text-armor-blue font-bold">
              {armor} 护甲
            </span>
          )}
        </div>
        <div className="h-4 bg-slate-800 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-danger-red to-danger-red/70"
            initial={{ width: "100%" }}
            animate={{ width: `${hpPercent}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>
    </div>
  );
};

// 打字机效果组件
const TypewriterText = ({ text, isTyping }: { text: string; isTyping: boolean }) => {
  const [displayText, setDisplayText] = useState("");
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (isTyping && index < text.length) {
      const timer = setTimeout(() => {
        setDisplayText(text.slice(0, index + 1));
        setIndex(index + 1);
      }, 30);
      return () => clearTimeout(timer);
    } else if (!isTyping) {
      setDisplayText(text);
      setIndex(text.length);
    }
  }, [isTyping, index, text]);

  return <span>{displayText}</span>;
};

// 打牌图标效果
const CardPlayEffect = ({ 
  type, 
  onComplete 
}: { 
  type: "attack" | "skill" | "ability"; 
  onComplete: () => void; 
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center pointer-events-none z-30"
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: [0, 1, 0], scale: [0.5, 1.5, 0.5] }}
      transition={{ duration: 0.5 }}
    >
      {type === "attack" ? (
        <Sword className="w-16 h-16 text-danger-red" />
      ) : (
        <ShieldIcon className="w-16 h-16 text-armor-blue" />
      )}
    </motion.div>
  );
};

// 重构的手牌卡牌组件
const HandCard = ({
  card,
  index,
  isSelected,
  canPlay,
  onSelect,
}: {
  card: Card;
  index: number;
  isSelected: boolean;
  canPlay: boolean;
  onSelect: (card: Card) => void;
}) => {
  const getCardBorderColor = (type: string) => {
    switch (type) {
      case "attack":
        return "border-danger-red/70 hover:border-danger-red shadow-danger-red/20";
      case "skill":
        return "border-armor-blue/70 hover:border-armor-blue shadow-armor-blue/20";
      case "ability":
        return "border-gold/70 hover:border-gold shadow-gold/20";
      default:
        return "border-slate-600/70 hover:border-slate-400";
    }
  };

  const getCardBgColor = (type: string) => {
    switch (type) {
      case "attack":
        return "from-danger-red/20 via-card-darker to-danger-red/10";
      case "skill":
        return "from-armor-blue/20 via-card-darker to-armor-blue/10";
      case "ability":
        return "from-gold/20 via-card-darker to-gold/10";
      default:
        return "from-slate-700/30 via-card-darker to-slate-700/10";
    }
  };

  const getCostBgColor = (type: string) => {
    switch (type) {
      case "attack":
        return "bg-danger-red";
      case "skill":
        return "bg-armor-blue";
      case "ability":
        return "bg-gold";
      default:
        return "bg-slate-600";
    }
  };

  return (
    <motion.div
      className={cn(
        "group relative",
        isSelected && "z-50"
      )}
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ 
        duration: 0.4, 
        delay: index * 0.1,
        type: "spring",
        stiffness: 100,
        damping: 15
      }}
      whileHover={{ 
        y: -32,
        zIndex: 50,
        scale: 1.1,
        transition: { duration: 0.2 }
      }}
      onClick={() => canPlay && onSelect(card)}
    >
      {/* 卡牌主体 */}
      <div
        className={cn(
          "w-40 h-56 rounded-xl border-2 bg-gradient-to-br backdrop-blur-sm cursor-pointer transition-all duration-200",
          getCardBorderColor(card.type),
          getCardBgColor(card.type),
          isSelected && "ring-4 ring-sonic-purple/60 shadow-2xl shadow-sonic-purple/40",
          !canPlay && "opacity-50 cursor-not-allowed"
        )}
      >
        {/* 消耗费用 */}
        <div className="absolute -top-2 -left-2 w-8 h-8 rounded-full flex items-center justify-center font-black text-lg text-white shadow-lg z-10">
          <div className={cn("w-full h-full rounded-full flex items-center justify-center", getCostBgColor(card.type))}>
            {card.cost}
          </div>
        </div>

        {/* 卡牌名称 */}
        <div className="pt-6 px-3 pb-2 border-b border-white/10">
          <h3 className="font-bold text-sm text-slate-100 truncate">
            {card.name}
          </h3>
        </div>

        {/* 卡牌效果 */}
        <div className="pt-3 px-3">
          <p className="text-xs text-slate-300 leading-relaxed">
            {card.effect}
          </p>
        </div>

        {/* 卡牌类型标签 */}
        <div className="absolute bottom-3 right-3">
          <span className={cn(
            "text-[10px] font-bold uppercase tracking-wider",
            card.type === "attack" ? "text-danger-red" :
            card.type === "skill" ? "text-armor-blue" : "text-gold"
          )}>
            {card.type}
          </span>
        </div>
      </div>
    </motion.div>
  );
};

export default function BattleArena() {
  // 游戏状态
  const [pollutionLevel, setPollutionLevel] = useState(3);
  const [playerHp, setPlayerHp] = useState(80);
  const [playerMaxHp] = useState(80);
  const [playerArmor, setPlayerArmor] = useState(0);
  const [playerAp, setPlayerAp] = useState(3);
  const [playerMaxAp] = useState(3);
  const [enemyHp, setEnemyHp] = useState(34);
  const [enemyMaxHp] = useState(34);
  const [enemyArmor, setEnemyArmor] = useState(0);
  const [turn, setTurn] = useState(1);
  const [hand, setHand] = useState<Card[]>(INITIAL_HAND_CARDS);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAttacking, setIsAttacking] = useState(false);
  const [isDefending, setIsDefending] = useState(false);
  const [isEnemyHit, setIsEnemyHit] = useState(false);
  const [showSonicWave, setShowSonicWave] = useState(false);
  const [damageNumbers, setDamageNumbers] = useState<{ id: number; damage: number; x: number; y: number; color: string }[]>([]);
  const [currentIntention, setCurrentIntention] = useState<SimpleEnemyBehavior>(getSimpleEnemyIntention());
  const [dialogMessages, setDialogMessages] = useState([
    { id: 1, text: "欢迎来到深渊协奏！战斗开始！", isTyping: false }
  ]);
  const [showCardPlayEffect, setShowCardPlayEffect] = useState<{ show: boolean; type: "attack" | "skill" | "ability" }>({ show: false, type: "attack" });

  // 选择卡牌
  const handleCardSelect = (card: Card) => {
    if (card.cost <= playerAp && !isProcessing) {
      setSelectedCard(card);
    }
  };

  // 使用卡牌
  const handlePlayCard = () => {
    if (!selectedCard || isProcessing) return;

    setIsProcessing(true);
    setSelectedCard(null);

    // 显示打牌效果
    setShowCardPlayEffect({ 
      show: true, 
      type: selectedCard.type === "attack" ? "attack" : "skill" 
    });

    // 消耗行动力
    setPlayerAp(prev => prev - selectedCard.cost);

    // 从手牌中移除卡牌
    setHand(prev => prev.filter(c => c.id !== selectedCard.id));

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
    <div className="min-h-screen bg-gradient-to-b from-abyss via-abyss to-card-darker flex flex-col relative overflow-hidden">
      {/* 背景声波脉冲 */}
      <div className="absolute inset-0 opacity-20">
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
      <div className="fixed top-6 left-6 z-30">
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
      <div className="relative z-10 p-6 flex justify-end">
        <PollutionScale current={pollutionLevel} />
      </div>

      {/* 中间战斗舞台区域 */}
      <div className="flex-1 flex flex-col relative z-10">
        {/* 敌人区域 */}
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <EnemyStatusBar hp={enemyHp} maxHp={enemyMaxHp} armor={enemyArmor} />
          <div className="relative">
            <EnemyCharacter isHit={isEnemyHit} name="嘶鸣游荡者" />
            {/* 敌人意图指示器 */}
            <div className="absolute -top-16 left-1/2 -translate-x-1/2 bg-card-darker/90 backdrop-blur rounded-lg px-4 py-2 border border-slate-700/50">
              <p className="text-sm text-slate-300">
                {currentIntention.description}
              </p>
            </div>
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

        {/* 玩家区域 */}
        <div className="flex-1 flex items-center justify-center gap-12 pb-20">
          <div className="flex items-center gap-8">
            {/* 玩家状态条 */}
            <PlayerStatusBar
              hp={playerHp}
              maxHp={playerMaxHp}
              armor={playerArmor}
              ap={playerAp}
              maxAp={playerMaxAp}
            />
            {/* 玩家角色 */}
            <PlayerCharacter
              isAttacking={isAttacking}
              isDefending={isDefending}
            />
          </div>
        </div>
      </div>

      {/* 底部手牌区 - 重构为真正手牌形态 */}
      <div className="relative z-20 bg-gradient-to-t from-abyss via-abyss/95 to-transparent pt-8 pb-6">
        <div className="container mx-auto px-6">
          {/* 手牌展示 - 使用负间距叠加效果 */}
          <div className="flex justify-center items-end -space-x-8 mb-6 group">
            {hand.map((card, index) => (
              <HandCard
                key={card.id}
                card={card}
                index={index}
                isSelected={selectedCard?.id === card.id}
                canPlay={card.cost <= playerAp && !isProcessing}
                onSelect={handleCardSelect}
              />
            ))}
          </div>

          {/* 操作按钮 */}
          <div className="flex justify-center gap-4">
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
      <div className="fixed bottom-40 left-6 z-20 w-80">
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
