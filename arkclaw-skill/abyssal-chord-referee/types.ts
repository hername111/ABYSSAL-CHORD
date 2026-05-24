// arkclaw skill类型定义

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface SkillRequest {
  messages: Message[];
  gameContext?: GameContext;
}

export interface GameContext {
  playerHp?: number;
  playerMaxHp?: number;
  playerArmor?: number;
  enemyHp?: number;
  enemyMaxHp?: number;
  contamination?: number;
  handCards?: string[];
  activeAbilities?: string[];
  currentPhase?: string;
}
