// 多人对战游戏逻辑 - 完全复⽤单人模式
import { Card, zhongLvCards, INITIAL_HAND_CARDS } from '@/lib/cards';
import type { MultiplayerGameState, MultiplayerPlayer, ActionLog, Debuff } from './types';

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
      harmonicStackArmor: 0,
      harmonicStackActive: false,
      freeSecondAttackAvailable: false,
      isSwordSwinging: false
    },
    exiled: [],
    debuffs: []
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

  // 随机选择先手玩家
  const currentPlayerId = playerIds[Math.floor(Math.random() * playerIds.length)];
  playersRecord[currentPlayerId].isCurrentTurn = true;

  return {
    roomId,
    players: playersRecord,
    playerIds,
    currentPlayerId,
    phase: 'playing',
    turnNumber: 1,
    turnTimeLeft: TURN_DURATION,
    selectedCardId: null,
    actionLogs: []
  };
}

// 判断是否是当前玩家回合
export function isCurrentPlayerTurn(
  gameState: MultiplayerGameState,
  playerId: string
): boolean {
  return gameState.players[playerId]?.isCurrentTurn ?? false;
}

// 处理卡牌打出
export function handlePlayCard(
  gameState: MultiplayerGameState,
  playerId: string,
  cardId: string
): MultiplayerGameState {
  console.log('=== handlePlayCard 被调用 ===');
  console.log('playerId:', playerId);
  console.log('cardId:', cardId);

  let newState = JSON.parse(JSON.stringify(gameState));
  const player = newState.players[playerId];
  const enemyId = newState.playerIds.find((id: string) => id !== playerId);
  const enemy = enemyId ? newState.players[enemyId] : null;

  // 检查是否是玩家回合
  if (!player.isCurrentTurn) {
    console.log('不是玩家回合');
    return newState;
  }

  // 查找卡牌
  const cardIndex = player.hand.findIndex((c: Card) => c.id === cardId);
  console.log('找到卡牌索引:', cardIndex);
  console.log('移除前手牌数量:', player.hand.length);

  if (cardIndex === -1) {
    console.log('卡牌不在手牌中');
    return newState;
  }

  // 获取卡牌对象
  const card = player.hand[cardIndex];
  console.log('找到的卡牌:', card.name);

  // 先重置挥剑状态，确保有上升沿
  player.turnState.isSwordSwinging = false;
  
  // 如果是攻击牌，设置挥剑动画
  if (card.type === 'attack') {
    player.turnState.isSwordSwinging = true;
  }

  // 第一步：从手牌移除卡牌
  player.hand.splice(cardIndex, 1);
  console.log('移除后手牌数量:', player.hand.length);

  // 第二步：处理卡牌词缀
  if (card.exhaust) {
    // 消耗：移出游戏
    player.exiled.push(card);
    console.log('卡牌移出游戏堆');
  } else {
    // 普通：加入弃牌堆
    player.discard.push(card);
    console.log('卡牌加入弃牌堆');
  }

  // 第三步：扣除 AP
  if (card.cost && player.ap >= card.cost) {
    // 检查是否可以免费出牌（反馈回路效果）
    if (player.turnState.freeSecondAttackAvailable) {
      // 使用免费出牌，不扣除 AP，并重置免费状态
      player.turnState.freeSecondAttackAvailable = false;
    } else {
      // 正常扣除 AP
      player.ap -= card.cost;
    }
  }

  // ============================================
  // 第四步：应用卡牌效果
  // ============================================
  switch (card.id) {
    // 共振壁垒：获得14护甲，护甲超过20时造成溢出伤害
    case 'zl-fortress-01':
      player.armor += 14;
      if (enemy && player.armor > 20) {
        const overflowDamage = player.armor - 20;
        enemy.hp = Math.max(0, enemy.hp - overflowDamage);
      }
      break;

    // 谐波叠加：获得3护甲，本回合每打出一张牌再获得2护甲
    case 'zl-fortress-02':
      player.armor += 3;
      // 标记本回合已激活谐波叠加
      player.turnState.harmonicStackActive = true;
      break;

    // 稳频调谐：获得3护甲，抽1张牌（多人模式版本，不降低污染度）
    case 'zl-basic-09':
      player.armor += 3;
      // 抽一张牌
      if (player.hand.length < MAX_HAND_SIZE) {
        // 如果牌库空了，将弃牌堆洗入抽牌堆
        if (player.deck.length === 0) {
          if (player.discard.length > 0) {
            player.deck = [...player.discard].sort(() => Math.random() - 0.5);
            player.discard = [];
          }
        }
        if (player.deck.length > 0) {
          const drawnCard = player.deck.shift()!;
          player.hand.push(drawnCard);
        }
      }
      break;

    // 次声崩塌：造成护甲值50%伤害，失去一半护甲
    case 'zl-fortress-03':
      if (enemy && player.armor > 0) {
        const halfDamage = Math.floor(player.armor * 0.5);
        let actualDamage = halfDamage;
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

    // 反馈回路：造成4伤害，若已受自伤则伤害翻倍（8点），并可以免费再打一次
    case 'zl-overload-02':
      if (enemy) {
        let baseDamage = 4 + player.permanentBonuses.damageBonus;
        // 检查本回合是否已受自伤
        if (player.turnState.hasTakenSelfDamage) {
          baseDamage *= 2; // 伤害翻倍
          // 设置可以免费再打一次
          player.turnState.freeSecondAttackAvailable = true;
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

    // 余音震击：造成3点伤害，附加1层声爆
    case 'zl-basic-10':
      if (enemy) {
        let damage = 3 + player.permanentBonuses.damageBonus;
        
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
      }
      
      // 附加1层声爆
      if (enemy) {
        const existingSonicBoom = enemy.debuffs.find((d: Debuff) => d.type === 'SONIC_BOOM');
        
        if (existingSonicBoom) {
          existingSonicBoom.stacks += 1;
        } else {
          enemy.debuffs.push({
            type: 'SONIC_BOOM',
            stacks: 1
          });
        }
      }
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
          case 'zl-ability-01':
            // 频率锚定：每回合+3护甲
            player.permanentBonuses.armorPerTurn += 3;
            break;
          case 'zl-ability-02':
            // 低频共振：每5护甲造成3伤害
            player.permanentBonuses.extraDamagePerArmor += 3 / 5;
            break;
          case 'zl-ability-04':
            // 终末定音：+5伤害
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

      // 声爆效果：给敌方添加声爆 debuff（仅攻击牌触发）
      if (card.sonicBoom && enemy && card.type === 'attack') {
        const sonicBoomStacks = card.sonicBoom;
        const existingSonicBoom = enemy.debuffs.find((d: Debuff) => d.type === 'SONIC_BOOM');
        
        if (existingSonicBoom) {
          existingSonicBoom.stacks += sonicBoomStacks;
        } else {
          enemy.debuffs.push({
            type: 'SONIC_BOOM',
            stacks: sonicBoomStacks
          });
        }
      }
  }

  // ============================================
  // 本回合卡牌计数和谐波叠加加成
  // ============================================
  player.turnState.cardsPlayed += 1;
  
  // 如果谐波叠加已激活，且当前打出的不是谐波叠加本身，则获得2护甲
  if (player.turnState.harmonicStackActive && card.id !== 'zl-fortress-02') {
    player.armor += 2;
  }

  // 清除断弦极限的下一张攻击牌加成（只对下一张攻击牌有效）
  // 注意：断弦极限本身是 attack 类型，所以要跳过它
  if (card.type === 'attack' && card.id !== 'zl-overload-03') {
    player.turnState.nextAttackDamageBonus = 0;
  }



  // ============================================
  // 检查游戏结束
  // ============================================
  if (enemy && enemy.hp <= 0) {
    newState.phase = 'ended';
    player.isWinner = true;
  }

  // 第六步：添加动作日志
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
  const currentIndex = newState.playerIds.indexOf(newState.currentPlayerId);
  const nextIndex = (currentIndex + 1) % newState.playerIds.length;
  const nextPlayerId = newState.playerIds[nextIndex];
  
  // 当前玩家（即将结束回合）
  const currentPlayer = newState.players[newState.currentPlayerId];
  // 敌人（即将接受声爆伤害）
  const enemyId = newState.playerIds.find((id: string) => id !== newState.currentPlayerId);
  const enemy = enemyId ? newState.players[enemyId] : null;

  // 在当前玩家回合结束时结算声爆伤害
  if (enemy) {
    const sonicBoomDebuff = enemy.debuffs.find((d: Debuff) => d.type === 'SONIC_BOOM');
    
    if (sonicBoomDebuff && sonicBoomDebuff.stacks > 0) {
      const sonicBoomDamage = sonicBoomDebuff.stacks * 2;
      // 声爆是真实伤害，直接扣除HP，不经过护甲
      enemy.hp = Math.max(0, enemy.hp - sonicBoomDamage);
      
      // 清除声爆debuff
      enemy.debuffs = enemy.debuffs.filter((d: Debuff) => d.type !== 'SONIC_BOOM');
    }
  }

  // 切换玩家
  newState.players[newState.currentPlayerId].isCurrentTurn = false;
  newState.players[nextPlayerId].isCurrentTurn = true;
  newState.currentPlayerId = nextPlayerId;
  newState.turnNumber += 1;
  newState.turnTimeLeft = TURN_DURATION;

  // 新回合重置
  const player = newState.players[nextPlayerId];
  player.ap = player.maxAp;
  
  // 重置本回合状态
  player.turnState = {
    cardsPlayed: 0,
    hasTakenSelfDamage: false,
    nextAttackDamageBonus: 0,
    harmonicStackArmor: 0,
    harmonicStackActive: false,
    freeSecondAttackAvailable: false,
    isSwordSwinging: false
  };

  // 抽牌（标准3张）
  const drawCount = 3 + player.permanentBonuses.extraCardsPerTurn;
  for (let i = 0; i < drawCount && player.hand.length < MAX_HAND_SIZE; i++) {
    // 如果牌库空了，将弃牌堆洗入抽牌堆
    if (player.deck.length === 0) {
      if (player.discard.length === 0) {
        // 牌库和弃牌堆都空了，无法继续抽牌
        break;
      }
      // 将弃牌堆洗入抽牌堆
      player.deck = [...player.discard].sort(() => Math.random() - 0.5);
      player.discard = [];
    }
    const card = player.deck.shift();
    if (card) {
      player.hand.push(card);
    }
  }

  // 每回合获得护甲
  player.armor += player.permanentBonuses.armorPerTurn;

  return newState;
}
