"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Shield,
  Zap,
  Skull,
  DoorOpen,
  User,
  Clock
} from "lucide-react";
import { Card, INITIAL_HAND_CARDS, zhongLvCards } from "@/lib/cards";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// 带唯一实例 ID 的卡牌类型
interface CardWithUid extends Card {
  uid: string;
}

// 能力类型枚举
type AbilityType = "FREQUENCY_ANCHOR" | "LOW_FREQUENCY_RESONANCE" | "PAIN_ECHO" | "FINAL_TUNING";

// 能力接口
interface ActiveAbility {
  id: AbilityType;
  cardId: string;
}

// 能力配置
const abilityConfig: Record<AbilityType, {
  name: string;
  armorPerTurn?: number;
  armorThreshold?: number;
  damagePerThreshold?: number;
  selfDamageBonusPerPoint?: number;
  maxBonus?: number;
  lowHpThreshold?: number;
  lowHpDamageBonus?: number;
  lowHpDotDamage?: number;
}> = {
  FREQUENCY_ANCHOR: { name: "频率锚定", armorPerTurn: 3 },
  LOW_FREQUENCY_RESONANCE: { name: "低频共振", armorThreshold: 5, damagePerThreshold: 3 },
  PAIN_ECHO: { name: "痛觉回响", selfDamageBonusPerPoint: 2, maxBonus: 8 },
  FINAL_TUNING: { name: "终末定音", lowHpThreshold: 20, lowHpDamageBonus: 5, lowHpDotDamage: 2 }
};

// 给卡牌添加唯一ID的辅助函数
const addUidsToCards = (cards: Card[]): CardWithUid[] => {
  return cards.map((card, index) => ({
    ...card,
    uid: `${card.id}-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`
  }));
};

