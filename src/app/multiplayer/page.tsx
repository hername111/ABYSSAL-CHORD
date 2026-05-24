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
} from "lucide-react";
import { Card, zhongLvCards } from "@/lib/cards";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { MultiplayerGameState, AbilityType, ActiveAbility } from "@/lib/multiplayer/types";
import { createMultiplayerWsConnection } from "@/lib/multiplayer/ws-client";

// 带唯一实例 ID 的卡牌类型
interface CardWithUid extends Card {
  uid: string;
}

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
  
  // 倒计时状态
  const [turnTimeLeft, setTurnTimeLeft] = useState(TURN_DURATION);

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

    // 发送出牌消息
    wsRef.current.sendPlayCard(card.id);
    setSelectedCardUid(null);
  }, [gameState, getCurrentPlayer, isMyTurn]);

  // 处理结束回合
  const handleEndTurn = useCallback(() => {
    if (!wsRef.current || !isMyTurn()) return;
    wsRef.current.sendEndTurn();
    setSelectedCardUid(null);
  }, [isMyTurn]);

  // 处理卡牌选择
  const handleCardSelect = useCallback((uid: string) => {
    if (!isMyTurn()) return;

    if (selectedCardUid === uid) {
      // 再次点击相同卡牌，则出牌
      handlePlayCard(uid);
    } else {
      // 选择新卡牌
      setSelectedCardUid(uid);
    }
  }, [selectedCardUid, handlePlayCard, isMyTurn]);

  // 转换卡牌数据格式
  const getPlayerHandWithUids = useCallback((player: any): CardWithUid[] => {
    if (!player) return [];
    return player.hand.map((card: Card, index: number) => {
      return { ...card, uid: `${card.id}_${index}` };
    });
  }, []);

  // 转换为实体状态格式
  const convertToEntityState = (player: any): EntityState => {
    if (!player) {
      return { hp: 80, maxHp: 80, armor: 0, buffs: [], debuffs: [] };
    }
    return {
      hp: player.hp,
      maxHp: player.maxHp,
      armor: player.armor,
      buffs: [],
      debuffs: []
    };
  };

  // 检查是否可以出牌
  const canPlayCard = useCallback((card: CardWithUid) => {
    const currentPlayer = getCurrentPlayer();
    if (!currentPlayer || !isMyTurn()) return false;
    return currentPlayer.ap >= card.cost;
  }, [getCurrentPlayer, isMyTurn]);

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

      {/* 顶部导航栏 */}
      <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-50">
        <Button
          variant="default"
          onClick={() => setShowExitConfirm(true)}
          className="bg-slate-800/80 hover:bg-slate-700/80 text-slate-200"
        >
          <X className="w-4 h-4 mr-2" />
          退出
        </Button>
        <Button
          variant="default"
          onClick={() => router.push('/cards')}
          className="bg-slate-800/80 hover:bg-slate-700/80 text-slate-200"
        >
          <BookOpen className="w-4 h-4 mr-2" />
          卡牌库
        </Button>
      </div>

      {/* 游戏主区域 */}
      <div className="flex-1 flex flex-col items-center justify-between p-4 relative z-10">
        
        {/* 上方：敌方玩家状态 */}
        <div className="w-full flex justify-center pt-8">
          {enemyPlayer && (
            <div className="flex flex-col items-center gap-4">
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-full bg-slate-800 border-4 border-sonic-purple/50 flex items-center justify-center">
                  <User className="w-10 h-10 text-slate-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-100">
                    {enemyPlayer.name}
                  </h2>
                  <p className="text-slate-400 text-lg">调音师</p>
                </div>
              </div>
              <EntityStatusPanel 
                entity={convertToEntityState(enemyPlayer)} 
                isEnemy={true}
                playerName={enemyPlayer.name}
              />
            </div>
          )}
        </div>

        {/* 中间：回合信息区 */}
        <div className="flex-1 flex items-center justify-center">
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

        {/* 下方：玩家手牌区 */}
        <div className="w-full pb-4">
          <div className="flex justify-center items-end gap-2 px-4">
            {handWithUids.map((card, index) => (
              <HandCard
                key={card.uid}
                card={card}
                index={index}
                total={handWithUids.length}
                isSelected={selectedCardUid === card.uid}
                onSelect={handleCardSelect}
                canPlay={canPlayCard(card)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* 底部：玩家自己状态 + 操作按钮 */}
      <div className="absolute bottom-8 left-8 z-20">
        {currentPlayer && (
          <div className="bg-black/50 backdrop-blur-md p-4 rounded-2xl border border-slate-700/50 shadow-xl">
            <div className="flex items-center gap-4 mb-3">
              <div className="w-20 h-20 rounded-full bg-sonic-purple/20 border-4 border-sonic-purple/50 flex items-center justify-center">
                <User className="w-10 h-10 text-sonic-purple" />
              </div>
              <div>
                <h2 className="text-3xl font-black text-slate-100">
                  {currentPlayer.name}
                </h2>
                <p className="text-slate-400 text-lg">调音师</p>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <EntityStatusPanel 
                entity={convertToEntityState(currentPlayer)} 
                isEnemy={false}
                playerName={currentPlayer.name}
              />
              
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
              {currentPlayer.permanentAbilities.length > 0 && (
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
                          switch (id) {
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
                  <div className="absolute left-0 top-full mt-2 w-80 bg-slate-900/98 backdrop-blur-md border border-slate-700/50 rounded-xl p-4 shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
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
                          switch (id) {
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
    </div>
  );
}
