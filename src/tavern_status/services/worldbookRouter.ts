// ── 世界书路由 ──
// 根据当前城市/季节/在场种族/活动类型生成扫描文本
// 用于激活对应的世界书条目（普利莫迪亚使用 § 锚点引用体系）

import { GameSave } from '../engine/saveSchema';

/**
 * 构建世界书扫描文本
 * 这些文本不直接进入上下文，只用于激活世界书条目的关键字
 */
export function buildWorldbookScan(save: GameSave): string {
  const w = save.world;
  const lines: string[] = [];

  lines.push('[普利莫迪亚世界状态扫描]');
  lines.push(`当前城市: ${w.currentCity}`);
  lines.push(`季节: ${w.season}`);
  lines.push(`天气: ${w.weather}`);

  // 收集在场种族
  const races = new Set<string>();
  races.add(save.player.race);
  for (const e of Object.values(save.employees)) {
    if (e.race) races.add(e.race);
  }
  for (const r of Object.values(save.relationships)) {
    if (r.race) races.add(r.race);
  }
  if (races.size > 0) lines.push(`在场种族: ${[...races].join('、')}`);

  // 当前活动
  if (save.reputation.tavernFame) lines.push(`酒馆声望: ${save.reputation.tavernFame}`);
  if (save.player.cookingLevel) lines.push(`烹饪等级: LV.${save.player.cookingLevel}·${save.player.cookingLevelTitle}`);

  lines.push('');
  lines.push('§MAT_INDEX§ §AROMA_TAG§ §TASTE_EXP_V2§ §COOK_METHOD§ §PRICE_REF§');

  return lines.join('\n');
}
