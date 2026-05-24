// 卡牌类型
export type CardType = 'attack' | 'skill' | 'ability';
// 卡牌流派
export type CardArchetype = 'basic' | 'fortress' | 'overload';
// 卡牌目标
export type CardTarget = 'single' | 'self' | 'aoe';

export interface Card {
  id: string;
  name: string;
  nameEn: string;
  type: CardType;
  archetype: CardArchetype;
  cost: number;
  target: CardTarget;
  effect: string;
  designNote: string;
  // 数值信息用于计算器
  baseDamage?: number;
  baseArmor?: number;
  selfDamage?: number;
  pollutionCost?: number;
  sonicBoom?: number;
  purification?: number;
  // 专门控制污染机制的数值型字段：正数增加污染，负数减少污染
  pollutionModifier?: number;
  // 新的词缀字段
  exhaust?: boolean; // 消耗：打出后移出本局战斗
  retain?: boolean; // 保留：回合结束时不丢入弃牌堆
}

// 钟律（重装和弦师）完整牌库
export const zhongLvCards: Card[] = [
  // 基础牌 (10张)
  {
    id: 'zl-basic-01',
    name: '重频打击',
    nameEn: 'Heavy Frequency Strike',
    type: 'attack',
    archetype: 'basic',
    cost: 1,
    target: 'single',
    effect: '造成 5 点伤害。',
    designNote: '基准攻击牌，1AP=5伤害，标准模版。',
    baseDamage: 5,
  },
  {
    id: 'zl-basic-02',
    name: '重频打击',
    nameEn: 'Heavy Frequency Strike',
    type: 'attack',
    archetype: 'basic',
    cost: 1,
    target: 'single',
    effect: '造成 5 点伤害。',
    designNote: '基准攻击牌，1AP=5伤害，标准模版。',
    baseDamage: 5,
  },
  {
    id: 'zl-basic-03',
    name: '重频打击',
    nameEn: 'Heavy Frequency Strike',
    type: 'attack',
    archetype: 'basic',
    cost: 1,
    target: 'single',
    effect: '造成 5 点伤害。',
    designNote: '基准攻击牌，1AP=5伤害，标准模版。',
    baseDamage: 5,
  },
  {
    id: 'zl-basic-04',
    name: '重频打击',
    nameEn: 'Heavy Frequency Strike',
    type: 'attack',
    archetype: 'basic',
    cost: 1,
    target: 'single',
    effect: '造成 5 点伤害。',
    designNote: '基准攻击牌，1AP=5伤害，标准模版。',
    baseDamage: 5,
  },
  {
    id: 'zl-basic-05',
    name: '声学壁垒',
    nameEn: 'Acoustic Barrier',
    type: 'skill',
    archetype: 'basic',
    cost: 1,
    target: 'self',
    effect: '获得 5 点护甲。',
    designNote: '基准防御牌，1AP=5护甲，与攻击对称。',
    baseArmor: 5,
  },
  {
    id: 'zl-basic-06',
    name: '声学壁垒',
    nameEn: 'Acoustic Barrier',
    type: 'skill',
    archetype: 'basic',
    cost: 1,
    target: 'self',
    effect: '获得 5 点护甲。',
    designNote: '基准防御牌，1AP=5护甲，与攻击对称。',
    baseArmor: 5,
  },
  {
    id: 'zl-basic-07',
    name: '声学壁垒',
    nameEn: 'Acoustic Barrier',
    type: 'skill',
    archetype: 'basic',
    cost: 1,
    target: 'self',
    effect: '获得 5 点护甲。',
    designNote: '基准防御牌，1AP=5护甲，与攻击对称。',
    baseArmor: 5,
  },
  {
    id: 'zl-basic-08',
    name: '声学壁垒',
    nameEn: 'Acoustic Barrier',
    type: 'skill',
    archetype: 'basic',
    cost: 1,
    target: 'self',
    effect: '获得 5 点护甲。',
    designNote: '基准防御牌，1AP=5护甲，与攻击对称。',
    baseArmor: 5,
  },
  {
    id: 'zl-basic-09',
    name: '稳频调谐',
    nameEn: 'Stable Frequency Tuning',
    type: 'skill',
    archetype: 'basic',
    cost: 1,
    target: 'self',
    effect: '获得 3 点护甲，降低 10 点污染度。',
    designNote: '3护甲+抽牌=实用的早期节奏调整。',
    baseArmor: 3,
    purification: 10,
    pollutionModifier: -10,
  },
  {
    id: 'zl-basic-10',
    name: '余音震击',
    nameEn: 'Resonant Shock',
    type: 'attack',
    archetype: 'basic',
    cost: 1,
    target: 'single',
    effect: '造成 3 点伤害，附加 1 层声爆。',
    designNote: '3伤害+1声爆（每层约=2点延迟伤害）≈5点等效值，守恒但伤害分布从即时变延迟。',
    baseDamage: 3,
    sonicBoom: 1,
  },
  // 流派核心牌 - 低频堡垒流 (3张)
  {
    id: 'zl-fortress-01',
    name: '共振壁垒',
    nameEn: 'Resonance Bulwark',
    type: 'skill',
    archetype: 'fortress',
    cost: 2,
    target: 'self',
    effect: '获得 14 点护甲。若本回合你的护甲总量超过 20 点，对全体敌人造成等同于溢出值的声波伤害。',
    designNote: '2AP基准=10护甲，实际14护甲（+4超模）。溢出伤害条件苛刻，需配合其他护甲牌触发——以守为攻的雪球核心。',
    baseArmor: 14,
  },
  {
    id: 'zl-fortress-02',
    name: '谐波叠加',
    nameEn: 'Harmonic Stack',
    type: 'skill',
    archetype: 'fortress',
    cost: 1,
    target: 'self',
    effect: '获得 3 点护甲。你本回合每打出一张牌，再获得 2 点护甲。',
    designNote: '1AP=3护甲（-2亏模），但配合多牌出牌节奏，打5张牌=3+8=11护甲（+6超模）。鼓励高密度出牌。',
    baseArmor: 3,
  },
  {
    id: 'zl-fortress-03',
    name: '次声崩塌',
    nameEn: 'Infrasonic Collapse',
    type: 'attack',
    archetype: 'fortress',
    cost: 3,
    target: 'aoe',
    effect: '造成伤害等于你当前护甲值的 50%（向下取整）。使用后失去一半护甲（向下取整）。',
    designNote: '3AP基准=15伤害。需先堆护甲再用，40护甲时=20伤害且仅失去20护甲。共振壁垒溢出伤害的替代释放口。',
  },
  // 流派核心牌 - 过载冲击流 (3张)
  {
    id: 'zl-overload-01',
    name: '过载轰鸣',
    nameEn: 'Overload Roar',
    type: 'attack',
    archetype: 'overload',
    cost: 2,
    target: 'single',
    effect: '造成 16 点伤害。对你自身造成 5 点伤害。',
    designNote: '2AP基准=10伤害。实际16伤害（+6超模），惩罚为5点自我伤害（约=1AP价值）。过载流核心：血线换杀线。',
    baseDamage: 16,
    selfDamage: 5,
  },
  {
    id: 'zl-overload-02',
    name: '反馈回路',
    nameEn: 'Feedback Loop',
    type: 'attack',
    archetype: 'overload',
    cost: 1,
    target: 'single',
    effect: '造成 4 点伤害。若你本回合已受到过自身卡牌的伤害，此牌伤害翻倍（8点），并可以不消耗行动力再打出一次（须从手牌中打出第二次，第二次不翻倍）。',
    designNote: '1AP基准=5伤害。条件不满足时4伤害（亏模1），满足时首次8+免费二次4=12伤害（+7超模）。极端的Combo牌。',
    baseDamage: 4,
  },
  {
    id: 'zl-overload-03',
    name: '断弦极限',
    nameEn: 'Broken String Limit',
    type: 'attack',
    archetype: 'overload',
    cost: 0,
    target: 'self',
    effect: '失去 10 点生命值。获得 2 点行动力。本回合你打出的下一张攻击牌伤害 +10。',
    designNote: '0AP。失去10HP（约2AP价值）换2AP+10增伤（约4AP价值），净超模+2AP但代价是血线。配合过载音叉遗物爆发天花板极高。',
  },
  // 成长型能力牌 (4张)
  {
    id: 'zl-ability-01',
    name: '频率锚定',
    nameEn: 'Frequency Anchor',
    type: 'ability',
    archetype: 'fortress',
    cost: 1,
    target: 'self',
    effect: '【永久】你每回合开始时获得 3 点护甲。',
    designNote: '1AP=5护甲的一次性效果，改为每回合3护甲，2回合即可回本（6>5），3回合净赚4点——投资型能力牌。',
  },
  {
    id: 'zl-ability-02',
    name: '低频共振',
    nameEn: 'Low Frequency Resonance',
    type: 'ability',
    archetype: 'fortress',
    cost: 2,
    target: 'self',
    effect: '【永久】你每获得 5 点护甲时，对对手造成 3 点声波伤害。',
    designNote: '2AP=10护甲的等价投资，按每回合获得约10护甲计=6点/回合自动伤害。让"叠甲"本身就成为攻击。',
  },
  {
    id: 'zl-ability-03',
    name: '痛觉回响',
    nameEn: 'Pain Echo',
    type: 'ability',
    archetype: 'overload',
    cost: 1,
    target: 'self',
    effect: '【永久】你每受到 1 点来自自身卡牌的伤害，你的下一张攻击牌伤害 +1（最多叠加至 +8，打出攻击牌后清零）。',
    designNote: '1AP投资，配合过载轰鸣（5自伤）=+5增伤。注意：断弦极限的"失去生命"不属于"受到伤害"，不触发此效果——设计者预留的数值安全阀。',
  },
  {
    id: 'zl-ability-04',
    name: '终末定音',
    nameEn: 'Final Tuning',
    type: 'ability',
    archetype: 'overload',
    cost: 3,
    target: 'self',
    effect: '【永久】当你的生命值降至 20 以下时，你所有攻击牌伤害 +5，但你每回合结束受到 2 点穿透伤害。',
    designNote: '3AP重投资。+5伤害/每张攻击牌≈每张+1AP价值，但2穿透/回合持续亏损血线。背水一战型能力牌，完美契合过载冲击流气质。',
  },
];

