"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, BookOpen, ScrollText, Sparkles, ChevronRight } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, zhongLvCards } from "@/lib/cards";
import { cn } from "@/lib/utils";
import CardDetailModal from "./CardDetailModal";

interface CardWithCount {
  card: Card;
  count: number;
}

function aggregateCards(cards: Card[]): CardWithCount[] {
  const cardMap = new Map<string, CardWithCount>();

  cards.forEach((card) => {
    const key = card.name;
    if (cardMap.has(key)) {
      const existing = cardMap.get(key)!;
      cardMap.set(key, { ...existing, count: existing.count + 1 });
    } else {
      cardMap.set(key, { card, count: 1 });
    }
  });

  return Array.from(cardMap.values());
}

interface SideDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SideDrawer({ isOpen, onClose }: SideDrawerProps) {
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const getCardTypeLabel = (type: string) => {
    switch (type) {
      case "attack":
        return "攻击";
      case "skill":
        return "技能";
      case "power":
        return "能力";
      default:
        return type;
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
    <>
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            />
            {/* Drawer */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 h-full w-96 bg-card-darker/95 backdrop-blur-xl border-l border-slate-700/50 z-50 shadow-2xl"
            >
              <div className="flex flex-col h-full">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-700/50">
                  <div className="flex items-center gap-3">
                    <BookOpen className="w-6 h-6 text-sonic-purple" />
                    <h2 className="text-xl font-bold text-slate-100">战术手册</h2>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onClose}
                    className="text-slate-400 hover:text-slate-100"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>

                {/* Tabs Content */}
                <div className="flex-1 overflow-y-auto">
                  <Tabs defaultValue="rules" className="w-full">
                    <TabsList className="w-full grid grid-cols-3 p-2 bg-slate-800/50">
                      <TabsTrigger value="rules" className="flex items-center gap-2">
                        <ScrollText className="w-4 h-4" />
                        <span>规则</span>
                      </TabsTrigger>
                      <TabsTrigger value="cards" className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4" />
                        <span>卡牌</span>
                      </TabsTrigger>
                      <TabsTrigger value="pollution" className="flex items-center gap-2">
                        <ScrollText className="w-4 h-4" />
                        <span>污染</span>
                      </TabsTrigger>
                    </TabsList>

                    <div className="p-6">
                      <TabsContent value="rules" className="space-y-4">
                        <h3 className="text-lg font-bold text-slate-100 mb-4">
                          ⚔️ 回合流程
                        </h3>
                        <div className="space-y-3 text-sm text-slate-300">
                          <div className="p-3 bg-slate-800/50 rounded-lg">
                            <div className="font-bold text-sonic-purple mb-1">
                              ① 敌人意图
                            </div>
                            <p>显示敌人本回合的行动意图</p>
                          </div>
                          <div className="p-3 bg-slate-800/50 rounded-lg">
                            <div className="font-bold text-sonic-purple mb-1">
                              ② 抽牌
                            </div>
                            <p>抽5张牌。如果抽牌堆用完，将弃牌堆洗入抽牌堆</p>
                          </div>
                          <div className="p-3 bg-slate-800/50 rounded-lg">
                            <div className="font-bold text-sonic-purple mb-1">
                              ③ 玩家行动
                            </div>
                            <p>按顺序打出卡牌。手牌满时，新抽到的牌会被烧毁</p>
                          </div>
                          <div className="p-3 bg-slate-800/50 rounded-lg">
                            <div className="font-bold text-sonic-purple mb-1">
                              ④ 结束回合
                            </div>
                            <p>将手牌（除了保留牌）加入弃牌堆，污染刻度尺+5</p>
                          </div>
                          <div className="p-3 bg-slate-800/50 rounded-lg">
                            <div className="font-bold text-sonic-purple mb-1">
                              ⑤ 声爆结算
                            </div>
                            <p>敌人行动之前，声爆效果触发，每层造成2点伤害，然后清除</p>
                          </div>
                          <div className="p-3 bg-slate-800/50 rounded-lg">
                            <div className="font-bold text-sonic-purple mb-1">
                              ⑥ 敌人行动
                            </div>
                            <p>敌人按意图行动。先扣护甲，护甲用完才扣血</p>
                          </div>
                        </div>
                        <h3 className="text-lg font-bold text-slate-100 mt-6 mb-4">
                          🃏 卡牌属性词缀
                        </h3>
                        <div className="space-y-3 text-sm text-slate-300">
                          <div className="p-3 bg-slate-800/50 rounded-lg">
                            <div className="font-bold text-danger-red mb-1">
                              +N 污染点
                            </div>
                            <p>打出该卡牌时，全局污染度增加N点（对应污染刻度尺的百分比）。污染度越高，敌人攻击伤害加成越大</p>
                          </div>
                          <div className="p-3 bg-slate-800/50 rounded-lg">
                            <div className="font-bold text-purify-green mb-1">
                              -N 污染点
                            </div>
                            <p>打出该卡牌时，全局污染度降低N点。降低污染度可以削弱敌人的伤害加成</p>
                          </div>
                          <div className="p-3 bg-slate-800/50 rounded-lg">
                            <div className="font-bold text-sonic-purple mb-1">
                              +N 声爆
                            </div>
                            <p>给敌人施加N层声爆状态。敌人行动之前，声爆触发，每层造成2点伤害，然后清除声爆状态</p>
                          </div>
                          <div className="p-3 bg-slate-800/50 rounded-lg">
                            <div className="font-bold text-armor-blue mb-1">
                              +N 护甲
                            </div>
                            <p>获得N点护甲。护甲优先抵挡伤害，一直保留到被敌人攻击消耗掉</p>
                          </div>
                          <div className="p-3 bg-slate-800/50 rounded-lg">
                            <div className="font-bold text-gold mb-1">
                              保留（Retain）
                            </div>
                            <p>带有此词缀的卡牌，回合结束时不会被弃置，保留在手牌中，可以积攒后打出</p>
                          </div>
                          <div className="p-3 bg-slate-800/50 rounded-lg">
                            <div className="font-bold text-gold mb-1">
                              消耗（Exhaust）
                            </div>
                            <p>带有此词缀的卡牌，打出后移出本局战斗，不进入弃牌堆。通常效果较强</p>
                          </div>
                          <div className="p-3 bg-slate-800/50 rounded-lg">
                            <div className="font-bold text-danger-red mb-1">
                              自伤
                            </div>
                            <p>卡牌对玩家自身造成的伤害。触发"痛觉回响"等能力的机制</p>
                          </div>
                          <div className="p-3 bg-slate-800/50 rounded-lg">
                            <div className="font-bold text-sonic-purple mb-1">
                              历史记录追溯
                            </div>
                            <p>根据本回合已打出的牌数动态计算收益。例如"谐波叠加"，每打出一张牌额外获得护甲</p>
                          </div>
                          <div className="p-3 bg-slate-800/50 rounded-lg">
                            <div className="font-bold text-armor-blue mb-1">
                              护甲溢出检测
                            </div>
                            <p>获得护甲后立即检测总护甲值是否超过阈值，溢出部分转化为伤害。例如"共振壁垒"</p>
                          </div>
                          <div className="p-3 bg-slate-800/50 rounded-lg">
                            <div className="font-bold text-yellow-500 mb-1">
                              条件伤害翻倍
                            </div>
                            <p>满足特定条件时伤害翻倍。例如"反馈回路"，本回合已受到自伤则伤害翻倍</p>
                          </div>
                          <div className="p-3 bg-slate-800/50 rounded-lg">
                            <div className="font-bold text-gold mb-1">
                              免费再打一次
                            </div>
                            <p>打出后不消耗行动力，可以立即再打一张牌。例如"反馈回路"的额外效果</p>
                          </div>
                          <div className="p-3 bg-slate-800/50 rounded-lg">
                            <div className="font-bold text-orange-500 mb-1">
                              失去生命值获得增益
                            </div>
                            <p>主动失去部分生命值，换取强大的即时增益。例如"断弦极限"，失去10点生命获得行动力和伤害加成</p>
                          </div>
                          <div className="p-3 bg-slate-800/50 rounded-lg">
                            <div className="font-bold text-red-500 mb-1">
                              下一张攻击牌伤害加成
                            </div>
                            <p>将增益暂时存储，在下一张攻击牌打出时附加到伤害中，然后清零。例如"断弦极限"和"痛觉回响"</p>
                          </div>
                        </div>
                        <h3 className="text-lg font-bold text-slate-100 mt-6 mb-4">
                          🔑 关键机制
                        </h3>
                        <div className="space-y-3 text-sm text-slate-300">
                          <div className="p-3 bg-slate-800/50 rounded-lg">
                            <div className="font-bold text-armor-blue mb-1">
                              护甲
                            </div>
                            <p>优先抵挡伤害，一直保留到被敌人攻击消耗掉。回合结束时不会清空护甲</p>
                          </div>
                          <div className="p-3 bg-slate-800/50 rounded-lg">
                            <div className="font-bold text-sonic-purple mb-1">
                              抽牌洗牌
                            </div>
                            <p>抽牌堆用完时，将弃牌堆洗入抽牌堆，继续抽牌</p>
                          </div>
                          <div className="p-3 bg-slate-800/50 rounded-lg">
                            <div className="font-bold text-danger-red mb-1">
                              手牌烧毁
                            </div>
                            <p>手牌已满（5张）时，新抽到的牌会被直接烧毁移出</p>
                          </div>
                          <div className="p-3 bg-slate-800/50 rounded-lg">
                            <div className="font-bold text-yellow-500 mb-1">
                              能力牌永久激活
                            </div>
                            <p>能力牌打出后不进入弃牌堆，而是永久注册到能力列表中，在本局战斗中持续生效</p>
                          </div>
                          <div className="p-3 bg-slate-800/50 rounded-lg">
                            <div className="font-bold text-sonic-purple mb-1">
                              事件监听机制
                            </div>
                            <p>能力牌通过监听不同的战斗事件来触发效果：回合开始、获得护甲、受到自伤等</p>
                          </div>
                          <div className="p-3 bg-slate-800/50 rounded-lg">
                            <div className="font-bold text-gold mb-1">
                              本回合状态追踪
                            </div>
                            <p>系统追踪本回合已打出的牌数、已受到的自伤等临时状态，用于条件卡牌效果</p>
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="cards" className="space-y-4">
                        <h3 className="text-lg font-bold text-slate-100 mb-4">
                          📚 钟律卡牌库
                        </h3>
                        <div className="space-y-2">
                          {aggregateCards(zhongLvCards).map(({ card, count }, index) => (
                            <div
                              key={`${card.id}-${index}`}
                              onClick={() => setSelectedCard(card)}
                              className="p-4 bg-slate-800/50 rounded-lg border border-slate-700/50 cursor-pointer hover:bg-purple-900/30 transition-colors relative"
                            >
                              {/* 数量角标 */}
                              {count > 1 && (
                                <span className="absolute -top-2 -right-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-sonic-purple px-2 text-xs font-bold text-white shadow-lg shadow-purple-500/30 z-10">
                                  x{count}
                                </span>
                              )}
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-3 flex-1">
                                  <span
                                    className={cn(
                                      "w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0",
                                      card.type === "attack"
                                        ? "bg-danger-red/20 text-danger-red"
                                        : card.type === "skill"
                                        ? "bg-armor-blue/20 text-armor-blue"
                                        : "bg-gold/20 text-gold"
                                    )}
                                  >
                                    {card.cost}
                                  </span>
                                  <h4 className="font-bold text-slate-100">
                                    {card.name}
                                  </h4>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  <span className="text-xs px-2 py-1 rounded bg-slate-700/50 text-slate-300">
                                    {getCardTypeLabel(card.type)}
                                  </span>
                                  <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
                                </div>
                              </div>
                              <div className="text-sm text-slate-400 mb-1">
                                目标：{getCardTargetLabel(card.target)}
                              </div>
                              <p className="text-sm text-slate-300">{card.effect}</p>
                            </div>
                          ))}
                        </div>
                      </TabsContent>

                      <TabsContent value="pollution" className="space-y-4">
                        <h3 className="text-lg font-bold text-slate-100 mb-4">
                          📊 污染刻度尺
                        </h3>
                        <div className="space-y-3 text-sm text-slate-300">
                          <div className="p-4 bg-purify-green/10 rounded-lg border border-purify-green/30">
                            <div className="font-bold text-purify-green mb-1">
                              0-15 — 寂静期
                            </div>
                            <p className="text-slate-300">
                              无额外效果。一切如常。
                            </p>
                          </div>
                          <div className="p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/30">
                            <div className="font-bold text-yellow-500 mb-1">
                              16-40 — 低鸣期
                            </div>
                            <p className="text-slate-300">
                              所有畸变体攻击伤害 +2。
                            </p>
                          </div>
                          <div className="p-4 bg-orange-500/10 rounded-lg border border-orange-500/30">
                            <div className="font-bold text-orange-500 mb-1">
                              41-70 — 共振期
                            </div>
                            <p className="text-slate-300">
                              所有畸变体攻击伤害 +4；每回合获得 3 点护甲。
                            </p>
                          </div>
                          <div className="p-4 bg-danger-red/10 rounded-lg border border-danger-red/30">
                            <div className="font-bold text-danger-red mb-1">
                              71-90 — 咆哮期
                            </div>
                            <p className="text-slate-300">
                              所有畸变体攻击伤害 +6；每回合获得 5 点护甲；玩家每回合开始受到 3 点穿透伤害。
                            </p>
                          </div>
                          <div className="p-4 bg-sonic-purple/10 rounded-lg border border-sonic-purple/30">
                            <div className="font-bold text-sonic-purple mb-1">
                              91-100 — 终焉和弦
                            </div>
                            <p className="text-slate-300">
                              所有畸变体攻击伤害 +10；玩家每回合开始受到 5 点穿透伤害。
                            </p>
                          </div>
                        </div>
                      </TabsContent>
                    </div>
                  </Tabs>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <CardDetailModal
        card={selectedCard}
        onClose={() => setSelectedCard(null)}
      />
    </>
  );
}
