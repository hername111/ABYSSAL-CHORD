'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getCurrentPlayer, getEnemyPlayers, isCurrentPlayerTurn } from '@/lib/multiplayer/gameLogic';
import { zhongLvCards } from '@/lib/cards';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skull, Shield, Users, User, Play, RotateCcw, Target, ChevronRight, Trophy, Gamepad2, Layers, Clock, MessageSquare, DoorOpen, Zap } from 'lucide-react';

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
      <span className="text-xs font-bold text-slate-200">{name}</span>
      {max && (
        <span className="text-xs font-bold ml-auto" style={{ color }}>
          {current}/{max}
        </span>
      )}
      {!max && (
        <span className="text-xs font-bold ml-auto" style={{ color }}>
          {current}
        </span>
      )}
    </div>
    {max && (
      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
        <div 
          className="h-full transition-all duration-300"
          style={{ 
            width: `${Math.min(100, (current / max) * 100)}%`,
            backgroundColor: color 
          }}
        />
      </div>
    )}
  </div>
);

// 可复用的实体状态面板组件
const EntityStatusPanel = ({ 
  entity, 
  isEnemy = false,
  intentType,
  intentValue
}: { 
  entity: { hp: number; maxHp: number; armor: number; name?: string };
  isEnemy?: boolean;
  intentType?: string;
  intentValue?: number;
}) => (
  <div className={`bg-black/80 backdrop-blur p-3 rounded-xl border-2 ${isEnemy ? 'border-red-500/50' : 'border-blue-500/50'} w-48 shadow-lg`}>
    {entity.name && (
      <div className="flex items-center gap-2 mb-2">
        {isEnemy ? <Skull className="w-4 h-4 text-red-400" /> : <User className="w-4 h-4 text-blue-400" />}
        <span className="text-sm font-bold text-slate-200">{entity.name}</span>
      </div>
    )}
    {intentType && intentValue && isEnemy && (
      <div className="mb-2 text-xs text-center p-1.5 rounded bg-red-500/20 border border-red-500/30">
        <span className="text-red-300">
          {intentType === 'ATTACK' ? `⚔️ 攻击 ${intentValue}` : 
           intentType === 'DEFEND' ? `🛡️ 防御 ${intentValue}` :
           intentType === 'BUFF' ? `💪 强化` :
           intentType === 'ESCAPE' ? `🏃 撤离` : '❓ 未知'}
        </span>
      </div>
    )}
    <div className="space-y-2">
      {/* 护甲（如果有） */}
      {entity.armor > 0 && (
        <StatBox 
          name="护甲" 
          current={entity.armor} 
          color="#3b82f6" 
          icon={Shield}
        />
      )}
      {/* 生命值 */}
      <StatBox 
        name="HP" 
        current={entity.hp} 
        max={entity.maxHp} 
        color={isEnemy ? "#ef4444" : "#22c55e"} 
        icon={Skull}
      />
    </div>
  </div>
);

