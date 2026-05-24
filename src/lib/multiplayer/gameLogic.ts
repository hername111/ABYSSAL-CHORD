// 多人对战游戏逻辑
import { zhongLvCards, MAX_HAND_SIZE } from '@/lib/cards';
import type { MultiplayerGameState, MultiplayerPlayer, ActionLog } from './types';

// 初始玩家血量
const INITIAL_HP = 80;
// 初始玩家护甲
const INITIAL_ARMOR = 0;
// 初始手牌数量
const INITIAL_HAND_SIZE = 5;
// 每回合抽牌数量
const CARDS_PER_TURN = 3;

// 创建初始玩家
export function createMultiplayerPlayer(id: string, name: string): MultiplayerPlayer {
  return {
    id,
    name,
    hp: INITIAL_HP,
    maxHp: INITIAL_HP,
    armor: INITIAL_ARMOR,
    isCurrentTurn: false,
    isReady: false,
    hand: [],
    pollutionLevel: 0,
  };
}

// 创建初始游戏状态
export function createInitialGameState(
  roomId: string,
  players: MultiplayerPlayer[]
): MultiplayerGameState {
  // 创建公共牌库
  const sharedDeck = createSharedDeck();
  
  // 为每位玩家分配初始手牌
  const playersWithHand = players.map(player => {
    const hand: string[] = [];
    for (let i = 0; i < INITIAL_HAND_SIZE && sharedDeck.length > 0; i++) {
      const card = sharedDeck.pop();
      if (card) hand.push(card);
    }
    return {
      ...player,
      hand,
    };
  });

  return {
    roomId,
    players: playersWithHand,
    currentPlayerIndex: 0,
    phase: 'playing',
    turnCount: 1,
    selectedTargetId: null,
    isSelectingTarget: false,
    pendingCardId: null,
    sharedDeck,
    sharedDiscard: [],
    actionLogs: [],
  };
}

// 创建公共牌库
function createSharedDeck(): string[] {
  const deck: string[] = [];
  
  // 添加基础牌
  zhongLvCards.forEach(card => {
    // 每种卡牌添加2-3张到公共牌库
    const count = card.archetype === 'basic' ? 3 : 2;
    for (let i = 0; i < count; i++) {
      deck.push(card.id);
    }
  });
  
  // 洗牌
  return shuffleArray(deck);
}

// 洗牌函数
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// 抽牌逻辑
export function drawCards(
  gameState: MultiplayerGameState,
  playerId: string,
  count: number
): MultiplayerGameState {
  let newState = { ...gameState };
  const playerIndex = newState.players.findIndex(p => p.id === playerId);
  
  if (playerIndex === -1) return newState;
  
  const player = newState.players[playerIndex];
  
  // 计算可以抽多少张牌
  const currentHandSize = player.hand.length;
  const maxCanDraw = Math.max(0, MAX_HAND_SIZE - currentHandSize);
  const actualDraw = Math.min(count, maxCanDraw);
  const overflow = count - actualDraw;
  
  if (overflow > 0) {
    // 添加爆牌日志
    newState = addActionLog(newState, {
      id: Date.now().toString(),
      timestamp: Date.now(),
      playerId,
      playerName: player.name,
      action: '手牌已满',
      details: `手牌已满，${overflow}张牌直接弃掉`,
    });
  }
  
  // 抽取可以抽的牌
  for (let i = 0; i < actualDraw; i++) {
    // 检查公共牌库是否为空
    if (newState.sharedDeck.length === 0) {
      // 洗牌：将弃牌堆变为新的抽牌堆
      if (newState.sharedDiscard.length > 0) {
        newState.sharedDeck = shuffleArray(newState.sharedDiscard);
        newState.sharedDiscard = [];
        
        // 添加洗牌日志
        newState = addActionLog(newState, {
          id: Date.now().toString(),
          timestamp: Date.now(),
          playerId: 'system',
          playerName: '系统',
          action: '洗牌',
          details: '公共牌库已洗牌',
        });
      } else {
        // 没有牌可抽了
        break;
      }
    }
    
    // 抽一张牌
    const card = newState.sharedDeck.pop();
    if (card) {
      player.hand.push(card);
    }
  }
  
  // 爆掉的牌直接进入弃牌堆
  for (let i = 0; i < overflow; i++) {
    // 检查公共牌库是否为空
    if (newState.sharedDeck.length === 0) {
      if (newState.sharedDiscard.length > 0) {
        newState.sharedDeck = shuffleArray(newState.sharedDiscard);
        newState.sharedDiscard = [];
      } else {
        break;
      }
    }
    
    // 抽一张牌直接弃掉
    const card = newState.sharedDeck.pop();
    if (card) {
      newState.sharedDiscard.push(card);
    }
  }
  
  newState.players[playerIndex] = player;
  return newState;
}

