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
} from "lucide-react";
import { Card, CardType, CardTarget, INITIAL_HAND_CARDS } from "@/lib/cards";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// 简化的敌人行为类型
type SimpleEnemyBehavior = {
  type: "attack" | "defend" | "buff";
  value: number;
  description: string;
};

// 随机获取敌人意图
const getSimpleEnemyIntention = (): SimpleEnemyBehavior => {
  const roll = Math.floor(Math.random() * 6) + 1;
  if (roll <= 3) {
    return {
      type: "attack",
      value: 6 + Math.floor(Math.random() * 5),
      description: "准备冲撞攻击",
    };
  } else if (roll === 4) {
    return {
      type: "buff",
      value: 2,
      description: "积蓄污染能量",
    };
  } else {
    return {
      type: "defend",
      value: 8,
      description: "进入防御姿态",
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

  const getPollutionText = (lvl: number) => {
    if (lvl < 25) return "清洁";
    if (lvl < 50) return "警戒";
    if (lvl < 75) return "危险";
    return "深渊";
  };

  return (
    <div className="fixed top-4 right-4 z-40">
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
          <span className="text-xs text-slate-400">{getPollutionText(level)}</span>
          <span className="text-xs font-bold text-slate-200">{level}%</span>
        </div>
      </div>
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

// 手牌组件 - 重构版本
const HandCard = ({ 
  card, 
  index, 
  total, 
  isSelected, 
  onSelect, 
  onPlay,
  canPlay,
  playerAp 
}: { 
  card: Card; 
  index: number; 
  total: number; 
  isSelected: boolean; 
  onSelect: (card: Card) => void;
  onPlay: () => void;
  canPlay: boolean;
  playerAp: number;
}) => {
  const middleIndex = (total - 1) / 2;
  const distanceFromMiddle = index - middleIndex;
  const rotationAngle = distanceFromMiddle * 6;

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
      default: return "from-card-darker to-slate-800";
    }
  };

  return (
    <div className="relative">
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

      {/* 绝对定位的使用卡牌按钮 */}
      <AnimatePresence>
        {isSelected && canPlay && (
          <motion.div
            className="absolute -top-16 left-1/2 -translate-x-1/2 z-50"
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            <Button
              onClick={onPlay}
              className="bg-gradient-to-r from-sonic-purple to-sonic-purple/80 hover:from-sonic-purple/90 hover:to-sonic-purple/70 text-white px-6 py-3 rounded-xl shadow-lg shadow-sonic-purple/40 border border-sonic-purple/50 font-bold text-lg"
            >
              使用卡牌
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
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
  const [isPlayerHit, setIsPlayerHit] = useState(false);
  const [isEnemyCharging, setIsEnemyCharging] = useState(false);
  const [showSonicWave, setShowSonicWave] = useState(false);
  const [showRedFlash, setShowRedFlash] = useState(false);
  const [damageNumbers, setDamageNumbers] = useState<Array<{ id: number; damage: number; x: number; y: number; color: string }>>([]);
  const [showCardPlayEffect, setShowCardPlayEffect] = useState<{ show: boolean; type: "attack" | "skill" }>({ show: false, type: "attack" });
  
  // AI裁判消息
  const [dialogMessages, setDialogMessages] = useState<Array<{ id: number; text: string; isTyping: boolean }>>([]);
  
  // 倒计时状态
  const [timeLeft, setTimeLeft] = useState(30);
  
  const router = useRouter();
  
  // 倒计时逻辑
  useEffect(() => {
    if (isProcessing) return;
    
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleEndTurn();
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
    resetTimer();
    
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
      
      // AI裁判台词
      const msg = { id: Date.now(), text: `你使用了【${selectedCard.name}】，获得了 ${armor} 点护甲！`, isTyping: true };
      setDialogMessages(prev => [...prev, msg]);
      
      setTimeout(() => {
        setPlayerArmor(prev => prev + armor);
        setTimeout(() => setIsDefending(false), 600);
        setTimeout(() => {
          setDialogMessages(prev => prev.map(m => m.id === msg.id ? { ...m, isTyping: false } : m));
        }, 800);
      }, 300);
    }
    
    // 移除打出的手牌
    setHand(prev => prev.filter(c => c !== selectedCard));
    setSelectedCard(null);
    
    setTimeout(() => {
      setIsProcessing(false);
    }, 1000);
  };
  
  // 结束回合 - 完整的视觉闭环
  const handleEndTurn = async () => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    setSelectedCard(null);
    resetTimer();
    
    try {
      // 第一步：敌人准备动画
      setIsEnemyCharging(true);
      const chargingMsg = { id: Date.now(), text: "嘶鸣游荡者正在蓄力...", isTyping: true };
      setDialogMessages(prev => [...prev, chargingMsg]);
      
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // 第二步：敌人攻击
      setIsEnemyCharging(false);
      setShowRedFlash(true);
      setIsPlayerHit(true);
      
      const attackMsg = { id: Date.now() + 1, text: "嘶鸣游荡者向你发起了猛烈冲撞！", isTyping: true };
      setDialogMessages(prev => [...prev, attackMsg]);
      
      const damage = currentIntention.type === "attack" ? currentIntention.value : 0;
      
      await new Promise(resolve => setTimeout(resolve, 200));
      setShowRedFlash(false);
      
      // 第三步：数值更新
      await new Promise(resolve => setTimeout(resolve, 300));
      
      if (damage > 0) {
        setDamageNumbers(prev => [...prev, { id: Date.now(), damage, x: 100, y: 400, color: "text-danger-red" }]);
        
        // 计算实际伤害（扣除护甲）
        let actualDamage = damage;
        if (playerArmor > 0) {
          if (playerArmor >= damage) {
            setPlayerArmor(prev => prev - damage);
            actualDamage = 0;
          } else {
            actualDamage = damage - playerArmor;
            setPlayerArmor(0);
          }
        }
        
        if (actualDamage > 0) {
          setPlayerHp(prev => Math.max(0, prev - actualDamage));
        }
      }
      
      setTimeout(() => setIsPlayerHit(false), 500);
      
      // 完成打字效果
      setTimeout(() => {
        setDialogMessages(prev => prev.map(m => 
          m.id === chargingMsg.id || m.id === attackMsg.id ? { ...m, isTyping: false } : m
        ));
      }, 800);
      
      // 重置回合
      setTurn(prev => prev + 1);
      setPlayerAp(playerMaxAp);
      setCurrentIntention(getSimpleEnemyIntention());
      setPollutionLevel(prev => Math.min(100, prev + 5));
      
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-abyss text-slate-200 relative overflow-hidden">
      {/* 背景声波动画 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-sonic-purple/10 rounded-full animate-pulse" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-sonic-purple/5 rounded-full animate-pulse delay-1000" />
      </div>

      {/* 左上角退出按钮 */}
      <div className="fixed top-4 left-4 z-40">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowExitConfirm(true)}
          className="bg-black/40 hover:bg-black/60 text-slate-400 hover:text-white"
        >
          <Settings className="w-5 h-5" />
        </Button>
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
        <div className="mt-4 w-40 space-y-2">
          {/* HP条 */}
          <div className="bg-black/70 p-2 rounded-lg backdrop-blur border border-slate-700/50">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold text-danger-red">HP</span>
              <span className="text-xs text-slate-300">{playerHp}/{playerMaxHp}</span>
            </div>
            <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-danger-red to-danger-red/70"
                initial={{ width: "100%" }}
                animate={{ width: `${(playerHp / playerMaxHp) * 100}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>
          
          {/* 护甲和AP */}
          <div className="flex gap-2">
            <div className="flex-1 bg-black/70 p-2 rounded-lg backdrop-blur border border-slate-700/50">
              <div className="flex items-center gap-1">
                <Shield className="w-3 h-3 text-armor-blue" />
                <span className="text-xs font-bold text-armor-blue">{playerArmor}</span>
              </div>
            </div>
            <div className="flex-1 bg-black/70 p-2 rounded-lg backdrop-blur border border-slate-700/50">
              <div className="flex items-center gap-1">
                <Zap className="w-3 h-3 text-sonic-purple" />
                <span className="text-xs font-bold text-sonic-purple">{playerAp}/{playerMaxAp}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 敌人角色 - 固定在右侧顶部 */}
      <div className="fixed top-1/4 right-10 z-30">
        <motion.div
          className="relative"
          animate={{
            scale: isEnemyCharging ? [1, 1.1, 1.05, 1.1] : isEnemyHit ? [1, 0.95, 1.02, 0.98, 1] : 1,
          }}
          transition={{
            duration: isEnemyCharging ? 0.8 : 0.4,
            repeat: isEnemyCharging ? Infinity : 0,
          }}
        >
          {/* 敌人身体 */}
          <div className="w-24 h-36 bg-gradient-to-b from-sonic-purple/80 to-slate-900 rounded-t-full rounded-b-2xl shadow-2xl shadow-sonic-purple/40">
            {/* 眼睛 */}
            <div className="absolute top-8 left-1/2 -translate-x-1/2 flex gap-3">
              <div className="w-4 h-4 bg-danger-red rounded-full animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.8)]" />
              <div className="w-4 h-4 bg-danger-red rounded-full animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.8)] delay-300" />
            </div>
          </div>
          
          {/* 意图指示器 */}
          <div className="absolute -top-16 left-1/2 -translate-x-1/2">
            <div className="bg-black/80 backdrop-blur-sm px-4 py-2 rounded-lg border border-sonic-purple/50">
              <div className="flex items-center gap-2">
                {currentIntention.type === "attack" ? (
                  <Swords className="w-5 h-5 text-danger-red animate-bounce" />
                ) : currentIntention.type === "defend" ? (
                  <Shield className="w-5 h-5 text-armor-blue" />
                ) : (
                  <Zap className="w-5 h-5 text-sonic-purple" />
                )}
                <span className="text-sm text-slate-200">
                  {currentIntention.type === "attack" ? `${currentIntention.value} 伤害` :
                   currentIntention.type === "defend" ? `${currentIntention.value} 护甲` :
                   `污染 +${currentIntention.value}`}
                </span>
              </div>
            </div>
          </div>
          
          {/* 敌人血条 */}
          <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 w-48">
            <div className="bg-black/70 p-2 rounded-lg backdrop-blur border border-slate-700/50">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-slate-200">嘶鸣游荡者</span>
                <span className="text-xs text-slate-300">{enemyHp}/{enemyMaxHp}</span>
              </div>
              <div className="h-4 bg-slate-800 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-danger-red to-danger-red/70"
                  initial={{ width: "100%" }}
                  animate={{ width: `${(enemyHp / enemyMaxHp) * 100}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
              {enemyArmor > 0 && (
                <div className="flex items-center gap-1 mt-1">
                  <Shield className="w-3 h-3 text-armor-blue" />
                  <span className="text-xs text-armor-blue">{enemyArmor}</span>
                </div>
              )}
            </div>
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

      {/* AI裁判区 - 固定在左下角，避开卡牌区域 */}
      <div className="fixed bottom-24 left-4 z-30 max-w-xs">
        <div className="bg-black/70 backdrop-blur-md p-4 rounded-xl border border-sonic-purple/30">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-sonic-purple rounded-full flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-sm text-slate-200">AI 裁判</span>
          </div>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {dialogMessages.slice(-3).map(msg => (
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

      {/* 卡牌互动区 - 固定在底部上方，专门用来渲染扇形卡牌 */}
      <div className="fixed bottom-24 left-0 right-0 z-40">
        <div className="relative h-64 flex justify-center items-end pb-8">
          <div className="relative flex items-end justify-center">
            {hand.map((card, index) => (
              <HandCard
                key={card.id}
                card={card}
                index={index}
                total={hand.length}
                isSelected={selectedCard === card}
                onSelect={handleCardSelect}
                onPlay={handlePlayCard}
                canPlay={card.cost <= playerAp && !isProcessing}
                playerAp={playerAp}
              />
            ))}
          </div>
        </div>
      </div>

      {/* 底部固定区 - 专门放置结束回合按钮 */}
      <div className="fixed bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-black/80 to-transparent z-50">
        {/* 倒计时进度条 - 在按钮上方 */}
        <div className="absolute top-0 left-0 right-0 px-4 pt-2">
          <div className="max-w-md mx-auto">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-400 font-bold">回合时间</span>
              <span className={cn(
                "text-xs font-black",
                timeLeft <= 10 ? "text-danger-red" : "text-sonic-purple"
              )}>
                {timeLeft}秒
              </span>
            </div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
              <motion.div
                className={cn(
                  "h-full transition-all duration-300",
                  timeLeft > 10 
                    ? "bg-gradient-to-r from-sonic-purple to-sonic-purple/60" 
                    : "bg-gradient-to-r from-danger-red to-danger-red/60 animate-pulse"
                )}
                initial={{ width: "100%" }}
                animate={{ width: `${(timeLeft / 30) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
        </div>
        
        <div className="flex justify-center items-center h-full pt-6">
          <Button
            onClick={handleEndTurn}
            disabled={isProcessing}
            className={cn(
              "px-8 py-4 text-lg font-bold rounded-xl shadow-lg transition-all duration-300",
              isProcessing 
                ? "bg-slate-700 cursor-not-allowed"
                : "bg-gradient-to-r from-sonic-purple to-sonic-purple/80 hover:from-sonic-purple/90 hover:to-sonic-purple/70 text-white shadow-sonic-purple/40 border border-sonic-purple/50"
            )}
          >
            {isProcessing ? "处理中..." : "结束回合"}
          </Button>
        </div>
      </div>

      {/* 退出确认弹窗 */}
      <AnimatePresence>
        {showExitConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-card-darker p-6 rounded-xl border border-slate-700 max-w-sm"
            >
              <h2 className="text-xl font-bold text-slate-200 mb-4">确认退出？</h2>
              <p className="text-slate-400 mb-6">退出后当前战斗进度将丢失。</p>
              <div className="flex gap-3">
                <Button
                  variant="ghost"
                  onClick={() => setShowExitConfirm(false)}
                  className="flex-1"
                >
                  继续战斗
                </Button>
                <Button
                  onClick={() => router.push("/")}
                  className="flex-1 bg-danger-red hover:bg-danger-red/90"
                >
                  退出
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
