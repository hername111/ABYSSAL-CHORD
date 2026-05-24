// 多人对战游戏逻辑 - 完全复⽤单人模式
import { Card, zhongLvCards, INITIAL_HAND_CARDS } from '@/lib/cards';
import type { MultiplayerGameState, MultiplayerPlayer, ActionLog } from './types';

// 游戏常量
const INITIAL_HP = 80;
const INITIAL_AP = 3;
const TURN_DURATION = 30;
const MAX_HAND_SIZE = 6;

// 创建初始玩家
export function createMultiplayerPlayer(id: string, name: string): MultiplayerPlayer {
  // 洗牌并抽取初始手牌
  const shuffledDeck = [...zhongLvCards].sort(() => Math.random() - 0.5);
  const hand = shuffledDeck.slice(0, INITIAL_HAND_CARDS.length);
  const deck = shuffledDeck.slice(INITIAL_HAND_CARDS.length);

  return {
    id,
    name,
    hp: INITIAL_HP,
    maxHp: INITIAL_HP,
    armor: 0,
    ap: INITIAL_AP,
    maxAp: INITIAL_AP,
    isCurrentTurn: false,
    isReady: false,
    hand,
    deck,
    discard: [],
    permanentAbilities: [],
    permanentBonuses: {
      damageBonus: 0,
      armorPerTurn: 0,
      extraCardsPerTurn: 0,
      extraDamagePerArmor: 0,
      freeSecondAttack: false
    }
  };
}

// 创建初始游戏状态
export function createInitialGameState(
  roomId: string,
  players: MultiplayerPlayer[]
): MultiplayerGameState {
  const playersRecord: Record<string, MultiplayerPlayer> = {};
  const playerIds: string[] = [];

  players.forEach((player) => {
    playersRecord[player.id] = player;
    playerIds.push(player.id);
  });

  // 设置第一个玩家为当前回合玩家
  if (playerIds.length > 0) {
    playersRecord[playerIds[0]].isCurrentTurn = true;
    // 确保当前玩家有AP
    playersRecord[playerIds[0]].ap = INITIAL_AP;
  }

  return {
    roomId,
    players: playersRecord,
    playerIds,
    currentPlayerId: playerIds[0] || '',
    phase: 'playing',
    turnNumber: 1,
    turnTimeLeft: TURN_DURATION,
    selectedCardId: null,
    actionLogs: []
  };
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
  const newState = JSON.parse(JSON.stringify(gameState));
  const player = newState.players[playerId];

  if (!player) return newState;

  for (let i = 0; i < count; i++) {
    if (player.hand.length >= MAX_HAND_SIZE) break;

    if (player.deck.length === 0) {
      if (player.discard.length > 0) {
        player.deck = shuffleArray(player.discard);
        player.discard = [];
      } else {
        break;
      }
    }

    const card = player.deck.pop();
    if (card) {
      player.hand.push(card);
    }
  }

  return newState;
}

// 弃牌逻辑
export function discardCard(
  gameState: MultiplayerGameState,
  playerId: string,
  cardId: string
): MultiplayerGameState {
  let newState = JSON.parse(JSON.stringify(gameState));
  const player = newState.players[playerId];

  if (!player) return newState;

  const cardIndex = player.hand.findIndex((c: Card) => c.id === cardId);
  if (cardIndex !== -1) {
    const [card] = player.hand.splice(cardIndex, 1);
    player.discard.push(card);
  }

  return newState;
}