export const cardTypeConfig: Record<CardType, { label: string; color: string; borderColor: string; bg: string }> = {
  attack: { label: '攻击', color: 'text-red-400', borderColor: 'border-red-500/60', bg: 'bg-red-500/10' },
  skill: { label: '技能', color: 'text-blue-400', borderColor: 'border-blue-500/60', bg: 'bg-blue-500/10' },
  ability: { label: '能力', color: 'text-purple-400', borderColor: 'border-purple-500/60', bg: 'bg-purple-500/10' },
};

export const archetypeConfig: Record<CardArchetype, { label: string; color: string }> = {
  basic: { label: '基础', color: 'text-slate-400' },
  fortress: { label: '低频堡垒', color: 'text-blue-400' },
  overload: { label: '过载冲击', color: 'text-red-400' },
};

export const targetConfig: Record<CardTarget, { label: string; icon: string }> = {
  single: { label: '单体', icon: '🎯' },
  self: { label: '自身', icon: '🛡️' },
  aoe: { label: '群体', icon: '💫' },
};

// 初始手牌 - 从钟律牌库中选取前6张
export const INITIAL_HAND_CARDS: Card[] = [
  zhongLvCards[0],  // 重频打击
  zhongLvCards[1],  // 重频打击
  zhongLvCards[4],  // 声学壁垒
  zhongLvCards[5],  // 声学壁垒
  zhongLvCards[8],  // 稳频调谐
  zhongLvCards[9],  // 余音震击
];
