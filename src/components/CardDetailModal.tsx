"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
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

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/70 backdrop-blur-md"
        />

        {/* Modal Content */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative max-w-2xl w-full"
        >
          <div className="bg-card-darker border border-sonic-purple/30 rounded-xl p-8 shadow-2xl">
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-sonic-purple/20 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Card Preview Header */}
            <div className="flex items-start gap-6 mb-8">
              {/* Card Placeholder */}
              <div className={cn(
                "w-48 h-72 rounded-lg border-2 flex flex-col overflow-hidden",
                getCardTypeColor(card.type)
              )}>
                {/* Cost */}
                <div className="bg-sonic-purple/30 p-2">
                  <div className="w-10 h-10 rounded-full bg-sonic-purple flex items-center justify-center text-xl font-black">
                    {card.cost}
                  </div>
                </div>
                {/* Name */}
                <div className="flex-1 flex items-center justify-center p-4 text-center">
                  <span className="text-xl font-bold">{card.name}</span>
                </div>
                {/* Type */}
                <div className="bg-sonic-purple/20 p-2 text-center text-sm">
                  {card.type}
                </div>
              </div>

              {/* Basic Info */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-3xl font-black text-sonic-purple">{card.name}</h2>
                  <span className={cn(
                    "px-3 py-1 rounded-full text-sm font-bold border",
                    getCardTypeColor(card.type)
                  )}>
                    {card.type}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm text-slate-400 mb-4">
                  <span>消耗：<span className="text-sonic-purple font-bold">{card.cost}</span></span>
                  <span>目标：<span className="text-sonic-purple font-bold">{getCardTargetLabel(card.target)}</span></span>
                </div>
                <p className="text-slate-300 text-lg leading-relaxed">{card.effect}</p>
              </div>
            </div>

            {/* Details Section */}
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              {/* Numerical Values */}
              <div className="bg-sonic-purple/10 rounded-lg p-4">
                <h3 className="text-lg font-bold text-sonic-purple mb-3">数值面板</h3>
                <div className="space-y-2 text-sm">
                  {card.baseDamage && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">基础伤害</span>
                      <span className="text-danger-red font-bold">{card.baseDamage}</span>
                    </div>
                  )}
                  {card.baseArmor && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">基础护甲</span>
                      <span className="text-armor-blue font-bold">{card.baseArmor}</span>
                    </div>
                  )}
                  {card.purification && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">净化值</span>
                      <span className="text-purify-green font-bold">{card.purification}</span>
                    </div>
                  )}
                  {card.sonicBoom && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">声爆层数</span>
                      <span className="text-sonic-purple font-bold">{card.sonicBoom}</span>
                    </div>
                  )}
                  {card.selfDamage && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">自伤值</span>
                      <span className="text-danger-red font-bold">{card.selfDamage}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Design Note */}
              <div className="bg-card-darker/50 rounded-lg p-4 border border-sonic-purple/20">
                <h3 className="text-lg font-bold text-gold mb-3">设计思路</h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  {card.designNote || "该卡牌为钟律的核心构筑牌，遵循1AP=5伤害/护甲的数值平衡基准。"}
                </p>
              </div>
            </div>

            {/* Upgrade Path Placeholder */}
            <div className="bg-sonic-purple/5 rounded-lg p-4 border border-sonic-purple/20">
              <h3 className="text-lg font-bold text-sonic-purple mb-3">升级路径</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-card-darker/50 rounded p-3">
                  <div className="text-sm text-slate-400 mb-1">升级 A：+2 伤害</div>
                  <div className="text-xs text-slate-500">基础伤害 +2</div>
                </div>
                <div className="bg-card-darker/50 rounded p-3">
                  <div className="text-sm text-slate-400 mb-1">升级 B：+1 护甲</div>
                  <div className="text-xs text-slate-500">额外 +2 护甲</div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
