"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
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
  DoorOpen,
  TrendingUp,
  TrendingDown,
  Sparkles,
  Target,
  User,
  MessageSquare,
  Send,
  Trash2,
  Bot,
} from "lucide-react";
import { Card, zhongLvCards } from "@/lib/cards";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card as UICard,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MultiplayerGameState, AbilityType, ActiveAbility } from "@/lib/multiplayer/types";
import { createMultiplayerWsConnection } from "@/lib/multiplayer/ws-client";
import { useBGM } from "@/hooks/useBGM";
import { useSoundEffects } from "@/hooks/useSoundEffects";

// 带唯一实例 ID 的卡牌类型
interface CardWithUid extends Card {
  uid: string;
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

// 能力名称和描述映射
const abilityNames: Record<AbilityType, string> = {
  FREQUENCY_ANCHOR: "频率锚定",
  LOW_FREQUENCY_RESONANCE: "低频共振",
  PAIN_ECHO: "痛觉回响",
  FINAL_TUNING: "终末定音",
};

const abilityDescriptions: Record<AbilityType, string> = {
  FREQUENCY_ANCHOR: "每回合开始时获得3点护甲",
  LOW_FREQUENCY_RESONANCE: "每获得5点护甲时，对敌人造成3点声波伤害",
  PAIN_ECHO: "每受到1点来自自身卡牌的伤害，下一张攻击牌伤害+1（最多叠加至+8）",
  FINAL_TUNING: "当你的生命值降至20以下时，你所有攻击牌伤害+5，但你每回合结束受到2点穿透伤害",
};

// 能力图标映射
const abilityIcons: Record<AbilityType, React.ElementType> = {
  FREQUENCY_ANCHOR: Shield,
  LOW_FREQUENCY_RESONANCE: Sparkles,
  PAIN_ECHO: Swords,
  FINAL_TUNING: Skull,
};

// 全局常量
const MAX_HAND_SIZE = 6;
const DRAW_PER_TURN = 2;
const TURN_DURATION = 30;

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

// 伤害数字组件
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
      transition={{ duration: 0.8, ease: "easeOut" }}
    >
      {type === 'ARMOR' ? (
        <Shield className="w-8 h-8" />
      ) : (
        <Sword className="w-8 h-8" />
      )}
      <span>-{amount}</span>
    </motion.div>
  );
};

// 飘字类型定义
type FloatingNumber = {
  id: string;
  amount: number;
  type: 'HP' | 'ARMOR';
  target: 'ME' | 'ENEMY';
};

// 全局飘字ID计数器
let popupIdCounter = 0;