// 弃牌逻辑
export function discardCard(
  gameState: MultiplayerGameState,
  playerId: string,
  cardId: string
): MultiplayerGameState {
  let newState = { ...gameState };
  const playerIndex = newState.players.findIndex(p => p.id === playerId);
  
  if (playerIndex === -1) return newState;
  
  const player = newState.players[playerIndex];
  
  // 从玩家手牌中移除卡牌
  const cardIndex = player.hand.indexOf(cardId);
  if (cardIndex !== -1) {
    player.hand.splice(cardIndex, 1);
    
    // 将卡牌加入公共弃牌堆
    newState.sharedDiscard.push(cardId);
  }
  
  newState.players[playerIndex] = player;
  return newState;
}

// 应用卡牌效果
export function applyCardEffect(
  gameState: MultiplayerGameState,
  playerId: string,
  cardId: string,
  targetId?: string
): MultiplayerGameState {
  let newState = { ...gameState };
  const card = zhongLvCards.find(c => c.id === cardId);
  
  if (!card) return newState;
  
  const playerIndex = newState.players.findIndex(p => p.id === playerId);
  if (playerIndex === -1) return newState;
  
  const player = newState.players[playerIndex];
  
  // 记录动作日志
  let actionDetails = '';
  
  // 应用卡牌效果（简化版）
  if (card.baseDamage && card.target !== 'self') {
    if (targetId) {
      const targetIndex = newState.players.findIndex(p => p.id === targetId);
      if (targetIndex !== -1) {
        const target = newState.players[targetIndex];
        
        // 计算伤害
        let damage = card.baseDamage;
        
        // 应用护甲
        if (target.armor > 0) {
          if (target.armor >= damage) {
            target.armor -= damage;
            actionDetails = `对 ${target.name} 造成 ${damage} 点伤害（护甲抵挡）`;
            damage = 0;
          } else {
            damage -= target.armor;
            actionDetails = `对 ${target.name} 造成 ${card.baseDamage} 点伤害（护甲抵挡 ${target.armor} 点）`;
            target.armor = 0;
          }
        } else {
          actionDetails = `对 ${target.name} 造成 ${damage} 点伤害`;
        }
        
        // 应用伤害
        if (damage > 0) {
          target.hp = Math.max(0, target.hp - damage);
        }
        
        newState.players[targetIndex] = target;
      }
    }
  } else if (card.baseArmor) {
    // 获得护甲
    player.armor += card.baseArmor;
    actionDetails = `获得 ${card.baseArmor} 点护甲`;
  }
  
  // 添加动作日志
  newState = addActionLog(newState, {
    id: Date.now().toString(),
    timestamp: Date.now(),
    playerId,
    playerName: player.name,
    action: `打出 ${card.name}`,
    details: actionDetails,
  });
  
  newState.players[playerIndex] = player;
  return newState;
}

// 处理打出卡牌
export function handlePlayCard(
  gameState: MultiplayerGameState,
  playerId: string,
  cardId: string,
  targetId?: string
): MultiplayerGameState {
  const card = zhongLvCards.find(c => c.id === cardId);
  if (!card) return gameState;

  let newState = { ...gameState };

  // 处理卡牌效果
  if (card.type === 'attack' && card.target !== 'self') {
    // 攻击卡牌需要目标
    if (!targetId && card.target !== 'aoe') {
      // 需要选择目标
      return {
        ...newState,
        isSelectingTarget: true,
        pendingCardId: cardId,
      };
    }
  }

  // 应用卡牌效果
  newState = applyCardEffect(newState, playerId, cardId, targetId);
  
  // 弃牌
  newState = discardCard(newState, playerId, cardId);

  return {
    ...newState,
    isSelectingTarget: false,
    pendingCardId: null,
  };
}

// 切换到下一个玩家
export function nextPlayer(gameState: MultiplayerGameState): MultiplayerGameState {
  let newState = { ...gameState };
  
  // 当前玩家不再是回合玩家
  newState.players[newState.currentPlayerIndex].isCurrentTurn = false;
  
  // 切换到下一个玩家
  newState.currentPlayerIndex = (newState.currentPlayerIndex + 1) % newState.players.length;
  
  // 新玩家成为回合玩家
  newState.players[newState.currentPlayerIndex].isCurrentTurn = true;
  
  // 增加回合数
  newState.turnCount++;
  
  // 新玩家抽牌
  const currentPlayer = newState.players[newState.currentPlayerIndex];
  newState = drawCards(newState, currentPlayer.id, CARDS_PER_TURN);
  
  return newState;
}

// 获取当前玩家
export function getCurrentPlayer(gameState: MultiplayerGameState): MultiplayerPlayer | undefined {
  return gameState.players[gameState.currentPlayerIndex];
}

// 获取敌方玩家
export function getEnemyPlayers(gameState: MultiplayerGameState, currentPlayerId: string): MultiplayerPlayer[] {
  return gameState.players.filter(p => p.id !== currentPlayerId);
}

// 检查是否是当前玩家回合
export function isCurrentPlayerTurn(gameState: MultiplayerGameState, playerId: string): boolean {
  return gameState.players[gameState.currentPlayerIndex]?.id === playerId;
}

// 添加动作日志
function addActionLog(
  gameState: MultiplayerGameState,
  log: ActionLog
): MultiplayerGameState {
  let newState = { ...gameState };
  
  // 保持日志数量不超过50条
  newState.actionLogs = [log, ...newState.actionLogs].slice(0, 50);
  
  return newState;
}
