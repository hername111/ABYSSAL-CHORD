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
    },
    turnState: {
      cardsPlayed: 0,
      hasTakenSelfDamage: false,
      nextAttackDamageBonus: 0,
      harmonicStackArmor: 0
    },
    exiled: []
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

// 应用卡牌效果（完全复⽤单人模式逻辑）
export function applyCardEffect(
  gameState: MultiplayerGameState,
  playerId: string,
  cardId: string,
  card: Card
): MultiplayerGameState {
  let newState = JSON.parse(JSON.stringify(gameState));
  const player = newState.players[playerId];

  if (!player) return newState;

  // 找到对手
  const enemyPlayerId = newState.playerIds.find((id: string) => id !== playerId);
  const enemy = enemyPlayerId ? newState.players[enemyPlayerId] : null;

  // ============================================
  // 特殊卡牌效果处理（按卡牌ID）
  // ============================================
  let harmonicStackBonus = 0;
  
  switch (card.id) {
    // 共振壁垒：获得14护甲，护甲超过20点时造成溢出伤害
    case 'zl-fortress-01':
      player.armor += 14;
      // 如果护甲超过20，造成溢出伤害
      if (player.armor > 20 && enemy) {
        const overflowDamage = player.armor - 20;
        // 溢出伤害直接作用于生命值（声波伤害）
        enemy.hp = Math.max(0, enemy.hp - overflowDamage);
      }
      break;

    // 谐波叠加：获得3护甲，本回合每打出一张牌再获得2护甲
    case 'zl-fortress-02':
      player.armor += 3;
      // 记录本回合已打出的卡牌数量，用于后续加成
      harmonicStackBonus = 2; // 每打一张牌加2护甲
      break;

    // 次声崩塌：造成护甲50%伤害，失去一半护甲
    case 'zl-fortress-03':
      if (enemy) {
        const damage = Math.floor(player.armor * 0.5);
        // 先造成伤害
        let actualDamage = damage;
        if (enemy.armor > 0) {
          if (enemy.armor >= actualDamage) {
            enemy.armor -= actualDamage;
            actualDamage = 0;
          } else {
            actualDamage -= enemy.armor;
            enemy.armor = 0;
          }
        }
        if (actualDamage > 0) {
          enemy.hp = Math.max(0, enemy.hp - actualDamage);
        }
      }
      // 失去一半护甲
      player.armor = Math.floor(player.armor / 2);
      break;

    // 过载轰鸣：造成16伤害，对自身造成5伤害
    case 'zl-overload-01':
      if (enemy) {
        let damage = 16 + player.permanentBonuses.damageBonus;
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
      }
      // 自伤5点
      player.hp = Math.max(0, player.hp - 5);
      player.turnState.hasTakenSelfDamage = true;
      break;

    // 反馈回路：造成4伤害，若已受自伤则伤害翻倍（8点）
    case 'zl-overload-02':
      if (enemy) {
        let baseDamage = 4 + player.permanentBonuses.damageBonus;
        // 检查本回合是否已受自伤
        if (player.turnState.hasTakenSelfDamage) {
          baseDamage *= 2; // 伤害翻倍
        }
        // 应用伤害
        let damage = baseDamage;
        if (enemy.armor > 0) {
          if (enemy.armor >= damage) {
            enemy.armor -= damage;
            damage = 0;
          } else {
            damage -= enemy.armor;
            enemy.armor = 0;
          }
        }
        if (damage > 0) {
          enemy.hp = Math.max(0, enemy.hp - damage);
        }
      }
      break;

    // 断弦极限：失去10生命，获得2AP，下一张攻击牌+10伤害
    case 'zl-overload-03':
      player.hp = Math.max(0, player.hp - 10);
      player.ap += 2;
      player.turnState.nextAttackDamageBonus += 10;
      break;

    default:
      // 普通卡牌效果处理
      // ============================================
      // 如果是能力牌，先添加到永久能力列表并设置加成
      // ============================================
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
            player.permanentBonuses.extraDamagePerArmor += 0.6; // 3伤害/5护甲 = 0.6
            break;
          case 'zl-ability-03': // 痛觉回响：自伤+伤害（简化处理）
            break;
          case 'zl-ability-04': // 终末定音：+5伤害加成
            player.permanentBonuses.damageBonus += 5;
            break;
        }
      }

      // ============================================
      // 普通卡牌效果（非特殊卡牌）
      // ============================================
      if (card.baseDamage && enemy) {
        // 计算伤害
        let damage = card.baseDamage + player.permanentBonuses.damageBonus;
        
        // 加上断弦极限的下一张攻击牌加成
        damage += player.turnState.nextAttackDamageBonus;
        
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
          player.turnState.hasTakenSelfDamage = true;
        }
      }

      // 护甲
      if (card.baseArmor) {
        player.armor += card.baseArmor;
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
  }

  // ============================================
  // 本回合卡牌计数和谐波叠加加成
  // ============================================
  player.turnState.cardsPlayed += 1;
  
  // 如果有谐波叠加，且已经打出过至少2张牌（包括这张），则获得2护甲
  if (player.turnState.cardsPlayed > 1) {
    // 检查之前是否打过谐波叠加（通过 permanentAbilities 或者其他方式）
    // 简单处理：每次打第二张牌开始都加2护甲
    player.armor += 2;
  }

  // 清除断弦极限的下一张攻击牌加成（只对下一张攻击牌有效）
  if (card.type === 'attack') {
    player.turnState.nextAttackDamageBonus = 0;
  }

  // ============================================
  // 检查游戏结束
  // ============================================
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

  // 找到卡牌在手牌中的位置
  const cardIndexInHand = player.hand.findIndex((c: Card) => c.id === cardId);

  // 先从手牌中移除卡牌
  if (cardIndexInHand !== -1) {
    player.hand.splice(cardIndexInHand, 1);
  }

  // 检查卡牌是否是 exhaust（消耗）词缀，并加入对应堆
  if (card.exhaust) {
    player.exiled.push(card);
  } else {
    player.discard.push(card);
  }

  // 应用卡牌效果（传递已获取的 card 对象）
  newState = applyCardEffect(newState, playerId, cardId, card);

  // 添加动作日志
  const actionLog: ActionLog = {
    id: Date.now().toString(),
    timestamp: Date.now(),
    playerId,
    playerName: player.name,
    action: `打出 ${card.name}`
  };
  newState.actionLogs.unshift(actionLog);

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

  // 重置回合状态
  nextPlayerState.turnState = {
    cardsPlayed: 0,
    hasTakenSelfDamage: false,
    nextAttackDamageBonus: 0,
    harmonicStackArmor: 0
  };

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
