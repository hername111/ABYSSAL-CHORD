# 项目上下文 — 深渊协奏 (Abyssal Chord)

### 版本技术栈

- **Framework**: Next.js 16 (App Router)
- **Core**: React 19
- **Language**: TypeScript 5
- **UI 组件**: shadcn/ui (基于 Radix UI)
- **Styling**: Tailwind CSS 4
- **Animation**: Framer Motion
- **AI**: coze-coding-dev-sdk (LLM 流式输出)

## 目录结构

```
├── public/                 # 静态资源
├── scripts/                # 构建与启动脚本
├── src/
│   ├── app/
│   │   ├── layout.tsx      # 根布局（暗色主题+导航栏）
│   │   ├── globals.css     # 全局样式（深渊主题+自定义动画）
│   │   ├── page.tsx        # 首页（Hero+功能入口）
│   │   ├── cards/page.tsx  # 卡牌浏览器
│   │   ├── characters/page.tsx  # 角色档案
│   │   ├── enemies/page.tsx     # 畸变体图鉴+掷骰模拟
│   │   ├── game/page.tsx   # 游戏主控台（核心页面）
│   │   ├── calculator/page.tsx  # 伤害计算器
│   │   ├── agent/page.tsx  # AI裁判聊天界面
│   │   └── api/agent/route.ts   # LLM流式API（SSE）
│   ├── components/
│   │   ├── ui/             # shadcn/ui 组件库
│   │   └── navbar.tsx      # 全局导航栏
│   ├── lib/
│   │   ├── utils.ts        # cn 工具函数
│   │   ├── cards.ts        # 卡牌数据模型（钟律20张）
│   │   └── game-data.ts    # 怪物/角色/污染度数据
│   └── server.ts
├── DESIGN.md               # 视觉设计规范
├── AGENTS.md               # 本文件
├── next.config.ts
├── package.json
└── tsconfig.json
```

## 页面路由

| 路径 | 功能 | 说明 |
|------|------|------|
| `/` | 首页 | 沉浸式产品介绍+功能入口 |
| `/characters` | 调音师 | 钟律&弦音角色档案与流派 |
| `/cards` | 卡牌库 | 钟律20张卡牌筛选/详情/设计思路 |
| `/enemies` | 畸变体图鉴 | 行为骰矩阵+掷骰模拟+Boss二阶段 |
| `/game` | 游戏台 | 污染刻度尺+回合SOP+玩家状态+怪物掷骰 |
| `/calculator` | 计算器 | 伤害/护甲/声爆/自伤精确计算 |
| `/agent` | AI裁判 | LLM流式聊天，规则裁决与策略建议 |

## API接口

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/agent` | POST | AI裁判对话（SSE流式输出），body: `{messages: [{role, content}]}` |

## 包管理规范

**仅允许使用 pnpm** 作为包管理器，**严禁使用 npm 或 yarn**。

## 开发规范

### 编码规范
- TypeScript strict 模式
- 禁止隐式 any
- 所有函数参数必须标注类型
- 使用 'use client' 标注客户端组件

### 暗色主题
- 项目强制暗色深渊主题，html 标签带 `dark` class
- CSS 变量在 globals.css 的 `:root` 中定义（已覆盖为深渊色调）
- 自定义颜色：abyss(#0a0a0f), sonic-purple(#8b5cf6), armor-blue(#3b82f6), danger-red(#ef4444), purify-green(#22c55e), gold(#eab308)

### Hydration 问题防范
- 严禁 JSX 中直接使用 Date.now()/Math.random()/typeof window
- 使用 'use client' + useEffect + useState 处理客户端状态

### next.config 配置规范
- 路径不要写死绝对路径，使用动态拼接
