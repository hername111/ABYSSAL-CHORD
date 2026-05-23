'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Users, Play, ArrowLeft, Copy, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createWsConnection, type WsMessage } from '@/lib/ws-client';

interface Player {
  id: string;
  name: string;
  isReady: boolean;
}

interface RoomState {
  roomId: string;
  players: Player[];
  isGameStarted: boolean;
}

export default function LobbyPage() {
  const router = useRouter();
  const [playerName, setPlayerName] = useState('');
  const [roomIdInput, setRoomIdInput] = useState('');
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null);
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  
  const connRef = useRef<ReturnType<typeof createWsConnection> | null>(null);

  useEffect(() => {
    if (!playerName) {
      const defaultName = `Player ${Math.floor(Math.random() * 1000)}`;
      setPlayerName(defaultName);
    }

    const handleMessage = (msg: WsMessage) => {
      console.log('Received message:', msg);
      
      switch (msg.type) {
        case 'room-created':
          setCurrentRoomId((msg.payload as { roomId: string; playerId: string }).roomId);
          setCurrentPlayerId((msg.payload as { roomId: string; playerId: string }).playerId);
          setError(null);
          break;
          
        case 'room-joined':
          setCurrentRoomId((msg.payload as { roomId: string; playerId: string }).roomId);
          setCurrentPlayerId((msg.payload as { roomId: string; playerId: string }).playerId);
          setError(null);
          break;
          
        case 'room-state':
          setRoomState(msg.payload as RoomState);
          break;
          
        case 'game-started':
          // Navigate to multiplayer battle page
          if (currentRoomId && currentPlayerId) {
            router.push(`/multiplayer?roomId=${currentRoomId}&playerId=${currentPlayerId}`);
          }
          break;
          
        case 'error':
          setError((msg.payload as { message: string }).message);
          break;
      }
    };

    connRef.current = createWsConnection({
      path: '/ws/lobby',
      onMessage: handleMessage,
      onOpen: () => console.log('Connected to lobby'),
    });

    return () => connRef.current?.close();
  }, []);

  const createRoom = useCallback(() => {
    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }
    
    connRef.current?.send({
      type: 'create-room',
      payload: {
        playerId: currentPlayerId || Math.random().toString(36).substring(2, 12),
        playerName: playerName.trim(),
      },
    });
  }, [playerName, currentPlayerId]);

  const joinRoom = useCallback(() => {
    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }
    
    if (!roomIdInput.trim()) {
      setError('Please enter room ID');
      return;
    }
    
    connRef.current?.send({
      type: 'join-room',
      payload: {
        roomId: roomIdInput.trim(),
        playerId: currentPlayerId || Math.random().toString(36).substring(2, 12),
        playerName: playerName.trim(),
      },
    });
  }, [playerName, roomIdInput, currentPlayerId]);

  const toggleReady = useCallback(() => {
    connRef.current?.send({
      type: 'toggle-ready',
      payload: {},
    });
  }, []);

  const leaveRoom = useCallback(() => {
    connRef.current?.send({
      type: 'leave-room',
      payload: {},
    });
    setCurrentRoomId(null);
    setRoomState(null);
    setError(null);
  }, []);

  const copyRoomId = useCallback(() => {
    if (currentRoomId) {
      navigator.clipboard.writeText(currentRoomId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [currentRoomId]);

  // If in a room, show room view
  if (currentRoomId && roomState) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden">
        {/* 背景声波脉冲动画 */}
        <div className="absolute inset-0 bg-gradient-to-b from-abyss via-abyss to-card-darker">
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
        </div>

        {/* 主内容 */}
        <div className="relative z-10 flex flex-col items-center space-y-8">
          {/* 返回按钮 */}
          <Link href="/">
            <Button
              variant="ghost"
              className="absolute top-6 left-6 text-slate-400 hover:text-white"
            >
              <ArrowLeft className="w-6 h-6 mr-2" />
              返回
            </Button>
          </Link>

          {/* 房间标题 */}
          <motion.div
            initial={{ opacity: 0, y: -40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className="text-center"
          >
            <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-sonic-purple via-purify-green to-sonic-purple mb-4">
              游戏房间
            </h1>
          </motion.div>

          {/* 房间ID */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.3 }}
            className="flex items-center gap-3 bg-slate-800/50 px-6 py-3 rounded-xl border border-slate-700/50"
          >
            <span className="text-slate-400">房间号:</span>
            <span className="text-2xl font-bold text-sonic-purple tracking-widest">
              {currentRoomId}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={copyRoomId}
              className="text-slate-400 hover:text-white"
            >
              {copied ? (
                <Check className="w-5 h-5 text-purify-green" />
              ) : (
                <Copy className="w-5 h-5" />
              )}
            </Button>
          </motion.div>

          {/* 玩家列表 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.5 }}
            className="w-full max-w-md"
          >
            <div className="bg-slate-900/50 rounded-2xl border border-slate-700/50 p-6">
              <h2 className="text-xl font-bold text-slate-300 mb-4 flex items-center">
                <Users className="w-5 h-5 mr-2 text-sonic-purple" />
                玩家列表
              </h2>
              
              <div className="space-y-3">
                {roomState.players.map((player) => (
                  <div
                    key={player.id}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                      player.id === currentPlayerId
                        ? 'bg-sonic-purple/10 border-sonic-purple/50'
                        : 'bg-slate-800/30 border-slate-700/30'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${
                        player.isReady ? 'bg-purify-green' : 'bg-slate-500'
                      }`} />
                      <span className={`font-medium ${
                        player.id === currentPlayerId ? 'text-sonic-purple' : 'text-slate-300'
                      }`}>
                        {player.name}
                        {player.id === currentPlayerId && ' (你)'}
                      </span>
                    </div>
                    <span className={`text-sm font-medium ${
                      player.isReady ? 'text-purify-green' : 'text-slate-500'
                    }`}>
                      {player.isReady ? '已准备' : '未准备'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* 操作按钮 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.7 }}
            className="flex gap-4"
          >
            <Button
              onClick={leaveRoom}
              variant="ghost"
              className="px-8 py-6 bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-700/50 border border-slate-700/50 rounded-xl"
            >
              离开房间
            </Button>
            
            <Button
              onClick={toggleReady}
              className={`px-12 py-6 text-white text-xl font-bold rounded-xl shadow-[0_0_40px_rgba(139,92,246,0.4)] transition-all duration-300 hover:shadow-[0_0_60px_rgba(139,92,246,0.6)] hover:scale-105 ${
                roomState.players.find(p => p.id === currentPlayerId)?.isReady
                  ? 'bg-gradient-to-r from-purify-green to-purify-green/70 hover:from-purify-green/90 hover:to-purify-green/60'
                  : 'bg-gradient-to-r from-sonic-purple to-sonic-purple/70 hover:from-sonic-purple/90 hover:to-sonic-purple/60'
              }`}
            >
              <Play className="w-8 h-8 mr-3" />
              {roomState.players.find(p => p.id === currentPlayerId)?.isReady
                ? '取消准备'
                : '准备就绪'
              }
            </Button>
          </motion.div>

          {/* 提示信息 */}
          {roomState.players.length < 2 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.9 }}
              className="text-slate-500 text-center"
            >
              等待其他玩家加入...
            </motion.div>
          )}
          
          {roomState.players.length >= 2 && !roomState.isGameStarted && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.9 }}
              className="text-slate-500 text-center"
            >
              所有玩家准备就绪后游戏开始
            </motion.div>
          )}
        </div>
      </div>
    );
  }

  // If not in a room, show lobby view
  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden">
      {/* 背景声波脉冲动画 */}
      <div className="absolute inset-0 bg-gradient-to-b from-abyss via-abyss to-card-darker">
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
      </div>

      {/* 主内容 */}
      <div className="relative z-10 flex flex-col items-center space-y-12">
        {/* 返回按钮 */}
        <Link href="/">
          <Button
            variant="ghost"
            className="absolute top-6 left-6 text-slate-400 hover:text-white"
          >
            <ArrowLeft className="w-6 h-6 mr-2" />
            返回
          </Button>
        </Link>

        {/* 游戏标题 */}
        <motion.div
          initial={{ opacity: 0, y: -40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className="text-center"
        >
          <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-sonic-purple via-purify-green to-sonic-purple mb-4 drop-shadow-[0_0_30px_rgba(139,92,246,0.5)]">
            局域网联机
          </h1>
          <p className="text-xl text-slate-400 tracking-widest font-medium">
            LOCAL MULTIPLAYER
          </p>
        </motion.div>

        {/* 玩家名称输入 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.3 }}
          className="w-full max-w-md"
        >
          <label className="text-slate-400 text-sm mb-2 block">你的名称</label>
          <Input
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="请输入你的名称"
            className="bg-slate-800/50 border-slate-700/50 text-white placeholder:text-slate-500 h-12 text-lg"
          />
        </motion.div>

        {/* 错误提示 */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 bg-red-500/10 text-red-400 px-4 py-2 rounded-lg border border-red-500/20"
          >
            <AlertCircle className="w-5 h-5" />
            {error}
          </motion.div>
        )}

        {/* 主按钮区域 */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.5 }}
          className="flex flex-col items-center gap-6"
        >
          {/* 创建房间按钮 */}
          <Button
            onClick={createRoom}
            className="group relative px-12 py-8 bg-gradient-to-r from-sonic-purple to-sonic-purple/70 hover:from-sonic-purple/90 hover:to-sonic-purple/60 text-white text-xl font-bold rounded-xl shadow-[0_0_40px_rgba(139,92,246,0.4)] transition-all duration-300 hover:shadow-[0_0_60px_rgba(139,92,246,0.6)] hover:scale-105"
          >
            <Users className="w-8 h-8 mr-3 group-hover:scale-110 transition-transform" />
            创建房间
            <div className="absolute inset-0 rounded-xl ring-2 ring-sonic-purple/50 group-hover:ring-sonic-purple/80 transition-all" />
          </Button>

          {/* 分隔线 */}
          <div className="flex items-center gap-4 w-full max-w-xs">
            <div className="flex-1 h-px bg-slate-700/50" />
            <span className="text-slate-500 text-sm">或</span>
            <div className="flex-1 h-px bg-slate-700/50" />
          </div>

          {/* 加入房间 */}
          <div className="w-full max-w-md flex gap-3">
            <Input
              value={roomIdInput}
              onChange={(e) => setRoomIdInput(e.target.value)}
              placeholder="输入房间号"
              className="bg-slate-800/50 border-slate-700/50 text-white placeholder:text-slate-500 h-14 text-lg uppercase tracking-widest"
              maxLength={6}
            />
            <Button
              onClick={joinRoom}
              className="px-8 h-14 bg-gradient-to-r from-purify-green to-purify-green/70 hover:from-purify-green/90 hover:to-purify-green/60 text-white font-bold rounded-xl"
            >
              加入
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
