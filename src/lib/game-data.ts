// 怪物行为类型
export type EnemyActionType = 'attack' | 'attack_debuff' | 'buff' | 'aoe' | 'special' | 'summon';

export interface EnemyAction {
  diceRange: [number, number]; // [min, max] inclusive
  name: string;
  nameEn: string;
  type: EnemyActionType;
  effect: string;
  damage?: number;
  armor?: number;
  sonicBoom?: number;
  pollutionIncrease?: number;
  piercing?: boolean;
  special?: string;
}

export interface Enemy {
  id: string;
  name: string;
  nameEn: string;
  lore: string;
  hpRange: [number, number, number, number]; // 1人~4人
  actions: EnemyAction[];
  isBoss?: boolean;
  phase2Actions?: EnemyAction[];
  phase2Trigger?: string;
  phase2Effect?: string;
}

export const enemies: Enemy[] = [
  {
    id: 'howling-drifter',
    name: '嘶鸣游荡者',
    nameEn: 'Howling Drifter',
    lore: '曾是人类，被旧日回音侵蚀后声带异化为可发射次声波的器官。它们在废土中漫无目的地游荡，发出令人头皮发麻的嘶鸣。单独一只并不可怕，但它们的嘶鸣会互相增幅。',
    hpRange: [18, 26, 34, 42],
    actions: [
      { diceRange: [1, 2], name: '次声冲撞', nameEn: 'Infrasonic Charge', type: 'attack', effect: '对目标玩家造成 6 点伤害。', damage: 6 },
      { diceRange: [3, 3], name: '撕裂嘶鸣', nameEn: 'Tearing Howl', type: 'attack_debuff', effect: '对目标玩家造成 4 点伤害，附加 2 层声爆。', damage: 4, sonicBoom: 2 },
      { diceRange: [4, 4], name: '声波蓄积', nameEn: 'Wave Accumulation', type: 'buff', effect: '获得 8 点护甲，并使污染刻度尺 +5。', armor: 8, pollutionIncrease: 5 },
      { diceRange: [5, 5], name: '共振增幅', nameEn: 'Resonance Amplify', type: 'special', effect: '本回合伤害 +3，并再次掷骰决定行动（此效果每回合仅触发一次，二次掷出5视为无动作）。', special: 'reroll_with_bonus_3' },
      { diceRange: [6, 6], name: '低频感染', nameEn: 'Low Frequency Infection', type: 'aoe', effect: '对全体玩家造成 3 点伤害，附加 1 层声爆。', damage: 3, sonicBoom: 1 },
    ],
  },
  {
    id: 'silent-mimic',
    name: '静默拟态体',
    nameEn: 'Silent Mimic',
    lore: '一种诡异的畸变体，它不发出任何声音——它吞噬声音。在它周围，一切声响都会被吸收殆尽。调音师的声波武器对它收效甚微，但它同样畏惧彻底的寂静。',
    hpRange: [22, 30, 38, 46],
    actions: [
      { diceRange: [1, 1], name: '真空触手', nameEn: 'Vacuum Tentacle', type: 'attack', effect: '对目标玩家造成 8 点伤害。', damage: 8 },
      { diceRange: [2, 2], name: '消音力场', nameEn: 'Silencing Field', type: 'buff', effect: '获得 10 点护甲。下一位攻击它的玩家，攻击伤害 -3。', armor: 10, special: 'reduce_next_attack_3' },
      { diceRange: [3, 4], name: '声波吞噬', nameEn: 'Wave Devour', type: 'attack_debuff', effect: '对目标玩家造成 5 点伤害，并随机弃掉该玩家 1 张手牌。', damage: 5, special: 'discard_1_card' },
      { diceRange: [5, 5], name: '拟态伪装', nameEn: 'Mimic Disguise', type: 'special', effect: '直到下一回合开始，获得"拟态"状态（受到攻击时，将伤害的50%反弹给攻击者，向下取整）。', special: 'reflect_50_percent' },
      { diceRange: [6, 6], name: '绝对寂静', nameEn: 'Absolute Silence', type: 'aoe', effect: '使污染刻度尺 +10。对所有玩家施加"失聪"Debuff（本回合攻击牌伤害-2），持续1回合。', pollutionIncrease: 10, special: 'deafen_all' },
    ],
  },
  {
    id: 'mutos',
    name: '深渊颂歌·穆托斯',
    nameEn: 'Abyssal Hymn · Mutos',
    lore: '回响裂谷深处的支配者。它曾是第一座锚点塔的首席调音师，在试图独自封印旧日回音源头时被彻底吞噬，肉身与声波融为一体，化为裂谷本身的心跳。它并非恶意——它只是在"歌唱"，而它的歌声足以碾碎一切生灵。',
    hpRange: [80, 120, 160, 200],
    isBoss: true,
    phase2Trigger: 'HP ≤ 50% 时触发',
    phase2Effect: '清空所有玩家护甲；污染刻度尺 +25；穆托斯获得"咏叹调"状态（永久：每回合获得8护甲、每回合结束时污染度+10、伤害类行为+5）',
    actions: [
      { diceRange: [1, 2], name: '震颤低音', nameEn: 'Tremor Bass', type: 'attack', effect: '对目标玩家造成 10 点伤害。', damage: 10 },
      { diceRange: [3, 3], name: '回响轰击', nameEn: 'Echo Bombardment', type: 'aoe', effect: '对全体玩家造成 7 点伤害。', damage: 7 },
      { diceRange: [4, 4], name: '声学护盾', nameEn: 'Acoustic Shield', type: 'buff', effect: '获得 12 点护甲。', armor: 12 },
      { diceRange: [5, 5], name: '深渊呼唤', nameEn: 'Abyssal Call', type: 'special', effect: '使污染刻度尺 +10。召唤 1 只嘶鸣游荡者（生命值为标准值的50%）。', pollutionIncrease: 10, special: 'summon_drifter_half' },
      { diceRange: [6, 6], name: '共鸣压制', nameEn: 'Resonance Suppress', type: 'attack_debuff', effect: '对目标玩家造成 6 点伤害，附加 3 层声爆。若目标已有声爆，则额外造成等于声爆层数×2的伤害后清除该目标所有声爆。', damage: 6, sonicBoom: 3, special: 'sonic_boom_detonate' },
    ],
    phase2Actions: [
      { diceRange: [1, 2], name: '坍缩音爆', nameEn: 'Collapsing Boom', type: 'attack', effect: '对目标玩家造成 15 点伤害（10+5咏叹调加成）。', damage: 15 },
      { diceRange: [3, 3], name: '裂谷共鸣', nameEn: 'Rift Resonance', type: 'aoe', effect: '对全体玩家造成 12 点伤害（7+5咏叹调加成）。', damage: 12 },
      { diceRange: [4, 4], name: '绝对音域', nameEn: 'Absolute Frequency', type: 'buff', effect: '获得 15 点护甲（8咏叹调+7额外）。所有玩家附加 2 层声爆。', armor: 15, sonicBoom: 2 },
      { diceRange: [5, 5], name: '深渊再呼', nameEn: 'Abyssal Recall', type: 'special', effect: '使污染刻度尺 +15（10+5额外）。召唤 1 只嘶鸣游荡者（标准值75%生命）。', pollutionIncrease: 15, special: 'summon_drifter_75' },
      { diceRange: [6, 6], name: '末日和弦', nameEn: 'Doomsday Chord', type: 'aoe', effect: '对全体玩家造成 8 点伤害。附加 3 层声爆。若污染度 ≥ 20，再额外造成 5 点穿透伤害。', damage: 8, sonicBoom: 3, piercing: true, special: 'pollution_threshold_bonus' },
    ],
  },
];

