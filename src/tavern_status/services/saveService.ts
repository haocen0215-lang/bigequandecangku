// ── 存档读写服务 ──
// 使用 chat 变量存储主存档

import { GameSave, SaveSchema } from '../engine/saveSchema';

const SAVE_KEY = 'primordia_save';

export function loadSave(): GameSave | null {
  try {
    const vars = getVariables({ type: 'chat' });
    const raw = vars[SAVE_KEY];
    if (!raw) return null;
    return SaveSchema.parse(raw);
  } catch (e) {
    console.warn('[primordia] 加载存档失败', e);
    return null;
  }
}

export async function writeSave(save: GameSave): Promise<void> {
  await updateVariablesWith(
    vars => {
      vars[SAVE_KEY] = klona(save);
      return vars;
    },
    { type: 'chat' },
  );
}

export function createInitialSave(): GameSave {
  return SaveSchema.parse({});
}
