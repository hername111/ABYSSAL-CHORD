import type { Metadata } from 'next';
import { Inspector } from 'react-dev-inspector';
import './globals.css';
import { Navbar } from '@/components/navbar';

export const metadata: Metadata = {
  title: {
    default: '深渊协奏 | Abyssal Chord',
    template: '%s | 深渊协奏',
  },
  description:
    '深渊协奏 — 1-4人合作型DBG实体桌游数字辅助系统。卡牌查询、伤害计算、怪物行为模拟、AI裁判裁决，一应俱全。',
  keywords: [
    '深渊协奏',
    'Abyssal Chord',
    'DBG',
    '桌游',
    '卡牌构筑',
    '合作游戏',
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isDev = process.env.COZE_PROJECT_ENV === 'DEV';

  return (
    <html lang="zh-CN" className="dark">
      <body className="antialiased sonic-bg min-h-screen">
        {isDev && <Inspector />}
        <Navbar />
        <main className="pt-14">{children}</main>
      </body>
    </html>
  );
}
