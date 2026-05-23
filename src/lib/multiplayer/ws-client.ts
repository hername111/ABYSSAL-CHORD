// 多人对战 WebSocket 客户端
import { createWsConnection } from '@/lib/ws-client';
import type { MultiplayerGameState } from './types';

interface MultiplayerWsOptions {
  roomId: string;
  playerId: string;
  playerName?: string;
  onGameStateUpdate?: (gameState: MultiplayerGameState) => void;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (error: string) => void;
}

export function createMultiplayerWsConnection(options: MultiplayerWsOptions) {
  const { roomId, playerId, playerName, onGameStateUpdate, onOpen, onClose, onError } = options;

  const conn = createWsConnection({
    path: '/ws/multiplayer',
    onOpen: () => {
      console.log('Multiplayer WebSocket connected');
      // 加入游戏
      conn.send({
        type: 'game:join',
        payload: {
          roomId,
          playerId,
          playerName: playerName || 'Player',
        },
      });
      onOpen?.();
    },
    onMessage: (msg) => {
      console.log('Received multiplayer message:', msg);
      
      switch (msg.type) {
        case 'game:state':
          onGameStateUpdate?.((msg.payload as { gameState: MultiplayerGameState }).gameState);
          break;
        case 'error':
          onError?.((msg.payload as { message: string }).message);
          break;
      }
    },
    onClose: () => {
      console.log('Multiplayer WebSocket closed');
      onClose?.();
    },
  });

  return {
    ...conn,
    
    // 发送打出卡牌
    sendPlayCard: (cardId: string, targetId?: string) => {
      conn.send({
        type: 'card:play',
        payload: { cardId, targetId },
      });
    },
    
    // 发送选择目标
    sendSelectTarget: (targetId: string) => {
      conn.send({
        type: 'target:select',
        payload: { targetId },
      });
    },
    
    // 发送结束回合
    sendEndTurn: () => {
      conn.send({
        type: 'turn:end',
        payload: {},
      });
    },
  };
}
