// ── AI 生成服务 ──
// 封装 generate 调用，局势摘要注入，AI 回复写入 chat 楼层

import { GameSave } from '../engine/saveSchema';
import { buildSituationSummary } from './situationBuilder';

export interface GenerateRequest {
  save: GameSave;
  actionMessage: string;
  shouldStream?: boolean;
  userInput?: string;
}

/**
 * 调用 AI 生成叙事文本
 * 1. 构建局势摘要（全文字标签，无数字）
 * 2. 构造注入内容
 * 3. 调用 generate
 * 4. AI 回复写入 chat 楼层（不写变量——变量由引擎管理）
 */
export async function requestAINarration(req: GenerateRequest): Promise<{ ok: boolean; reply: string }> {
  const situation = buildSituationSummary(req.save, req.actionMessage);

  const userInput = req.userInput || situation;

  try {
    const reply = await generate({
      user_input: userInput,
      should_stream: req.shouldStream ?? true,
      // 注入权限边界
      injects: [
        {
          position: 'in_chat',
          depth: 0,
          role: 'system',
          should_scan: false,
          content: [
            '你现在只负责AIRP、角色互动、叙述、建议和气氛。',
            '以下内容由前端脚本决定，你不能更改、伪造或宣称已经完成：',
            '- 资源、物品、经验、技能、任务、金币',
            '- 烹饪结果、战斗伤害、等级、地点移动',
            '- 建造进度、作物成熟、产业收入',
            '你可以根据权威局势进行角色扮演和场景描写。',
            '最终回复只保留角色对玩家说的话或场景叙述。',
          ].join('\n'),
        },
      ],
    });

    return { ok: true, reply };
  } catch (e) {
    console.error('[primordia] AI 生成失败', e);
    return { ok: false, reply: '' };
  }
}

/**
 * 将 AI 回复写入酒馆聊天楼层
 * role: assistant，不携带数据（变量由引擎管理）
 */
export async function writeAIReplyToChat(reply: string, userMessage?: string): Promise<void> {
  try {
    const messages: { role: 'user' | 'assistant'; message: string }[] = [];

    if (userMessage) {
      messages.push({ role: 'user', message: userMessage });
    }

    messages.push({ role: 'assistant', message: reply, data: {} });

    await createChatMessages(messages, { refresh: 'none' });
  } catch (e) {
    console.error('[primordia] 写入楼层失败', e);
  }
}
