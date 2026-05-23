"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Sword, Shield } from "lucide-react";
import { Card } from "@/lib/cards";
import { cn } from "@/lib/utils";

interface CardDetailModalProps {
  card: Card | null;
  onClose: () => void;
}

export default function CardDetailModal({ card, onClose }: CardDetailModalProps) {
  if (!card) return null;

  const getCardTypeColor = (type: string) => {
    switch (type) {
      case "attack":
        return "text-danger-red border-danger-red bg-danger-red/10";
      case "skill":
        return "text-armor-blue border-armor-blue bg-armor-blue/10";
      case "ability":
        return "text-gold border-gold bg-gold/10";
      default:
        return "text-slate-300 border-slate-600 bg-slate-800/50";
    }
  };

  const getCardTargetLabel = (target: string) => {
    switch (target) {
      case "single":
        return "单体";
      case "aoe":
        return "群体";
      case "self":
        return "自身";
      default:
        return target;
    }
  };

  const isAttack = card.type === "attack";

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-md"
        />

        {/* Modal Content - Compact Size */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative max-w-3xl w-full"
        >
          <div className="bg-card-darker border border-sonic-purple/30 rounded-xl overflow-hidden shadow-2xl">
            {/* Close Button - Large Touch Area */}
            <button
              onClick={onClose}
              className="absolute top-3 right-3 p-2 rounded-full hover:bg-sonic-purple/20 transition-all duration-300 z-10 flex items-center justify-center"
              aria-label="关闭详情"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Main Grid - Two-Column Layout */}
            <div className="grid grid-cols-5 gap-4 p-4">
              {/* Left Column - Information (3 columns) */}
              <div className="col-span-3 space-y-3">
                {/* Header - Compact */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-black text-sonic-purple">{card.name}</h2>
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-xs font-bold border",
                      getCardTypeColor(card.type)
                    )}>
                      {card.type}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <span>消耗：</span>
                      <span className="text-sonic-purple font-black text-base">{card.cost}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <span>目标：</span>
                      <span className="text-sonic-purple font-black">{getCardTargetLabel(card.target)}</span>
                    </span>
                  </div>
                </div>

                {/* Story Background - Compact */}
                <div>
                  <h3 className="text-xs font-bold text-gold mb-1.5">卡牌故事</h3>
                  <div className="bg-slate-800/50 rounded-lg p-2.5">
                    <p className="text-slate-300 text-xs leading-relaxed italic">
                      "{card.effect}"
                    </p>
                  </div>
                </div>

                {/* Numerical Stats + Design Philosophy Grid */}
                <div className="grid grid-cols-2 gap-2.5">
                  {/* Numerical Stats - Left */}
                  <div>
                    <h3 className="text-xs font-bold text-sonic-purple mb-1.5">数值</h3>
                    <div className="space-y-1.5">
                      {card.baseDamage && (
                        <div className="bg-slate-800/50 rounded-lg p-2">
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400 text-xs">基础伤害</span>
                            <span className="text-danger-red font-black text-sm">{card.baseDamage}</span>
                          </div>
                        </div>
                      )}
                      {card.baseArmor && (
                        <div className="bg-slate-800/50 rounded-lg p-2">
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400 text-xs">基础护甲</span>
                            <span className="text-armor-blue font-black text-sm">{card.baseArmor}</span>
                          </div>
                        </div>
                      )}
                      {card.purification && (
                        <div className="bg-slate-800/50 rounded-lg p-2">
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400 text-xs">净化值</span>
                            <span className="text-purify-green font-black text-sm">{card.purification}</span>
                          </div>
                        </div>
                      )}
                      {card.sonicBoom && (
                        <div className="bg-slate-800/50 rounded-lg p-2">
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400 text-xs">声爆层数</span>
                            <span className="text-sonic-purple font-black text-sm">{card.sonicBoom}</span>
                          </div>
                        </div>
                      )}
                      {card.selfDamage && (
                        <div className="bg-slate-800/50 rounded-lg p-2">
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400 text-xs">自伤值</span>
                            <span className="text-danger-red font-black text-sm">{card.selfDamage}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Design Philosophy - Right */}
                  <div>
                    <h3 className="text-xs font-bold text-gold mb-1.5">设计思路</h3>
                    <div className="bg-slate-800/50 rounded-lg p-2.5 h-full">
                      <p className="text-slate-400 text-xs leading-relaxed">
                        {card.designNote || "该卡牌为钟律的核心构筑牌，严格遵循1AP=5伤害/护甲的数值平衡基准。"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Upgrade Paths - Compact */}
                <div>
                  <h3 className="text-xs font-bold text-sonic-purple mb-1.5">升级路径</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-slate-800/50 rounded-lg p-2">
                      <div className="font-bold text-slate-100 text-xs mb-0.5">升级 A</div>
                      <div className="text-xs text-slate-400">基础伤害 +2</div>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-2">
                      <div className="font-bold text-slate-100 text-xs mb-0.5">升级 B</div>
                      <div className="text-xs text-slate-400">额外 +2 护甲</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column - Visual Preview (2 columns) */}
              <div className="col-span-2">
                {/* Visual Preview Box - Compact with Fixed Aspect Ratio */}
                <div className="relative">
                  {/* Title Inset - Absolute Positioned */}
                  <div className="absolute top-2 left-2 z-10">
                    <h3 className="text-xs font-bold text-sonic-purple bg-black/60 px-2 py-1 rounded backdrop-blur-sm">
                      全息技能预览
                    </h3>
                  </div>
                  
                  {/* Preview Area - Holographic Display with Fixed Height */}
                  <motion.div
                    animate={{ opacity: [0.3, 0.6, 0.3] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    className="relative bg-gradient-to-br from-sonic-purple/15 via-black to-sonic-purple/20 rounded-lg border-2 border-sonic-purple/40 shadow-[inset_0_6px_30px_rgba(0,0,0,0.8),0_0_20px_rgba(139,92,246,0.12)] aspect-square flex items-center justify-center"
                  >
                    {/* Scanning Line Effect */}
                    <motion.div
                      className="absolute inset-0 pointer-events-none"
                      animate={{
                        background: [
                          "linear-gradient(transparent 0%, transparent 49%, rgba(139,92,246,0.1) 50%, transparent 51%, transparent 100%)",
                        ],
                        y: ["0%", "100%"],
                      }}
                      transition={{
                        duration: 2.5,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                      style={{ backgroundSize: "100% 6px" }}
                    />
                    
                    {isAttack ? (
                      <AttackAnimation />
                    ) : (
                      <DefenseAnimation />
                    )}
                  </motion.div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

// Attack Animation Component - Infinite Repeat
function AttackAnimation() {
  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {/* Red Pulse Background - Infinite */}
      <motion.div
        animate={{
          scale: [0.8, 1.3, 0.8],
          opacity: [0, 0.4, 0],
        }}
        transition={{
          duration: 0.6,
          repeat: Infinity,
          repeatDelay: 3,
          ease: "easeInOut",
        }}
        className="absolute inset-0 bg-danger-red/30 rounded-full blur-3xl"
      />
      
      {/* Sword Icon - Move Right & Shake - Infinite */}
      <motion.div
        animate={{
          x: [-30, 0, 20, 15, 25, -30],
          opacity: [0, 1, 1, 1, 1, 0],
          rotate: [-10, 0, 35, 25, 40, -10],
        }}
        transition={{
          duration: 2.4,
          times: [0, 0.1, 0.2, 0.25, 0.3, 1],
          repeat: Infinity,
          repeatDelay: 1.2,
          ease: "easeInOut",
        }}
        className="relative z-20 flex items-center justify-center"
      >
        <Sword className="w-12 h-12 text-danger-red drop-shadow-[0_0_12px_rgba(239,68,68,0.7)]" />
      </motion.div>
    </div>
  );
}

// Defense Animation Component - Infinite Repeat
function DefenseAnimation() {
  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {/* Circular Ripples - Continuous */}
      <div className="absolute inset-0 flex items-center justify-center">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            initial={{ scale: 0.5, opacity: 0.6 }}
            animate={{
              scale: 0.5 + i * 0.35,
              opacity: 0,
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              delay: i * 0.4,
              ease: "easeOut",
            }}
            className="absolute border-2 border-armor-blue/60 rounded-full"
            style={{
              width: `${80 + i * 50}px`,
              height: `${80 + i * 50}px`,
            }}
          />
        ))}
      </div>
      
      {/* Shield Icon - Expand from Center - Infinite */}
      <motion.div
        animate={{
          scale: [0.3, 1.1, 0.95, 0.3],
          opacity: [0, 1, 1, 0],
        }}
        transition={{
          duration: 2.4,
          times: [0, 0.25, 0.5, 1],
          repeat: Infinity,
          repeatDelay: 1.2,
          ease: "easeInOut",
        }}
        className="relative z-20 flex items-center justify-center"
      >
        <Shield className="w-14 h-14 text-armor-blue drop-shadow-[0_0_15px_rgba(59,130,246,0.6)]" />
      </motion.div>
    </div>
  );
}
