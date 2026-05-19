// ── 局势摘要构建器 ──
// 从存档提取 AI 叙事需要的一切——全部是文字标签，没有数字

import { GameSave } from '../engine/saveSchema';
import { moneyLabel, COOKING_LEVELS } from '../engine/labels';

export function buildSituationSummary(save: GameSave, actionMessage?: string): string {
  const w = save.world;
  const p = save.player;
  const t = save.tavern;
  const lv = COOKING_LEVELS[p.cookingLevel];

  let s = `[权威局势]\n${w.date} ${w.time} | ${w.weather} | ${w.season} | ${w.currentLocation}\n\n`;
  s += `【酒馆】${t.name}（${t.city}）\n`;
  if (t.style) s += `风格: ${t.style}\n`;

  const regs = Object.entries(t.regions);
  if (regs.length > 0) {
    s += `区域:\n`;
    for (const [rn, r] of regs) {
      s += `  ${rn}: ${r.status} | 设施: ${r.facilities.join('、') || '暂无'}`;
      if (r.decorations.length > 0) s += ` | 装饰: ${r.decorations.join('、')}`;
      if (r.vibe) s += ` | ${r.vibe}`;
      s += `\n`;
    }
  }

  s += `\n【玩家】${p.name || '无名'}（${p.race}）\n`;
  s += `烹饪等级: LV.${p.cookingLevel}·${lv?.title || ''} — ${lv?.desc || ''}\n`;
  s += `状态: ${p.hp} · ${p.stamina}\n`;
  s += `穿着: ${p.outfit || '待描述'}\n`;
  s += `财务状况: ${moneyLabel(p.money.铜币 + p.money.银币 * 100 + p.money.金币 * 1000)}\n\n`;

  const emps = Object.entries(save.employees);
  if (emps.length > 0) {
    s += `【在场员工】\n`;
    for (const [, e] of emps)
      s += `  ${e.role}: ${e.personality.slice(0, 30)}… 当前: ${e.currentState || '在岗位上'}\n`;
  }

  const rels = Object.entries(save.relationships);
  if (rels.length > 0) {
    s += `\n【在场角色】\n`;
    for (const [, r] of rels) {
      s += `  ${r.displayName}（${r.race}）${r.city ? `· ${r.city}` : ''}: ${r.currentActivity || '待着'} | ${r.affinityLabel}\n`;
    }
  }

  const crops = Object.entries(save.farms);
  if (crops.length > 0) {
    s += `\n【后院农田】\n`;
    for (const [, c] of crops) s += `  ${c.status}\n`;
  }

  const brews = Object.entries(save.brews);
  if (brews.length > 0) {
    s += `\n【酿造中】\n`;
    for (const [bn, b] of brews) s += `  ${bn}（${b.container}）: ${b.aging}\n`;
  }

  if (actionMessage) s += `\n[刚发生的事]\n${actionMessage}\n`;
  s += `\n[AI叙述规则]\n你只负责AIRP和叙事。不要改变量、不要输出JSON、不要给数字结论。把所有引擎结果写成自然的场景描写。\n`;
  return s;
}
