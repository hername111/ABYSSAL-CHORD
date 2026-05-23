"use client";

import { Inter } from "next/font/google";
import { useState } from "react";
import { BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import SideDrawer from "@/components/SideDrawer";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  return (
    <html lang="zh-CN" className="dark">
      <body className={`${inter.className} antialiased`}>
        {/* 右上角战术手册按钮 - 全局固定 */}
        <div className="fixed top-6 right-6 z-30">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsDrawerOpen(true)}
            className="text-slate-400 hover:text-slate-100 hover:bg-slate-800/50 transition-all duration-300 group"
          >
            <BookOpen className="w-6 h-6 group-hover:scale-110 transition-transform" />
          </Button>
        </div>

        {/* 全局侧边抽屉 */}
        <SideDrawer
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
        />

        {/* 页面内容 */}
        {children}
      </body>
    </html>
  );
}
