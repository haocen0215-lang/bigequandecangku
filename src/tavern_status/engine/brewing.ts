// ── 酿酒引擎 ──
// 陈酿状态以文字标签轮转

import { AGING_STAGES } from './labels';
import { GameSave } from './saveSchema';

export function advanceAging(current: string): string {
  const idx = AGING_STAGES.indexOf(current);
  if (idx < 0 || idx >= AGING_STAGES.length - 1) return current;
  return AGING_STAGES[idx + 1];
}

export function startBrew(
  save: GameSave,
  name: string,
  ingredients: string[],
  container: string,
): { ok: boolean; message: string } {
  if (save.brews[name]) return { ok: false, message: `已经有一桶叫${name}的东西在酿着了。` };
  for (const ing of ingredients) {
    const item = save.inventory[ing];
    if (!item || item.数量 <= 0) return { ok: false, message: `${ing}不够——库存里没有或者用完了。` };
    item.数量 -= 1;
  }
  save.brews[name] = { ingredients, container, aging: AGING_STAGES[0], startedAt: save.world.date };
  return { ok: true, message: `把${ingredients.join('、')}封进了${container}。${AGING_STAGES[0]}` };
}

export function openBrew(save: GameSave, brewId: string): { ok: boolean; message: string; quality: string } {
  const brew = save.brews[brewId];
  if (!brew) return { ok: false, message: '没找到这桶东西。', quality: '' };
  const quality = brew.aging;
  delete save.brews[brewId];
  return { ok: true, message: `打开了${brewId}——${quality}。`, quality };
}
