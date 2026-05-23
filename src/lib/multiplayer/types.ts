// 多人对战类型定义

export interface MultiplayerPlayer {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  armor: number;
  isCurrentTurn: boolean;
  isReady: boolean;
  hand: string[];
  pollutionLevel: number;
}

export interface ActionLog {
  id: string;
  timestamp: number;
  playerId: string;
  playerName: string;
  action: string;
  details?: string;
}

export interface MultiplayerGameState {
  roomId: string;
  players: MultiplayerPlayer[];
  currentPlayerIndex: number;
  phase: 'waiting' | 'playing' | 'ended';
  turnCount: number;
  selectedTargetId: string | null;
  isSelectingTarget: boolean;
  pendingCardId: string | null;
  
  // 公共牌库机制
  sharedDeck: string[];
  sharedDiscard: string[];
  
  // 动作日志
  actionLogs: ActionLog[];
}

export interface MultiplayerWsMessage {
  type: 'game:start' | 'game:state' | 'player:join' | 'player:leave' | 'player:ready' | 'turn:start' | 'turn:end' | 'card:play' | 'target:select' | 'game:end' | 'deck:shuffle' | 'action:log';
  payload: unknown;
}

// 游戏状态更新消息
export interface GameStateUpdatePayload {
  gameState: MultiplayerGameState;
}

// 玩家加入消息
export interface PlayerJoinPayload {
  player: MultiplayerPlayer;
}

// 玩家离开消息
export interface PlayerLeavePayload {
  playerId: string;
}

// 玩家就绪消息
export interface PlayerReadyPayload {
  playerId: string;
  isReady: boolean;
}

// 回合开始消息
export interface TurnStartPayload {
  playerId: string;
  turnCount: number;
}

// 回合结束消息
export interface TurnEndPayload {
  playerId: string;
}

// 卡牌打出消息
export interface CardPlayPayload {
  playerId: string;
  cardId: string;
  targetId?: string;
}

// 目标选择消息
export interface TargetSelectPayload {
  playerId: string;
  targetId: string;
}

// 游戏结束消息
export interface GameEndPayload {
  winnerId: string;
}

// 洗牌消息
export interface DeckShufflePayload {
  message: string;
}

// 动作日志消息
export interface ActionLogPayload {
  log: ActionLog;
}
