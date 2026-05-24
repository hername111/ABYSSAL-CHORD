// 深渊协奏AI裁判 Skill for arkclaw
// 处理游戏中AI裁判的任务

import { LLMClient, Config, HeaderUtils } from "coze-coding-dev-sdk";
import { REFEREE_SYSTEM_PROMPT } from "./system-prompt";
import type { SkillRequest, Message } from "./types";

/**
 * 深渊协奏AI裁判 Skill
 * 处理规则裁决、伤害计算、策略建议等任务
 */
export async function handler(request: Request) {
  try {
    const body: SkillRequest = await request.json();
    const { messages, gameContext } = body;

    // 构建带游戏上下文的提示词
    let enhancedSystemPrompt = REFEREE_SYSTEM_PROMPT;
    
    if (gameContext) {
      enhancedSystemPrompt += `\n\n## 当前游戏上下文\n`;
      
      if (gameContext.playerHp !== undefined) {
        enhancedSystemPrompt += `- 玩家HP: ${gameContext.playerHp}/${gameContext.playerMaxHp || 80}\n`;
      }
      if (gameContext.playerArmor !== undefined) {
        enhancedSystemPrompt += `- 玩家护甲: ${gameContext.playerArmor}\n`;
      }
      if (gameContext.enemyHp !== undefined) {
        enhancedSystemPrompt += `- 敌人HP: ${gameContext.enemyHp}/${gameContext.enemyMaxHp || 50}\n`;
      }
      if (gameContext.contamination !== undefined) {
        enhancedSystemPrompt += `- 污染度: ${gameContext.contamination}/100\n`;
      }
      if (gameContext.activeAbilities && gameContext.activeAbilities.length > 0) {
        enhancedSystemPrompt += `- 场上能力: ${gameContext.activeAbilities.join(', ')}\n`;
      }
      if (gameContext.currentPhase) {
        enhancedSystemPrompt += `- 当前阶段: ${gameContext.currentPhase}\n`;
      }
      
      enhancedSystemPrompt += `\n请基于当前游戏状态给出更有针对性的回答。`;
    }

    // 构建完整消息列表
    const allMessages: Message[] = [
      { role: 'system', content: enhancedSystemPrompt },
      ...messages
    ];

    // 初始化LLM客户端
    const config = new Config();
    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const client = new LLMClient(config, customHeaders);

    // 调用LLM产生流式响应
    const llmStream = client.stream(allMessages, {
      model: "doubao-seed-2-0-lite-260215",
      temperature: 0.7,
    });

    // 构建流式响应
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
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

  } catch (error) {
    console.error('[Abyssal Chord Referee Skill] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// HTTP 方法支持
export const POST = handler;
