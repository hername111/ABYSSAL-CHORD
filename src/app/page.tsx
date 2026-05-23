"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Skull, Zap, Gamepad2, Waves, BookOpen } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function MainMenu() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center relative overflow-hidden">
      {/* 右上角幽灵图鉴按钮 */}
      <div className="absolute top-6 right-6 z-20">
        <Link href="/cards" className="group">
          <div className="flex items-center gap-2 opacity-50 hover:opacity-100 transition-opacity duration-300">
            <BookOpen className="h-5 w-5 text-slate-400 group-hover:text-sonic-purple transition-colors" />
            <span className="text-sm text-slate-400 group-hover:text-slate-200 transition-colors">
              游戏图鉴
            </span>
          </div>
        </Link>
      </div>

      {/* 背景声波动画 */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a0f] via-[#0f0f1a] to-[#0a0a0f]">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-sonic-purple/20"
              style={{
                width: `${300 + i * 200}px`,
                height: `${300 + i * 200}px`,
              }}
              animate={{
                scale: [1, 1.1, 1],
                opacity: [0.3, 0.1, 0.3],
              }}
              transition={{
                duration: 4 + i * 0.5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          ))}
        </div>
      </div>

      {/* 主标题 */}
      <motion.div
        className="relative z-10 text-center mb-16"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <div className="flex items-center justify-center gap-4 mb-4">
          <Waves className="h-12 w-12 text-sonic-purple animate-pulse" />
        </div>
        <h1 className="text-6xl md:text-7xl font-bold bg-gradient-to-r from-sonic-purple via-purify-green to-sonic-purple bg-clip-text text-transparent mb-2 tracking-wider">
          深渊协奏
        </h1>
        <h2 className="text-2xl md:text-3xl font-light text-slate-400 tracking-[0.3em]">
          ABYSSAL CHORD
        </h2>
      </motion.div>

      {/* 游戏模式按钮 */}
      <motion.div
        className="relative z-10 flex flex-col gap-6 w-full max-w-md px-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.3 }}
      >
        <Link href="/battle" className="w-full">
          <Button
            size="lg"
            className="w-full h-20 text-xl font-bold bg-gradient-to-r from-sonic-purple to-purify-green hover:from-sonic-purple/80 hover:to-purify-green/80 text-white border-2 border-sonic-purple/50 shadow-lg shadow-sonic-purple/30 transition-all duration-300"
          >
            <Gamepad2 className="mr-3 h-6 w-6" />
            单人突围
            <span className="ml-2 text-sm font-normal opacity-80">
              (Solo Mode)
            </span>
          </Button>
        </Link>

        <Button
          size="lg"
          disabled
          className="w-full h-20 text-xl font-bold bg-card-darker/50 text-slate-500 border-2 border-slate-700/50 cursor-not-allowed"
        >
          <Zap className="mr-3 h-6 w-6" />
          局域网联机
          <span className="ml-2 text-sm font-normal">
            (Co-op Mode · 暂未开放)
          </span>
        </Button>
      </motion.div>

      {/* 底部说明 */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 text-center text-slate-500 text-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.6 }}
      >
        <p className="flex items-center justify-center gap-2">
          <Skull className="h-4 w-4" />
          在旧日回音的频率中奏响最后一枚和弦
        </p>
      </motion.div>
    </div>
  );
}
