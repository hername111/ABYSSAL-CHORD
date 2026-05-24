'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { createMultiplayerWsConnection } from '@/lib/multiplayer/ws-client';
import type { MultiplayerGameState, MultiplayerPlayer } from '@/lib/multiplayer/types';
import { getCurrentPlayer, getEnemyPlayers, isCurrentPlayerTurn } from '@/lib/multiplayer/gameLogic';
import { zhongLvCards } from '@/lib/cards';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skull, Shield, Users, User, Play, RotateCcw, Target, ChevronRight, Trophy, Gamepad2, Layers, Clock, MessageSquare, DoorOpen, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

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

export default function MultiplayerBattlePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const roomId = searchParams.get('roomId');
  const playerId = searchParams.get('playerId');
  const playerName = searchParams.get('playerName') || '玩家';

  // 开发模式下的模拟数据
  const mockGameState = {
    roomId: roomId || 'TEST_ROOM',
    players: [
      {
        id: playerId || 'player1',
        name: playerName || '玩家1',
        hp: 80,
        maxHp: 80,
        armor: 0,
        isCurrentTurn: true,
        isReady: true,
        hand: ['heavy_strike', 'acoustic_barrier', 'frequency_tuning', 'heavy_strike', 'resonating_barrier'],
        pollutionLevel: 0,
        activeAbilities: ['FREQUENCY_ANCHOR', 'LOW_FREQUENCY_RESONANCE'],
      } as any,
      {
        id: 'player2',
        name: '对手玩家',
        hp: 80,
        maxHp: 80,
        armor: 0,
        isCurrentTurn: false,
        isReady: true,
        hand: ['heavy_strike', 'acoustic_barrier'],
        pollutionLevel: 0,
        activeAbilities: [],
      } as any,
    ],
    currentPlayerIndex: 0,
    phase: 'playing',
    turnCount: 1,
    selectedTargetId: null,
    isSelectingTarget: false,
    pendingCardId: null,
    sharedDeck: [],
    sharedDiscard: [],
    actionLogs: [],
  } as any;

  const [gameState, setGameState] = useState<MultiplayerGameState | null>(mockGameState);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(30);
  const wsRef = useRef<ReturnType<typeof createMultiplayerWsConnection> | null>(null);
  
  // 判断是否是真实的联机模式（有真实roomId和playerId）
  const isRealMultiplayer = roomId && playerId && roomId !== 'undefined' && playerId !== 'undefined' && roomId.length > 0 && playerId.length > 0;
  
  // 当前玩家信息
  const myPlayer = gameState?.players.find(p => p.id === (isRealMultiplayer ? playerId : 'mock-player-2'));
  const enemyPlayers = gameState ? gameState.players.filter(p => p.id !== (isRealMultiplayer ? playerId : 'mock-player-2')) : [];
  const isMyTurn = gameState?.players[gameState.currentPlayerIndex]?.id === (isRealMultiplayer ? playerId : 'mock-player-2');
  
  // 回合倒计时
  useEffect(() => {
    if (!gameState || !isMyTurn) return;
    
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 0) return 30;
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [gameState?.currentPlayerIndex, isMyTurn]);

  useEffect(() => {
    // 如果不是真实的联机模式，直接使用模拟数据，不连接WebSocket
    if (!isRealMultiplayer) {
      return;
    }

    const ws = createMultiplayerWsConnection({
      roomId,
      playerId,
      playerName,
      onGameStateUpdate: (state) => {
        setGameState(state);
      },
      onOpen: () => {
        setIsConnected(true);
        setError(null);
      },
      onClose: () => {
        setIsConnected(false);
      },
      onError: (errorMsg) => {
        setError(errorMsg);
      },
    });

    wsRef.current = ws;

    return () => {
      ws.close();
    };
  }, [roomId, playerId, playerName, isRealMultiplayer]);

  
  // 模拟AP状态（和单人模式一致）
  const [playerAp, setPlayerAp] = useState(3);
  const [playerMaxAp] = useState(3);

  const handlePlayCard = (cardId: string) => {
    if (!isMyTurn || !myPlayer) return;

    // 检查玩家是否有这张牌
    if (!myPlayer.hand.includes(cardId)) {
      return;
    }

    const card = zhongLvCards.find(c => c.id === cardId);
    if (!card) return;

    // 如果是攻击牌且需要目标，先选择目标
    if (card.type === 'attack' && card.target === 'single') {
      setSelectedCard(cardId);
      return;
    }

    // 如果有WebSocket连接，通过连接发送
    if (wsRef.current) {
      wsRef.current.sendPlayCard(cardId);
    } else {
      // 开发模式：简单模拟出牌效果
      setGameState(prev => {
        if (!prev) return prev;
        const newPlayers = prev.players.map(p => {
          if (p.id === playerId) {
            return {
              ...p,
              hand: p.hand.filter(id => id !== cardId),
            };
          }
          return p;
        });
        return {
          ...prev,
          players: newPlayers,
        };
      });
    }
    setSelectedCard(null);
  };

  const handleSelectTarget = (targetId: string) => {
    if (!isMyTurn || !selectedCard) return;
    if (wsRef.current) {
      wsRef.current.sendPlayCard(selectedCard, targetId);
    }
    setSelectedCard(null);
  };

  const handleEndTurn = () => {
    if (!isMyTurn) return;
    if (wsRef.current) {
      wsRef.current.sendEndTurn();
    } else {
      // 开发模式：简单模拟回合切换
      setGameState(prev => {
        if (!prev) return prev;
        const nextIndex = (prev.currentPlayerIndex + 1) % prev.players.length;
        const newPlayers = prev.players.map((p, index) => ({
          ...p,
          isCurrentTurn: index === nextIndex,
        }));
        return {
          ...prev,
          currentPlayerIndex: nextIndex,
          turnCount: prev.turnCount + 1,
          players: newPlayers,
        };
      });
    }
  };

  const handleBackToLobby = () => {
    router.push('/lobby');
  };

  // 只在真实的联机模式下才显示错误
  if (error && isRealMultiplayer) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
        <Card className="bg-[#13131a] border-red-500/50 max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-red-400 flex items-center gap-2">
              <Skull className="w-6 h-6" />
              错误
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-300 mb-4">{error}</p>
            <Button onClick={handleBackToLobby} className="w-full">
              返回房间
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 只在真实的联机模式下才显示加载状态
  if (!gameState && isRealMultiplayer) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4" />
          <p className="text-slate-400">
            {isConnected ? '等待游戏开始...' : '正在连接...'}
          </p>
        </div>
      </div>
    );
  }

  if (gameState && gameState.phase === 'ended') {
    const winner = gameState.players.find(p => p.hp > 0);
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
        <Card className="bg-[#13131a] border-yellow-500/50 max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-yellow-400 flex items-center gap-2">
              <Trophy className="w-6 h-6" />
              游戏结束
            </CardTitle>
          </CardHeader>
          <CardContent>
            {winner && (
              <p className="text-2xl text-center text-slate-200 mb-4">
                {winner.name} 获胜！
              </p>
            )}
            <Button onClick={handleBackToLobby} className="w-full">
              返回房间
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }



  return (
    <div className="min-h-screen bg-[#0a0a0f] relative overflow-hidden">
      {/* 背景声波效果 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-gradient-radial from-purple-500/10 to-transparent animate-[pulse_4s_ease-in-out_infinite]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-gradient-radial from-purple-500/5 to-transparent animate-[pulse_4s_ease-in-out_infinite_2s]" />
      </div>

      <div className="relative z-10 min-h-screen">
        {/* 顶部：对手玩家 - 固定在顶部居中 */}
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-40">
          <div className="flex justify-center gap-4 flex-wrap">
            {enemyPlayers.map((enemy) => (
              <Card
                key={enemy.id}
                className={`bg-[#13131a] border-2 transition-all duration-300 w-48 ${
                  selectedCard ? 'cursor-pointer hover:border-yellow-500 hover:scale-105' : ''
                } ${enemy.isCurrentTurn ? 'border-purple-500/50 shadow-[0_0_20px_rgba(139,92,246,0.3)]' : 'border-slate-700/50'}`}
                onClick={() => selectedCard && handleSelectTarget(enemy.id)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <User className="w-4 h-4 text-slate-400" />
                      {enemy.name}
                    </CardTitle>
                    {enemy.isCurrentTurn && (
                      <Badge className="bg-purple-600 text-xs">
                        当前回合
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {/* 生命值 */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-red-400 flex items-center gap-1">
                        <Skull className="w-4 h-4" />
                        HP
                      </span>
                      <span className="text-slate-200 font-bold">
                        {enemy.hp}/{enemy.maxHp}
                      </span>
                    </div>
                    <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-red-600 to-red-400 transition-all duration-300"
                        style={{ width: `${(enemy.hp / enemy.maxHp) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* 护甲 */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-blue-400 flex items-center gap-1">
                      <Shield className="w-4 h-4" />
                      护甲
                    </span>
                    <span className="text-slate-200 font-bold">{enemy.armor}</span>
                  </div>

                  {/* 污染度 */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-purple-400 flex items-center gap-1">
                        <Skull className="w-4 h-4" />
                        污染度
                      </span>
                      <span className="text-slate-200 font-bold">{enemy.pollutionLevel}%</span>
                    </div>
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 transition-all duration-300"
                        style={{ width: `${enemy.pollutionLevel}%` }}
                      />
                    </div>
                  </div>

                  {/* 手牌数量 */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Layers className="w-4 h-4" />
                      手牌
                    </span>
                    <span className="text-slate-200 font-bold">{enemy.hand.length}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* 左侧：战斗日志区域（预留位置） */}
        <div className="fixed left-6 top-24 bottom-24 w-64 z-30">
          {/* 预留左侧区域 */}
        </div>

        {/* 中央：提示与交互区 */}
        <div className="fixed inset-0 flex items-center justify-center z-20 pt-32 pb-32">
          <div className="text-center">
            {/* 牌库状态 */}
            <div className="mb-6 flex justify-center gap-4">
              <div className="bg-[#13131a] border border-slate-700/50 rounded-xl p-4">
                <div className="flex items-center gap-2 text-sm">
                  <Layers className="w-4 h-4 text-purple-400" />
                  <span className="text-slate-400">抽牌堆</span>
                </div>
                <p className="text-2xl font-bold text-slate-200">
                  {gameState?.sharedDeck.length || 0}
                </p>
              </div>
              <div className="bg-[#13131a] border border-slate-700/50 rounded-xl p-4">
                <div className="flex items-center gap-2 text-sm">
                  <RotateCcw className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-400">弃牌堆</span>
                </div>
                <p className="text-2xl font-bold text-slate-200">
                  {gameState?.sharedDiscard.length || 0}
                </p>
              </div>
            </div>

            <div className="mb-4">
              <Badge variant="outline" className="text-lg px-4 py-2 bg-[#13131a] border-purple-500/50">
                <Gamepad2 className="w-5 h-5 mr-2 text-purple-400" />
                回合 {gameState?.turnCount || 1}
              </Badge>
            </div>

            {selectedCard ? (
              <div className="bg-[#13131a] border-2 border-yellow-500/50 rounded-xl p-6 max-w-md">
                <h3 className="text-yellow-400 text-xl mb-2 flex items-center justify-center gap-2">
                  <Target className="w-6 h-6" />
                  选择目标
                </h3>
                <p className="text-slate-400">
                  点击上方的敌对玩家作为目标
                </p>
                <Button
                  onClick={() => setSelectedCard(null)}
                  variant="outline"
                  className="mt-4"
                >
                  取消
                </Button>
              </div>
            ) : (
              <div className="bg-[#13131a] border border-purple-500/30 rounded-xl p-6 max-w-md">
                <h2 className="text-2xl font-bold mb-2 bg-gradient-to-r from-purple-400 to-violet-400 bg-clip-text text-transparent">
                  {isMyTurn ? '你的回合' : `${gameState?.players[gameState.currentPlayerIndex]?.name} 的回合`}
                </h2>
                <p className="text-slate-400">
                  {isMyTurn ? '选择卡牌进行出牌，或点击「结束回合」' : '等待其他玩家...'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* 右侧：抽牌堆/弃牌堆区域（预留位置） */}
        <div className="fixed right-6 top-24 bottom-24 w-64 z-30">
          {/* 预留右侧区域 */}
        </div>

        {/* 底部：手牌 */}
        <div className="fixed bottom-0 left-0 right-0 p-4 z-40">
          {/* 回合倒计时 */}
          {isMyTurn && (
            <div className="w-80 mx-auto mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-slate-300">回合时间</span>
                <span className={cn(
                  "text-xs font-bold",
                  timeLeft > 10 ? "text-purple-400" : "text-red-500 animate-pulse"
                )}>
                  {timeLeft}秒
                </span>
              </div>
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full transition-all duration-300",
                    timeLeft > 10 
                      ? "bg-gradient-to-r from-purple-500 to-purple-500/70" 
                      : "bg-gradient-to-r from-red-500 to-red-500/70"
                  )}
                  style={{ width: `${(timeLeft / 30) * 100}%` }}
                />
              </div>
            </div>
          )}
          
          {/* 手牌和按钮 */}
          <div className="flex items-end justify-center gap-8">
            {/* 手牌 */}
            <div className="flex justify-center items-end gap-[-24px] flex-wrap">
              {myPlayer && myPlayer.hand.map((cardId, index) => {
                const card = zhongLvCards.find(c => c.id === cardId);
                if (!card) return null;
                
                const isDisabled = !isMyTurn;
                const isSelected = selectedCard === card.id;

                return (
                  <div
                    key={`${cardId}-${index}`}
                    className={`relative transition-all duration-300 ${
                      isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:-translate-y-2'
                    } ${isSelected ? 'scale-110 -translate-y-4' : ''}`}
                    style={{ zIndex: index }}
                  >
                    <div
                      className={`relative w-44 h-56 rounded-2xl border-4 overflow-hidden transition-all duration-300 ${
                          card.type === 'attack'
                            ? 'bg-gradient-to-br from-red-950/80 to-red-900/60 border-red-500/80 hover:border-red-400 hover:shadow-[0_0_30px_rgba(239,68,68,0.4)]'
                            : card.type === 'skill'
                            ? 'bg-gradient-to-br from-blue-950/80 to-blue-900/60 border-blue-500/80 hover:border-blue-400 hover:shadow-[0_0_30px_rgba(59,130,246,0.4)]'
                            : 'bg-gradient-to-br from-yellow-950/80 to-yellow-900/60 border-yellow-500/80 hover:border-yellow-400 hover:shadow-[0_0_30px_rgba(234,179,8,0.4)]'
                        }`}
                      onClick={() => !isDisabled && handlePlayCard(card.id)}
                    >
                      {/* 费用图标 */}
                      <div className="absolute -top-2 -left-2 w-10 h-10 rounded-full bg-purple-600 border-4 border-[#13131a] flex items-center justify-center z-10 shadow-lg">
                        <span className="text-white font-bold text-xl">{card.cost}</span>
                      </div>

                      {/* 卡牌内容 */}
                      <div className="p-4 pt-8 h-full flex flex-col">
                        {/* 卡牌名称 */}
                        <h3 className="text-lg font-bold mb-1 text-slate-100 leading-tight">
                          {card.name}
                        </h3>

                        {/* 目标类型 */}
                        <p className="text-xs text-slate-400 mb-2">
                          {card.target === 'single'
                            ? '单体'
                            : card.target === 'aoe'
                            ? '群体'
                            : '自身'}
                        </p>

                        {/* 卡牌效果 */}
                        <p className="text-sm text-slate-300 flex-1 leading-relaxed">
                          {card.effect}
                        </p>
                      </div>

                      {/* 卡牌类型标签 */}
                      <div className="absolute -bottom-2 -left-2">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold shadow-lg ${
                            card.type === 'attack'
                              ? 'bg-red-500 text-white'
                              : card.type === 'skill'
                              ? 'bg-blue-500 text-white'
                              : 'bg-yellow-500 text-black'
                          }`}
                        >
                          {card.type === 'attack' ? '攻击' : card.type === 'skill' ? '技能' : '能力'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 出牌/结束回合按钮 */}
            <div className="flex flex-col gap-4">
              {/* 出牌按钮（选择目标后显示） */}
              {selectedCard && isMyTurn && (
                <Button
                  onClick={() => {
                    if (gameState?.selectedTargetId) {
                      handlePlayCard(selectedCard);
                    }
                  }}
                  disabled={!gameState?.selectedTargetId}
                  size="lg"
                  className="bg-green-600 hover:bg-green-500 text-xl px-12 py-6 rounded-2xl shadow-[0_0_30px_rgba(34,197,94,0.4)]"
                >
                  出牌
                  <ChevronRight className="w-6 h-6 ml-2" />
                </Button>
              )}
              
              {/* 结束回合按钮 */}
              {isMyTurn && !selectedCard && (
                <Button
                  onClick={handleEndTurn}
                  size="lg"
                  className="bg-purple-600 hover:bg-purple-500 text-xl px-12 py-6 rounded-2xl shadow-[0_0_30px_rgba(139,92,246,0.4)]"
                >
                  结束回合
                  <ChevronRight className="w-6 h-6 ml-2" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 左下角：玩家状态面板 */}
      {myPlayer && (
        <div className="fixed bottom-8 left-8 z-40">
          <div className="flex flex-col items-start">
            {/* 人物角色 */}
            <div className="relative">
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
              <div className="absolute -right-6 top-4 origin-left">
                {/* 剑的形状 */}
                <div className="relative">
                  {/* 剑身 */}
                  <div className="w-3 h-28 bg-gradient-to-r from-purple-500 to-purple-500/50 shadow-[0_0_15px_rgba(139,92,246,0.8)]" />
                  {/* 剑尖 */}
                  <div className="absolute -top-2 left-0 border-l-[6px] border-r-[6px] border-b-[12px] border-l-transparent border-r-transparent border-b-purple-500" />
                </div>
              </div>
            </div>
            
            {/* 玩家状态条 */}
            <div className="mt-4 w-64">
              {/* 护甲显示 - 如果有护甲 */}
              {myPlayer.armor > 0 && (
                <div className="flex items-center gap-2 bg-blue-500/20 px-2 py-1 rounded-lg border border-blue-500/50 mb-1">
                  <Shield className="w-4 h-4 text-blue-400" />
                  <span className="text-sm font-bold text-blue-400">{myPlayer.armor} 护甲</span>
                </div>
              )}
              
              {/* HP条 */}
              <StatBox
                name="HP"
                current={myPlayer.hp}
                max={myPlayer.maxHp}
                color="#ef4444"
                icon={Skull}
              />
              
              {/* AP条 */}
              <div className="mt-2">
                <StatBox
                  name="AP"
                  current={playerAp}
                  max={playerMaxAp}
                  color="#8b5cf6"
                  icon={Zap}
                />
              </div>
              
              {/* 永久属性/Buff栏 */}
              {(myPlayer as any).activeAbilities && (myPlayer as any).activeAbilities.length > 0 && (
                <div className="mt-2">
                  {/* 紧凑显示格 */}
                  <div className="relative group">
                    <div className="bg-slate-800/80 backdrop-blur border border-slate-700/50 rounded-xl p-2 cursor-pointer hover:bg-slate-700/80 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="flex -space-x-1">
                            {(myPlayer as any).activeAbilities.slice(0, 3).map((ability: string, idx: number) => {
                              let color = '#94a3b8';
                              if (ability === 'FREQUENCY_ANCHOR') color = '#3b82f6';
                              if (ability === 'LOW_FREQUENCY_RESONANCE') color = '#8b5cf6';
                              if (ability === 'PAIN_ECHO') color = '#ef4444';
                              if (ability === 'FINAL_TUNING') color = '#eab308';
                              
                              return (
                                <div 
                                  key={`${ability}-${idx}`}
                                  className="w-4 h-4 rounded-full border-2 border-slate-900"
                                  style={{ backgroundColor: color }}
                                />
                              );
                            })}
                          </div>
                          <span className="text-slate-300 text-sm font-bold">
                            {(myPlayer as any).activeAbilities.length} 个能力
                          </span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-500 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                    
                    {/* 悬停Tooltip */}
                    <div className="absolute bottom-full left-0 mb-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                      <div className="bg-slate-800/95 backdrop-blur border border-slate-600/50 rounded-xl p-3 min-w-[200px] shadow-xl">
                        <div className="space-y-2">
                          {(myPlayer as any).activeAbilities.map((ability: string, idx: number) => {
                            let name = '';
                            let desc = '';
                            let color = '#94a3b8';
                            
                            if (ability === 'FREQUENCY_ANCHOR') {
                              name = '频率锚定';
                              desc = '每回合+3护甲';
                              color = '#3b82f6';
                            } else if (ability === 'LOW_FREQUENCY_RESONANCE') {
                              name = '低频共振';
                              desc = '每5护甲→3伤害';
                              color = '#8b5cf6';
                            } else if (ability === 'PAIN_ECHO') {
                              name = '痛觉回响';
                              desc = '自伤→下次攻击+伤害';
                              color = '#ef4444';
                            } else if (ability === 'FINAL_TUNING') {
                              name = '终末定音';
                              desc = '≤20HP时+5伤害/2DOT';
                              color = '#eab308';
                            }
                            
                            return (
                              <div key={`${ability}-${idx}`} className="flex items-start gap-2">
                                <div 
                                  className="w-3 h-3 rounded-full mt-1 flex-shrink-0"
                                  style={{ backgroundColor: color }}
                                />
                                <div>
                                  <div className="text-slate-200 text-sm font-bold">{name}</div>
                                  <div className="text-slate-400 text-xs">{desc}</div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      {/* 小箭头 */}
                      <div className="w-3 h-3 bg-slate-800/95 border-b border-r border-slate-600/50 absolute left-4 -bottom-1.5 rotate-45" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 退出按钮 */}
      <div className="fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="icon"
          onClick={handleBackToLobby}
          className="bg-[#13131a] border-slate-700/50 hover:bg-slate-800/50 w-12 h-12 rounded-full"
        >
          <DoorOpen className="w-6 h-6 text-slate-400" />
        </Button>
      </div>
    </div>
  );
}
