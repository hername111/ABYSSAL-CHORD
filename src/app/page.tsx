"use client";

import { motion } from "framer-motion";
import { Play, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useBGM } from "@/hooks/useBGM";

export default function MainMenu() {
  // 播放首页背景音乐
  useBGM("/sounds/bgm_menu.mp3");

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden">
      {/* 背景声波脉冲动画 */}
      <div className="absolute inset-0 bg-gradient-to-b from-abyss via-abyss to-card-darker">
        <div className="absolute inset-0 opacity-30">
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-sonic-purple/30"
              initial={{ width: 0, height: 0, opacity: 0 }}
              animate={{
                width: [0, 400 + i * 200],
                height: [0, 400 + i * 200],
                opacity: [0, 0.3, 0],
              }}
              transition={{
                duration: 6,
                repeat: Infinity,
                delay: i * 1.2,
                ease: "easeOut",
              }}
            />
          ))}
        </div>
      </div>

      {/* 主内容 */}
      <div className="relative z-10 flex flex-col items-center space-y-12">
        {/* 游戏标题 */}
        <motion.div
          initial={{ opacity: 0, y: -40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="text-center"
        >
          <h1 className="text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-sonic-purple via-purify-green to-sonic-purple mb-4 drop-shadow-[0_0_30px_rgba(139,92,246,0.5)]">
            深渊协奏
          </h1>
          <p className="text-2xl text-slate-400 tracking-widest font-medium">
            ABYSSAL CHORD
          </p>
        </motion.div>

        {/* 副标题 */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.5 }}
          className="text-lg text-slate-500 max-w-lg text-center"
        >
          当旧日频率撕裂大地，唯有共振者能在混沌中奏响秩序
        </motion.p>

        {/* 主按钮区域 */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.8 }}
          className="flex flex-col items-center gap-6"
        >
          {/* 单人突围按钮 */}
          <Link href="/battle">
            <Button
              className="group relative px-12 py-8 bg-gradient-to-r from-sonic-purple to-sonic-purple/70 hover:from-sonic-purple/90 hover:to-sonic-purple/60 text-white text-xl font-bold rounded-xl shadow-[0_0_40px_rgba(139,92,246,0.4)] transition-all duration-300 hover:shadow-[0_0_60px_rgba(139,92,246,0.6)] hover:scale-105"
            >
              <Play className="w-8 h-8 mr-3 group-hover:scale-110 transition-transform" />
              单人突围
              <div className="absolute inset-0 rounded-xl ring-2 ring-sonic-purple/50 group-hover:ring-sonic-purple/80 transition-all" />
            </Button>
          </Link>

          {/* 局域网联机按钮 */}
          <Link href="/lobby">
            <Button
              className="group relative px-10 py-6 bg-slate-800/50 text-slate-300 text-lg font-medium rounded-xl border border-slate-700/50 hover:bg-slate-700/50 hover:text-white hover:border-slate-600/50 transition-all"
            >
              <Users className="w-6 h-6 mr-3 group-hover:scale-110 transition-transform" />
              局域网联机
              <div className="absolute inset-0 rounded-xl ring-1 ring-slate-700/30 group-hover:ring-slate-600/50 transition-all" />
            </Button>
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
