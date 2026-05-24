'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { createMultiplayerWsConnection } from '@/lib/multiplayer/ws-client';
import type { MultiplayerGameState, MultiplayerPlayer } from '@/lib/multiplayer/types';
import { getCurrentPlayer, getEnemyPlayers, isCurrentPlayerTurn } from '@/lib/multiplayer/gameLogic';
import { zhongLvCards } from '@/lib/cards';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skull, Shield, Users, User, Play, RotateCcw, Target, ChevronRight, Trophy, Gamepad2, Layers, Clock, MessageSquare, DoorOpen } from 'lucide-react';

export default function MultiplayerBattlePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const roomId = searchParams.get('roomId');
  const playerId = searchParams.get('playerId');
  const playerName = searchParams.get('playerName') || '玩家';

  const [gameState, setGameState] = useState<MultiplayerGameState | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const wsRef = useRef<ReturnType<typeof createMultiplayerWsConnection> | null>(null);

  useEffect(() => {
    if (!roomId || !playerId) {
      setError('缺少房间ID或玩家ID');
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
  }, [roomId, playerId, playerName]);

  const currentPlayer = gameState ? getCurrentPlayer(gameState) : null;
  const enemyPlayers = gameState && playerId ? getEnemyPlayers(gameState, playerId) : [];
  const isMyTurn = gameState && playerId ? isCurrentPlayerTurn(gameState, playerId) : false;
  const myPlayer = gameState?.players.find(p => p.id === playerId);

  const handlePlayCard = (cardId: string) => {
    if (!isMyTurn || !wsRef.current || !myPlayer) return;

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

    // 直接打出卡牌
    wsRef.current.sendPlayCard(cardId);
    setSelectedCard(null);
  };

  const handleSelectTarget = (targetId: string) => {
    if (!isMyTurn || !wsRef.current || !selectedCard) return;
    wsRef.current.sendPlayCard(selectedCard, targetId);
    setSelectedCard(null);
  };

  const handleEndTurn = () => {
    if (!isMyTurn || !wsRef.current) return;
    wsRef.current.sendEndTurn();
  };

  const handleBackToLobby = () => {
    router.push('/lobby');
  };

  if (error) {
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

  if (!gameState) {
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

  if (gameState.phase === 'ended') {
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

      <div className="relative z-10 min-h-screen flex flex-col lg:flex-row">
        {/* 左侧：动作日志 */}
        <div className="lg:w-64 p-4 border-r border-slate-700/50">
          <Card className="bg-[#13131a] border-slate-700/50 h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-purple-400" />
                战斗日志
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px] lg:h-[calc(100vh-200px)]">
                <div className="space-y-2">
                  {gameState.actionLogs.length === 0 ? (
                    <p className="text-slate-500 text-sm text-center py-4">
                      等待游戏开始...
                    </p>
                  ) : (
                    gameState.actionLogs.map((log) => (
                      <div
                        key={log.id}
                        className="text-sm p-2 rounded bg-slate-800/30 border border-slate-700/30"
                      >
                        <p className="text-slate-300 font-medium">{log.playerName}</p>
                        <p className="text-purple-300">{log.action}</p>
                        {log.details && (
                          <p className="text-slate-400 text-xs mt-1">{log.details}</p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* 右侧：主战斗区域（经典1v1对战视角） */}
        <div className="flex-1 flex flex-col relative">
          {/* 顶部：对手区域 */}
          <div className="p-6 flex justify-center">
            <div className="flex gap-6 flex-wrap justify-center">
              {enemyPlayers.map((enemy) => (
                <div
                  key={enemy.id}
                  className={`relative transition-all duration-300 ${
                    selectedCard ? 'cursor-pointer hover:scale-105' : ''
                  } ${enemy.isCurrentTurn ? 'shadow-[0_0_30px_rgba(139,92,246,0.5)]' : ''}`}
                  onClick={() => selectedCard && handleSelectTarget(enemy.id)}
                >
                  <div className={`bg-[#13131a] border-2 rounded-2xl p-5 min-w-[220px] ${
                    enemy.isCurrentTurn ? 'border-red-500/60' : 'border-red-500/30'
                  }`}>
                    {/* 对手头像与名字 */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-900 to-red-800 flex items-center justify-center border-2 border-red-500/50">
                        <User className="w-6 h-6 text-red-300" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-bold text-red-300">{enemy.name}</h3>
                          {enemy.isCurrentTurn && (
                            <Badge className="bg-red-600 text-xs">对手回合</Badge>
                          )}
                        </div>
                        <p className="text-xs text-slate-500">手牌: {enemy.hand.length}张</p>
                      </div>
                    </div>

                    {/* 血条 */}
                    <div className="space-y-3">
                      {/* 生命值 */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-red-400 flex items-center gap-1">
                            <Skull className="w-4 h-4" />
                            生命值
                          </span>
                          <span className="text-red-200 font-bold">
                            {enemy.hp}/{enemy.maxHp}
                          </span>
                        </div>
                        <div className="h-4 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                          <div
                            className="h-full bg-gradient-to-r from-red-700 to-red-500 transition-all duration-300"
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
                        <span className="text-blue-200 font-bold text-lg">{enemy.armor}</span>
                      </div>

                      {/* 污染度 */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-purple-400 flex items-center gap-1">
                            <Skull className="w-4 h-4" />
                            污染度
                          </span>
                          <span className="text-purple-200 font-bold">{enemy.pollutionLevel}%</span>
                        </div>
                        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 transition-all duration-300"
                            style={{ width: `${enemy.pollutionLevel}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 中部：公共区域 */}
          <div className="flex-1 flex items-center justify-center relative">
            {/* 中央牌库 */}
            <div className="absolute right-12 top-1/2 -translate-y-1/2 flex flex-col gap-4">
              <div className="bg-[#13131a] border border-purple-500/40 rounded-xl p-4 shadow-[0_0_20px_rgba(139,92,246,0.2)]">
                <div className="flex items-center gap-2 text-sm mb-1">
                  <Layers className="w-4 h-4 text-purple-400" />
                  <span className="text-slate-400">抽牌堆</span>
                </div>
                <p className="text-3xl font-bold text-purple-300">
                  {gameState.sharedDeck.length}
                </p>
              </div>
              <div className="bg-[#13131a] border border-slate-600/50 rounded-xl p-4">
                <div className="flex items-center gap-2 text-sm mb-1">
                  <RotateCcw className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-400">弃牌堆</span>
                </div>
                <p className="text-3xl font-bold text-slate-300">
                  {gameState.sharedDiscard.length}
                </p>
              </div>
            </div>

            {/* 回合信息 */}
            <div className="text-center">
              <div className="mb-6">
                <Badge variant="outline" className="text-xl px-6 py-3 bg-[#13131a] border-purple-500/50">
                  <Gamepad2 className="w-6 h-6 mr-2 text-purple-400" />
                  回合 {gameState.turnCount}
                </Badge>
              </div>

              {selectedCard ? (
                <div className="bg-[#13131a] border-2 border-yellow-500/50 rounded-xl p-6 max-w-md">
                  <h3 className="text-yellow-400 text-xl mb-2 flex items-center justify-center gap-2">
                    <Target className="w-6 h-6" />
                    选择目标
                  </h3>
                  <p className="text-slate-400">
                    点击上方的对手作为目标
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
                    {isMyTurn ? '你的回合' : `${currentPlayer?.name} 的回合`}
                  </h2>
                  <p className="text-slate-400">
                    {isMyTurn ? '选择下方手牌进行出牌，或点击「结束回合」' : '等待对手...'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* 底部：玩家区域 */}
          <div className="p-6">
            {/* 玩家状态 */}
            {myPlayer && (
              <div className="mb-6 flex justify-center">
                <div className={`bg-[#13131a] border-2 border-blue-500/60 rounded-2xl p-5 min-w-[220px] shadow-[0_0_30px_rgba(59,130,246,0.3)] ${
                  myPlayer.isCurrentTurn ? 'ring-2 ring-blue-500/40' : ''
                }`}>
                  {/* 玩家头像与名字 */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-900 to-blue-800 flex items-center justify-center border-2 border-blue-500/50">
                      <User className="w-6 h-6 text-blue-300" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold text-blue-300">{myPlayer.name}</h3>
                        {myPlayer.isCurrentTurn && (
                          <Badge className="bg-blue-600 text-xs">你的回合</Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 血条 */}
                  <div className="space-y-3">
                    {/* 生命值 */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-red-400 flex items-center gap-1">
                          <Skull className="w-4 h-4" />
                          生命值
                        </span>
                        <span className="text-red-200 font-bold">
                          {myPlayer.hp}/{myPlayer.maxHp}
                        </span>
                      </div>
                      <div className="h-4 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                        <div
                          className="h-full bg-gradient-to-r from-red-700 to-red-500 transition-all duration-300"
                          style={{ width: `${(myPlayer.hp / myPlayer.maxHp) * 100}%` }}
                        />
                      </div>
                    </div>

                    {/* 护甲 */}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-blue-400 flex items-center gap-1">
                        <Shield className="w-4 h-4" />
                        护甲
                      </span>
                      <span className="text-blue-200 font-bold text-lg">{myPlayer.armor}</span>
                    </div>

                    {/* 污染度 */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-purple-400 flex items-center gap-1">
                          <Skull className="w-4 h-4" />
                          污染度
                        </span>
                        <span className="text-purple-200 font-bold">{myPlayer.pollutionLevel}%</span>
                      </div>
                      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 transition-all duration-300"
                          style={{ width: `${myPlayer.pollutionLevel}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 手牌区 */}
            <div className="flex justify-center items-end gap-[-20px] flex-wrap">
              {myPlayer && myPlayer.hand.map((cardId, index) => {
                const card = zhongLvCards.find(c => c.id === cardId);
                if (!card) return null;
                
                const isDisabled = !isMyTurn;
                const isSelected = selectedCard === card.id;

                return (
                  <div
                    key={`${cardId}-${index}`}
                    className={`relative transition-all duration-300 ${
                      isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:-translate-y-3'
                    } ${isSelected ? 'scale-110 -translate-y-6' : ''}`}
                    style={{ zIndex: index }}
                  >
                    <div
                      className={`relative w-40 h-52 rounded-xl border-3 overflow-hidden ${
                        card.type === 'attack'
                          ? 'bg-gradient-to-br from-red-950/80 to-red-900/60 border-red-500/80 hover:border-red-400 hover:shadow-[0_0_30px_rgba(239,68,68,0.4)]'
                          : card.type === 'skill'
                          ? 'bg-gradient-to-br from-blue-950/80 to-blue-900/60 border-blue-500/80 hover:border-blue-400 hover:shadow-[0_0_30px_rgba(59,130,246,0.4)]'
                          : 'bg-gradient-to-br from-yellow-950/80 to-yellow-900/60 border-yellow-500/80 hover:border-yellow-400 hover:shadow-[0_0_30px_rgba(234,179,8,0.4)]'
                      }`}
                      onClick={() => !isDisabled && handlePlayCard(card.id)}
                    >
                      {/* 费用图标 */}
                      <div className="absolute -top-2 -left-2 w-11 h-11 rounded-full bg-purple-600 border-4 border-[#13131a] flex items-center justify-center z-10 shadow-lg">
                        <span className="text-white font-bold text-xl">{card.cost}</span>
                      </div>

                      {/* 卡牌内容 */}
                      <div className="p-4 pt-9 h-full flex flex-col">
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

            {/* 结束回合按钮 */}
            {isMyTurn && (
              <div className="flex justify-center mt-6">
                <Button
                  onClick={handleEndTurn}
                  size="lg"
                  className="bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 text-xl px-14 py-9 rounded-2xl shadow-[0_0_40px_rgba(139,92,246,0.5)]"
                >
                  结束回合
                  <ChevronRight className="w-7 h-7 ml-2" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 左上角退出按钮 */}
      <div className="fixed top-6 left-6 z-50">
        <div
          onClick={handleBackToLobby}
          className="w-12 h-12 bg-red-500/20 hover:bg-red-500/40 border border-red-500/50 rounded-full flex items-center justify-center cursor-pointer transition-all"
        >
          <DoorOpen className="w-6 h-6 text-red-400" />
        </div>
      </div>
    </div>
  );
}
