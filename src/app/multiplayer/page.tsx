'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skull, Shield, Users, User, Play, RotateCcw, Target, ChevronRight, Trophy, Gamepad2, Layers, Clock, MessageSquare, DoorOpen, Zap } from 'lucide-react';

// 复制StatBox组件
interface StatBoxProps {
  name: string;
  current: number;
  max: number;
  color: string;
  icon?: React.ElementType;
  showIcon?: boolean;
}

function StatBox({ name, current, max, color, icon: Icon, showIcon = true }: StatBoxProps) {
  const percentage = Math.max(0, Math.min(100, (current / max) * 100));
  
  return (
    <div className="flex items-center gap-3 bg-black/60 backdrop-blur-md px-3 py-2 rounded-xl border border-slate-700/50 shadow-lg">
      {showIcon && Icon && <Icon className="w-5 h-5" style={{ color }} />}
      <div className="flex-1">
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs font-bold tracking-wider uppercase" style={{ color }}>
            {name}
          </span>
          <span className="text-xs font-mono font-bold text-slate-200">
            {current}/{max}
          </span>
        </div>
        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
          <div 
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{ 
              width: `${percentage}%`,
              backgroundColor: color,
              boxShadow: `0 0 10px ${color}40`
            }}
          />
        </div>
      </div>
    </div>
  );
}

// 复制EntityStatusPanel组件
interface EntityStatusPanelProps {
  entity: { hp: number; maxHp: number; armor?: number; name: string };
  isEnemy?: boolean;
}