// 应用卡牌效果（完全复用单人模式逻辑）
export function applyCardEffect(
  gameState: MultiplayerGameState,
  playerId: string,
  cardId: string
): MultiplayerGameState {
  let newState = JSON.parse(JSON.stringify(gameState));
  const player = newState.players[playerId];

  if (!player) return newState;

  const cardIndex = player.hand.findIndex((c: Card) => c.id === cardId);
  if (cardIndex === -1) return newState;

  const card = player.hand[cardIndex];

  // 找到对手
  const enemyPlayerId = newState.playerIds.find((id: string) => id !== playerId);
  const enemy = enemyPlayerId ? newState.players[enemyPlayerId] : null;

  // 如果是能力牌，先添加到永久能力列表并设置加成
  if (card.type === 'ability') {
    // 添加到永久能力数组
    const abilityId = card.id.toUpperCase().replace(/-/g, '_');
    player.permanentAbilities.push({
      id: abilityId,
      cardId: card.id,
      name: card.name,
      effect: card.effect
    });

    // 根据具体能力牌设置加成
    switch (card.id) {
      case 'zl-ability-01': // 频率锚定：每回合+3护甲
        player.permanentBonuses.armorPerTurn += 3;
        break;
      case 'zl-ability-02': // 低频共振：每5护甲造成3伤害
        // 这个需要在获得护甲时触发，暂存标记
        player.permanentBonuses.extraDamagePerArmor += 0.6; // 3伤害/5护甲 = 0.6
        break;
      case 'zl-ability-03': // 痛觉回响：自伤+伤害
        // 这个需要在自伤时触发，暂不处理复杂逻辑
        player.permanentBonuses.damageBonus += 0;
        break;
      case 'zl-ability-04': // 终末定音：20血以下+5伤害但受2穿透
        player.permanentBonuses.damageBonus += 5;
        break;
    }
  }

  // 应用卡牌效果
  if (card.baseDamage && enemy) {
    // 计算伤害
    let damage = card.baseDamage + player.permanentBonuses.damageBonus;
    
    // 额外伤害（基于护甲）
    if (player.permanentBonuses.extraDamagePerArmor > 0) {
      damage += Math.floor(player.armor * player.permanentBonuses.extraDamagePerArmor);
    }

    // 应用护甲
    if (enemy.armor > 0) {
      if (enemy.armor >= damage) {
        enemy.armor -= damage;
        damage = 0;
      } else {
        damage -= enemy.armor;
        enemy.armor = 0;
      }
    }

    // 应用伤害
    if (damage > 0) {
      enemy.hp = Math.max(0, enemy.hp - damage);
    }

    // 自伤
    if (card.selfDamage) {
      player.hp = Math.max(0, player.hp - card.selfDamage);
    }
  }

  // 护甲
  if (card.baseArmor) {
    player.armor += card.baseArmor;
  }

  // 污染度变化
  if (card.pollutionModifier) {
    // 这里可以根据需要实现污染度逻辑
  }

  // 半甲效果
  if (card.halfArmor && enemy) {
    enemy.armor = Math.floor(enemy.armor / 2);
  }

  // 声爆效果
  if (card.sonicBoom && enemy) {
    const sonicDamage = player.armor;
    if (enemy.armor >= sonicDamage) {
      enemy.armor -= sonicDamage;
    } else {
      const remaining = sonicDamage - enemy.armor;
      enemy.armor = 0;
      enemy.hp = Math.max(0, enemy.hp - remaining);
    }
  }

  // 免费二次攻击
  if (card.freeSecondAttack) {
    player.permanentBonuses.freeSecondAttack = true;
  }

  // 添加动作日志
  const actionLog: ActionLog = {
    id: Date.now().toString(),
    timestamp: Date.now(),
    playerId,
    playerName: player.name,
    action: `打出 ${card.name}`
  };
  newState.actionLogs.unshift(actionLog);

  // 检查游戏结束
  if (enemy && enemy.hp <= 0) {
    newState.phase = 'ended';
    player.isWinner = true;
  }

  return newState;
}

// 处理打出卡牌
export function handlePlayCard(
  gameState: MultiplayerGameState,
  playerId: string,
  cardId: string
): MultiplayerGameState {
  let newState = JSON.parse(JSON.stringify(gameState));
  const player = newState.players[playerId];

  if (!player) return newState;

  const card = player.hand.find((c: Card) => c.id === cardId);
  if (!card) return newState;

  if (player.ap < card.cost) return newState;

  // 扣除AP
  player.ap -= card.cost;

  // 应用卡牌效果
  newState = applyCardEffect(newState, playerId, cardId);

  // 弃牌
  newState = discardCard(newState, playerId, cardId);

  return newState;
}

// 切换到下一个玩家
export function nextPlayer(gameState: MultiplayerGameState): MultiplayerGameState {
  let newState = JSON.parse(JSON.stringify(gameState));

  // 当前玩家不再是回合玩家
  newState.players[newState.currentPlayerId].isCurrentTurn = false;

  // 找到下一个玩家索引
  const currentIndex = newState.playerIds.indexOf(newState.currentPlayerId);
  const nextIndex = (currentIndex + 1) % newState.playerIds.length;
  newState.currentPlayerId = newState.playerIds[nextIndex];

  // 新玩家成为回合玩家
  const nextPlayerState = newState.players[newState.currentPlayerId];
  nextPlayerState.isCurrentTurn = true;

  // 重置AP
  nextPlayerState.ap = nextPlayerState.maxAp;

  // 每回合+护甲
  if (nextPlayerState.permanentBonuses.armorPerTurn > 0) {
    nextPlayerState.armor += nextPlayerState.permanentBonuses.armorPerTurn;
  }

  // 抽牌
  const cardsToDraw = 3 + nextPlayerState.permanentBonuses.extraCardsPerTurn;
  newState = drawCards(newState, newState.currentPlayerId, cardsToDraw);

  // 增加回合数
  newState.turnNumber++;
  newState.turnTimeLeft = TURN_DURATION;

  return newState;
}

// 检查是否是当前玩家回合
export function isCurrentPlayerTurn(gameState: MultiplayerGameState, playerId: string): boolean {
  return gameState.currentPlayerId === playerId;
}
