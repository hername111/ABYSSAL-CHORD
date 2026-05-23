"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart,
  Shield,
  Zap,
  Skull,
  Sparkles,
  Send,
  RotateCcw,
  BookOpen,
  X,
  AlertTriangle,
  ScrollText,
  Sword,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
      initial={{ 
        opacity: 0, 
        y: y, 
        x: x, 
        scale: 0.5,
        rotate: 0
      }}
      animate={{ 
        opacity: [0, 1, 0], 
        y: y - 80, 
        scale: [0.8, 1.4, 1]
      }}
      transition={{ duration: 1.2, ease: "easeOut" }}
      className={cn(
        "absolute pointer-events-none text-3xl font-black",
        color
      )}
    >
      -{damage}
    </motion.div>
  );
};

// 声波特效组件
const SonicWaveEffect = ({ active }: { active: boolean }) => {
  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ opacity: 0, x: 100, scale: 0.5 }}
          animate={{ 
            opacity: [0, 1, 0], 
            x: [150, 400, 600],
            scale: [0.5, 1.2, 0.8]
          }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: "easeIn" }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
        >
          <div className="relative">
            {/* 主声波弧 */}
            <motion.div
              className="absolute -top-8 -left-24 w-48 h-24 border-t-4 border-l-4 border-r-4 border-sonic-purple"
              style={{ borderRadius: "96px 96px 0 0", borderBottom: "none" }}
              animate={{
                rotate: [0, 15, 0]
              }}
            />
            {/* 声波光晕 */}
            <motion.div
              className="absolute -top-4 -left-20 w-40 h-20 bg-sonic-purple/30 rounded-full blur-xl"
              animate={{
                scale: [0.8, 1.5, 0.5],
                opacity: [0.6, 0.3, 0]
              }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// 玩家角色实体（带武器）
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
        className="relative"
        animate={
          isAttacking ? { x: [0, 30, 0] } : {}
        }
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        {/* 身体主体 */}
        <div className="w-24 h-32 relative">
          {/* 身体底座/阴影 */}
          <motion.div
            className="absolute bottom-0 left-1/2 -translate-x-1/2 w-20 h-4 bg-black/40 rounded-full blur-sm"
            animate={{ scale: isAttacking ? [1, 0.8, 1] : isDefending ? [1, 1.1, 1] : 1 }}
          />

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
    <div className="flex flex-col gap-3 w-48">
      {/* HP条 */}
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-sm">
          <Heart className="h-4 w-4 text-danger-red" />
          <span className="text-slate-300">
            {hp} / {maxHp}
          </span>
        </div>
        <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-danger-red to-danger-red/70"
            initial={{ width: "100%" }}
            animate={{ width: `${hpPercent}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>

      {/* 护甲 */}
      <div className="flex items-center gap-2">
        <Shield className="h-4 w-4 text-armor-blue" />
        <span className="text-sm text-slate-300">
          <motion.span
            key={armor}
            initial={{ scale: 1 }}
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ duration: 0.3 }}
            className="text-lg font-bold text-armor-blue"
          >
            {armor}
          </motion.span>
          <span className="text-slate-500 ml-1">护甲</span>
        </span>
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

// 战术手册侧边抽屉
const TacticalManualDrawer = ({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* 背景遮罩 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* 侧边抽屉 */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-96 bg-card-darker/95 backdrop-blur-xl border-l border-slate-700/50 shadow-2xl z-50 flex flex-col"
          >
            {/* 抽屉头部 */}
            <div className="p-4 border-b border-slate-700/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-sonic-purple" />
                <h2 className="text-lg font-bold text-slate-200">战术手册</h2>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose} className="text-slate-400 hover:text-slate-200">
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Tabs 内容 */}
            <div className="flex-1 overflow-auto p-4">
              <Tabs defaultValue="rules" className="w-full">
                <TabsList className="w-full grid grid-cols-3 mb-4">
                  <TabsTrigger value="rules">规则</TabsTrigger>
                  <TabsTrigger value="cards">卡牌</TabsTrigger>
                  <TabsTrigger value="pollution">污染</TabsTrigger>
                </TabsList>

                {/* 规则Tab */}
                <TabsContent value="rules" className="space-y-4">
                  <div className="space-y-2">
                    <h3 className="text-sm font-bold text-sonic-purple flex items-center gap-2">
                      <ScrollText className="h-4 w-4" />
                      回合流程
                    </h3>
                    <div className="bg-slate-900/50 rounded-lg p-3 text-sm text-slate-400 space-y-1">
                      <p>1. 回合开始：触发 Buff</p>
                      <p>2. 掷骰：决定怪物意图</p>
                      <p>3. 抽牌与出牌：玩家行动</p>
                      <p>4. 怪物行动：结算怪物攻击</p>
                      <p>5. 弃牌重置：进入下一回合</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-sm font-bold text-danger-red flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      关键机制
                    </h3>
                    <div className="bg-slate-900/50 rounded-lg p-3 text-sm text-slate-400 space-y-1">
                      <p><span className="text-danger-red">声爆 Debuff</span>：每层回合结束时造成 1 点穿透伤害</p>
                      <p><span className="text-armor-blue">护甲</span>：优先抵扣伤害，回合结束清零</p>
                      <p><span className="text-sonic-purple">污染度</span>：每回合自动+1，怪物获得 Buff</p>
                    </div>
                  </div>
                </TabsContent>

                {/* 卡牌Tab */}
                <TabsContent value="cards" className="space-y-3">
                  <h3 className="text-sm font-bold text-slate-300 mb-3">钟律卡牌库</h3>
                  <div className="space-y-2 max-h-96 overflow-auto">
                    {zhongLvCards.map((card) => (
                      <div key={card.id} className="bg-slate-900/50 rounded-lg p-3 text-sm">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-slate-200">{card.name}</span>
                          <span className="text-sonic-purple font-bold">{card.cost}</span>
                        </div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={cn(
                            "text-xs px-2 py-0.5 rounded-full",
                            card.type === "attack" ? "bg-danger-red/20 text-danger-red" :
                            card.type === "skill" ? "bg-armor-blue/20 text-armor-blue" :
                            "bg-gold/20 text-gold"
                          )}>
                            {card.type === "attack" ? "攻击" : card.type === "skill" ? "技能" : "能力"}
                          </span>
                          <span className="text-slate-500 text-xs">{card.target === "single" ? "单体" : card.target === "aoe" ? "群体" : "自身"}</span>
                        </div>
                        <p className="text-slate-400 text-xs">{card.effect}</p>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                {/* 污染Tab */}
                <TabsContent value="pollution" className="space-y-3">
                  <h3 className="text-sm font-bold text-slate-300 mb-3">污染度等级说明</h3>
                  <div className="space-y-2">
                    {[
                      { level: "寂静期", range: "0-5", color: "text-purify-green", effect: "无额外效果" },
                      { level: "低鸣期", range: "6-12", color: "text-yellow-500", effect: "所有畸变体攻击伤害 +2" },
                      { level: "共振期", range: "13-20", color: "text-orange-500", effect: "攻击伤害 +4，怪物每回合获得 3 护甲" },
                      { level: "咆哮期", range: "21-28", color: "text-danger-red", effect: "攻击伤害 +6，玩家每回合受到 3 点穿透伤害" },
                      { level: "终焉和弦", range: "29-30", color: "text-sonic-purple", effect: "攻击伤害 +10，玩家每回合受到 5 点穿透，再增污染游戏失败" },
                    ].map((item, i) => (
                      <div key={i} className="bg-slate-900/50 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className={cn("font-bold", item.color)}>{item.level}</span>
                          <span className="text-slate-400 text-sm">{item.range}</span>
                        </div>
                        <p className="text-slate-400 text-xs">{item.effect}</p>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

// 卡牌组件
const BattleCard = ({
  card,
  isSelected,
  canPlay,
  onSelect,
  index,
}: {
  card: Card;
  isSelected: boolean;
  canPlay: boolean;
  onSelect: (card: Card) => void;
  index: number;
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
        return "from-danger-red/15 to-danger-red/5";
      case "skill":
        return "from-armor-blue/15 to-armor-blue/5";
      case "ability":
        return "from-gold/15 to-gold/5";
      default:
        return "from-slate-700/30 to-slate-800/30";
    }
  };

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{
        y: isSelected ? -32 : 0,
        x: isSelected ? 0 : 0,
        opacity: canPlay || isSelected ? 1 : 0.5,
        scale: isSelected ? 1.15 : 1,
        zIndex: isSelected ? 50 : index,
      }}
      whileHover={{ y: -16, scale: 1.08, zIndex: 50 }}
      transition={{ duration: 0.25, type: "spring", stiffness: 300, damping: 20 }}
      className={cn(
        "relative w-40 h-56 rounded-xl border-2 cursor-pointer transition-all",
        getCardBorderColor(card.type),
        canPlay && "hover:shadow-xl"
      )}
      onClick={() => canPlay && onSelect(card)}
    >
      {/* 卡牌背景 */}
      <div className={cn("absolute inset-0 rounded-xl bg-gradient-to-br", getCardBgColor(card.type))} />

      {/* 选中发光效果 */}
      {isSelected && (
        <motion.div
          className="absolute inset-[-4px] rounded-2xl"
          style={{
            boxShadow:
              card.type === "attack"
                ? "0 0 20px 8px rgba(239, 68, 68, 0.4)"
                : card.type === "skill"
                ? "0 0 20px 8px rgba(59, 130, 246, 0.4)"
                : "0 0 20px 8px rgba(234, 179, 8, 0.4)",
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        />
      )}

      {/* 费用 */}
      <div className="absolute top-2 left-2 w-8 h-8 rounded-full bg-sonic-purple/90 flex items-center justify-center border border-sonic-purple/50 shadow-lg">
        <span className="text-lg font-bold text-white">{card.cost}</span>
      </div>

      {/* 卡牌内容 */}
      <div className="relative h-full flex flex-col p-3 pt-10">
        {/* 卡牌名称 */}
        <h3 className="text-sm font-bold text-slate-200 mb-2 text-center leading-tight">
          {card.name}
        </h3>

        {/* 类型标签 */}
        <div className="flex justify-center mb-2">
          <span
            className={cn(
              "text-xs px-2 py-0.5 rounded-full font-medium",
              card.type === "attack" && "bg-danger-red/20 text-danger-red",
              card.type === "skill" && "bg-armor-blue/20 text-armor-blue",
              card.type === "ability" && "bg-gold/20 text-gold"
            )}
          >
            {card.type === "attack"
              ? "攻击"
              : card.type === "skill"
              ? "技能"
              : "能力"}
          </span>
        </div>

        {/* 效果描述 */}
        <div className="flex-1 overflow-hidden">
          <p className="text-xs text-slate-400 leading-relaxed line-clamp-6">
            {card.effect}
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export default function BattleArena() {
  // 游戏状态
  const [playerHp, setPlayerHp] = useState(80);
  const [playerMaxHp] = useState(80);
  const [playerArmor, setPlayerArmor] = useState(0);
  const [playerAp, setPlayerAp] = useState(3);
  const [playerMaxAp] = useState(3);
  const [enemyHp, setEnemyHp] = useState(40);
  const [enemyMaxHp] = useState(40);
  const [enemyArmor, setEnemyArmor] = useState(0);
  const [pollutionLevel, setPollutionLevel] = useState(3);
  const [turn, setTurn] = useState(1);
  const [hand, setHand] = useState<Card[]>(INITIAL_HAND_CARDS);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [currentIntention, setCurrentIntention] = useState<SimpleEnemyBehavior>(
    getSimpleEnemyIntention()
  );
  const [dialogMessages, setDialogMessages] = useState([
    { id: 1, text: "战斗开始！嘶鸣游荡者正在向你逼近...", isTyping: false },
  ]);
  const [isManualOpen, setIsManualOpen] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  // 动画状态
  const [isAttacking, setIsAttacking] = useState(false);
  const [isDefending, setIsDefending] = useState(false);
  const [isEnemyHit, setIsEnemyHit] = useState(false);
  const [showSonicWave, setShowSonicWave] = useState(false);
  const [damageNumbers, setDamageNumbers] = useState<{ id: number; damage: number; x: number; y: number; color?: string }[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // 选择卡牌
  const handleCardSelect = (card: Card) => {
    if (selectedCard?.id === card.id) {
      setSelectedCard(null);
    } else if (card.cost <= playerAp && !isProcessing) {
      setSelectedCard(card);
    }
  };

  // 使用卡牌
  const handlePlayCard = () => {
    if (!selectedCard) return;

    setIsProcessing(true);
    setSelectedCard(null);

    // 消耗AP
    setPlayerAp((prev) => prev - selectedCard.cost);

    // 移除打出的手牌
    setHand((prev) => prev.filter((c) => c.id !== selectedCard.id));

    // 判断卡牌类型并触发对应动画
    if (selectedCard.type === "attack") {
      setIsAttacking(true);
      
      // 延迟显示声波特效
      setTimeout(() => {
        setShowSonicWave(true);
        
        setTimeout(() => {
          setShowSonicWave(false);
        }, 400);
      }, 150);

      setTimeout(() => {
        const damage = selectedCard.baseDamage || 5;
        setIsEnemyHit(true);

        // 添加伤害数字
        setDamageNumbers(prev => [...prev, {
          id: Date.now(),
          damage: damage,
          x: 450,
          y: 150,
          color: "text-danger-red"
        }]);

        // 伤害结算
        if (enemyArmor > 0) {
          if (damage <= enemyArmor) {
            setEnemyArmor((prev) => prev - damage);
          } else {
            const remainingDamage = damage - enemyArmor;
            setEnemyArmor(0);
            setEnemyHp((prev) => Math.max(0, prev - remainingDamage));
          }
        } else {
          setEnemyHp((prev) => Math.max(0, prev - damage));
        }

        setDialogMessages((prev) => [
          ...prev,
          {
            id: Date.now(),
            text: `你打出【${selectedCard.name}】，造成了 ${damage} 点伤害！`,
            isTyping: true,
          },
        ]);

        setTimeout(() => {
          setIsAttacking(false);
          setIsEnemyHit(false);
          setIsProcessing(false);
        }, 600);
      }, 500);
    } else if (selectedCard.type === "skill") {
      setIsDefending(true);

      setTimeout(() => {
        const armor = selectedCard.baseArmor || 5;
        const purify = selectedCard.purification || 0;

        setPlayerArmor((prev) => prev + armor);
        if (purify > 0) {
          setPollutionLevel((prev) => Math.max(0, prev - purify));
        }

        setDialogMessages((prev) => [
          ...prev,
          {
            id: Date.now(),
            text: `你打出【${selectedCard.name}】，获得了 ${armor} 点护甲${
              purify > 0 ? `，污染度下降 ${purify}` : ""
            }！`,
            isTyping: true,
          },
        ]);

        setTimeout(() => {
          setIsDefending(false);
          setIsProcessing(false);
        }, 600);
      }, 300);
    }
  };

  // 结束回合
  const handleEndTurn = () => {
    setIsProcessing(true);

    // 敌人行动
    const { damage = 0, armor = 0, pollution = 0 } = currentIntention;

    if (damage > 0) {
      if (playerArmor > 0) {
        if (damage <= playerArmor) {
          setPlayerArmor((prev) => prev - damage);
        } else {
          const remainingDamage = damage - playerArmor;
          setPlayerArmor(0);
          setPlayerHp((prev) => Math.max(0, prev - remainingDamage));
        }
      } else {
        setPlayerHp((prev) => Math.max(0, prev - damage));
      }

      // 添加玩家伤害数字
      setDamageNumbers(prev => [...prev, {
        id: Date.now(),
        damage: damage,
        x: 200,
        y: 150,
        color: "text-danger-red"
      }]);

      setDialogMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          text: `嘶鸣游荡者发动攻击！你受到了 ${damage} 点伤害！`,
          isTyping: true,
        },
      ]);
    }

    if (armor > 0) {
      setEnemyArmor((prev) => prev + armor);
    }

    if (pollution > 0) {
      setPollutionLevel((prev) => Math.min(30, prev + pollution));
    }

    // 新回合重置
    setTimeout(() => {
      setTurn((prev) => prev + 1);
      setPlayerAp(playerMaxAp);
      setPlayerArmor(0);
      setCurrentIntention(getSimpleEnemyIntention());
      setHand(INITIAL_HAND_CARDS.slice(0, 6));
      setIsProcessing(false);

      setDialogMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          text: `第 ${turn + 1} 回合开始！`,
          isTyping: true,
        },
      ]);
    }, 1000);
  };

  return (
    <div className="min-h-screen w-full flex flex-col relative overflow-hidden bg-gradient-to-br from-[#0a0a0f] via-[#0f0f1a] to-[#0a0a0f]">
      {/* 背景声波动画 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-sonic-purple/10 via-transparent to-transparent animate-sonic-pulse" />
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-sonic-purple/20 rounded-full blur-3xl animate-sonic-pulse" style={{ animationDelay: "0s" }} />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purify-green/15 rounded-full blur-3xl animate-sonic-pulse" style={{ animationDelay: "1s" }} />
        </div>
      </div>

      {/* 伤害数字飘出 */}
      {damageNumbers.map((d) => (
        <DamageNumber key={d.id} damage={d.damage} x={d.x} y={d.y} color={d.color} />
      ))}

      {/* 顶部状态栏 */}
      <div className="relative z-10 p-4">
        <div className="flex justify-between items-start">
          {/* 左上角：退出按钮 */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowExitConfirm(true)}
            className="text-slate-500 hover:text-slate-300 hover:bg-slate-800/50"
          >
            <RotateCcw className="h-5 w-5" />
          </Button>

          {/* 右上角：污染刻度尺 */}
          <PollutionScale current={pollutionLevel} />

          {/* 右上角：战术手册按钮 */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsManualOpen(true)}
            className="text-slate-300 hover:text-white hover:bg-sonic-purple/20"
          >
            <BookOpen className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* 中央战斗舞台 */}
      <div className="flex-1 relative flex items-center justify-center px-8">
        <div className="relative w-full max-w-4xl h-full flex items-center justify-between">
          {/* 玩家角色（左） */}
          <div className="flex flex-col items-center gap-4">
            <PlayerCharacter
              isAttacking={isAttacking}
              isDefending={isDefending}
            />
            <PlayerStatusBar
              hp={playerHp}
              maxHp={playerMaxHp}
              armor={playerArmor}
              ap={playerAp}
              maxAp={playerMaxAp}
            />
          </div>

          {/* 中央区域 - 声波特效 */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <SonicWaveEffect active={showSonicWave} />
          </div>

          {/* 敌人角色（右） */}
          <div className="flex flex-col items-center gap-4">
            <div className="flex flex-col items-center gap-2">
              <div className="mb-2">
                <div className="text-sm text-slate-400 mb-1">意图：{currentIntention.description}</div>
              </div>
              <EnemyCharacter
                isHit={isEnemyHit}
                name="嘶鸣游荡者"
              />
              <EnemyStatusBar
                hp={enemyHp}
                maxHp={enemyMaxHp}
                armor={enemyArmor}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 底部手牌区 */}
      <div className="relative z-10 bg-gradient-to-t from-[#0a0a0f] via-[#0a0a0f]/95 to-transparent">
        {/* AI裁判对话框 */}
        <div className="absolute left-4 bottom-48 z-20">
          <div className="bg-black/60 backdrop-blur-md rounded-lg border border-slate-700/50 p-4 max-w-md">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-sonic-purple" />
              <span className="text-sm font-bold text-sonic-purple">AI 裁判</span>
            </div>
            <div className="text-sm text-slate-300 min-h-[60px] max-h-24 overflow-y-auto">
              {dialogMessages.slice(-2).map((msg, i) => (
                <div key={msg.id} className={i > 0 ? "mt-2" : ""}>
                  <TypewriterText text={msg.text} isTyping={msg.isTyping && i === dialogMessages.length - 1} />
                  {msg.isTyping && i === dialogMessages.length - 1 && (
                    <span className="inline-block w-2 h-4 bg-sonic-purple ml-1 animate-pulse" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 手牌区域 */}
        <div className="pt-12 pb-8 px-4">
          <div className="flex flex-col items-center gap-4">
            {/* 手牌 */}
            <div className="flex items-end justify-center relative">
              {hand.map((card, index) => (
                <div
                  key={card.id}
                  style={{
                    zIndex: index,
                    transform: `translateX(${(index - hand.length / 2) * -8}px)`,
                  }}
                >
                  <BattleCard
                    card={card}
                    isSelected={selectedCard?.id === card.id}
                    canPlay={card.cost <= playerAp && !isProcessing}
                    onSelect={handleCardSelect}
                    index={index}
                  />
                </div>
              ))}
            </div>

            {/* 操作按钮 */}
            <div className="flex items-center gap-4">
              {selectedCard && (
                <Button
                  onClick={handlePlayCard}
                  disabled={isProcessing}
                  className="bg-gradient-to-r from-sonic-purple to-purify-green hover:from-sonic-purple/80 hover:to-purify-green/80 text-white shadow-lg shadow-sonic-purple/30"
                >
                  <Sword className="h-4 w-4 mr-2" />
                  使用卡牌
                </Button>
              )}
              <Button
                variant="secondary"
                onClick={handleEndTurn}
                disabled={isProcessing}
              >
                结束回合
              </Button>
            </div>

            {/* 回合计数器 */}
            <div className="text-slate-400 text-sm">
              第 <span className="text-sonic-purple font-bold">{turn}</span> 回合
            </div>
          </div>
        </div>
      </div>

      {/* 战术手册抽屉 */}
      <TacticalManualDrawer
        isOpen={isManualOpen}
        onClose={() => setIsManualOpen(false)}
      />

      {/* 退出确认弹窗 */}
      <AnimatePresence>
        {showExitConfirm && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
              onClick={() => setShowExitConfirm(false)}
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card-darker rounded-xl border border-slate-700/50 p-6 z-50 w-96"
            >
              <h3 className="text-xl font-bold text-slate-200 mb-4">确认退出？</h3>
              <p className="text-slate-400 mb-6">确定要返回主菜单吗？当前战斗进度将丢失。</p>
              <div className="flex gap-3 justify-end">
                <Button variant="secondary" onClick={() => setShowExitConfirm(false)}>
                  继续战斗
                </Button>
                <Link href="/">
                  <Button variant="destructive">退出</Button>
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