function EntityStatusPanel({ entity, isEnemy = false }: EntityStatusPanelProps) {
  const hpColor = isEnemy ? '#ef4444' : '#22c55e';
  
  return (
    <div className={`flex items-center gap-3 bg-black/60 backdrop-blur-md p-3 rounded-xl border border-slate-700/50 shadow-lg relative ${isEnemy ? 'cursor-pointer hover:border-red-500/50' : ''}`}>
      <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg relative overflow-hidden ${isEnemy ? 'bg-gradient-to-br from-purple-600 to-purple-900' : 'bg-gradient-to-br from-slate-600 to-slate-800'}`}>
        {isEnemy ? <Skull className="w-6 h-6 text-purple-200" /> : <User className="w-6 h-6 text-slate-200" />}
      </div>
      
      <div className="flex-1">
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm font-bold text-slate-200">{entity.name}</span>
          {entity.armor !== undefined && entity.armor > 0 && (
            <div className="flex items-center gap-1 bg-blue-500/20 px-2 py-0.5 rounded-lg">
              <Shield className="w-3 h-3 text-blue-400" />
              <span className="text-xs font-bold text-blue-400">{entity.armor}</span>
            </div>
          )}
        </div>
        <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
          <div 
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{ 
              width: `${(entity.hp / entity.maxHp) * 100}%`,
              backgroundColor: hpColor,
              boxShadow: `0 0 10px ${hpColor}40`
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default function MultiplayerPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roomId = searchParams.get('roomId');
  const playerId = searchParams.get('playerId');
  
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [gameState, setGameState] = useState<any>(null);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  
  // 游戏内状态
  const [playerAp, setPlayerAp] = useState(3);
  const [playerMaxAp] = useState(3);

  useEffect(() => {
    if (!roomId || !playerId) {
      router.push('/lobby');
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(`${protocol}//${window.location.host}/ws/multiplayer?roomId=${roomId}&playerId=${playerId}`);

    socket.onopen = () => {
      console.log('Connected to multiplayer');
    };

    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log('Received message:', message);

        switch (message.type) {
          case 'room-state':
          case 'game-state':
            setGameState(message.payload);
            break;
          case 'player-joined':
            setGameState((prev: any) => prev ? {
              ...prev,
              players: [...prev.players, message.payload]
            } : prev);
            break;
          case 'player-left':
            setGameState((prev: any) => prev ? {
              ...prev,
              players: prev.players.filter((p: any) => p.id !== message.payload.playerId)
            } : prev);
            break;
          case 'player-ready':
            setGameState((prev: any) => prev ? {
              ...prev,
              players: prev.players.map((p: any) => 
                p.id === message.payload.playerId 
                  ? { ...p, isReady: message.payload.isReady } 
                  : p
              )
            } : prev);
            break;
          case 'game-started':
            setGameState(message.payload);
            break;
          case 'error':
            console.error('Multiplayer error:', message.payload);
            break;
        }
      } catch (e) {
        console.error('Failed to parse message:', e);
      }
    };

    socket.onclose = () => {
      console.log('Disconnected from multiplayer');
    };

    setWs(socket);

    return () => {
      socket.close();
    };
  }, [roomId, playerId, router]);

  const handleBackToLobby = () => {
    router.push('/lobby');
  };

  const handleSelectCard = (cardId: string) => {
    if (selectedCard === cardId) {
      setSelectedCard(null);
    } else {
      setSelectedCard(cardId);
    }
  };

  const handleSelectTarget = (targetId: string) => {
    if (selectedCard && ws) {
      // TODO: 发送出牌消息
      console.log('Playing card:', selectedCard, 'on target:', targetId);
      setSelectedCard(null);
    }
  };

  const handleEndTurn = () => {
    if (ws) {
      // TODO: 发送结束回合消息
      console.log('Ending turn');
    }
  };

  // 判断是否正在游戏中
  const actualGameState = gameState && 'gameState' in gameState ? (gameState as any).gameState : gameState;
  const enemyPlayers = actualGameState && 'players' in actualGameState ? 
    (actualGameState as any).players.filter((p: any) => p.id !== playerId) : [];
  const isMyTurn = actualGameState && 'players' in actualGameState && playerId ? 
    (actualGameState as any).players[(actualGameState as any).currentPlayerIndex]?.id === playerId : false;
  const myPlayer = actualGameState && 'players' in actualGameState ? 
    (actualGameState as any).players.find((p: any) => p.id === playerId) : null;

  // 转换myPlayer为适合EntityStatusPanel的格式
  const myPlayerEntity = myPlayer ? {
    hp: myPlayer.hp,
    maxHp: myPlayer.maxHp,
    armor: myPlayer.armor,
    name: myPlayer.name
  } : null;

  // 检查是否已经进入游戏
  const isPlaying = actualGameState && 'players' in actualGameState && 
    (actualGameState as any).phase === 'playing';

  return (
    <div className="min-h-screen bg-[#0a0a0f] relative overflow-hidden">
      {/* 如果还没有进入游戏，显示房间等待界面 */}
      {!isPlaying && gameState && 'players' in gameState && (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-purple-400 to-violet-400 bg-clip-text text-transparent">
              等待游戏开始...
            </h1>
            <p className="text-slate-400">
              房主点击「开始游戏」即可开始
            </p>
          </div>
        </div>
      )}

      {/* 背景声波效果 */}
      {(isPlaying || !gameState) && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-gradient-radial from-purple-500/10 to-transparent animate-[pulse_4s_ease-in-out_infinite]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-gradient-radial from-purple-500/5 to-transparent animate-[pulse_4s_ease-in-out_infinite_2s]" />
        </div>
      )}

      {/* 游戏界面 */}
      {isPlaying && (
        <>
          {/* 顶部：对手玩家（固定在顶部居中） */}
          {enemyPlayers.length > 0 && (
            <div className="fixed top-6 left-1/2 -translate-x-1/2 z-40">
              <div className="flex justify-center gap-4 flex-wrap">
                {enemyPlayers.map((enemy: any) => (
                  <div
                    key={enemy.id}
                    onClick={() => selectedCard && handleSelectTarget(enemy.id)}
                    className={`transition-all duration-300 cursor-pointer relative ${
                      selectedCard ? 'hover:scale-105' : ''
                    }`}
                  >
                    <EntityStatusPanel 
                      entity={{
                        hp: enemy.hp,
                        maxHp: enemy.maxHp,
                        armor: enemy.armor,
                        name: enemy.name
                      }}
                      isEnemy={true}
                    />
                    {enemy.isCurrentTurn && (
                      <div className="absolute -top-2 -right-2">
                        <Badge className="bg-purple-600 text-xs">
                          当前回合
                        </Badge>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 左侧：战斗日志 */}
          <div className="fixed left-8 top-1/2 -translate-y-1/2 z-30">
            <div className="bg-black/80 backdrop-blur-md p-4 rounded-xl border border-purple-500/30 w-64 shadow-lg">
              <div className="flex items-center gap-2 mb-3">
                <MessageSquare className="w-4 h-4 text-purple-400" />
                <span className="text-sm font-bold text-slate-200">战斗日志</span>
              </div>
              <div className="text-xs text-slate-400 text-center">
                等待战斗开始...
              </div>
            </div>
          </div>

          {/* 右侧：抽牌堆/弃牌堆 */}
          {gameState && (
            <div className="fixed right-8 top-1/2 -translate-y-1/2 z-30">
              <div className="space-y-4">
                <div className="bg-black/80 backdrop-blur-md p-4 rounded-xl border border-purple-500/30 shadow-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Layers className="w-4 h-4 text-purple-400" />
                    <span className="text-sm text-slate-400">抽牌堆</span>
                  </div>
                  <div className="text-2xl font-bold text-purple-400">
                    {gameState.sharedDeck?.length || 0}
                  </div>
                </div>
                <div className="bg-black/80 backdrop-blur-md p-4 rounded-xl border border-slate-600/30 shadow-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <RotateCcw className="w-4 h-4 text-slate-400" />
                    <span className="text-sm text-slate-400">弃牌堆</span>
                  </div>
                  <div className="text-2xl font-bold text-slate-400">
                    {gameState.sharedDiscard?.length || 0}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 中央：提示与交互区 */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 text-center">
            <div className="bg-black/80 backdrop-blur-md p-6 rounded-2xl border border-purple-500/30 shadow-2xl">
              <div className="flex items-center justify-center gap-3 mb-3">
                <Gamepad2 className="w-6 h-6 text-purple-400" />
                <span className="text-lg font-bold text-slate-200">
                  {isMyTurn ? '你的回合' : '其他玩家的回合'}
                </span>
              </div>
              
              {selectedCard && (
                <p className="text-purple-400 animate-pulse">
                  选择要攻击的目标...
                </p>
              )}
            </div>
          </div>

          {/* 底部：手牌区域 */}
          {myPlayer?.hand && myPlayer.hand.length > 0 && (
            <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40">
              <div className="flex items-end justify-center gap-[-24px]">
                {myPlayer.hand.map((cardId: string, index: number) => {
                  const isSelected = selectedCard === cardId;
                  
                  return (
                    <div
                      key={cardId}
                      onClick={() => isMyTurn && handleSelectCard(cardId)}
                      className={`
                        w-44 h-56 rounded-2xl border-4 bg-gradient-to-br from-slate-900 to-black 
                        transition-all duration-300 cursor-pointer relative flex flex-col overflow-hidden
                        ${isSelected ? 'translate-y-[-16px] scale-110 shadow-[0_0_30px_rgba(139,92,246,0.5)] z-10' : 'hover:-translate-y-2'}
                        ${!isMyTurn ? 'opacity-50 cursor-not-allowed' : ''}
                        border-red-500/50
                      `}
                      style={{
                        transform: `rotate(${(index - (myPlayer.hand.length - 1) / 2) * 3}deg)`,
                      }}
                    >
                      {/* 卡牌内容 */}
                      <div className="p-3 flex flex-col h-full">
                        <div className="text-sm font-bold text-slate-200 mb-1">
                          Card {index + 1}
                        </div>
                        <div className="text-xs text-slate-400 flex-1">
                          卡牌内容
                        </div>
                        <div className="mt-auto">
                          <div className="flex justify-between text-xs">
                            <Badge className="bg-red-500">攻击</Badge>
                            <span className="text-slate-400">1 AP</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* 卡牌上角费用 */}
                      <div className="absolute -top-3 -left-3 w-10 h-10 bg-gradient-to-br from-purple-600 to-purple-800 rounded-full flex items-center justify-center border-4 border-slate-900 shadow-lg">
                        <span className="text-xl font-bold text-white">1</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 右下角：结束回合按钮 */}
          {isMyTurn && (
            <div className="fixed bottom-8 right-8 z-40">
              <Button
                onClick={handleEndTurn}
                className="w-32 h-16 bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 text-xl font-bold shadow-[0_0_30px_rgba(139,92,246,0.5)]"
              >
                结束回合
                <ChevronRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          )}

          {/* 左下角：玩家状态面板（固定，绝对定位） */}
          {myPlayerEntity && (
            <div className="fixed bottom-8 left-8 z-40 flex flex-col items-start">
              {/* 人物展示 */}
              <div className="flex items-end gap-4">
                {/* 人物身体 */}
                <div className="relative">
                  {/* 身体 */}
                  <div className="w-24 h-40 bg-gradient-to-br from-slate-700 to-slate-900 rounded-t-2xl relative overflow-hidden">
                    {/* 头部 */}
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 w-16 h-16 bg-gradient-to-br from-slate-600 to-slate-800 rounded-full flex items-center justify-center">
                      {/* 眼睛 */}
                      <div className="flex gap-2">
                        <div className="w-3 h-3 bg-white/90 rounded-full shadow-[0_0_10px_rgba(255,255,255,0.8)]" />
                        <div className="w-3 h-3 bg-white/90 rounded-full shadow-[0_0_10px_rgba(255,255,255,0.8)]" />
                      </div>
                    </div>
                  </div>
                  
                  {/* 剑的形状 */}
                  <div className="absolute -right-8 bottom-4">
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
                {myPlayerEntity.armor > 0 && (
                  <div className="flex items-center gap-2 bg-blue-500/20 px-2 py-1 rounded-lg border border-blue-500/50 mb-1">
                    <Shield className="w-4 h-4 text-blue-400" />
                    <span className="text-sm font-bold text-blue-400">{myPlayerEntity.armor}</span>
                  </div>
                )}
                
                {/* HP条 */}
                <StatBox 
                  name="HP" 
                  current={myPlayerEntity.hp} 
                  max={myPlayerEntity.maxHp} 
                  color="#ef4444" 
                  showIcon={false}
                />
                
                {/* AP条 */}
                <div className="mt-2 w-48">
                  <StatBox 
                    name="AP" 
                    current={playerAp} 
                    max={playerMaxAp} 
                    color="#8b5cf6" 
                    icon={Zap}
                  />
                </div>
              </div>
            </div>
          )}

          {/* 左上角退出按钮 */}
          <div className="fixed top-6 left-6 z-50">
            <div
              onClick={handleBackToLobby}
              className="w-12 h-12 bg-red-500/20 hover:bg-red-500/40 border border-red-500/50 rounded-full flex items-center justify-center cursor-pointer transition-all"
            >
              <DoorOpen className="w-6 h-6 text-red-400" />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
