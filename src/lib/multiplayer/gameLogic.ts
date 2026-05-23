// 多人对战游戏逻辑
import type { MultiplayerGameState, MultiplayerPlayer } from './types';
import { zhongLvCards } from '../cards';

// 创建初始游戏状态
export function createInitialGameState(roomId: string, players: MultiplayerPlayer[]): MultiplayerGameState {
  // 随机决定一号玩家
  const currentPlayerIndex = Math.floor(Math.random() * players.length);
  
  return {
    roomId,
    players: players.map((player, index) => ({
      ...player,
      isCurrentTurn: index === currentPlayerIndex,
      hp: 80,
      maxHp: 80,
      armor: 0,
      hand: [],
      pollutionLevel: 0,
    })),
    currentPlayerIndex,
    phase: 'playing',
    turnCount: 1,
    selectedTargetId: null,
    isSelectingTarget: false,
    pendingCardId: null,
  };
}

// 开始新回合
export function startNewTurn(gameState: MultiplayerGameState): MultiplayerGameState {
  const nextPlayerIndex = (gameState.currentPlayerIndex + 1) % gameState.players.length;
  
  return {
    ...gameState,
    players: gameState.players.map((player, index) => ({
      ...player,
      isCurrentTurn: index === nextPlayerIndex,
    })),
    currentPlayerIndex: nextPlayerIndex,
    turnCount: gameState.turnCount + 1,
    selectedTargetId: null,
    isSelectingTarget: false,
    pendingCardId: null,
  };
}

// 玩家打出卡牌
export function playCard(
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
  newState = applyCardEffect(newState, playerId, card, targetId);

  return {
    ...newState,
    isSelectingTarget: false,
    pendingCardId: null,
  };
}

// 选择目标
export function selectTarget(
  gameState: MultiplayerGameState,
  playerId: string,
  targetId: string
): MultiplayerGameState {
  if (!gameState.isSelectingTarget || !gameState.pendingCardId) {
    return gameState;
  }

  const card = zhongLvCards.find(c => c.id === gameState.pendingCardId);
  if (!card) return gameState;

  let newState = { ...gameState };

  // 应用卡牌效果
  newState = applyCardEffect(newState, playerId, card, targetId);

  return {
    ...newState,
    selectedTargetId: null,
    isSelectingTarget: false,
    pendingCardId: null,
  };
}

// 应用卡牌效果
function applyCardEffect(
  gameState: MultiplayerGameState,
  playerId: string,
  card: any,
  targetId?: string
): MultiplayerGameState {
  const newPlayers = [...gameState.players];
  const playerIndex = newPlayers.findIndex(p => p.id === playerId);
  
  if (playerIndex === -1) return gameState;

  // 处理基础伤害
  if (card.baseDamage) {
    if (card.targetType === 'single' && targetId) {
      const targetIndex = newPlayers.findIndex(p => p.id === targetId);
      if (targetIndex !== -1) {
        let damage = card.baseDamage;
        
        // 应用护甲
        if (newPlayers[targetIndex].armor > 0) {
          const blockedDamage = Math.min(newPlayers[targetIndex].armor, damage);
          newPlayers[targetIndex] = {
            ...newPlayers[targetIndex],
            armor: newPlayers[targetIndex].armor - blockedDamage,
          };
          damage -= blockedDamage;
        }
        
        newPlayers[targetIndex] = {
          ...newPlayers[targetIndex],
          hp: Math.max(0, newPlayers[targetIndex].hp - damage),
        };
      }
    } else if (card.targetType === 'all') {
      // 群体伤害
      newPlayers.forEach((player, index) => {
        if (index !== playerIndex) {
          let damage = card.baseDamage;
          
          if (player.armor > 0) {
            const blockedDamage = Math.min(player.armor, damage);
            newPlayers[index] = {
              ...newPlayers[index],
              armor: player.armor - blockedDamage,
            };
            damage -= blockedDamage;
          }
          
          newPlayers[index] = {
            ...newPlayers[index],
            hp: Math.max(0, player.hp - damage),
          };
        }
      });
    }
  }

  // 处理基础护甲
  if (card.baseArmor) {
    newPlayers[playerIndex] = {
      ...newPlayers[playerIndex],
      armor: newPlayers[playerIndex].armor + card.baseArmor,
    };
  }

  // 处理污染度
  if (card.pollutionModifier) {
    newPlayers[playerIndex] = {
      ...newPlayers[playerIndex],
      pollutionLevel: Math.max(0, Math.min(100, newPlayers[playerIndex].pollutionLevel + card.pollutionModifier)),
    };
  }

  // 处理声爆
  if (card.sonicBoom) {
    // 声爆效果可以在后续扩展
  }

  // 处理自伤
  if (card.selfDamage) {
    newPlayers[playerIndex] = {
      ...newPlayers[playerIndex],
      hp: Math.max(0, newPlayers[playerIndex].hp - card.selfDamage),
    };
  }

  // 检查游戏是否结束
  const alivePlayers = newPlayers.filter(p => p.hp > 0);
  if (alivePlayers.length <= 1) {
    return {
      ...gameState,
      players: newPlayers,
      phase: 'ended',
    };
  }

  return {
    ...gameState,
    players: newPlayers,
  };
}

// 检查是否是当前玩家的回合
export function isCurrentPlayerTurn(gameState: MultiplayerGameState, playerId: string): boolean {
  const player = gameState.players.find(p => p.id === playerId);
  return player?.isCurrentTurn ?? false;
}

// 获取当前玩家
export function getCurrentPlayer(gameState: MultiplayerGameState): MultiplayerPlayer | null {
  return gameState.players.find(p => p.isCurrentTurn) ?? null;
}

// 获取敌对玩家列表
export function getEnemyPlayers(gameState: MultiplayerGameState, playerId: string): MultiplayerPlayer[] {
  return gameState.players.filter(p => p.id !== playerId && p.hp > 0);
}
