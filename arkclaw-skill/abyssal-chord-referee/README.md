# 深渊协奏AI裁判 Skill for arkclaw

## 概述

这是一个为arkclaw agent设计的Skill，用于处理《深渊协奏》桌游中的AI裁判任务。

## 功能

- **规则裁决**：解决游戏中的规则争议
- **伤害计算**：帮助计算复杂的Buff叠加伤害
- **术语解释**：解释游戏中的术语差异
- **策略建议**：提供角色流派搭配和战斗策略建议

## 安装

1. 将此文件夹复制到arkclaw的skills目录
2. 确保安装了依赖：`coze-coding-dev-sdk`

## API使用

### 端点

`POST /api/skills/abyssal-chord-referee`

### 请求体

```json
{
  "messages": [
    { "role": "user", "content": "痛觉回响和断弦极限怎么互动？" }
  ],
  "gameContext": {
    "playerHp": 60,
    "playerMaxHp": 80,
    "playerArmor": 5,
    "enemyHp": 30,
    "enemyMaxHp": 50,
    "contamination": 15,
    "activeAbilities": ["痛觉回响"]
  }
}
```

### 响应

SSE流式响应，格式：

```
data: {"content":"根据规则..."}

data: [DONE]
```

## 文件结构

```
abyssal-chord-referee/
├── skill.ts          # Skill入口
├── types.ts          # 类型定义
├── system-prompt.ts  # AI裁判系统提示词
└── README.md         # 使用说明
```

## 技术栈

- TypeScript
- coze-coding-dev-sdk
- SSE流式响应