// 污染度等级配置
export interface PollutionLevel {
  range: [number, number];
  name: string;
  nameEn: string;
  damageBonus: number;
  armorPerTurn: number;
  playerPiercingDmg: number;
  color: string;
  bgColor: string;
}

export const pollutionLevels: PollutionLevel[] = [
  { range: [0, 15], name: '寂静期', nameEn: 'Silent', damageBonus: 0, armorPerTurn: 0, playerPiercingDmg: 0, color: 'text-green-400', bgColor: 'bg-green-500' },
  { range: [16, 40], name: '低鸣期', nameEn: 'Humming', damageBonus: 2, armorPerTurn: 0, playerPiercingDmg: 0, color: 'text-yellow-400', bgColor: 'bg-yellow-500' },
  { range: [41, 70], name: '共振期', nameEn: 'Resonance', damageBonus: 4, armorPerTurn: 3, playerPiercingDmg: 0, color: 'text-orange-400', bgColor: 'bg-orange-500' },
  { range: [71, 90], name: '咆哮期', nameEn: 'Roaring', damageBonus: 6, armorPerTurn: 5, playerPiercingDmg: 3, color: 'text-red-400', bgColor: 'bg-red-500' },
  { range: [91, 100], name: '终焉和弦', nameEn: 'Finale', damageBonus: 10, armorPerTurn: 5, playerPiercingDmg: 5, color: 'text-purple-400', bgColor: 'bg-purple-500' },
];

