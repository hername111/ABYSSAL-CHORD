// 多人对战WebSocket客户端
import { createWsConnection as createBaseWsConnection, type WsMessage } from '../ws-client';
import type {
  MultiplayerGameState,
  MultiplayerPlayer,
  MultiplayerWsMessage,
  GameStateUpdatePayload,
  PlayerJoinPayload,
  PlayerLeavePayload,
  PlayerReadyPayload,
  TurnStartPayload,
  TurnEndPayload,
  CardPlayPayload,
  TargetSelectPayload,
  GameEndPayload,
} from './types';

interface MultiplayerWsOptions {
  roomId: string;
  playerId: string;
  onGameStateUpdate?: (state: MultiplayerGameState) => void;
  onPlayerJoin?: (player: MultiplayerPlayer) => void;
  onPlayerLeave?: (playerId: string) => void;
  onTurnStart?: (payload: TurnStartPayload) => void;
  onTurnEnd?: (payload: TurnEndPayload) => void;
  onGameEnd?: (payload: GameEndPayload) => void;
  onOpen?: () => void;
  onClose?: () => void;
}

export function createMultiplayerWsConnection(opts: MultiplayerWsOptions) {
  const {
    roomId,
    playerId,
    onGameStateUpdate,
    onPlayerJoin,
    onPlayerLeave,
    onTurnStart,
    onTurnEnd,
    onGameEnd,
    onOpen,
    onClose,
  } = opts;

  const connection = createBaseWsConnection({
    path: `/ws/multiplayer/${roomId}`,
    onMessage: (msg: WsMessage) => {
      switch (msg.type) {
        case 'game:state':
          onGameStateUpdate?.((msg.payload as GameStateUpdatePayload).gameState);
          break;
        case 'player:join':
          onPlayerJoin?.((msg.payload as PlayerJoinPayload).player);
          break;
        case 'player:leave':
          onPlayerLeave?.((msg.payload as PlayerLeavePayload).playerId);
          break;
        case 'turn:start':
          onTurnStart?.(msg.payload as TurnStartPayload);
          break;
        case 'turn:end':
          onTurnEnd?.(msg.payload as TurnEndPayload);
          break;
        case 'game:end':
          onGameEnd?.(msg.payload as GameEndPayload);
          break;
      }
    },
    onOpen,
    onClose,
  });

  return {
    send: connection.send,
    close: connection.close,
    
    // 发送玩家就绪状态
    sendReady: (isReady: boolean) => {
      connection.send({
        type: 'player:ready',
        payload: { playerId, isReady } as PlayerReadyPayload,
      });
    },
    
    // 结束回合
    sendEndTurn: () => {
      connection.send({
        type: 'turn:end',
        payload: { playerId } as TurnEndPayload,
      });
    },
    
    // 打出卡牌
    sendPlayCard: (cardId: string, targetId?: string) => {
      connection.send({
        type: 'card:play',
        payload: { playerId, cardId, targetId } as CardPlayPayload,
      });
    },
    
    // 选择目标
    sendSelectTarget: (targetId: string) => {
      connection.send({
        type: 'target:select',
        payload: { playerId, targetId } as TargetSelectPayload,
      });
    },
  };
}