// 独立的浮动文本生成器函数
const createAddFloatingText = (setFloatingNumbers: React.Dispatch<React.SetStateAction<FloatingNumber[]>>) => {
  return (target: 'ME' | 'ENEMY', amount: number, type: 'HP' | 'ARMOR') => {
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

// 通用的实体状态面板组件
const EntityStatusPanel = ({
  entity,
  isEnemy = false,
  playerName,
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

  const allStatusEffects = [...entity.buffs, ...entity.debuffs];

  return (
    <div className="w-48 space-y-2">
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

// 手牌组件
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
  const getBorderColor = (type: string) => {
    switch (type) {
      case "attack": return "border-danger-red/80";
      case "skill": return "border-armor-blue/80";
      case "ability": return "border-gold/80";
      default: return "border-slate-60";
    }
  };

  const getBgColor = (type: string) => {
    switch (type) {
      case "attack": return "from-red-950/80 to-red-900/60";
      case "skill": return "from-blue-950/80 to-blue-900/60";
      case "ability": return "from-yellow-950/80 to-yellow-900/60";
      default: return "from-card-darker to-slate-80";
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "attack": return "攻击";
      case "skill": return "技能";
      case "ability": return "能力";
      default: return "基础";
    }
  };

  const getTypeLabelColor = (type: string) => {
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

export default function MultiplayerBattle() {
  // 播放联机模式背景音乐
  useBGM("/sounds/bgm_multi.mp3");
  const { 
    playNormalAttack, 
    playFreezeAbility, 
    playShieldBlock, 
    playRealAttack, 
    playEeeee, 
    playVictory, 
    playFail 
  } = useSoundEffects();
  
  // 用于记录上一次的状态，避免重复播放音效
  const prevGameStateRef = useRef<any>(null);
  const hasPlayedEndSoundRef = useRef(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const roomId = searchParams.get('roomId') || '';
  const playerId = searchParams.get('playerId') || '';
  const playerName = searchParams.get('playerName') || '玩家';

  // WebSocket 连接
  const wsRef = useRef<ReturnType<typeof createMultiplayerWsConnection> | null>(null);
  const [gameState, setGameState] = useState<MultiplayerGameState | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(true);

  // 使用 useRef 来管理 uid 计数器
  const uidCounterRef = useRef(0);
  
  // UI状态
  const [selectedCardUid, setSelectedCardUid] = useState<string | null>(null);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showEnergyWarning, setShowEnergyWarning] = useState(false);
  const [showCardPlayEffect, setShowCardPlayEffect] = useState<{ show: boolean; type: "attack" | "skill" }>({ show: false, type: "attack" });
  // 本地剑动画状态（用于控制动画显示时长）
  const [showMySwordSwing, setShowMySwordSwing] = useState(false);
  const [showEnemySwordSwing, setShowEnemySwordSwing] = useState(false);
  // 用于记录上一次的状态，避免无限循环
  const prevMySwordSwingRef = useRef(false);
  const prevEnemySwordSwingRef = useRef(false);
  
  // AI裁判对话框状态
  const [showAgentDialog, setShowAgentDialog] = useState(false);
  const [agentMessages, setAgentMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [agentInput, setAgentInput] = useState('');
  const [isAgentLoading, setIsAgentLoading] = useState(false);
  const agentMessagesEndRef = useRef<HTMLDivElement>(null);
  
  // 飘字状态 - 单一数据源，统一管理所有飘字
  const [floatingNumbers, setFloatingNumbers] = useState<FloatingNumber[]>([]);
  const addFloatingText = createAddFloatingText(setFloatingNumbers);
  


  
  // 倒计时状态
  const [turnTimeLeft, setTurnTimeLeft] = useState(TURN_DURATION);
  
  // 本地回合状态（用于倒计时）
  const [turn, setTurn] = useState(1);

  // 连接到游戏服务器
  useEffect(() => {
    if (!roomId || !playerId) {
      router.push('/lobby');
      return;
    }

    const ws = createMultiplayerWsConnection({
      roomId,
      playerId,
      playerName,
      onGameStateUpdate: (state) => {
        setGameState(state);
        setTurn(state.turnNumber);
        setIsJoining(false);
      },
      onOpen: () => {
        setIsConnected(true);
        setConnectionError(null);
      },
      onClose: () => {
        setIsConnected(false);
      },
      onError: (error) => {
        setConnectionError(error);
      },
    });
    wsRef.current = ws;

    return () => {
      ws.close();
    };
  }, [roomId, playerId, playerName, router]);

  // 获取当前玩家
  const getCurrentPlayer = useCallback(() => {
    if (!gameState) return null;
    return gameState.players[playerId] || null;
  }, [gameState, playerId]);

  // 获取敌方玩家
  const getEnemyPlayer = useCallback(() => {
    if (!gameState) return null;
    return Object.values(gameState.players).find(p => p.id !== playerId) || null;
  }, [gameState, playerId]);

  // 检查是否是我的回合
  const isMyTurn = useCallback(() => {
    if (!gameState) return false;
    return gameState.currentPlayerId === playerId;
  }, [gameState, playerId]);

  // 处理出牌
  const handlePlayCard = useCallback((cardUid: string) => {
    if (!gameState || !wsRef.current || !isMyTurn()) return;
    
    const currentPlayer = getCurrentPlayer();
    if (!currentPlayer) return;

    // 查找卡牌
    const cardIndex = currentPlayer.hand.findIndex((c, index) => `${c.id}_${index}` === cardUid);
    if (cardIndex === -1) return;
    
    const card = currentPlayer.hand[cardIndex];
    if (!card) return;

    // 检查AP是否足够
    if (currentPlayer.ap < card.cost) return;

    // 显示打牌图标效果
    const effectType = card.type === "attack" ? "attack" : "skill";
    setShowCardPlayEffect({ show: true, type: effectType });
    
    // 播放出牌音效
    if (card.type === "attack") {
      playNormalAttack();
    } else {
      playFreezeAbility();
    }



    // 发送出牌消息
    wsRef.current.sendPlayCard(card.id);
    setSelectedCardUid(null);
  }, [gameState, getCurrentPlayer, isMyTurn, playerId, playNormalAttack, playFreezeAbility]);

  // 处理结束回合
  const handleEndTurn = useCallback(() => {
    if (!wsRef.current || !isMyTurn()) return;
    wsRef.current.sendEndTurn();
    setSelectedCardUid(null);
  }, [isMyTurn]);

  // 倒计时逻辑
  useEffect(() => {
    if (!gameState) {
      setTurnTimeLeft(TURN_DURATION);
      return;
    }

    setTurnTimeLeft(TURN_DURATION);

    const interval = setInterval(() => {
      setTurnTimeLeft((prev) => {
        if (prev <= 1) {
          if (isMyTurn()) {
            handleEndTurn();
          }
          return TURN_DURATION;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [turn, isMyTurn, handleEndTurn]);

  // 监听游戏状态变化，管理剑挥舞动画和音效
  useEffect(() => {
    if (!gameState) return;

    // 第一次只保存状态，不做比较
    if (!prevGameStateRef.current) {
      prevGameStateRef.current = gameState;
      return;
    }

    const currentPlayer = getCurrentPlayer();
    const enemy = getEnemyPlayer();
    
    // 检测游戏结束，播放对应音效
    if (gameState.phase === 'ended' && !hasPlayedEndSoundRef.current) {
      hasPlayedEndSoundRef.current = true;
      // 检查当前玩家是否是赢家
      if (currentPlayer?.isWinner) {
        playVictory();
      } else {
        playFail();
      }
    }
    
    // 检测自己受伤，播放对应音效和飘字
    if (currentPlayer && prevGameStateRef.current) {
      const prevPlayer = prevGameStateRef.current.players[playerId];
      if (prevPlayer) {
        const prevHp = prevPlayer.hp;
        const prevArmor = prevPlayer.armor;
        const currentHp = currentPlayer.hp;
        const currentArmor = currentPlayer.armor;
        
        // 检测到 hp 或 armor 变化，说明受到了伤害
        if (prevHp !== currentHp || prevArmor !== currentArmor) {
          // 计算伤害相关数值
          const armorLost = prevArmor - currentArmor;
          const hpLost = prevHp - currentHp;
          const totalDamage = armorLost + hpLost;
          
          if (totalDamage > 0) {
            // 播放音效
            if (prevArmor >= totalDamage) {
              // 完全抵挡：伤害被护甲全额吸收
              playShieldBlock();
            } else if (prevArmor > 0 && prevArmor < totalDamage) {
              // 破甲重击：击穿护甲并造成生命值伤害
              playRealAttack();
            } else if (prevArmor === 0) {
              // 直接受损：没有护甲，直接承受伤害
              playEeeee();
            }
            
            // 添加飘字
            if (armorLost > 0) {
              addFloatingText('ME', armorLost, 'ARMOR');
            }
            if (hpLost > 0) {
              addFloatingText('ME', hpLost, 'HP');
            }
          }
        }
      }
    }
    
    // 检测敌人受伤，添加飘字
    if (enemy && prevGameStateRef.current) {
      const enemyPlayerId = Object.keys(prevGameStateRef.current.players).find(id => id !== playerId);
      if (enemyPlayerId) {
        const prevEnemy = prevGameStateRef.current.players[enemyPlayerId];
        if (prevEnemy) {
          const prevHp = prevEnemy.hp;
          const prevArmor = prevEnemy.armor;
          const currentHp = enemy.hp;
          const currentArmor = enemy.armor;
          
          // 检测到 hp 或 armor 变化，说明受到了伤害
          if (prevHp !== currentHp || prevArmor !== currentArmor) {
            const armorLost = prevArmor - currentArmor;
            const hpLost = prevHp - currentHp;
            
            // 添加飘字
            if (armorLost > 0) {
              addFloatingText('ENEMY', armorLost, 'ARMOR');
            }
            if (hpLost > 0) {
              addFloatingText('ENEMY', hpLost, 'HP');
            }
          }
        }
      }
    }
    
    // 保存当前状态为上一次的状态
    prevGameStateRef.current = gameState;

    // 反过来！当我打出攻击牌时，让对方的剑挥动
    if (currentPlayer?.turnState.isSwordSwinging && !prevMySwordSwingRef.current) {
      setShowEnemySwordSwing(true);
      setTimeout(() => setShowEnemySwordSwing(false), 500);
    }
    prevMySwordSwingRef.current = currentPlayer?.turnState.isSwordSwinging || false;

    // 反过来！当对方打出攻击牌时，让我的剑挥动
    if (enemy?.turnState.isSwordSwinging && !prevEnemySwordSwingRef.current) {
      setShowMySwordSwing(true);
      setTimeout(() => setShowMySwordSwing(false), 500);
    }
    prevEnemySwordSwingRef.current = enemy?.turnState.isSwordSwinging || false;
  }, [gameState, getCurrentPlayer, getEnemyPlayer, playShieldBlock, playRealAttack, playEeeee, playVictory, playFail, addFloatingText]);

  // 转换卡牌数据格式
  const getPlayerHandWithUids = useCallback((player: any): CardWithUid[] => {
    if (!player) return [];
    return player.hand.map((card: Card, index: number) => {
      return { ...card, uid: `${card.id}_${index}` };
    });
  }, []);

  // 处理卡牌选择
  const handleCardSelect = useCallback((uid: string) => {
    if (!isMyTurn()) return;

    if (selectedCardUid === uid) {
      // 再次点击相同卡牌，则取消选中
      setSelectedCardUid(null);
      setShowEnergyWarning(false);
    } else {
      // 找到卡牌
      const hand = getPlayerHandWithUids(getCurrentPlayer());
      const card = hand.find(c => c.uid === uid);
      if (!card) return;
      
      // 检查是否有足够的 AP
      const currentPlayer = getCurrentPlayer();
      if (currentPlayer && card.cost > currentPlayer.ap) {
        setShowEnergyWarning(true);
        setSelectedCardUid(null);
        // 2秒后自动隐藏警告
        setTimeout(() => {
          setShowEnergyWarning(false);
        }, 2000);
        return;
      }
      
      // 选择新卡牌
      setSelectedCardUid(uid);
      setShowEnergyWarning(false);
    }
  }, [selectedCardUid, isMyTurn, getCurrentPlayer, getPlayerHandWithUids]);

  // 转换为实体状态格式
  const convertToEntityState = (player: any): EntityState => {
    if (!player) {
      return { hp: 80, maxHp: 80, armor: 0, buffs: [], debuffs: [] };
    }
    // 转换 debuffs 格式
    const convertedDebuffs: StatusEffect[] = player.debuffs?.map((d: any) => ({
      type: d.type as StatusEffectType,
      stacks: d.stacks
    })) || [];
    
    return {
      hp: player.hp,
      maxHp: player.maxHp,
      armor: player.armor,
      buffs: [],
      debuffs: convertedDebuffs
    };
  };

  // 检查是否可以出牌
  const canPlayCard = useCallback((card: CardWithUid) => {
    const currentPlayer = getCurrentPlayer();
    if (!currentPlayer || !isMyTurn()) return false;
    return currentPlayer.ap >= card.cost;
  }, [getCurrentPlayer, isMyTurn]);

  // 发送消息给AI裁判
  const sendAgentMessage = useCallback(async () => {
    if (!agentInput.trim() || isAgentLoading) return;

    const userMessage = agentInput.trim();
    setAgentInput('');
    setAgentMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsAgentLoading(true);

    try {
      const response = await fetch('/api/agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...agentMessages, { role: 'user', content: userMessage }],
        }),
      });

      if (!response.ok) {
        throw new Error('请求失败');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = '';

      if (reader) {
        setAgentMessages(prev => [...prev, { role: 'assistant', content: '' }]);
        
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
                  assistantMessage += parsed.content;
                  setAgentMessages(prev => {
                    const newMessages = [...prev];
                    newMessages[newMessages.length - 1] = { 
                      role: 'assistant', 
                      content: assistantMessage 
                    };
                    return newMessages;
                  });
                }
              } catch (e) {
                // 忽略解析错误
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('AI裁判请求失败:', error);
      setAgentMessages(prev => [...prev, { 
        role: 'assistant', 
        content: '抱歉，我现在无法回答你的问题。请稍后再试。' 
      }]);
    } finally {
      setIsAgentLoading(false);
    }
  }, [agentInput, isAgentLoading, agentMessages]);

  // 清空聊天记录
  const clearAgentChat = useCallback(() => {
    setAgentMessages([]);
  }, []);

  // 自动滚动到最新消息
  useEffect(() => {
    agentMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [agentMessages]);

  // 处理键盘回车发送
  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendAgentMessage();
    }
  }, [sendAgentMessage]);

  // 渲染游戏结束界面
  if (gameState?.phase === 'ended') {
    const winnerId = Object.values(gameState.players).find(p => p.isWinner)?.id;
    const winner = winnerId ? gameState.players[winnerId] : null;
    const isWinner = winnerId === playerId;
    
    return (
      <div className="min-h-screen bg-abyss flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute inset-0 bg-gradient-radial from-sonic-purple/10 via-transparent to-transparent animate-pulse"></div>
        </div>
        
        <div className="relative z-10 text-center">
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-6xl font-black text-slate-100 mb-8">
              {isWinner ? '胜利！' : '失败...'}
            </h1>
            <p className="text-xl text-slate-400 mb-8">
              {isWinner ? '你击败了对手！' : `${winner?.name || '对手'}获胜了`}
            </p>
            <Button
              onClick={() => router.push('/')}
              className="bg-sonic-purple hover:bg-sonic-purple/80 text-white px-8 py-4 text-xl"
            >
              返回主页
            </Button>
          </motion.div>
        </div>
      </div>
    );
  }

  // 渲染等待界面
  if (isJoining || !gameState || !isConnected) {
    return (
      <div className="min-h-screen bg-abyss flex items-center justify-center relative overflow-hidden">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-sonic-purple border-t-transparent mx-auto mb-4"></div>
          <p className="text-slate-400 text-xl">
            {connectionError || (isJoining ? '正在加入游戏...' : '连接中...')}
          </p>
          {connectionError && (
            <Button
              onClick={() => router.push('/lobby')}
              className="mt-4 bg-sonic-purple hover:bg-sonic-purple/80 text-white"
            >
              返回房间
            </Button>
          )}
        </div>
      </div>
    );
  }

  const currentPlayer = getCurrentPlayer();
  const enemyPlayer = getEnemyPlayer();
  const handWithUids = getPlayerHandWithUids(currentPlayer);

  return (
    <div className="min-h-screen bg-abyss flex flex-col relative overflow-hidden">
      {/* 背景声波脉冲动画 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-radial from-sonic-purple/5 via-transparent to-transparent animate-pulse"></div>
      </div>

      {/* 左上角：退出按钮 + AI裁判 */}
      <div className="absolute top-4 left-4 z-50 flex flex-col gap-2">
        <Button
          variant="default"
          onClick={() => setShowExitConfirm(true)}
          className="bg-slate-800/80 hover:bg-slate-700/80 text-slate-200"
        >
          <X className="w-4 h-4 mr-2" />
          退出
        </Button>
        
        {/* AI裁判区 - 点击打开对话框 */}
        <div 
          className="w-12 h-12 bg-sonic-purple rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform cursor-pointer"
          onClick={() => setShowAgentDialog(true)}
        >
          <MessageSquare className="w-6 h-6 text-white" />
        </div>
      </div>

      {/* 右上角：敌方玩家状态 */}
      <div className="absolute top-4 right-4 z-50">
        {enemyPlayer && (
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-3">
              {/* 敌人的飘字 - 在头像左边 */}
              <div className="relative z-50">
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
              <div className="text-right">
                <h2 className="text-xl font-black text-slate-100">
                  {enemyPlayer.name}
                </h2>
                <p className="text-slate-400 text-sm">调音师</p>
              </div>
              <div className="w-16 h-16 rounded-full bg-slate-800 border-4 border-sonic-purple/50 flex items-center justify-center relative">
                <User className="w-8 h-8 text-slate-400" />
                {/* 剑的图标 - 对手的剑 */}
                <motion.div 
                  className="absolute -right-4 -bottom-2 text-sonic-purple drop-shadow-lg"
                  animate={showEnemySwordSwing ? {
                    rotate: [0, 60, -30, 0],
                    scale: [1, 1.5, 1.2, 1],
                    transition: { duration: 0.5, times: [0, 0.3, 0.7, 1] }
                  } : {}}
                >
                  <Sword className="w-8 h-8" />
                </motion.div>
              </div>
            </div>
            <div className="relative">
              <EntityStatusPanel 
                entity={convertToEntityState(enemyPlayer)} 
                isEnemy={true}
                playerName={enemyPlayer.name}
              />
            </div>
            {/* 敌方永久属性加成显示 */}
            {enemyPlayer?.permanentAbilities?.length > 0 && (
              <div className="mt-2 w-48 group relative">
                <div className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">敌方永久能力</div>
                
                {/* 紧凑显示格 */}
                <div className="flex items-center gap-2 bg-slate-800/60 px-3 py-2 rounded-lg border border-slate-700/50 cursor-default">
                  <div className="flex -space-x-1">
                    {(() => {
                      // 统计能力叠加次数
                      const abilityCounts: Record<string, number> = {};
                      enemyPlayer.permanentAbilities.forEach(a => {
                        abilityCounts[a.id] = (abilityCounts[a.id] || 0) + 1;
                      });
                      
                      return Object.entries(abilityCounts).map(([id, count]) => {
                        let iconColor = "";
                        switch (id as AbilityType) {
                          case "FREQUENCY_ANCHOR": iconColor = "bg-armor-blue"; break;
                          case "LOW_FREQUENCY_RESONANCE": iconColor = "bg-sonic-purple"; break;
                          case "PAIN_ECHO": iconColor = "bg-danger-red"; break;
                          case "FINAL_NOTE": iconColor = "bg-gold"; break;
                          default: iconColor = "bg-purify-green";
                        }
                        
                        return (
                          <div 
                            key={id}
                            className={`w-5 h-5 rounded-full ${iconColor} border-2 border-slate-900 flex items-center justify-center text-[9px] font-bold text-white shadow-md relative`}
                          >
                            {count > 1 && (
                              <span className="absolute -top-1 -right-1 w-3 h-3 bg-slate-900 rounded-full text-[8px] flex items-center justify-center text-yellow-400 font-black border border-yellow-400/50">
                                ×{count}
                              </span>
                            )}
                          </div>
                        );
                      });
                    })()}
                  </div>
                  <div className="flex-1 text-xs text-slate-400">
                    {enemyPlayer.permanentAbilities.length} 项能力生效
                  </div>
                </div>
                
                {/* 悬停展开详情 */}
                <div className="absolute right-0 top-full mt-2 w-72 bg-slate-900/98 backdrop-blur-md border border-slate-700/50 rounded-xl p-4 shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                  <div className="text-sm font-bold text-slate-200 mb-3">敌方当前永久效果</div>
                  <div className="space-y-2">
                    {(() => {
                      const abilityCounts: Record<string, number> = {};
                      enemyPlayer.permanentAbilities.forEach(a => {
                        abilityCounts[a.id] = (abilityCounts[a.id] || 0) + 1;
                      });
                      
                      return Object.entries(abilityCounts).map(([id, count]) => {
                        const ability = enemyPlayer.permanentAbilities.find(a => a.id === id);
                        if (!ability) return null;
                        
                        let borderColor = "";
                        switch (id as AbilityType) {
                          case "FREQUENCY_ANCHOR": borderColor = "border-armor-blue/50 bg-armor-blue/10"; break;
                          case "LOW_FREQUENCY_RESONANCE": borderColor = "border-sonic-purple/50 bg-sonic-purple/10"; break;
                          case "PAIN_ECHO": borderColor = "border-danger-red/50 bg-danger-red/10"; break;
                          case "FINAL_NOTE": borderColor = "border-gold/50 bg-gold/10"; break;
                          default: borderColor = "border-purify-green/50 bg-purify-green/10";
                        }
                        
                        return (
                          <div 
                            key={id}
                            className={`p-2 rounded-lg border ${borderColor}`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-bold text-slate-100">
                                {ability.name}
                              </span>
                              {count > 1 && (
                                <span className="text-[10px] font-bold text-yellow-400 bg-yellow-400/20 px-1.5 py-0.5 rounded-full">
                                  ×{count}
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-400 leading-relaxed">
                              {ability.effect}
                            </p>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              </div>
            )}
            {/* 敌方回合时在敌方状态栏下方显示倒计时 */}
            {!isMyTurn() && (
              <div className="w-full bg-black/50 rounded-lg p-3 border border-sonic-purple/30">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-slate-400 font-bold text-sm">敌方回合时间</span>
                  <span className={`font-extrabold text-lg ${
                    turnTimeLeft <= 5 ? "text-danger-red" : "text-sonic-purple"
                  }`}>
                    {turnTimeLeft}秒
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full ${
                      turnTimeLeft <= 5 ? "bg-danger-red" : "bg-sonic-purple"
                    }`}
                    initial={{ width: "100%" }}
                    animate={{ width: `${(turnTimeLeft / TURN_DURATION) * 100}%` }}
                    transition={{ duration: 1, ease: "linear" }}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 游戏主区域 */}
      <div className="flex-1 flex flex-col items-center justify-between p-4 relative z-10">

        {/* 中间：回合信息区 - 往上移动一些 */}
        <div className="flex-1 flex items-start justify-center pt-20">
          <div className="text-center">
            <motion.div
              key={gameState.turnNumber}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <h1 className="text-4xl md:text-6xl font-black text-slate-200 mb-4">
                {isMyTurn() ? (
                  <span className="text-sonic-purple">你的回合</span>
                ) : (
                  <span className="text-slate-400">对手的回合</span>
                )}
              </h1>
              <p className="text-xl md:text-2xl text-slate-500 mb-2">
                回合 {gameState.turnNumber}
              </p>
              <p className="text-lg text-slate-600">
                选择卡牌进行出牌，或点击「结束回合」
              </p>
            </motion.div>
          </div>
        </div>

      </div>

      {/* 手牌容器 - 往下移动一些 */}
      <div className="fixed bottom-[200px] left-1/2 -translate-x-1/2 flex justify-center items-end h-72 z-40">
        <div className="relative flex items-end justify-center -space-x-6" style={{ transformOrigin: "bottom center" }}>
          {handWithUids.map((card, index) => (
            <div
              key={card.uid}
              className="relative"
              style={{ transformOrigin: "bottom center" }}
            >
              <HandCard
                card={card}
                index={index}
                total={handWithUids.length}
                isSelected={selectedCardUid === card.uid}
                onSelect={handleCardSelect}
                canPlay={canPlayCard(card)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* 底部时间进度条 */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-black/70 backdrop-blur-sm border-t border-slate-800 py-3">
        <div className="max-w-2xl mx-auto px-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-300 font-bold text-lg">回合时间</span>
            <span className={`font-extrabold text-xl ${turnTimeLeft <= 10 ? "text-red-500 animate-pulse" : "text-sonic-purple"}`}>
              {turnTimeLeft}秒
            </span>
          </div>
          <div className="h-4 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
            <motion.div
              className={`h-full ${turnTimeLeft <= 10 ? "bg-red-500" : "bg-sonic-purple"}`}
              initial={{ width: "100%" }}
              animate={{ width: `${(turnTimeLeft / TURN_DURATION) * 100}%` }}
              transition={{ duration: 0.1 }}
            />
          </div>
        </div>
      </div>

      {/* 底部：玩家自己状态 + 操作按钮 - 往上移动一些 */}
      <div className="absolute bottom-28 left-8 z-20">
        {currentPlayer && (
          <div className="bg-black/50 backdrop-blur-md p-4 rounded-2xl border border-slate-700/50 shadow-xl">
            <div className="flex items-center gap-4 mb-3">
              <div className="w-20 h-20 rounded-full bg-sonic-purple/20 border-4 border-sonic-purple/50 flex items-center justify-center relative">
                <User className="w-10 h-10 text-sonic-purple" />
                {/* 剑的图标 */}
                <motion.div 
                  className="absolute -right-4 -bottom-2 text-sonic-purple drop-shadow-lg"
                  animate={showMySwordSwing ? {
                    rotate: [0, 60, -30, 0],
                    scale: [1, 1.5, 1.2, 1],
                    transition: { duration: 0.5, times: [0, 0.3, 0.7, 1] }
                  } : {}}
                >
                  <Sword className="w-8 h-8" />
                </motion.div>
              </div>
              <div>
                <h2 className="text-3xl font-black text-slate-100">
                  {currentPlayer.name}
                </h2>
                <p className="text-slate-400 text-lg">调音师</p>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <div className="relative">
                {/* 玩家自己的飘字 - 在角色上方 */}
                <div className="absolute -top-20 left-0 right-0 flex justify-center z-50">
                  {floatingNumbers
                    .filter(fn => fn.target === 'ME')
                    .map((fn, index) => (
                      <DamageNumber
                        key={fn.id}
                        amount={fn.amount}
                        type={fn.type}
                        index={index}
                      />
                    ))}
                </div>
                
                <EntityStatusPanel 
                  entity={convertToEntityState(currentPlayer)} 
                  isEnemy={false}
                  playerName={currentPlayer.name}
                />
              </div>
              
              {/* AP条 */}
              <div className="mt-2 w-48">
                <StatBox 
                  name="AP" 
                  current={currentPlayer.ap} 
                  max={currentPlayer.maxAp} 
                  color="#8b5cf6" 
                  icon={Zap}
                />
              </div>
              
              {/* 永久属性加成显示 */}
              {currentPlayer?.permanentAbilities?.length > 0 && (
                <div className="mt-3 w-64 group relative">
                  <div className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">永久能力</div>
                  
                  {/* 紧凑显示格 */}
                  <div className="flex items-center gap-2 bg-slate-800/60 px-3 py-2 rounded-lg border border-slate-700/50 cursor-default">
                    <div className="flex -space-x-1">
                      {(() => {
                        // 统计能力叠加次数
                        const abilityCounts: Record<string, number> = {};
                        currentPlayer.permanentAbilities.forEach(a => {
                          abilityCounts[a.id] = (abilityCounts[a.id] || 0) + 1;
                        });
                        
                        return Object.entries(abilityCounts).map(([id, count]) => {
                          let iconColor = "";
                          switch (id as AbilityType) {
                            case "FREQUENCY_ANCHOR": iconColor = "bg-armor-blue"; break;
                            case "LOW_FREQUENCY_RESONANCE": iconColor = "bg-sonic-purple"; break;
                            case "PAIN_ECHO": iconColor = "bg-danger-red"; break;
                            case "FINAL_NOTE": iconColor = "bg-gold"; break;
                            default: iconColor = "bg-purify-green";
                          }
                          
                          return (
                            <div 
                              key={id}
                              className={`w-6 h-6 rounded-full ${iconColor} border-2 border-slate-900 flex items-center justify-center text-xs font-bold text-white shadow-md relative`}
                            >
                              {count > 1 && (
                                <span className="absolute -top-1 -right-1 w-4 h-4 bg-slate-900 rounded-full text-[9px] flex items-center justify-center text-yellow-400 font-black border border-yellow-400/50">
                                  ×{count}
                                </span>
                              )}
                            </div>
                          );
                        });
                      })()}
                    </div>
                    <div className="flex-1 text-xs text-slate-400">
                      {currentPlayer.permanentAbilities.length} 项能力生效
                    </div>
                  </div>
                  
                  {/* 悬停展开详情 */}
                  <div className="absolute left-0 bottom-full mb-2 w-80 bg-slate-900/98 backdrop-blur-md border border-slate-700/50 rounded-xl p-4 shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                    <div className="text-sm font-bold text-slate-200 mb-3">当前永久效果</div>
                    <div className="space-y-2">
                      {(() => {
                        const abilityCounts: Record<string, number> = {};
                        currentPlayer.permanentAbilities.forEach(a => {
                          abilityCounts[a.id] = (abilityCounts[a.id] || 0) + 1;
                        });
                        
                        return Object.entries(abilityCounts).map(([id, count]) => {
                          const ability = currentPlayer.permanentAbilities.find(a => a.id === id);
                          if (!ability) return null;
                          
                          let borderColor = "";
                          switch (id as AbilityType) {
                            case "FREQUENCY_ANCHOR": borderColor = "border-armor-blue/50 bg-armor-blue/10"; break;
                            case "LOW_FREQUENCY_RESONANCE": borderColor = "border-sonic-purple/50 bg-sonic-purple/10"; break;
                            case "PAIN_ECHO": borderColor = "border-danger-red/50 bg-danger-red/10"; break;
                            case "FINAL_NOTE": borderColor = "border-gold/50 bg-gold/10"; break;
                            default: borderColor = "border-purify-green/50 bg-purify-green/10";
                          }
                          
                          return (
                            <div 
                              key={id}
                              className={`p-3 rounded-lg border ${borderColor}`}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-bold text-slate-100">
                                  {ability.name}
                                </span>
                                {count > 1 && (
                                  <span className="text-xs font-bold text-yellow-400 bg-yellow-400/20 px-2 py-0.5 rounded-full">
                                    ×{count}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-400 leading-relaxed">
                                {ability.effect}
                              </p>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 右下角：操作按钮 */}
      <div className="fixed right-8 bottom-32 z-50 flex flex-col gap-3">
        {isMyTurn() && (
          <>
            {/* 只有选中牌时才显示出牌按钮 */}
            <AnimatePresence>
              {selectedCardUid && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8, y: 20 }}
                  onClick={() => handlePlayCard(selectedCardUid)}
                  className="px-12 py-6 text-2xl font-extrabold tracking-widest bg-purple-600 hover:bg-purple-500 text-white rounded-xl shadow-[0_0_25px_rgba(147,51,234,0.7)] hover:shadow-[0_0_35px_rgba(147,51,234,0.9)] transition-all transform hover:scale-110 active:scale-95"
                >
                  使用卡牌
                </motion.button>
              )}
            </AnimatePresence>
            
            {/* 固定的结束回合按钮 */}
            <button
              onClick={handleEndTurn}
              className="px-10 py-4 text-xl font-extrabold tracking-widest bg-sonic-purple hover:bg-sonic-purple/90 text-white rounded-xl shadow-[0_0_20px_rgba(139,92,246,0.6)] hover:shadow-[0_0_30px_rgba(139,92,246,0.8)] transition-all transform hover:scale-105 active:scale-95"
            >
              结束回合
            </button>
          </>
        )}
      </div>

      {/* 退出确认对话框 */}
      <AnimatePresence>
        {showExitConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-slate-900 p-8 rounded-2xl border border-sonic-purple/50 shadow-2xl"
            >
              <h2 className="text-2xl font-black text-slate-100 mb-4">确认退出？</h2>
              <p className="text-slate-400 mb-6">退出后将返回大厅，游戏进度将丢失。</p>
              <div className="flex gap-4">
                <Button
                  variant="default"
                  onClick={() => setShowExitConfirm(false)}
                  className="bg-slate-700 hover:bg-slate-600 text-white"
                >
                  取消
                </Button>
                <Button
                  variant="default"
                  onClick={() => router.push('/lobby')}
                  className="bg-danger-red hover:bg-danger-red/80 text-white"
                >
                  确认退出
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI裁判对话框 */}
      <AnimatePresence>
        {showAgentDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="w-full max-w-2xl bg-slate-900/95 backdrop-blur-xl rounded-2xl border border-sonic-purple/50 shadow-2xl overflow-hidden"
            >
              {/* 对话框头部 */}
              <div className="flex items-center justify-between p-4 border-b border-slate-700/50 bg-slate-900/80">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-sonic-purple rounded-full flex items-center justify-center">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-100">AI 裁判</h3>
                    <p className="text-xs text-slate-400">深渊协奏规则顾问</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={clearAgentChat}
                    className="bg-slate-700 hover:bg-slate-600 text-slate-200"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    清空
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => setShowAgentDialog(false)}
                    className="bg-slate-700 hover:bg-slate-600 text-slate-200"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* 对话区域 */}
              <div className="h-96 overflow-y-auto p-4 space-y-4 bg-slate-950/50">
                {agentMessages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-3">
                    <div className="w-16 h-16 bg-sonic-purple/20 rounded-full flex items-center justify-center mb-2">
                      <MessageSquare className="w-8 h-8 text-sonic-purple" />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-slate-200 mb-1">你好，调音师</h4>
                      <p className="text-sm text-slate-400 max-w-sm">
                        我是深渊协奏的AI裁判。你可以问我任何关于出牌策略、卡牌效果或游戏规则的问题。
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-4 justify-center">
                      <Badge 
                        variant="outline" 
                        className="bg-sonic-purple/10 border-sonic-purple/30 text-sonic-purple cursor-pointer hover:bg-sonic-purple/20 transition-colors"
                        onClick={() => {
                          setAgentInput("现在我应该出什么牌？");
                        }}
                      >
                        现在我应该出什么牌？
                      </Badge>
                      <Badge 
                        variant="outline" 
                        className="bg-sonic-purple/10 border-sonic-purple/30 text-sonic-purple cursor-pointer hover:bg-sonic-purple/20 transition-colors"
                        onClick={() => {
                          setAgentInput("解释一下声爆机制");
                        }}
                      >
                        解释声爆机制
                      </Badge>
                    </div>
                  </div>
                ) : (
                  agentMessages.map((message, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: message.role === 'user' ? 20 : -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3 }}
                      className={cn(
                        "flex gap-3 max-w-[85%]",
                        message.role === 'user' ? "ml-auto flex-row-reverse" : "mr-auto"
                      )}
                    >
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                        message.role === 'user' ? "bg-slate-600" : "bg-sonic-purple"
                      )}>
                        {message.role === 'user' ? (
                          <User className="w-4 h-4 text-white" />
                        ) : (
                          <Bot className="w-4 h-4 text-white" />
                        )}
                      </div>
                      <div className={cn(
                        "px-4 py-3 rounded-xl",
                        message.role === 'user' 
                          ? "bg-slate-700 rounded-tr-sm" 
                          : "bg-slate-800 rounded-tl-sm border border-slate-700/50"
                      )}>
                        <p className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">
                          {message.content}
                        </p>
                      </div>
                    </motion.div>
                  ))
                )}
                {isAgentLoading && (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex gap-3 max-w-[85%] mr-auto"
                  >
                    <div className="w-8 h-8 bg-sonic-purple rounded-full flex items-center justify-center flex-shrink-0">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                    <div className="px-4 py-3 bg-slate-800 rounded-xl rounded-tl-sm border border-slate-700/50">
                      <div className="flex gap-1">
                        <motion.div
                          className="w-2 h-2 bg-sonic-purple rounded-full"
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ duration: 1, repeat: Infinity, delay: 0 }}
                        />
                        <motion.div
                          className="w-2 h-2 bg-sonic-purple rounded-full"
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
                        />
                        <motion.div
                          className="w-2 h-2 bg-sonic-purple rounded-full"
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
                <div ref={agentMessagesEndRef} />
              </div>

              {/* 输入区域 */}
              <div className="p-4 border-t border-slate-700/50 bg-slate-900/80">
                <div className="flex gap-3">
                  <Input
                    value={agentInput}
                    onChange={(e) => setAgentInput(e.target.value)}
                    onKeyDown={handleKeyPress}
                    placeholder="询问出牌策略或游戏规则..."
                    className="flex-1 bg-slate-800/50 border-slate-700/50 text-slate-200 placeholder:text-slate-500 focus-visible:ring-sonic-purple"
                    disabled={isAgentLoading}
                  />
                  <Button
                    variant="default"
                    onClick={sendAgentMessage}
                    disabled={!agentInput.trim() || isAgentLoading}
                    className="bg-sonic-purple hover:bg-sonic-purple/80 text-white"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    发送
                  </Button>
                </div>
              </div>
            </motion.div>
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

      {/* 体力不足警告提示 */}
      <AnimatePresence>
        {showEnergyWarning && (
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
    </div>
  );
}
