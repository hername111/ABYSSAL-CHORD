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
  Volume2,
  User,
  Crosshair,
  ArrowRight,
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

// 敌人意图组件
const EnemyIntention = ({ behavior }: { behavior: SimpleEnemyBehavior }) => {
  return (
    <div className="flex items-center gap-2 bg-card-darker/80 rounded-lg px-3 py-2 border border-slate-700/50">
      <Crosshair className="h-4 w-4 text-sonic-purple" />
      <span className="text-sm text-slate-300">{behavior.description}</span>
    </div>
  );
};

// 角色Avatar组件
const PlayerAvatar = ({
  isAnimating,
  animType,
}: {
  isAnimating: boolean;
  animType: "attack" | "defend" | null;
}) => {
  return (
    <div className="relative">
      <motion.div
        className="w-32 h-32 bg-gradient-to-br from-sonic-purple/30 to-purify-green/30 rounded-2xl flex items-center justify-center border-2 border-sonic-purple/50 shadow-xl shadow-sonic-purple/20"
        animate={
          isAnimating && animType === "attack"
            ? { x: [0, 30, 0] }
            : isAnimating && animType === "defend"
            ? { scale: [1, 1.15, 1] }
            : {}
        }
        transition={{
          duration: 0.4,
          ease: "easeOut",
        }}
      >
        <User className="h-16 w-16 text-sonic-purple" />
        {isAnimating && animType === "defend" && (
          <motion.div
            className="absolute inset-0 rounded-2xl border-4 border-armor-blue"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1.2, opacity: [0.8, 0] }}
            transition={{ duration: 0.6 }}
          />
        )}
      </motion.div>
    </div>
  );
};

