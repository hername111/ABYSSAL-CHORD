import { NextRequest } from "next/server";

// arkclaw服务器配置
const ARKCLAW_SERVER_URL = process.env.ARKCLAW_SERVER_URL || "http://66.32.30.22:3000";
const ARKCLAW_SKILL_PATH = "/api/referee/chat";

// 判断是否使用arkclaw
const USE_ARKCLAW = process.env.USE_ARKCLAW === "true" || !!process.env.ARKCLAW_SERVER_URL;

export async function POST(request: NextRequest) {
  try {
    const { messages: chatMessages, gameContext } = await request.json();
    
    // 如果配置了arkclaw，使用arkclaw
    if (USE_ARKCLAW) {
      return proxyToArkclaw(chatMessages, gameContext, request);
    }
    
    // 否则使用原有的直接调用doubao的方式（保持向后兼容）
    return callDirectLLM(chatMessages, request);
    
  } catch (error) {
    console.error('[Agent API] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

/**
 * 代理请求到arkclaw服务器
 */
async function proxyToArkclaw(
  messages: any[],
  gameContext: any,
  request: NextRequest
) {
  const arkclawUrl = `${ARKCLAW_SERVER_URL}${ARKCLAW_SKILL_PATH}`;
  
  console.log(`[Agent API] Proxying to arkclaw: ${arkclawUrl}`);
  
  // 转发请求头
  const headers = new Headers();
  request.headers.forEach((value, key) => {
    // 跳过一些不需要转发的头
    if (!['host', 'content-length'].includes(key.toLowerCase())) {
      headers.set(key, value);
    }
  });
  headers.set('Content-Type', 'application/json');
  
  const response = await fetch(arkclawUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      messages,
      gameContext
    }),
  });
  
  if (!response.ok) {
    console.error(`[Agent API] Arkclaw returned error: ${response.status}`);
    throw new Error(`Arkclaw error: ${response.status}`);
  }
  
  // 直接转发arkclaw的流式响应
  return new Response(response.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}

/**
 * 直接调用LLM（原有的方式，保持向后兼容）
 */
async function callDirectLLM(chatMessages: any[], request: NextRequest) {
  const { LLMClient, Config, HeaderUtils } = await import("coze-coding-dev-sdk");
  
  const SYSTEM_PROMPT = `你是《深渊协奏》(Abyssal Chord) 桌游的AI裁判助手。你精通这款1-4人合作型DBG桌游的全部规则，负责为玩家提供权威的规则裁决和游戏辅助。

## 你的核心职责
1. **规则裁决**：当玩家对规则产生争议时，给出明确的判定和规则引用
2. **伤害计算辅助**：帮助玩家计算复杂的Buff叠加伤害
3. **术语解释**：解释游戏中的术语差异（如"受到伤害"vs"失去生命"vs"穿透伤害"）
4. **策略建议**：为玩家提供角色流派搭配和战斗策略建议

## 关键规则知识库

### 术语体系（极其重要）
- **受到伤害**：有来源的伤害事件，触发所有"受到伤害时"触发器，可以被护甲抵扣
- **穿透伤害**：有来源但跳过护甲的伤害事件，仍触发"受到伤害时"触发器
- **失去生命**：无来源的生命值直接调整，不视为伤害事件，不触发任何"受到伤害时"触发器，不被护甲抵扣

### 数值基准线
- 1点行动力(Cost) = 5点物理伤害 或 5点护甲
- 超模效果必须带有惩罚机制

### 污染刻度尺等级
- 0-15 寂静期：无额外效果
- 16-40 低鸣期：畸变体攻击伤害+2
- 41-70 共振期：畸变体攻击伤害+4，每回合获得3点护甲
- 71-90 咆哮期：畸变体攻击伤害+6，每回合获得5点护甲，玩家每回合开始受3点穿透伤害
- 91-100 终焉和弦：畸变体攻击伤害+10，每回合获得5点护甲，玩家每回合开始受5点穿透伤害

### 回合SOP
1. 回合开始阶段：触发Buff、声爆结算、抽牌
2. 掷骰决定怪物意图
3. 玩家行动阶段（打出卡牌/调谐/使用遗物）
4. 怪物行动结算阶段
5. 弃牌重置阶段

### 经典争议裁决
- "反击护盾"vs"穿透攻击"：穿透伤害直接扣血，不受护甲影响；普通伤害的护甲抵扣效率受结算顺序影响（从左到右）
- "痛觉回响"vs"断弦极限"：断弦极限的"失去10点生命"不触发痛觉回响——"失去生命"不等于"受到伤害"

## 回答风格
- 以末日废土的沉浸感语气回答
- 引用具体规则条文
- 必要时分步骤展示计算过程
- 用中文回答`;

  const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);

  const config = new Config();
  const client = new LLMClient(config, customHeaders);

  const allMessages = [
    { role: "system" as const, content: SYSTEM_PROMPT },
    ...chatMessages,
  ];

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const llmStream = client.stream(allMessages, {
          model: "doubao-seed-2-0-lite-260215",
          temperature: 0.7,
        });

        for await (const chunk of llmStream) {
          if (chunk.content) {
            const text = chunk.content.toString();
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ content: text })}\n\n`)
            );
          }
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : "Unknown error";
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: errMsg })}\n\n`)
        );
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