export function getPollutionLevel(pollution: number): PollutionLevel {
  if (pollution >= 91) return pollutionLevels[4];
  if (pollution >= 71) return pollutionLevels[3];
  if (pollution >= 41) return pollutionLevels[2];
  if (pollution >= 16) return pollutionLevels[1];
  return pollutionLevels[0];
}

// 角色数据
export interface Character {
  id: string;
  name: string;
  nameEn: string;
  title: string;
  titleEn: string;
  maxHp: number;
  relic: string;
  relicEn: string;
  relicEffect: string;
  lore: string;
  archetypes: { name: string; nameEn: string; description: string }[];
}

export const characters: Character[] = [
  {
    id: 'zhong-lv',
    name: '钟律',
    nameEn: 'Zhong Lü',
    title: '重装和弦师',
    titleEn: 'Heavy Chordist',
    maxHp: 80,
    relic: '过载音叉',
    relicEn: 'Overload Tuning Fork',
    relicEffect: '每回合第一次打出 Cost ≥ 2 的卡牌时，获得 1 点临时行动力（回合结束清除）。',
    lore: '前锚点塔声学工程师，在一次锚点塔过载事故中被超低频共振波直接冲击全身，濒死之际与旧日回音产生了"全频共谐"。他的骨骼在共振中变得密度极高，身体可以承受并放大低频声波，代价是感官逐渐钝化，只能通过声波震动"听"到世界。',
    archetypes: [
      { name: '低频堡垒流', nameEn: 'Low Frequency Fortress', description: '通过大量堆叠护甲与"共振护盾"机制（护甲溢出时转化为对全体敌人的声波伤害），形成"以守为攻"的滚雪球体系。高防御、慢启动、后期爆发。' },
      { name: '过载冲击流', nameEn: 'Overload Strike', description: '利用"自我伤害"换取超高倍率的攻击牌，配合遗物的临时行动力触发多次过载，形成"血线换杀线"的极限输出。高风险、高爆发、操作密集。' },
    ],
  },
  {
    id: 'xian-yin',
    name: '弦音',
    nameEn: 'Xian Yin',
    title: '频率猎手',
    titleEn: 'Frequency Hunter',
    maxHp: 55,
    relic: '断裂琴弦',
    relicEn: 'Snapped String',
    relicEffect: '每回合打出的前 2 张攻击牌，若造成未被格挡的伤害，额外附加 2 点声爆 Debuff。',
    lore: '旧日回音爆发时年仅 12 岁的孤儿，在畸变体群中独自存活了三年。她的共谐能力表现为超高频感知——能"看见"声波在空气中的折射纹路，也能用极细的高频声束切割一切。常年的独自求生使她极度不信任他人，但在加入调音师小队后，她发现共鸣的力量远比孤独更强。',
    archetypes: [
      { name: '高频刺客流', nameEn: 'High Frequency Assassin', description: '通过低费高频率的攻击牌密集输出，叠加"声爆"Debuff层数，形成"千刀万剐"的持续消耗体系。低费快攻、Debuff叠加、灵活走位。' },
      { name: '回声幻影流', nameEn: 'Echo Phantom', description: '利用"回声"标记机制（打出的牌在本回合末复制一次效果），将每张牌的收益翻倍，配合高价值单卡实现"一牌双响"的精密连招。资源效率极致化、Combo链、操作上限高。' },
    ],
  },
];