// 敌人Avatar组件
const EnemyAvatar = ({
  isHit,
  name,
}: {
  isHit: boolean;
  name: string;
}) => {
  return (
    <div className="relative">
      <motion.div
        className={cn(
          "w-32 h-32 bg-gradient-to-br from-danger-red/30 to-sonic-purple/30 rounded-2xl flex items-center justify-center border-2 border-danger-red/50 shadow-xl shadow-danger-red/20",
          isHit && "bg-danger-red/60"
        )}
        animate={
          isHit
            ? {
                x: [0, -8, 8, -8, 8, 0],
                scale: [1, 1.05, 1],
              }
            : {}
        }
        transition={{ duration: 0.5 }}
      >
        <Skull className="h-16 w-16 text-danger-red" />
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
          <span className="text-lg font-bold text-armor-blue">{armor}</span>
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
  const [userInput, setUserInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // 动画状态
  const [playerAnimType, setPlayerAnimType] = useState<"attack" | "defend" | null>(null);
  const [playerAnimating, setPlayerAnimating] = useState(false);
  const [enemyHit, setEnemyHit] = useState(false);
  const [armorBounce, setArmorBounce] = useState(false);

  // 选择卡牌
  const handleCardSelect = (card: Card) => {
    if (selectedCard?.id === card.id) {
      setSelectedCard(null);
    } else if (card.cost <= playerAp) {
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
      setPlayerAnimType("attack");
      setPlayerAnimating(true);

      setTimeout(() => {
        const damage = selectedCard.baseDamage || 5;
        setEnemyHit(true);

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
          setPlayerAnimating(false);
          setPlayerAnimType(null);
          setEnemyHit(false);
          setIsProcessing(false);
        }, 600);
      }, 300);
    } else if (selectedCard.type === "skill") {
      setPlayerAnimType("defend");
      setPlayerAnimating(true);
      setArmorBounce(true);

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
          setPlayerAnimating(false);
          setPlayerAnimType(null);
          setArmorBounce(false);
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

  // 发送消息给AI裁判
  const handleSendMessage = async () => {
    if (!userInput.trim()) return;

    const messageText = userInput;
    setUserInput("");
    setDialogMessages((prev) => [
      ...prev,
      { id: Date.now(), text: `你: ${messageText}`, isTyping: false },
    ]);

    try {
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: messageText }],
        }),
      });

      if (!response.ok) throw new Error("API请求失败");

      const reader = response.body?.getReader();
      if (!reader) return;

      let aiMessage = "";
      const decoder = new TextDecoder();
      const messageId = Date.now();

      setDialogMessages((prev) => [
        ...prev,
        { id: messageId, text: "", isTyping: true },
      ]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n").filter((line) => line.trim());

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.content) {
                aiMessage += data.content;
                setDialogMessages((prev) =>
                  prev.map((m) =>
                    m.id === messageId ? { ...m, text: aiMessage } : m
                  )
                );
              }
            } catch (e) {
              // 忽略解析错误
            }
          }
        }
      }

      setDialogMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, isTyping: false } : m
        )
      );
    } catch (error) {
      console.error("AI裁判连接失败:", error);
      setDialogMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          text: "AI裁判暂时连接失败，请稍后再试。",
          isTyping: false,
        },
      ]);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSendMessage();
  };

  return (
    <div className="min-h-screen w-full flex flex-col relative overflow-hidden bg-gradient-to-br from-[#0a0a0f] via-[#0f0f1a] to-[#0a0a0f]">
      {/* 背景声波动画 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-sonic-purple/15"
            style={{
              width: `${400 + i * 300}px`,
              height: `${400 + i * 300}px`,
            }}
            animate={{
              scale: [1, 1.08, 1],
              opacity: [0.3, 0.1, 0.3],
            }}
            transition={{
              duration: 5 + i * 0.8,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      {/* 顶部状态栏 */}
      <div className="relative z-10 flex justify-between items-start p-4">
        {/* 返回按钮 */}
        <Link href="/" className="opacity-60 hover:opacity-100 transition-opacity">
          <Button variant="ghost" className="text-slate-400 hover:text-slate-200">
            <RotateCcw className="h-4 w-4 mr-2" />
            返回菜单
          </Button>
        </Link>

        {/* 污染刻度尺 */}
        <PollutionScale current={pollutionLevel} />
      </div>

      {/* 战斗舞台 - 上中下三层布局 */}
      <div className="flex-1 relative z-10 flex flex-col">
        {/* 上层：敌人区 */}
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <EnemyIntention behavior={currentIntention} />

          <div className="flex flex-col items-center gap-2">
            <EnemyAvatar isHit={enemyHit} name="嘶鸣游荡者" />
            <EnemyStatusBar hp={enemyHp} maxHp={enemyMaxHp} armor={enemyArmor} />
          </div>
        </div>

        {/* 中层：玩家区与敌人区之间的空白地带 */}
        <div className="h-16"></div>

        {/* 下层：玩家区 */}
        <div className="flex items-end justify-center gap-12 pb-8">
          <div className="flex flex-col items-center gap-4">
            <PlayerAvatar isAnimating={playerAnimating} animType={playerAnimType} />
            <PlayerStatusBar
              hp={playerHp}
              maxHp={playerMaxHp}
              armor={playerArmor}
              ap={playerAp}
              maxAp={playerMaxAp}
            />
          </div>

          <div className="flex flex-col items-center gap-3">
            <div className="text-center">
              <span className="text-slate-400 text-sm">第</span>
              <span className="text-sonic-purple text-2xl font-bold mx-2">{turn}</span>
              <span className="text-slate-400 text-sm">回合</span>
            </div>
            {selectedCard && (
              <Button
                onClick={handlePlayCard}
                disabled={isProcessing}
                className="bg-gradient-to-r from-sonic-purple to-purify-green hover:from-sonic-purple/80 hover:to-purify-green/80 text-white border border-sonic-purple/50 shadow-lg shadow-sonic-purple/30"
              >
                <Sparkles className="mr-2 h-4 w-4" />
                使用卡牌
              </Button>
            )}
            <Button
              onClick={handleEndTurn}
              disabled={isProcessing}
              variant="secondary"
              className="bg-card-darker/80 border border-slate-700/50"
            >
              <ArrowRight className="mr-2 h-4 w-4" />
              结束回合
            </Button>
          </div>
        </div>
      </div>

      {/* 手牌区 */}
      <div className="relative z-20 bg-gradient-to-t from-[#0a0a0f] via-[#0a0a0f]/95 to-transparent pt-8 pb-4 border-t border-slate-800/30">
        <div className="flex justify-center items-end gap-[-20px] px-8 h-64 overflow-visible">
          {hand.map((card, index) => (
            <div key={card.id} className="relative" style={{ marginLeft: index > 0 ? "-32px" : "0" }}>
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
      </div>

      {/* AI 裁判对话框 */}
      <div className="absolute left-6 bottom-6 z-30 w-80">
        <div className="bg-black/60 backdrop-blur-md rounded-xl border border-slate-700/50 shadow-2xl overflow-hidden">
          {/* 标题栏 */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-700/30 bg-card-darker/50">
            <Volume2 className="h-4 w-4 text-sonic-purple animate-pulse" />
            <span className="text-sm font-medium text-slate-300">AI 裁判</span>
          </div>

          {/* 消息区域 */}
          <div className="h-32 overflow-y-auto p-4 space-y-3">
            {dialogMessages.slice(-4).map((msg) => (
              <div key={msg.id} className="text-sm text-slate-300 leading-relaxed">
                <TypewriterText text={msg.text} isTyping={msg.isTyping} />
                {msg.isTyping && (
                  <span className="inline-block w-2 h-4 bg-sonic-purple ml-1 animate-pulse align-middle" />
                )}
              </div>
            ))}
          </div>

          {/* 输入区域 */}
          <div className="p-3 border-t border-slate-700/30 bg-card-darker/30">
            <div className="flex gap-2">
              <Input
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="询问规则..."
                className="bg-slate-800/50 border-slate-700/50 text-sm"
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
      </div>
    </div>
  );
}