export default function MultiplayerPage() {
  const router = useRouter();
  
  // ========== 玩家1状态 ==========
  const [player1State, setPlayer1State] = useState({
    hp: 80,
    maxHp: 80,
    armor: 0,
    buffs: [],
    debuffs: []
  });
  const [player1Deck, setPlayer1Deck] = useState<CardWithUid[]>([]);
  const [player1Hand, setPlayer1Hand] = useState<CardWithUid[]>([]);
  const [player1Discard, setPlayer1Discard] = useState<CardWithUid[]>([]);
  const [player1Ap, setPlayer1Ap] = useState(3);
  const [player1ActiveAbilities, setPlayer1ActiveAbilities] = useState<ActiveAbility[]>([]);
  
  // ========== 玩家2状态 ==========
  const [player2State, setPlayer2State] = useState({
    hp: 80,
    maxHp: 80,
    armor: 0,
    buffs: [],
    debuffs: []
  });
  const [player2Deck, setPlayer2Deck] = useState<CardWithUid[]>([]);
  const [player2Hand, setPlayer2Hand] = useState<CardWithUid[]>([]);
  const [player2Discard, setPlayer2Discard] = useState<CardWithUid[]>([]);
  const [player2Ap, setPlayer2Ap] = useState(3);
  const [player2ActiveAbilities, setPlayer2ActiveAbilities] = useState<ActiveAbility[]>([]);
  
  // ========== 通用游戏状态 ==========
  const [currentPlayer, setCurrentPlayer] = useState<'PLAYER1' | 'PLAYER2'>('PLAYER1');
  const [turn, setTurn] = useState(1);
  const [selectedCardUid, setSelectedCardUid] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(true);
  const [showEnergyWarning, setShowEnergyWarning] = useState(false);
  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false);
  
  // ========== 当前玩家便捷访问 ==========
  const getCurrentHand = () => currentPlayer === 'PLAYER1' ? player1Hand : player2Hand;
  const getCurrentDeck = () => currentPlayer === 'PLAYER1' ? player1Deck : player2Deck;
  const getCurrentDiscard = () => currentPlayer === 'PLAYER1' ? player1Discard : player2Discard;
  const getCurrentAp = () => currentPlayer === 'PLAYER1' ? player1Ap : player2Ap;
  const getCurrentState = () => currentPlayer === 'PLAYER1' ? player1State : player2State;
  const getCurrentActiveAbilities = () => currentPlayer === 'PLAYER1' ? player1ActiveAbilities : player2ActiveAbilities;
  
  const setCurrentHand = (hand: CardWithUid[]) => currentPlayer === 'PLAYER1' ? setPlayer1Hand(hand) : setPlayer2Hand(hand);
  const setCurrentDeck = (deck: CardWithUid[]) => currentPlayer === 'PLAYER1' ? setPlayer1Deck(deck) : setPlayer2Deck(deck);
  const setCurrentDiscard = (discard: CardWithUid[]) => currentPlayer === 'PLAYER1' ? setPlayer1Discard(discard) : setPlayer2Discard(discard);
  const setCurrentAp = (ap: number) => currentPlayer === 'PLAYER1' ? setPlayer1Ap(ap) : setPlayer2Ap(ap);
  const setCurrentState = (state: any) => currentPlayer === 'PLAYER1' ? setPlayer1State(state) : setPlayer2State(state);
  const setCurrentActiveAbilities = (abilities: ActiveAbility[]) => currentPlayer === 'PLAYER1' ? setPlayer1ActiveAbilities(abilities) : setPlayer2ActiveAbilities(abilities);
  
  // ========== 受伤 ==========
  const takeDamage = (target: 'PLAYER1' | 'PLAYER2', amount: number, piercing: boolean = false) => {
    const setState = target === 'PLAYER1' ? setPlayer1State : setPlayer2State;
    setState(prev => {
      let newArmor = prev.armor;
      let newHp = prev.hp;
      
      if (!piercing && newArmor > 0) {
        if (newArmor >= amount) {
          newArmor -= amount;
          amount = 0;
        } else {
          amount -= newArmor;
          newArmor = 0;
        }
      }
      
      if (amount > 0) {
        newHp = Math.max(0, newHp - amount);
      }
      
      return { ...prev, hp: newHp, armor: newArmor };
    });
  };
  
  // ========== 加护甲 ==========
  const addArmor = (target: 'PLAYER1' | 'PLAYER2', amount: number) => {
    const setState = target === 'PLAYER1' ? setPlayer1State : setPlayer2State;
    setState(prev => ({ ...prev, armor: prev.armor + amount }));
  };
  
  // ========== 抽牌 ==========
  const drawCards = (count: number) => {
    const deck = [...getCurrentDeck()];
    const hand = [...getCurrentHand()];
    const discard = [...getCurrentDiscard()];
    
    for (let i = 0; i < count; i++) {
      if (deck.length === 0) {
        if (discard.length === 0) break;
        const shuffled = [...discard];
        for (let j = shuffled.length - 1; j > 0; j--) {
          const k = Math.floor(Math.random() * (j + 1));
          [shuffled[j], shuffled[k]] = [shuffled[k], shuffled[j]];
        }
        deck.push(...shuffled);
        discard.length = 0;
      }
      
      if (hand.length >= 6) break;
      
      const card = deck.pop();
      if (card) {
        hand.push(card);
      }
    }
    
    setCurrentDeck(deck);
    setCurrentHand(hand);
    setCurrentDiscard(discard);
  };
  
  // ========== 开始回合 ==========
  const startTurn = () => {
    setCurrentAp(3);
    drawCards(2);
    setTimeLeft(30);
    
    const hasFrequencyAnchor = getCurrentActiveAbilities().find(a => a.id === "FREQUENCY_ANCHOR");
    if (hasFrequencyAnchor) {
      addArmor(currentPlayer, abilityConfig.FREQUENCY_ANCHOR.armorPerTurn!);
    }
    
    setShowHint(true);
    setTimeout(() => setShowHint(false), 2000);
  };
  
  // ========== 结束回合 ==========
  const handleEndTurn = () => {
    if (isProcessing || gameOver) return;
    
    setIsProcessing(true);
    setSelectedCardUid(null);
    setShowHint(false);
    
    const hasFinalTuning = getCurrentActiveAbilities().find(a => a.id === "FINAL_TUNING");
    const currentState = getCurrentState();
    if (hasFinalTuning && currentState.hp <= abilityConfig.FINAL_TUNING.lowHpThreshold!) {
      takeDamage(currentPlayer, abilityConfig.FINAL_TUNING.lowHpDotDamage!, true);
    }
    
    const currentHand = getCurrentHand();
    const cardsToDiscard = currentHand.filter(c => !c.retain);
    const cardsToKeep = currentHand.filter(c => c.retain);
    setCurrentHand(cardsToKeep);
    const newDiscard = [...getCurrentDiscard(), ...cardsToDiscard];
    if (currentPlayer === 'PLAYER1') {
      setPlayer1Discard(newDiscard);
    } else {
      setPlayer2Discard(newDiscard);
    }
    
    const nextPlayer = currentPlayer === 'PLAYER1' ? 'PLAYER2' : 'PLAYER1';
    setCurrentPlayer(nextPlayer);
    setTurn(prev => prev + 1);
    
    setTimeout(() => {
      setIsProcessing(false);
      startTurn();
    }, 500);
  };
  
  // ========== 倒计时逻辑 ==========
  useEffect(() => {
    if (isProcessing || gameOver) return;
    
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setShowTimeoutWarning(true);
          setTimeout(() => {
            setShowTimeoutWarning(false);
            handleEndTurn();
          }, 2000);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [isProcessing, currentPlayer, gameOver]);
  
  // ========== 检查游戏结束 ==========
  useEffect(() => {
    if (player1State.hp <= 0) {
      setGameOver(true);
      setWinner('玩家2');
    } else if (player2State.hp <= 0) {
      setGameOver(true);
      setWinner('玩家1');
    }
  }, [player1State.hp, player2State.hp]);
  
  // ========== 初始化游戏 ==========
  useEffect(() => {
    const shuffleDeck = (deck: Card[]) => {
      const shuffled = [...deck];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    };
    
    const p1Deck = shuffleDeck([...zhongLvCards]);
    const p2Deck = shuffleDeck([...zhongLvCards]);
    
    const p1Hand = addUidsToCards(p1Deck.slice(0, 5));
    const p2Hand = addUidsToCards(p2Deck.slice(0, 5));
    
    setPlayer1Deck(p1Deck.slice(5) as CardWithUid[]);
    setPlayer1Hand(p1Hand);
    setPlayer1Discard([]);
    
    setPlayer2Deck(p2Deck.slice(5) as CardWithUid[]);
    setPlayer2Hand(p2Hand);
    setPlayer2Discard([]);
    
    setTimeout(() => {
      setShowHint(true);
      setTimeout(() => setShowHint(false), 2000);
    }, 500);
  }, []);
  
  // ========== 处理出牌 ==========
  const handlePlayCard = () => {
    if (!selectedCardUid || isProcessing) return;
    
    const currentHand = getCurrentHand();
    const card = currentHand.find(c => c.uid === selectedCardUid);
    if (!card) return;
    
    const currentAp = getCurrentAp();
    if (currentAp < card.cost) {
      setShowEnergyWarning(true);
      setTimeout(() => setShowEnergyWarning(false), 1500);
      return;
    }
    
    setIsProcessing(true);
    setShowHint(false);
    
    setCurrentAp(currentAp - card.cost);
    
    let damage = card.baseDamage || 0;
    const selfDamage = card.selfDamage || 0;
    const armorGain = card.baseArmor || 0;
    
    const hasPainEcho = getCurrentActiveAbilities().find(a => a.id === "PAIN_ECHO");
    if (hasPainEcho && selfDamage > 0) {
      const bonus = Math.min(selfDamage * abilityConfig.PAIN_ECHO.selfDamageBonusPerPoint!, abilityConfig.PAIN_ECHO.maxBonus!);
      damage += bonus;
    }
    
    const hasFinalTuning = getCurrentActiveAbilities().find(a => a.id === "FINAL_TUNING");
    const currentState = getCurrentState();
    if (hasFinalTuning && currentState.hp <= abilityConfig.FINAL_TUNING.lowHpThreshold!) {
      damage += abilityConfig.FINAL_TUNING.lowHpDamageBonus!;
    }
    
    if (damage > 0) {
      const opponent = currentPlayer === 'PLAYER1' ? 'PLAYER2' : 'PLAYER1';
      takeDamage(opponent, damage);
    }
    
    if (armorGain > 0) {
      addArmor(currentPlayer, armorGain);
    }
    
    if (selfDamage > 0) {
      takeDamage(currentPlayer, selfDamage, true);
    }
    
    if (card.id === 'INFRASONIC_COLLAPSE') {
      const armorLost = Math.floor(currentState.armor / 2);
      if (armorLost > 0) {
        const newState = { ...currentState, armor: Math.max(0, currentState.armor - armorLost) };
        if (currentPlayer === 'PLAYER1') {
          setPlayer1State(newState);
        } else {
          setPlayer2State(newState);
        }
      }
    }
    
    if (card.id === 'LOW_FREQUENCY_RESONANCE') {
      const opponent = currentPlayer === 'PLAYER1' ? 'PLAYER2' : 'PLAYER1';
      const threshold = abilityConfig.LOW_FREQUENCY_RESONANCE.armorThreshold!;
      const dmgPerThreshold = abilityConfig.LOW_FREQUENCY_RESONANCE.damagePerThreshold!;
      const totalDmg = Math.floor(currentState.armor / threshold) * dmgPerThreshold;
      if (totalDmg > 0) {
        takeDamage(opponent, totalDmg);
      }
    }
    
    if (card.type === 'ability') {
      const abilityId = card.id as AbilityType;
      const newAbilities = [...getCurrentActiveAbilities(), { id: abilityId, cardId: card.id }];
      if (currentPlayer === 'PLAYER1') {
        setPlayer1ActiveAbilities(newAbilities);
      } else {
        setPlayer2ActiveAbilities(newAbilities);
      }
    }
    
    const newHand = currentHand.filter(c => c.uid !== card.uid);
    setCurrentHand(newHand);
    const newDiscard = [...getCurrentDiscard(), card];
    if (currentPlayer === 'PLAYER1') {
      setPlayer1Discard(newDiscard);
    } else {
      setPlayer2Discard(newDiscard);
    }
    
    setSelectedCardUid(null);
    
    setTimeout(() => {
      setIsProcessing(false);
    }, 800);
  };
  
  // ========== 重新开始 ==========
  const handleRestart = () => {
    setPlayer1State({ hp: 80, maxHp: 80, armor: 0, buffs: [], debuffs: [] });
    setPlayer1Ap(3);
    setPlayer1ActiveAbilities([]);
    
    setPlayer2State({ hp: 80, maxHp: 80, armor: 0, buffs: [], debuffs: [] });
    setPlayer2Ap(3);
    setPlayer2ActiveAbilities([]);
    
    setTurn(1);
    setCurrentPlayer('PLAYER1');
    setSelectedCardUid(null);
    setTimeLeft(30);
    setGameOver(false);
    setWinner(null);
    
    const shuffleDeck = (deck: Card[]) => {
      const shuffled = [...deck];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    };
    
    const p1DeckShuffled = shuffleDeck([...zhongLvCards]);
    const p2DeckShuffled = shuffleDeck([...zhongLvCards]);
    
    const p1Hand = addUidsToCards(p1DeckShuffled.slice(0, 5));
    const p2Hand = addUidsToCards(p2DeckShuffled.slice(0, 5));
    
    setPlayer1Deck(p1DeckShuffled.slice(5) as CardWithUid[]);
    setPlayer1Hand(p1Hand);
    setPlayer1Discard([]);
    
    setPlayer2Deck(p2DeckShuffled.slice(5) as CardWithUid[]);
    setPlayer2Hand(p2Hand);
    setPlayer2Discard([]);
    
    setTimeout(() => {
      startTurn();
    }, 500);
  };
  
  const currentHand = getCurrentHand();
  const currentAp = getCurrentAp();
  const selectedCard = currentHand.find(c => c.uid === selectedCardUid);
  const canPlaySelected = selectedCard && currentAp >= selectedCard.cost;
  
  const opponentState = currentPlayer === 'PLAYER1' ? player2State : player1State;
  const opponentDeck = currentPlayer === 'PLAYER1' ? player2Deck : player1Deck;
  const opponentDiscard = currentPlayer === 'PLAYER1' ? player2Discard : player1Discard;
  
  return (
    <div className="min-h-screen bg-[#0a0a0f] relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-gradient-to-r from-purple-500/10 via-transparent to-transparent animate-pulse" />
      </div>
      
      <div className="fixed top-8 left-8 z-50">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push('/')}
          className="w-16 h-16 rounded-full bg-slate-900/80 hover:bg-slate-800/80 border-2 border-slate-700/50"
        >
          <DoorOpen className="w-8 h-8" />
        </Button>
      </div>
      
      <div className="fixed top-8 left-1/2 -translate-x-1/2 z-30">
        <div className="bg-slate-900/90 backdrop-blur-sm p-4 rounded-2xl border border-slate-700/50 shadow-xl">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center">
              <User className="w-6 h-6 text-slate-400" />
            </div>
            <div>
              <div className="font-bold text-lg text-slate-200">
                {currentPlayer === 'PLAYER1' ? '玩家2' : '玩家1'}
              </div>
            </div>
          </div>
          
          <div className="mb-2 w-48">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-red-500 font-bold">HP</span>
              <span className="text-slate-200 font-bold">
                {opponentState.hp}/{opponentState.maxHp}
              </span>
            </div>
            <div className="h-4 bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-red-500 to-red-400 transition-all"
                style={{ width: `${(opponentState.hp / opponentState.maxHp) * 100}%` }}
              />
            </div>
          </div>
          
          {opponentState.armor > 0 && (
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-500" />
              <span className="font-bold text-blue-500">{opponentState.armor} 护甲</span>
            </div>
          )}
        </div>
      </div>
      
      <div className="fixed top-8 right-8 z-30 space-y-4">
        <div className="bg-slate-900/90 backdrop-blur-sm p-4 rounded-xl border border-slate-700/50">
          <div className="text-slate-400 text-sm font-bold mb-1">对手牌库</div>
          <div className="text-2xl font-bold text-purple-500 font-['Rajdhani']">{opponentDeck.length}</div>
        </div>
        <div className="bg-slate-900/90 backdrop-blur-sm p-4 rounded-xl border border-slate-700/50">
          <div className="text-slate-400 text-sm font-bold mb-1">弃牌堆</div>
          <div className="text-2xl font-bold text-slate-500 font-['Rajdhani']">{opponentDiscard.length}</div>
        </div>
      </div>
      
      <AnimatePresence>
        {showHint && !gameOver && (
          <motion.div
            className="fixed top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-[60] pointer-events-none"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
          >
            <div className="bg-black/80 backdrop-blur-md px-8 py-4 rounded-xl border border-purple-500/40">
              <p className="text-xl font-bold text-purple-500 text-center">
                {currentPlayer === 'PLAYER1' ? '玩家1' : '玩家2'} 的回合
              </p>
              <p className="text-sm text-slate-400 text-center mt-1">
                选择卡牌进行出牌，或点击「结束回合」
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <AnimatePresence>
        {showEnergyWarning && !gameOver && (
          <motion.div
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[70]"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
          >
            <div className="bg-black/90 backdrop-blur-md px-8 py-5 rounded-xl border border-red-500/60">
              <p className="text-xl font-bold text-red-500 text-center">⚠️ 体力不足！</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <AnimatePresence>
        {showTimeoutWarning && !gameOver && (
          <motion.div
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[70]"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
          >
            <div className="bg-black/90 backdrop-blur-md px-8 py-5 rounded-xl border border-purple-500/60">
              <p className="text-xl font-bold text-purple-500 text-center">⏰ 时间到！</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <div className="fixed bottom-[200px] left-1/2 -translate-x-1/2 flex justify-center items-end h-64 z-40">
        <div className="relative flex items-end justify-center -space-x-6">
          {currentHand.map((card, index) => (
            <div
              key={card.uid}
              className="relative"
              style={{ 
                transform: `translateX(${(index - (currentHand.length - 1) / 2) * 30}px) rotate(${(index - (currentHand.length - 1) / 2) * 4}deg)`,
                transformOrigin: "bottom center"
              }}
            >
              <motion.div
                className={cn(
                  "w-36 h-48 rounded-xl border-2 cursor-pointer transition-all",
                  selectedCardUid === card.uid 
                    ? "border-purple-500 bg-slate-900/95 shadow-[0_0_30px_rgba(139,92,246,0.6)] -translate-y-4"
                    : "border-slate-600 bg-slate-900/80 hover:border-slate-400 hover:-translate-y-2",
                  card.type === 'attack' ? "border-red-500/50" : 
                  card.type === 'skill' ? "border-blue-500/50" : 
                  "border-yellow-500/50"
                )}
                onClick={() => {
                  if (isProcessing) return;
                  if (selectedCardUid === card.uid) {
                    setSelectedCardUid(null);
                  } else {
                    setSelectedCardUid(card.uid);
                  }
                }}
              >
                <div className="p-3 h-full flex flex-col">
                  <div className="flex justify-between items-start">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center text-xl font-black",
                      card.type === 'attack' ? "bg-red-500" : 
                      card.type === 'skill' ? "bg-blue-500" : 
                      "bg-yellow-500"
                    )}>
                      {card.cost}
                    </div>
                  </div>
                  
                  <div className="flex-1 flex flex-col justify-center mt-2">
                    <h3 className="text-lg font-black text-slate-100 font-['Rajdhani']">
                      {card.name}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      {card.type === 'attack' ? '单体' : card.type === 'skill' ? '自身' : '永久'}
                    </p>
                    <p className="text-sm text-slate-300 mt-2 leading-relaxed">
                      {card.effect}
                    </p>
                  </div>
                  
                  <div className="mt-2">
                    <span className={cn(
                      "px-3 py-1 rounded-full text-sm font-bold",
                      card.type === 'attack' ? "bg-red-500" : 
                      card.type === 'skill' ? "bg-blue-500" : 
                      "bg-yellow-500 text-slate-900"
                    )}>
                      {card.type === 'attack' ? '攻击' : card.type === 'skill' ? '技能' : '能力'}
                    </span>
                  </div>
                </div>
              </motion.div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="fixed bottom-8 left-0 right-0 z-50">
        <div className="max-w-md mx-auto mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 font-bold font-['Rajdhani']">回合时间</span>
            <span className={cn(
              "font-bold text-2xl font-['Rajdhani']",
              timeLeft <= 10 ? "text-red-500 animate-pulse" : "text-purple-500"
            )}>
              {timeLeft}秒
            </span>
          </div>
          <div className="h-4 bg-slate-800 rounded-full overflow-hidden">
            <div 
              className={cn(
                "h-full transition-all duration-1000",
                timeLeft <= 10 ? "bg-gradient-to-r from-red-500 to-red-400" : "bg-gradient-to-r from-purple-500 to-purple-400"
              )}
              style={{ width: `${(timeLeft / 30) * 100}%` }}
            />
          </div>
        </div>
        
        <div className="flex justify-between items-end px-8">
          <div className="flex-shrink-0">
            <div className="bg-slate-900/90 backdrop-blur-sm p-4 rounded-2xl border border-slate-700/50 shadow-xl">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-14 h-14 rounded-full bg-slate-700 flex items-center justify-center">
                  <User className="w-7 h-7 text-slate-400" />
                </div>
                <div>
                  <div className="font-bold text-xl text-slate-200">
                    {currentPlayer === 'PLAYER1' ? '玩家1' : '玩家2'}
                  </div>
                </div>
              </div>
              
              <div className="mb-2 w-48">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-red-500 font-bold">HP</span>
                  <span className="text-slate-200 font-bold">
                    {getCurrentState().hp}/{getCurrentState().maxHp}
                  </span>
                </div>
                <div className="h-4 bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-red-500 to-red-400 transition-all"
                    style={{ width: `${(getCurrentState().hp / getCurrentState().maxHp) * 100}%` }}
                  />
                </div>
              </div>
              
              <div className="w-48 mb-2">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-purple-500 font-bold flex items-center gap-1">
                    <Zap className="w-4 h-4" /> AP
                  </span>
                  <span className="text-slate-200 font-bold font-['Rajdhani']">
                    {currentAp}/3
                  </span>
                </div>
                <div className="h-4 bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-purple-500 to-purple-400 transition-all"
                    style={{ width: `${(currentAp / 3) * 100}%` }}
                  />
                </div>
              </div>
              
              {getCurrentState().armor > 0 && (
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-blue-500" />
                  <span className="font-bold text-blue-500">{getCurrentState().armor} 护甲</span>
                </div>
              )}
              
              {getCurrentActiveAbilities().length > 0 && (
                <div className="mt-3">
                  <div className="text-xs font-bold text-slate-400 mb-2">永久能力</div>
                  <div className="flex gap-1">
                    {getCurrentActiveAbilities().map((a, i) => (
                      <div key={i} className={cn(
                        "w-6 h-6 rounded-full border border-slate-600",
                        a.id === "FREQUENCY_ANCHOR" ? "bg-blue-500" :
                        a.id === "LOW_FREQUENCY_RESONANCE" ? "bg-purple-500" :
                        a.id === "PAIN_ECHO" ? "bg-red-500" :
                        "bg-yellow-500"
                      )} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex-1" />
          
          <div className="flex items-end gap-4">
            <div className="bg-slate-900/90 backdrop-blur-sm p-4 rounded-xl border border-slate-700/50">
              <div className="text-slate-400 text-sm font-bold mb-1">我的牌库</div>
              <div className="text-2xl font-bold text-purple-500 font-['Rajdhani']">{getCurrentDeck().length}</div>
            </div>
            
            <div className="bg-slate-900/90 backdrop-blur-sm p-4 rounded-xl border border-slate-700/50">
              <div className="text-slate-400 text-sm font-bold mb-1">弃牌堆</div>
              <div className="text-2xl font-bold text-slate-500 font-['Rajdhani']">{getCurrentDiscard().length}</div>
            </div>
            
            <div className="flex flex-col gap-3">
              <AnimatePresence>
                {selectedCardUid && !gameOver && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    onClick={handlePlayCard}
                    disabled={!canPlaySelected || isProcessing}
                    className="px-12 py-6 text-2xl font-extrabold bg-purple-600 hover:bg-purple-500 text-white rounded-xl shadow-lg transition-all disabled:opacity-50"
                  >
                    使用卡牌
                  </motion.button>
                )}
              </AnimatePresence>
              
              <button
                onClick={handleEndTurn}
                disabled={isProcessing || gameOver}
                className="px-10 py-4 text-xl font-extrabold bg-purple-500 hover:bg-purple-400 text-white rounded-xl shadow-lg transition-all disabled:opacity-50"
              >
                结束回合
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <AnimatePresence>
        {gameOver && (
          <motion.div
            className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <motion.div
              className="bg-black/95 backdrop-blur-xl p-12 rounded-2xl border-2 border-purple-500/50 text-center"
              initial={{ scale: 0.8, y: 50 }}
              animate={{ scale: 1, y: 0 }}
            >
              <Skull className="w-24 h-24 mx-auto mb-6 text-purple-500" />
              <h1 className="text-4xl font-bold font-['Rajdhani'] text-slate-200 mb-4">游戏结束</h1>
              <p className="text-2xl font-['Rajdhani'] text-purple-500 mb-8">{winner} 获胜！</p>
              <div className="flex gap-4 justify-center">
                <Button onClick={handleRestart} className="bg-purple-500 hover:bg-purple-400">
                  再来一局
                </Button>
                <Button onClick={() => router.push('/')} variant="secondary">
                  返回主页
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
