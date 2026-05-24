'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Skull,
  Shield,
  Zap,
  RotateCcw,
  User,
  X,
  Loader2
} from 'lucide-react';
import { Card, zhongLvCards } from '@/lib/cards';
import { createMultiplayerWsConnection } from '@/lib/multiplayer/ws-client';
import type { MultiplayerGameState, MultiplayerPlayer } from '@/lib/multiplayer/types';
import { useSearchParams, useRouter } from 'next/navigation';

// 游戏常量
const INITIAL_HP = 80;
const INITIAL_AP = 3;
const TURN_DURATION = 30;

// 动画常量
const ANIMATION_DURATION = 0.3;

export default function MultiplayerBattlePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // 从URL获取参数
  const roomId = searchParams?.get('roomId');
  const playerId = searchParams?.get('playerId');
  const playerName = searchParams?.get('playerName');

  // WebSocket状态
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [gameState, setGameState] = useState<MultiplayerGameState | null>(null);
  const wsRef = useRef<ReturnType<typeof createMultiplayerWsConnection> | null>(null);
  
  // 本地UI状态
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [floatingTexts, setFloatingTexts] = useState<{ id: number; target: 'self' | 'enemy'; amount: number; type: 'damage' | 'heal' | 'armor' | 'contamination' }[]>([]);
  const floatingIdCounter = useRef(0);

  // 连接WebSocket
  useEffect(() => {
    if (!roomId || !playerId) {
      setConnectionError('缺少必要参数，请从房间页面进入');
      setIsConnecting(false);
      return;
    }

    const ws = createMultiplayerWsConnection({
      roomId,
      playerId,
      playerName: playerName || 'Player',
      onGameStateUpdate: (state) => {
        console.log('[Multiplayer] Game state updated:', state);
        setGameState(state);
      },
      onOpen: () => {
        console.log('[Multiplayer] Connected');
        setIsConnected(true);
        setIsConnecting(false);
        setConnectionError(null);
      },
      onClose: () => {
        console.log('[Multiplayer] Disconnected');
        setIsConnected(false);
      },
      onError: (error: string) => {
        console.error('[Multiplayer] Error:', error);
        setConnectionError(error || '连接错误');
        setIsConnecting(false);
      }
    });

    wsRef.current = ws;

    return () => {
      ws.close();
    };
  }, [roomId, playerId, playerName]);

  // 添加飘字
  const addFloatingText = useCallback((target: 'self' | 'enemy', amount: number, type: 'damage' | 'heal' | 'armor' | 'contamination') => {
    const id = floatingIdCounter.current++;
    setFloatingTexts(prev => [...prev, { id, target, amount, type }]);
    setTimeout(() => {
      setFloatingTexts(prev => prev.filter(t => t.id !== id));
    }, 1500);
  }, []);

  // 获取当前玩家状态
  const getMyState = useCallback((): MultiplayerPlayer | null => {
    if (!gameState || !playerId) return null;
    return gameState.players[playerId] || null;
  }, [gameState, playerId]);

  // 获取对手状态
  const getEnemyState = useCallback((): MultiplayerPlayer | null => {
    if (!gameState || !playerId) return null;
    const enemyPlayerId = gameState.playerIds.find((id) => id !== playerId);
    return enemyPlayerId ? gameState.players[enemyPlayerId] : null;
  }, [gameState, playerId]);

  // 是否是我的回合
  const isMyTurn = useMemo(() => {
    if (!gameState || !playerId) return false;
    return gameState.currentPlayerId === playerId;
  }, [gameState, playerId]);

  // 获取我的手牌
  const myHand = useMemo(() => {
    const myState = getMyState();
    if (!myState) return [];
    return myState.hand;
  }, [getMyState]);

  // 处理出牌
  const handlePlayCard = useCallback((card: Card) => {
    if (!isMyTurn || !wsRef.current) return;

    const myState = getMyState();
    if (!myState || myState.ap < card.cost) return;

    if (selectedCard?.id === card.id) {
      // 确认出牌
      wsRef.current.sendPlayCard(card.id);
      setSelectedCard(null);
    } else {
      // 选中卡牌
      setSelectedCard(card);
    }
  }, [isMyTurn, selectedCard, getMyState]);

  // 处理结束回合
  const handleEndTurn = useCallback(() => {
    if (!isMyTurn || !wsRef.current) return;

    wsRef.current.sendEndTurn();
    setSelectedCard(null);
  }, [isMyTurn]);

  // 重新开始（返回房间）
  const handleRestart = () => {
    router.push('/lobby');
  };

  // 渲染游戏结束界面
  if (gameState?.phase === 'ended') {
    const myState = getMyState();
    const isWinner = myState?.isWinner;

    return (
      <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center p-8">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center"
        >
          <h1 className={`text-6xl font-bold mb-4 font-['Rajdhani'] ${isWinner ? 'text-purple-500' : 'text-red-500'}`}>
            {isWinner ? '胜利！' : '败北...'}
          </h1>
          <p className="text-slate-400 text-xl mb-8">
            {isWinner ? '你战胜了对手！' : '你被对手击败了...'}
          </p>
          <button
            onClick={handleRestart}
            className="px-8 py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xl font-bold flex items-center gap-3 mx-auto transition-all hover:scale-105"
          >
            <RotateCcw size={24} />
            返回房间
          </button>
        </motion.div>
      </div>
    );
  }

  // 渲染连接错误
  if (connectionError) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center p-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-red-500 mb-4 font-['Rajdhani']">连接失败</h1>
          <p className="text-slate-400 text-xl mb-8">{connectionError}</p>
          <button
            onClick={() => router.push('/lobby')}
            className="px-8 py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xl font-bold flex items-center gap-3 mx-auto transition-all hover:scale-105"
          >
            返回房间
          </button>
        </div>
      </div>
    );
  }

  // 渲染加载状态
  if (isConnecting || !gameState) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center p-8">
        <Loader2 className="w-16 h-16 text-purple-500 animate-spin mb-4" />
        <p className="text-slate-400 text-xl">正在连接...</p>
      </div>
    );
  }

  const myState = getMyState();
  const enemyState = getEnemyState();

  if (!myState || !enemyState) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center p-8">
        <p className="text-slate-400 text-xl">等待玩家加入...</p>
      </div>
    );
  }

  // 回合倒计时
  const turnTimeLeft = gameState.turnTimeLeft ?? TURN_DURATION;

  return (
    <div className="min-h-screen bg-[#0a0a0f] relative overflow-hidden select-none">
      {/* 声波背景动画 */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-gradient-to-br from-purple-900/10 to-transparent animate-pulse" style={{ animationDuration: '3s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full border border-purple-800/20 animate-ping" style={{ animationDuration: '4s' }} />
      </div>

      <div className="relative z-10 h-screen flex flex-col">
        {/* 顶部：敌方状态栏 */}
        <div className="p-4">
          <div className="flex justify-center">
            <div className="relative group">
              <div className="bg-[#13131a] border border-slate-700/50 rounded-2xl p-4 flex items-center gap-4 shadow-xl">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center border-2 border-red-500/50">
                    <User className="w-8 h-8 text-slate-400" />
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-bold text-slate-200 font-['Rajdhani']">{enemyState.name}</span>
                    <span className="text-slate-500">调音师</span>
                  </div>
                  
                  {/* HP条 */}
                  <div className="flex items-center gap-3">
                    <Skull className="w-5 h-5 text-red-500" />
                    <div className="w-48 h-5 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                      <motion.div
                        className="h-full bg-gradient-to-r from-red-600 to-red-500"
                        initial={{ width: '100%' }}
                        animate={{ width: `${(enemyState.hp / INITIAL_HP) * 100}%` }}
                        transition={{ duration: ANIMATION_DURATION }}
                      />
                    </div>
                    <span className="text-slate-200 font-bold font-['Rajdhani'] w-16 text-right">{enemyState.hp}/{INITIAL_HP}</span>
                  </div>
                  
                  {/* 护甲显示 */}
                  <div className="flex items-center gap-3">
                    <Shield className="w-5 h-5 text-blue-500" />
                    <span className="text-blue-500 font-bold text-xl font-['Rajdhani']">{enemyState.armor} 护甲</span>
                  </div>
                </div>
              </div>
              
              {/* 敌方飘字 */}
              <AnimatePresence>
                {floatingTexts.filter(t => t.target === 'enemy').map(t => (
                  <motion.div
                    key={t.id}
                    initial={{ opacity: 1, y: 0, scale: 0.5 }}
                    animate={{ opacity: 0, y: -60, scale: 1.2 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1 }}
                    className={`absolute -top-8 left-1/2 -translate-x-1/2 font-['Rajdhani'] font-bold text-2xl ${
                      t.type === 'damage' ? 'text-red-500' :
                      t.type === 'armor' ? 'text-blue-500' :
                      t.type === 'contamination' ? 'text-purple-500' :
                      'text-green-500'
                    }`}
                  >
                    {t.type === 'damage' ? `-${t.amount}` : `+${t.amount}`}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* 中间：游戏主区域 */}
        <div className="flex-1 flex flex-col items-center justify-center gap-8 px-8">
          {/* 中央提示区域 */}
          <div className="text-center">
            <motion.h2
              key={isMyTurn ? 'my-turn' : 'enemy-turn'}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className={`text-5xl font-bold mb-4 font-['Rajdhani'] ${isMyTurn ? 'text-purple-400' : 'text-slate-500'}`}
            >
              {isMyTurn ? '你的回合' : `${enemyState.name}的回合`}
            </motion.h2>
            
            {/* 回合计数 */}
            <p className="text-slate-500 text-2xl font-['Rajdhani'] mb-4">
              回合 {gameState.turnNumber} · 剩余 {turnTimeLeft} 秒
            </p>
            
            {selectedCard && isMyTurn && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6"
              >
                <p className="text-slate-400 text-lg mb-4">再次点击卡牌确认出牌</p>
                <button
                  onClick={() => setSelectedCard(null)}
                  className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors"
                >
                  取消选择
                </button>
              </motion.div>
            )}
            
            {!selectedCard && isMyTurn && (
              <p className="text-slate-500 text-xl">
                选择卡牌进行出牌，或点击「结束回合」
              </p>
            )}
          </div>
        </div>

        {/* 底部：玩家状态栏 + 手牌 */}
        <div className="p-4 pb-8">
          {/* 回合倒计时条 */}
          <div className="max-w-4xl mx-auto mb-4">
            <div className="flex items-center justify-between mb-2 px-2">
              <span className="text-slate-400 font-bold font-['Rajdhani'] text-xl">回合时间</span>
              <span className={`font-bold font-['Rajdhani'] text-2xl ${turnTimeLeft <= 10 ? 'text-red-500 animate-pulse' : 'text-purple-500'}`}>
                {turnTimeLeft}秒
              </span>
            </div>
            <div className="h-4 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
              <motion.div
                className="h-full bg-gradient-to-r from-purple-600 to-purple-500"
                initial={{ width: '100%' }}
                animate={{ width: `${(turnTimeLeft / TURN_DURATION) * 100}%` }}
                transition={{ duration: 1, ease: 'linear' }}
              />
            </div>
          </div>

          {/* 手牌区域 */}
          <div className="flex items-end justify-center gap-4 mb-8 min-h-[220px]">
            {myHand.map((card, index) => {
              const isSelected = selectedCard?.id === card.id;
              const borderColor =
                card.type === 'attack' ? 'border-red-500/60' :
                card.type === 'skill' ? 'border-blue-500/60' :
                'border-yellow-500/60';
              const canPlay = isMyTurn && myState.ap >= card.cost;
              const rotationAngle = (index - myHand.length / 2) * 2;
              
              return (
                <motion.div
                  key={card.id}
                  initial={{ y: 100, opacity: 0, rotate: rotationAngle }}
                  animate={{
                    y: isSelected ? -30 : 0,
                    opacity: 1,
                    rotate: 0,
                    scale: isSelected ? 1.1 : 1,
                    zIndex: isSelected ? 50 : 10
                  }}
                  whileHover={!isSelected && canPlay ? { y: -10, scale: 1.05 } : {}}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  className={`relative w-40 flex-shrink-0 ${!canPlay ? 'opacity-50 grayscale' : ''}`}
                >
                  <div
                    onClick={() => canPlay && handlePlayCard(card)}
                    className={`
                      bg-[#13131a] border-2 ${borderColor} rounded-2xl p-4
                      cursor-pointer transition-all
                      ${isSelected ? 'ring-2 ring-purple-500 ring-offset-2 ring-offset-[#0a0a0f] shadow-[0_0_30px_rgba(139,92,246,0.3)]' : ''}
                      ${canPlay && !isSelected ? 'hover:shadow-[0_0_20px_rgba(139,92,246,0.2)]' : ''}
                    `}
                  >
                    {/* 费用 */}
                    <div className="absolute -top-3 -left-3 w-12 h-12 rounded-full bg-gradient-to-br from-purple-600 to-purple-800 border-2 border-slate-200 flex items-center justify-center shadow-lg">
                      <span className="text-2xl font-bold text-white font-['Rajdhani']">{card.cost}</span>
                    </div>
                    
                    {/* 卡面内容 */}
                    <div className="pt-6">
                      <h3 className="text-xl font-bold text-slate-100 mb-2 font-['Rajdhani'] leading-tight">{card.name}</h3>
                      <p className="text-xs text-slate-400 mb-3 capitalize">{card.type === 'attack' ? '单体' : card.type === 'skill' ? '自身' : '能力'}</p>
                      <p className="text-sm text-slate-300 leading-relaxed">{card.effect}</p>
                    </div>
                    
                    {/* 类型标签 */}
                    <div className="mt-4 flex justify-end">
                      <span className={`
                        px-3 py-1 rounded-full text-sm font-bold
                        ${card.type === 'attack' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : ''}
                        ${card.type === 'skill' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : ''}
                        ${card.type === 'ability' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' : ''}
                      `}>
                        {card.type === 'attack' ? '攻击' : card.type === 'skill' ? '技能' : '能力'}
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
            
            {/* 手牌数量提示 */}
            {myHand.length === 0 && (
              <div className="text-slate-600 text-xl font-['Rajdhani']">没有手牌</div>
            )}
          </div>

          {/* 底部控制栏 */}
          <div className="flex justify-between items-end max-w-6xl mx-auto px-4">
            {/* 左侧：玩家状态栏 */}
            <div className="relative">
              <div className="bg-[#13131a] border border-slate-700/50 rounded-2xl p-4 flex items-center gap-4 shadow-xl">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-700 to-purple-900 flex items-center justify-center border-2 border-purple-500/50">
                    <User className="w-8 h-8 text-purple-200" />
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-bold text-slate-200 font-['Rajdhani']">{myState.name}</span>
                    <span className="text-slate-500">调音师</span>
                  </div>
                  
                  {/* HP条 */}
                  <div className="flex items-center gap-3">
                    <Skull className="w-5 h-5 text-red-500" />
                    <div className="w-48 h-5 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                      <motion.div
                        className="h-full bg-gradient-to-r from-red-600 to-red-500"
                        initial={{ width: '100%' }}
                        animate={{ width: `${(myState.hp / INITIAL_HP) * 100}%` }}
                        transition={{ duration: ANIMATION_DURATION }}
                      />
                    </div>
                    <span className="text-slate-200 font-bold font-['Rajdhani'] w-16 text-right">{myState.hp}/{INITIAL_HP}</span>
                  </div>
                  
                  {/* AP条 */}
                  <div className="flex items-center gap-3">
                    <Zap className="w-5 h-5 text-purple-500" />
                    <div className="w-48 h-5 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                      <div className="h-full flex">
                        {[...Array(INITIAL_AP)].map((_, i) => (
                          <div key={i} className={`flex-1 ${i < myState.ap ? 'bg-purple-500' : 'bg-slate-700'} ${i > 0 ? 'border-l border-slate-800' : ''}`} />
                        ))}
                      </div>
                    </div>
                    <span className="text-purple-400 font-bold font-['Rajdhani'] w-16 text-right">{myState.ap}/{INITIAL_AP}</span>
                  </div>
                  
                  {/* 护甲显示 */}
                  <div className="flex items-center gap-3">
                    <Shield className="w-5 h-5 text-blue-500" />
                    <span className="text-blue-500 font-bold text-xl font-['Rajdhani']">{myState.armor} 护甲</span>
                  </div>
                </div>
              </div>
              
              {/* 己方飘字 */}
              <AnimatePresence>
                {floatingTexts.filter(t => t.target === 'self').map(t => (
                  <motion.div
                    key={t.id}
                    initial={{ opacity: 1, y: 0, scale: 0.5 }}
                    animate={{ opacity: 0, y: -60, scale: 1.2 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1 }}
                    className={`absolute -top-8 left-1/2 -translate-x-1/2 font-['Rajdhani'] font-bold text-2xl ${
                      t.type === 'damage' ? 'text-red-500' :
                      t.type === 'armor' ? 'text-blue-500' :
                      t.type === 'contamination' ? 'text-purple-500' :
                      'text-green-500'
                    }`}
                  >
                    {t.type === 'damage' ? `-${t.amount}` : `+${t.amount}`}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* 右侧：操作按钮 */}
            <div className="flex gap-4">
              {isMyTurn && (
                <button
                  onClick={handleEndTurn}
                  disabled={!isMyTurn}
                  className="px-8 py-4 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-2xl text-3xl font-bold flex items-center gap-3 transition-all hover:scale-105 font-['Rajdhani'] shadow-[0_0_30px_rgba(139,92,246,0.4)]"
                >
                  <RotateCcw size={32} />
                  结束回合
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* 返回按钮 */}
      <button
        onClick={() => router.push('/')}
        className="absolute top-4 left-4 w-12 h-12 rounded-full bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 flex items-center justify-center transition-all group"
      >
        <X className="w-6 h-6 text-slate-400 group-hover:text-white" />
      </button>
    </div>
  );
}