export default function MultiplayerBattle() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roomId = searchParams.get('roomId');
  const playerId = searchParams.get('playerId');
  const playerName = searchParams.get('playerName');

  const [gameState, setGameState] = useState<any>(null);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  // 模拟AP状态（和单人模式一致）
  const [playerAp, setPlayerAp] = useState(3);
  const [playerMaxAp] = useState(3);

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
    (wsRef.current as any).sendPlayCard(cardId);
    setSelectedCard(null);
  };

  const handleSelectTarget = (targetId: string) => {
    if (!selectedCard || !wsRef.current) return;
    (wsRef.current as any).sendPlayCard(selectedCard, targetId);
    setSelectedCard(null);
  };

  const handleEndTurn = () => {
    if (!isMyTurn || !wsRef.current) return;
    (wsRef.current as any).sendEndTurn();
  };

  const handleBackToLobby = () => {
    router.push('/lobby');
  };

  useEffect(() => {
    if (!roomId || !playerId) {
      router.push('/lobby');
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);
      ws.send(JSON.stringify({
        type: 'join-room',
        payload: { roomId, playerId, playerName }
      }));
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      console.log('Received message:', message);

      switch (message.type) {
        case 'room-state':
          setGameState(message.payload);
          break;
        case 'game-started':
          console.log('Game started!');
          break;
        case 'error':
          console.error('Error:', message.payload);
          break;
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
    };

    // 扩展WebSocket以支持发送游戏动作
    const extendedWs = ws as any;
    extendedWs.sendPlayCard = (cardId: string, targetId?: string) => {
      ws.send(JSON.stringify({
        type: 'play-card',
        payload: { cardId, targetId }
      }));
    };

    extendedWs.sendEndTurn = () => {
      ws.send(JSON.stringify({
        type: 'end-turn'
      }));
    };

    wsRef.current = extendedWs;

    return () => {
      ws.close();
    };
  }, [roomId, playerId, playerName]);

  const currentPlayer = gameState ? getCurrentPlayer(gameState) : null;
  const enemyPlayers = gameState && playerId ? getEnemyPlayers(gameState, playerId) : [];
  const isMyTurn = gameState && playerId ? isCurrentPlayerTurn(gameState, playerId) : false;
  const myPlayer = gameState?.players.find((p: any) => p.id === playerId);

  // 转换myPlayer为适合EntityStatusPanel的格式
  const myPlayerEntity = myPlayer ? {
    hp: myPlayer.hp,
    maxHp: myPlayer.maxHp,
    armor: myPlayer.armor,
    name: myPlayer.name
  } : null;

  return (
    <div className="min-h-screen bg-[#0a0a0f] relative overflow-hidden">
      {/* 背景声波效果 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-gradient-radial from-purple-500/10 to-transparent animate-[pulse_4s_ease-in-out_infinite]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-gradient-radial from-purple-500/5 to-transparent animate-[pulse_4s_ease-in-out_infinite_2s]" />
      </div>

      {/* 顶部：对手玩家（固定在顶部居中） */}
      {enemyPlayers.length > 0 && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-40">
          <div className="flex justify-center gap-4 flex-wrap">
            {enemyPlayers.map((enemy) => (
              <div
                key={enemy.id}
                onClick={() => selectedCard && handleSelectTarget(enemy.id)}
                className={`transition-all duration-300 cursor-pointer ${
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
              <p className="text-2xl font-bold text-slate-200">
                {gameState.sharedDeck.length}
              </p>
            </div>
            <div className="bg-black/80 backdrop-blur-md p-4 rounded-xl border border-slate-700/30 shadow-lg">
              <div className="flex items-center gap-2 mb-1">
                <RotateCcw className="w-4 h-4 text-slate-400" />
                <span className="text-sm text-slate-400">弃牌堆</span>
              </div>
              <p className="text-2xl font-bold text-slate-200">
                {gameState.sharedDiscard.length}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 中央：提示与交互区 */}
      <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
        {gameState && (
          <div className="text-center pointer-events-auto">
            {/* 回合信息 */}
            <div className="mb-4">
              <Badge variant="outline" className="text-lg px-4 py-2 bg-[#13131a] border-purple-500/50">
                <Gamepad2 className="w-5 h-5 mr-2 text-purple-400" />
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
                  点击顶部的敌对玩家作为目标
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
                  {isMyTurn ? '选择卡牌进行出牌，或点击「结束回合」' : '等待其他玩家...'}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 底部：手牌 */}
      <div className="fixed bottom-0 left-0 right-0 p-4 z-30">
        {/* 手牌 */}
        <div className="flex justify-center items-end gap-[-24px] flex-wrap pb-4">
          {myPlayer && myPlayer.hand.map((cardId: string, index: number) => {
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

        {/* 结束回合按钮 */}
        {isMyTurn && (
          <div className="flex justify-center">
            <Button
              onClick={handleEndTurn}
              size="lg"
              className="bg-purple-600 hover:bg-purple-500 text-xl px-12 py-8 rounded-2xl shadow-[0_0_30px_rgba(139,92,246,0.4)]"
            >
              结束回合
              <ChevronRight className="w-6 h-6 ml-2" />
            </Button>
          </div>
        )}
      </div>

      {/* 左下角：玩家状态面板 */}
      {myPlayerEntity && (
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
    </div>
  );
}
