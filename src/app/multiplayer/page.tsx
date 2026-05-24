'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Skull, 
  User, 
  Play, 
  Zap, 
  Shield, 
  Flame, 
  Sparkles, 
  Clock,
  RotateCcw,
  DoorOpen
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { zhongLvCards } from '@/lib/cards';
import { cn } from '@/lib/utils';
import { createMultiplayerWsConnection } from '@/lib/multiplayer/ws-client';
import type { MultiplayerGameState, MultiplayerPlayer } from '@/lib/multiplayer/types';

// 全局样式
const sonicPurple = '#8b5cf6';
const dangerRed = '#ef4444';
const purifyGreen = '#22c55e';
const armorBlue = '#3b82f6';
const abyss = '#0a0a0f';
const cardDarker = '#13131a';

const TURN_DURATION = 30; // 回合倒计时 30秒

// 获取卡牌对象
function getCardById(cardId: string) {
  return zhongLvCards.find(c => c.id === cardId);
}

// 卡牌组件
function Card({ 
  cardId, 
  onClick, 
  selected, 
  disabled,
  small = false 
}: { 
  cardId: string; 
  onClick?: () => void;
  selected?: boolean;
  disabled?: boolean;
  small?: boolean;
}) {
  const card = getCardById(cardId);
  if (!card) return null;

  const getTypeColor = () => {
    switch (card.type) {
      case 'attack': return 'border-red-500/60 bg-red-950/30';
      case 'skill': return 'border-blue-500/60 bg-blue-950/30';
      case 'ability': return 'border-yellow-500/60 bg-yellow-950/30';
      default: return 'border-slate-600/60 bg-slate-900/30';
    }
  };

  const getTypeTextColor = () => {
    switch (card.type) {
      case 'attack': return 'text-red-400';
      case 'skill': return 'text-blue-400';
      case 'ability': return 'text-yellow-400';
      default: return 'text-slate-400';
    }
  };

  const getTypeLabel = () => {
    switch (card.type) {
      case 'attack': return '攻击';
      case 'skill': return '技能';
      case 'ability': return '能力';
      default: return '';
    }
  };

  return (
    <motion.div
      whileHover={!disabled ? { y: -8, scale: 1.05 } : {}}
      whileTap={!disabled ? { scale: 0.95 } : {}}
      onClick={!disabled ? onClick : undefined}
      className={cn(
        "relative cursor-pointer transition-all duration-300",
        small ? "w-24 h-36" : "w-40 h-56",
        disabled && "opacity-50 cursor-not-allowed",
        selected && "ring-4 ring-sonic-purple ring-offset-2 ring-offset-abyss scale-105 z-20"
      )}
    >
      <div className={cn(
        "absolute inset-0 rounded-xl border-2 overflow-hidden",
        getTypeColor()
      )}>
        {/* 背景层 */}
        <div className="absolute inset-0 bg-gradient-to-b from-card-darker via-card-darker to-abyss" />
        
        {/* 声波装饰线 */}
        <div className="absolute inset-0 opacity-20">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-sonic-purple to-transparent"
              style={{ transform: `translateX(-50%) translateX(${(i - 1) * 20}px)` }}
            />
          ))}
        </div>

        {/* 内容层 */}
        <div className="relative h-full flex flex-col p-3">
          {/* 费用 */}
          <div className="flex justify-between items-start">
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg border-2",
              "bg-sonic-purple/20 border-sonic-purple/50 text-white"
            )}>
              {card.cost}
            </div>
            <span className={cn("text-xs font-bold px-2 py-1 rounded-full bg-black/30", getTypeTextColor())}>
              {getTypeLabel()}
            </span>
          </div>

          {/* 卡名 */}
          <div className="mt-2 text-center">
            <h3 className={cn("font-bold text-slate-200 leading-tight", small ? "text-sm" : "text-lg")}>
              {card.name}
            </h3>
          </div>

          {/* 效果描述 */}
          <div className="mt-auto">
            <p className={cn("text-slate-400 leading-relaxed", small ? "text-[10px]" : "text-xs")}>
              {card.effect}
            </p>
          </div>

          {/* 目标类型 */}
          <div className="mt-2 text-center">
            <span className="text-[10px] text-slate-600 font-medium">
              {card.target === 'self' ? '自身' : card.target === 'aoe' ? '群体' : '单体'}
            </span>
          </div>
        </div>
      </div>

      {/* 选中状态光效 */}
      {selected && (
        <div className="absolute -inset-1 rounded-xl bg-sonic-purple/30 blur-md -z-10 animate-pulse" />
      )}
    </motion.div>
  );
}

