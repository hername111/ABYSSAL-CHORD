"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
  Heart,
  Shield,
  Zap,
  Skull,
  Sparkles,
  Send,
  X,
  Play,
  RotateCcw,
  Volume2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, zhongLvCards } from "@/lib/cards";
import { enemies } from "@/lib/game-data";
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
    { description: "共振增幅 - 本回合伤害 +3", damage: 9 }, // 6+3
    { description: "低频感染 - 全体造成 3 点伤害，附加 1 层声爆", damage: 3, sonicBlast: 1 },
  ];
  return behaviors[roll - 1];
}

// 使用真实卡牌数据，选取前 5 张
const INITIAL_HAND_CARDS: Card[] = zhongLvCards.slice(0, 5);

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

// 敌人意图组件
const EnemyIntention = ({ behavior }: { behavior: SimpleEnemyBehavior }) => {
  const getIntentionIcon = () => {
    if (behavior.damage) return <Skull className="h-5 w-5 text-danger-red" />;
    if (behavior.armor) return <Shield className="h-5 w-5 text-armor-blue" />;
    if (behavior.sonicBlast)
      return <Sparkles className="h-5 w-5 text-sonic-purple" />;
    return <Volume2 className="h-5 w-5 text-slate-400" />;
  };

  return (
    <div className="flex items-center gap-2 bg-card-darker/90 rounded-lg px-3 py-2 border border-slate-700/50">
      {getIntentionIcon()}
      <span className="text-sm text-slate-200 font-medium">
        {behavior.description}
      </span>
    </div>
  );
};

// 卡牌组件
const GameCard = ({
  card,
  selected,
  onSelect,
  disabled,
}: {
  card: Card;
  selected: boolean;
  onSelect: () => void;
  disabled: boolean;
}) => {
  const getCardTypeColor = (type: string) => {
    switch (type) {
      case 'attack':
        return "border-danger-red bg-gradient-to-br from-danger-red/20 to-card-darker";
      case 'skill':
        return "border-armor-blue bg-gradient-to-br from-armor-blue/20 to-card-darker";
      case 'ability':
        return "border-gold bg-gradient-to-br from-gold/20 to-card-darker";
      default:
        return "border-slate-600 bg-gradient-to-br from-slate-800/20 to-card-darker";
    }
  };

  const getCardTypeName = (type: string) => {
    switch (type) {
      case 'attack':
        return "攻击";
      case 'skill':
        return "技能";
      case 'ability':
        return "能力";
      default:
        return "卡牌";
    }
  };

  const getTargetLabel = (target: string) => {
    switch (target) {
      case 'single':
        return "单体";
      case 'self':
        return "自身";
      case 'aoe':
        return "群体";
      default:
        return "目标";
    }
  };

  return (
    <motion.div
      whileHover={!disabled ? { y: -16, scale: 1.08 } : {}}
      whileTap={!disabled ? { scale: 0.95 } : {}}
      className={cn(
        "relative w-36 h-52 rounded-xl cursor-pointer transition-all duration-300",
        getCardTypeColor(card.type),
        selected
          ? "ring-4 ring-sonic-purple shadow-2xl shadow-sonic-purple/40"
          : "shadow-lg",
        disabled && "opacity-50 cursor-not-allowed"
      )}
      onClick={() => !disabled && onSelect()}
    >
      {/* 费用标记 */}
      <div className="absolute -top-3 -left-3 w-10 h-10 rounded-full bg-sonic-purple flex items-center justify-center text-xl font-bold text-white border-2 border-sonic-purple/50 shadow-lg">
        {card.cost}
      </div>

      {/* 卡牌内容 */}
      <div className="p-4 pt-6 h-full flex flex-col">
        <div className="text-xs font-medium text-slate-400 mb-1">
          {getCardTypeName(card.type)} · {getTargetLabel(card.target)}
        </div>
        <h3 className="text-lg font-bold text-slate-100 mb-2 leading-tight">
          {card.name}
        </h3>
        <div className="flex-1 bg-black/30 rounded-lg p-2 text-xs text-slate-300 leading-relaxed">
          {card.effect}
        </div>
      </div>
    </motion.div>
  );
};

