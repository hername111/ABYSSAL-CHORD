// 多人对战类型定义 - 完全复⽤单人模式结构
import { Card } from '@/lib/cards';

// 能力类型枚举
export type AbilityType = "FREQUENCY_ANCHOR" | "LOW_FREQUENCY_RESONANCE" | "PAIN_ECHO" | "FINAL_TUNING" | string;

// 能力接口
export interface ActiveAbility {
  id: AbilityType;
  cardId: string;
  name: string;
  effect: string;
}

export interface MultiplayerPlayer {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  armor: number;
  ap: number;
  maxAp: number;
  isCurrentTurn: boolean;
  isReady: boolean;
  hand: Card[];
  deck: Card[];
  discard: Card[];
  isWinner?: boolean;
  // 永久能力 - 数组格式用于UI显示
  permanentAbilities: ActiveAbility[];
  // 永久能力加成 - 对象格式用于效果计算
  permanentBonuses: {
    damageBonus: number;
    armorPerTurn: number;
    extraCardsPerTurn: number;
    extraDamagePerArmor: number;
    freeSecondAttack: boolean;
  };
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
  players: Record<string, MultiplayerPlayer>; // 改为对象，与单人模式一致
  playerIds: string[]; // 保持玩家顺序
  currentPlayerId: string;
  phase: 'waiting' | 'playing' | 'ended';
  turnNumber: number;
  turnTimeLeft: number;
  selectedCardId: string | null;
  actionLogs: ActionLog[];
}

export interface MultiplayerWsMessage {
  type: 'game:start' | 'game:state' | 'player:join' | 'player:leave' | 'player:ready' | 'turn:start' | 'turn:end' | 'card:play' | 'game:end' | 'action:log';
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
  turnNumber: number;
}

// 回合结束消息
export interface TurnEndPayload {
  playerId: string;
}

// 卡牌打出消息
export interface CardPlayPayload {
  playerId: string;
  cardId: string;
}

// 游戏结束消息
export interface GameEndPayload {
  winnerId: string;
}

// 动作日志消息
export interface ActionLogPayload {
  log: ActionLog;
}