// 玩家状态栏组件
function PlayerStatusPanel({ 
  player, 
  isCurrentTurn, 
  isSelf,
  onClick
}: { 
  player: MultiplayerPlayer; 
  isCurrentTurn: boolean;
  isSelf: boolean;
  onClick?: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: isSelf ? -20 : 20 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        "relative w-64 bg-slate-900/60 rounded-2xl border p-4",
        isCurrentTurn ? "border-sonic-purple/50" : "border-slate-700/50",
        onClick && "cursor-pointer hover:border-sonic-purple/70 transition-colors"
      )}
      onClick={onClick}
    >
      {/* 回合计号 */}
      {isCurrentTurn && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-sonic-purple text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg shadow-sonic-purple/30">
          当前回合
        </div>
      )}

      <div className="flex items-center gap-4">
        {/* 头像 */}
        <div className={cn(
          "w-14 h-14 rounded-full flex items-center justify-center border-2",
          isSelf ? "bg-sonic-purple/20 border-sonic-purple/50" : "bg-red-500/20 border-red-500/50"
        )}>
          {isSelf ? <User className="w-7 h-7 text-sonic-purple" /> : <Skull className="w-7 h-7 text-red-400" />}
        </div>

        {/* 信息 */}
        <div className="flex-1">
          <h3 className="font-bold text-slate-200 text-lg">{player.name}</h3>
          <p className="text-slate-500 text-sm">调音师</p>

          {/* HP条 */}
          <div className="mt-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-red-400 font-bold text-sm flex items-center gap-1">
                <Flame className="w-4 h-4" />
                HP
              </span>
              <span className="text-slate-300 font-bold text-sm">
                {player.hp}/{player.maxHp}
              </span>
            </div>
            <div className="h-4 bg-slate-800 rounded-full overflow-hidden border border-slate-700/50">
              <motion.div
                className="h-full bg-gradient-to-r from-red-600 to-red-400"
                initial={{ width: '100%' }}
                animate={{ width: `${(player.hp / player.maxHp) * 100}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>

          {/* 护甲 */}
          <div className="mt-2">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-armor-blue" />
              <span className="text-armor-blue font-bold text-lg">{player.armor} 护甲</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function MultiplayerBattlePage() {
  const searchParams = useSearchParams();
  const roomId = searchParams.get('roomId') || '';
  const playerId = searchParams.get('playerId') || '';
  const playerName = searchParams.get('playerName') || 'Player';

  // 游戏状态
  const [gameState, setGameState] = useState<MultiplayerGameState | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [turnTimer, setTurnTimer] = useState(TURN_DURATION);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connRef = useRef<ReturnType<typeof createMultiplayerWsConnection> | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // 获取当前玩家信息
  const currentPlayer = gameState?.players[gameState.currentPlayerIndex];
  const selfPlayer = gameState?.players.find(p => p.id === playerId);
  const enemyPlayer = gameState?.players.find(p => p.id !== playerId);
  const isMyTurn = currentPlayer?.id === playerId;

  // 处理结束回合
  const handleEndTurn = useCallback(() => {
    if (!isMyTurn || !connRef.current) return;
    connRef.current.sendEndTurn();
    setSelectedCardId(null);
  }, [isMyTurn]);

  // 处理卡牌点击
  const handleCardClick = useCallback((cardId: string) => {
    if (!isMyTurn || !gameState) return;

    // 如果已经选择了这张牌，取消选择
    if (selectedCardId === cardId) {
      setSelectedCardId(null);
      return;
    }

    setSelectedCardId(cardId);
  }, [isMyTurn, selectedCardId, gameState]);

  // 处理出牌
  const handlePlayCard = useCallback(() => {
    if (!selectedCardId || !isMyTurn || !connRef.current) return;

    const card = getCardById(selectedCardId);
    if (!card) return;

    // 检查AP
    if (selfPlayer) {
      // 简化处理，因为多人游戏状态中没有AP字段
    }

    // 如果是攻击牌，自动选择敌方玩家作为目标
    let targetId: string | undefined;
    if (card.type === 'attack' && card.target !== 'self') {
      targetId = enemyPlayer?.id;
    }

    connRef.current.sendPlayCard(selectedCardId, targetId);
    setSelectedCardId(null);
  }, [selectedCardId, isMyTurn, selfPlayer, enemyPlayer]);

  // 连接WebSocket
  useEffect(() => {
    if (!roomId || !playerId) return;

    const conn = createMultiplayerWsConnection({
      roomId,
      playerId,
      playerName,
      onGameStateUpdate: (newState) => {
        setGameState(newState);
      },
      onOpen: () => {
        setIsConnected(true);
        setError(null);
      },
      onClose: () => {
        setIsConnected(false);
      },
      onError: (err) => {
        setError(err);
      },
    });

    connRef.current = conn;

    return () => {
      conn.close();
    };
  }, [roomId, playerId, playerName]);

  // 回合倒计时
  useEffect(() => {
    if (gameState?.phase === 'ended') {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    setTurnTimer(TURN_DURATION);

    timerRef.current = setInterval(() => {
      setTurnTimer(prev => {
        if (prev <= 1) {
          // 时间到自动结束回合
          if (isMyTurn) {
            handleEndTurn();
          }
          return TURN_DURATION;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState?.currentPlayerIndex, gameState?.phase, isMyTurn, handleEndTurn]);

  // 渲染游戏结束界面
  if (gameState?.phase === 'ended') {
    const winner = gameState.players.find(p => p.hp > 0);
    const isWinner = winner?.id === playerId;

    return (
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gradient-to-b from-abyss via-abyss to-card-darker">
        <div className="absolute inset-0 opacity-30">
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-sonic-purple/30"
              initial={{ width: 0, height: 0, opacity: 0 }}
              animate={{
                width: [0, 400 + i * 200],
                height: [0, 400 + i * 200],
                opacity: [0, 0.3, 0],
              }}
              transition={{
                duration: 6,
                repeat: Infinity,
                delay: i * 1.2,
                ease: 'easeOut',
              }}
            />
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center z-10"
        >
          <h1 className={cn(
            "text-6xl font-black mb-6",
            isWinner 
              ? "text-transparent bg-clip-text bg-gradient-to-r from-purify-green to-sonic-purple"
              : "text-transparent bg-clip-text bg-gradient-to-r from-danger-red to-sonic-purple"
          )}>
            {isWinner ? '胜利！' : '失败...'}
          </h1>
          <p className="text-slate-400 text-xl mb-8">
            {isWinner ? `${winner?.name} 赢得了对决！` : `${winner?.name} 赢得了对决`}
          </p>
          <Link href="/">
            <Button className="px-8 py-6 bg-gradient-to-r from-sonic-purple to-sonic-purple/70 text-white text-xl font-bold rounded-xl shadow-[0_0_40px_rgba(139,92,246,0.4)] hover:shadow-[0_0_60px_rgba(139,92,246,0.6)] hover:scale-105 transition-all">
              <RotateCcw className="w-6 h-6 mr-3" />
              返回主页
            </Button>
          </Link>
        </motion.div>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-abyss">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-sonic-purple/30 border-t-sonic-purple rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400 text-lg">
            {error || '连接服务器中...'}
          </p>
          {!isConnected && !error && (
            <p className="text-slate-600 text-sm mt-2">房间号: {roomId}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-b from-abyss via-abyss to-card-darker">
      {/* 背景声波脉冲动画 */}
      <div className="absolute inset-0 opacity-30">
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-sonic-purple/30"
            initial={{ width: 0, height: 0, opacity: 0 }}
            animate={{
              width: [0, 400 + i * 200],
              height: [0, 400 + i * 200],
              opacity: [0, 0.3, 0],
            }}
            transition={{
              duration: 6,
              repeat: Infinity,
              delay: i * 1.2,
              ease: 'easeOut',
            }}
          />
        ))}
      </div>

      {/* 顶部导航 */}
      <div className="absolute top-6 left-6 right-6 z-50 flex justify-between items-start">
        {/* 返回按钮 */}
        <Link href="/">
          <div className="w-12 h-12 bg-red-500/20 hover:bg-red-500/40 border border-red-500/50 rounded-full flex items-center justify-center cursor-pointer transition-all">
            <DoorOpen className="w-6 h-6 text-red-400" />
          </div>
        </Link>

        {/* 房间信息 */}
        <div className="text-center">
          <div className="text-sonic-purple font-bold text-lg">房间 {roomId}</div>
          <div className="text-slate-500 text-sm">
            {isConnected ? '已连接' : '连接中...'}
          </div>
        </div>

        <div className="w-12" /> {/* 占位 */}
      </div>

      {/* 敌人状态 - 顶部中央 */}
      {enemyPlayer && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-40">
          <PlayerStatusPanel 
            player={enemyPlayer} 
            isCurrentTurn={!isMyTurn && currentPlayer?.id === enemyPlayer.id}
            isSelf={false}
          />
        </div>
      )}

      {/* 主内容区域 */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* 中央区域 - 游戏提示 */}
        <div className="flex-1 flex items-center justify-center">
          <motion.div
            key={gameState.turnCount}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <h2 className="text-4xl font-black text-slate-300 mb-4">
              {isMyTurn ? (
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-sonic-purple to-purify-green">
                  你的回合
                </span>
              ) : (
                <span className="text-slate-500">
                  {currentPlayer?.name} 的回合
                </span>
              )}
            </h2>
            
            <div className="text-slate-500 text-lg space-y-2">
              <p>回合 {gameState.turnCount} · 剩余 {turnTimer} 秒</p>
              {isMyTurn && (
                <p className="text-slate-400">
                  {selectedCardId 
                    ? '点击「出牌」使用卡牌，或点击「结束回合」' 
                    : '选择卡牌进行出牌，或点击「结束回合」'}
                </p>
              )}
              {isMyTurn && !selectedCardId && (
                <p className="text-slate-600 text-sm">点击卡牌可以选中，再次点击可以取消</p>
              )}
            </div>

            {/* 出牌/结束回合按钮 */}
            {isMyTurn && (
              <div className="mt-8 flex gap-4 justify-center">
                {selectedCardId ? (
                  <Button
                    onClick={handlePlayCard}
                    className="px-12 py-6 bg-gradient-to-r from-purify-green to-purify-green/70 text-white text-2xl font-bold rounded-xl shadow-[0_0_40px_rgba(34,197,94,0.4)] hover:shadow-[0_0_60px_rgba(34,197,94,0.6)] hover:scale-105 transition-all"
                  >
                    <Sparkles className="w-8 h-8 mr-3" />
                    出牌
                  </Button>
                ) : null}
                
                <Button
                  onClick={handleEndTurn}
                  className="px-12 py-6 bg-gradient-to-r from-sonic-purple to-sonic-purple/70 text-white text-2xl font-bold rounded-xl shadow-[0_0_40px_rgba(139,92,246,0.4)] hover:shadow-[0_0_60px_rgba(139,92,246,0.6)] hover:scale-105 transition-all"
                >
                  <Play className="w-8 h-8 mr-3" />
                  结束回合
                </Button>
              </div>
            )}
          </motion.div>
        </div>

        {/* 底部区域 - 手牌和自己的状态 */}
        <div className="pb-8">
          {/* 回合倒计时条 */}
          <div className="w-full max-w-md mx-auto mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400 font-bold">回合时间</span>
              <span className={cn(
                "font-bold text-xl",
                turnTimer <= 10 ? "text-danger-red animate-pulse" : "text-sonic-purple"
              )}>
                {turnTimer}秒
              </span>
            </div>
            <div className="h-4 bg-slate-800 rounded-full overflow-hidden border border-slate-700/50">
              <motion.div
                className={cn(
                  "h-full transition-all",
                  turnTimer <= 10 
                    ? "bg-gradient-to-r from-danger-red to-danger-red/70" 
                    : "bg-gradient-to-r from-sonic-purple to-sonic-purple/70"
                )}
                animate={{ width: `${(turnTimer / TURN_DURATION) * 100}%` }}
              />
            </div>
          </div>

          {/* 手牌区域 */}
          <div className="relative z-20">
            <div className="flex items-end justify-center gap-2 pb-4 px-4 min-h-[280px]">
              <AnimatePresence>
                {selfPlayer?.hand.map((cardId, index) => (
                  <motion.div
                    key={`${cardId}-${index}`}
                    initial={{ opacity: 0, y: 50, scale: 0.8 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 50, scale: 0.8 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className="flex-shrink-0"
                  >
                    <Card
                      cardId={cardId}
                      onClick={() => handleCardClick(cardId)}
                      selected={selectedCardId === cardId}
                      disabled={!isMyTurn}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>

          {/* 自己的状态 - 左下角 */}
          {selfPlayer && (
            <div className="absolute bottom-8 left-8 z-40">
              <PlayerStatusPanel 
                player={selfPlayer} 
                isCurrentTurn={isMyTurn}
                isSelf={true}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