// 主对战界面
export default function BattleArena() {
  const [playerHP, setPlayerHP] = useState(80);
  const [playerMaxHP] = useState(80);
  const [playerArmor, setPlayerArmor] = useState(0);
  const [playerAP, setPlayerAP] = useState(3);
  const [maxAP] = useState(3);
  const [pollution, setPollution] = useState(3);
  const [hand, setHand] = useState<Card[]>([...INITIAL_HAND_CARDS]);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [enemyHP, setEnemyHP] = useState(18);
  const [enemyMaxHP] = useState(18);
  const [enemyArmor, setEnemyArmor] = useState(0);
  const [currentEnemy] = useState(enemies[0]);
  const [currentIntention, setCurrentIntention] = useState<SimpleEnemyBehavior>(
    getSimpleEnemyIntention()
  );
  const [dialogMessages, setDialogMessages] = useState<string[]>([
    "欢迎来到回响裂谷，调音师。嘶鸣游荡者正在向你逼近...",
  ]);
  const [userInput, setUserInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [turnPhase, setTurnPhase] = useState<"player" | "enemy">("player");

  // 自动滚动对话框
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [dialogMessages]);

  // 添加消息
  const addMessage = (msg: string) => {
    setDialogMessages((prev) => [...prev, msg]);
  };

  // 处理发送消息
  const handleSendMessage = () => {
    if (!userInput.trim()) return;
    addMessage(`> ${userInput}`);
    setTimeout(() => {
      addMessage("AI 裁判正在思考...");
    }, 500);
    setUserInput("");
  };

  // 处理打牌
  const handlePlayCard = () => {
    if (!selectedCard) return;
    if (playerAP < selectedCard.cost) return;

    setPlayerAP((prev) => prev - selectedCard.cost);
    setHand((prev) => prev.filter((c) => c.id !== selectedCard.id));

    let msg = `你打出了【${selectedCard.name}】`;

    // 简化效果处理
    if (selectedCard.baseDamage) {
      const damage = selectedCard.baseDamage;
      const effectiveDamage = Math.max(0, damage - enemyArmor);
      setEnemyHP((prev) => Math.max(0, prev - effectiveDamage));
      setEnemyArmor(0);
      msg += `，造成了 ${effectiveDamage} 点伤害！`;
    }
    if (selectedCard.baseArmor !== undefined) {
      const armor = selectedCard.baseArmor;
      setPlayerArmor((prev) => prev + armor);
      msg += `，获得了 ${armor} 点护甲！`;
    }
    if (selectedCard.purification !== undefined) {
      const purification = selectedCard.purification;
      setPollution((prev) => Math.max(0, prev - purification));
      msg += `，污染度降低了 ${purification}！`;
    }

    addMessage(msg);
    setSelectedCard(null);

    // 如果手牌打完，进入敌人回合
    if (hand.length <= 1) {
      setTimeout(() => {
        setTurnPhase("enemy");
        handleEnemyTurn();
      }, 1000);
    }
  };

  // 处理敌人回合
  const handleEnemyTurn = () => {
    addMessage("--- 敌人回合 ---");

    setTimeout(() => {
      let msg = `${currentEnemy.name} 行动了！`;

      if (currentIntention.damage) {
        const damage = currentIntention.damage;
        const effectiveDamage = Math.max(0, damage - playerArmor);
        setPlayerHP((prev) => Math.max(0, prev - effectiveDamage));
        setPlayerArmor(0);
        msg += ` 造成了 ${effectiveDamage} 点伤害！`;
      }
      if (currentIntention.armor !== undefined) {
        const armor = currentIntention.armor;
        setEnemyArmor((prev) => prev + armor);
        msg += ` 获得了 ${armor} 点护甲！`;
      }
      if (currentIntention.pollution !== undefined) {
        const pollution = currentIntention.pollution;
        setPollution((prev) => Math.min(30, prev + pollution));
        msg += ` 污染度上升了 ${pollution}！`;
      }

      addMessage(msg);

      // 回玩家回合
      setTimeout(() => {
        setTurnPhase("player");
        setPlayerAP(maxAP);
        setPollution((prev) => Math.min(30, prev + 1));
        setHand([...INITIAL_HAND_CARDS]);
        setCurrentIntention(getSimpleEnemyIntention());
        addMessage("--- 你的回合 ---");
      }, 1500);
    }, 1000);
  };

  // 重新掷骰
  const rerollIntention = () => {
    setCurrentIntention(getSimpleEnemyIntention());
    addMessage("重新掷骰确定敌人意图...");
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-[#0a0a0f] via-[#0f0f1a] to-[#0a0a0f] flex flex-col overflow-hidden relative">
      {/* 返回按钮 */}
      <div className="absolute top-4 left-4 z-50">
        <Link href="/">
          <Button
            variant="ghost"
            className="text-slate-400 hover:text-white hover:bg-slate-800/50"
          >
            <X className="mr-2 h-4 w-4" />
            返回主菜单
          </Button>
        </Link>
      </div>

      {/* 上层：状态栏与敌人区 */}
      <div className="flex-1 flex flex-col items-center justify-start pt-8 px-4 relative">
        {/* 污染刻度尺（右上角） */}
        <div className="absolute top-4 right-4">
          <PollutionScale current={pollution} />
        </div>

        {/* 敌人意图 */}
        <div className="mb-4">
          <EnemyIntention behavior={currentIntention} />
        </div>

        {/* 敌人区域 */}
        <motion.div
          className="flex flex-col items-center"
          animate={turnPhase === "enemy" ? { x: [0, -10, 10, -10, 0] } : {}}
          transition={{ duration: 0.5 }}
        >
          {/* 敌人头像/模型 */}
          <div className="w-40 h-40 rounded-full bg-gradient-to-br from-danger-red/30 to-sonic-purple/30 flex items-center justify-center border-2 border-danger-red/50 shadow-xl shadow-danger-red/20 mb-4">
            <Skull className="h-20 w-20 text-danger-red" />
          </div>

          {/* 敌人血条 */}
          <div className="w-64">
            <div className="flex justify-between mb-1">
              <span className="text-lg font-bold text-slate-200">
                {currentEnemy.name}
              </span>
              <span className="text-lg font-bold text-danger-red">
                {enemyHP} / {enemyMaxHP}
                {enemyArmor > 0 && (
                  <span className="text-armor-blue ml-2">
                    (+{enemyArmor} 护甲)
                  </span>
                )}
              </span>
            </div>
            <div className="h-4 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
              <div
                className="h-full bg-gradient-to-r from-danger-red to-danger-red/70 transition-all duration-500"
                style={{ width: `${(enemyHP / enemyMaxHP) * 100}%` }}
              />
            </div>
          </div>

          {/* 重新掷骰按钮 */}
          <Button
            variant="ghost"
            size="sm"
            onClick={rerollIntention}
            className="mt-2 text-slate-400 hover:text-sonic-purple"
          >
            <RotateCcw className="mr-1 h-3 w-3" />
            重新掷骰
          </Button>
        </motion.div>
      </div>

      {/* 中层：玩家状态区 */}
      <div className="flex items-center justify-center py-6 px-4">
        <motion.div
          className="flex items-center gap-6 bg-card-darker/60 rounded-2xl p-6 border border-slate-700/50"
          animate={turnPhase === "player" ? { scale: [1, 1.02, 1] } : {}}
          transition={{ duration: 2, repeat: Infinity }}
        >
          {/* 角色头像 */}
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-sonic-purple/30 to-purify-green/30 flex items-center justify-center border-2 border-sonic-purple/50 shadow-lg">
            <Sparkles className="h-12 w-12 text-sonic-purple" />
          </div>

          {/* 状态数值 */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <Heart className="h-6 w-6 text-danger-red" />
              <div className="w-40">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-300">生命值</span>
                  <span className="text-danger-red font-bold">
                    {playerHP} / {playerMaxHP}
                  </span>
                </div>
                <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-danger-red to-danger-red/70 transition-all duration-300"
                    style={{ width: `${(playerHP / playerMaxHP) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Shield className="h-6 w-6 text-armor-blue" />
              <div className="w-40">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-300">护甲</span>
                  <span className="text-armor-blue font-bold">{playerArmor}</span>
                </div>
                <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-armor-blue to-armor-blue/70"
                    style={{ width: `${Math.min(100, playerArmor * 5)}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Zap className="h-6 w-6 text-gold" />
              <div className="w-40">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-300">行动力</span>
                  <span className="text-gold font-bold">
                    {playerAP} / {maxAP}
                  </span>
                </div>
                <div className="flex gap-1">
                  {[...Array(maxAP)].map((_, i) => (
                    <div
                      key={i}
                      className={cn(
                        "w-8 h-8 rounded-full transition-all duration-300",
                        i < playerAP
                          ? "bg-gradient-to-br from-gold to-gold/60 border-2 border-gold/50"
                          : "bg-slate-800 border-2 border-slate-700"
                      )}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 回合指示器 */}
          <div
            className={cn(
              "px-4 py-2 rounded-lg font-bold text-lg",
              turnPhase === "player"
                ? "bg-purify-green/20 text-purify-green border border-purify-green/50"
                : "bg-danger-red/20 text-danger-red border border-danger-red/50"
            )}
          >
            {turnPhase === "player" ? "你的回合" : "敌人回合"}
          </div>
        </motion.div>
      </div>

      {/* 下层：手牌区与AI裁判对话框 */}
      <div className="h-[40%] bg-gradient-to-t from-[#0a0a0f] via-[#0d0d15] to-transparent border-t border-slate-800/50">
        <div className="h-full flex">
          {/* AI 裁判对话框（左侧） */}
          <div className="w-80 h-full bg-card-darker/40 border-r border-slate-800/50 flex flex-col">
            <div className="p-3 border-b border-slate-800/50 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-sonic-purple" />
              <span className="font-medium text-slate-200">AI 裁判</span>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {dialogMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "text-sm p-2 rounded-lg",
                    msg.startsWith(">")
                      ? "bg-sonic-purple/20 text-slate-200"
                      : msg.startsWith("---")
                      ? "bg-slate-800/50 text-slate-400 font-medium text-center"
                      : "bg-card-darker/60 text-slate-300"
                  )}
                >
                  {msg}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            <div className="p-3 border-t border-slate-800/50">
              <div className="flex gap-2">
                <Input
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                  placeholder="向AI裁判提问..."
                  className="bg-slate-900/50 border-slate-700 text-sm"
                />
                <Button
                  size="icon"
                  onClick={handleSendMessage}
                  className="bg-sonic-purple hover:bg-sonic-purple/80"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* 手牌展示区（右侧） */}
          <div className="flex-1 flex flex-col p-4">
            {/* 手牌上方控制区 */}
            <div className="flex items-center justify-between mb-4">
              <span className="text-slate-400 text-sm">
                手牌 ({hand.length} 张)
              </span>
              {selectedCard && (
                <Button
                  onClick={handlePlayCard}
                  disabled={playerAP < selectedCard.cost}
                  className="bg-gradient-to-r from-sonic-purple to-purify-green hover:from-sonic-purple/80 hover:to-purify-green/80 text-white font-bold"
                >
                  <Play className="mr-2 h-4 w-4" />
                  使用【{selectedCard.name}】
                </Button>
              )}
            </div>

            {/* 手牌横向排列 */}
            <div className="flex-1 flex items-center justify-center">
              <div className="flex gap-4 items-end pb-8">
                {hand.map((card) => (
                  <GameCard
                    key={card.id}
                    card={card}
                    selected={selectedCard?.id === card.id}
                    onSelect={() => setSelectedCard(card)}
                    disabled={playerAP < card.cost || turnPhase !== "player"}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
