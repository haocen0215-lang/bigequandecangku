// ── 健康检查引擎 ──
// 检测存档完整性：金钱非负、引用完整性、标签有效性

import { GameSave } from './saveSchema';

export interface HealthCheckItem {
  pass: boolean;
  category: string;
  message: string;
  severity: 'ok' | 'warn' | 'error';
}

export interface HealthReport {
  ok: boolean;
  checks: HealthCheckItem[];
  summary: string;
}

export function runHealthCheck(save: GameSave): HealthReport {
  const checks: HealthCheckItem[] = [];

  const add = (category: string, pass: boolean, message: string, severity: HealthCheckItem['severity'] = 'error') =>
    checks.push({ category, pass, message, severity });

  // ─── 1. 金钱非负 ───
  const m = save.player.money;
  for (const tier of ['秘银币', '铂金币', '金币', '银币', '铜币'] as const) {
    const v = m[tier];
    if (v == null || v < 0) {
      add('金钱', false, `玩家.金钱.${tier} = ${v}（应为 ≥ 0）`, 'error');
    }
  }

  // ─── 2. 库存引用完整性 ───
  for (const [name, item] of Object.entries(save.inventory)) {
    if (item.数量 == null) add('库存', false, `「${name}」缺少 数量 字段`, 'warn');
    if (item.数量 < 0) add('库存', false, `「${name}」数量 = ${item.数量}（负值）`, 'error');
    if (!['食材', '调料', '成品', '其他'].includes(item.分类)) {
      add('库存', false, `「${name}」分类「${item.分类}」不合法`, 'warn');
    }
    if (item.售价铜币 != null && item.售价铜币 < 0) {
      add('库存', false, `「${name}」售价铜币 = ${item.售价铜币}（负值）`, 'warn');
    }
  }

  // ─── 3. 农田状态 ───
  for (const [key, farm] of Object.entries(save.farms)) {
    if (!farm.status || farm.status.trim() === '') {
      add('农田', false, `「${key}」缺少状态`, 'warn');
    }
  }

  // ─── 4. 酿酒状态 ───
  for (const [key, brew] of Object.entries(save.brews)) {
    if (!brew.aging || brew.aging.trim() === '') {
      add('酿酒', false, `「${key}」缺少陈酿状态`, 'warn');
    }
    if (!brew.container || brew.container.trim() === '') {
      add('酿酒', false, `「${key}」缺少容器`, 'warn');
    }
  }

  // ─── 5. 员工 ───
  for (const [id, emp] of Object.entries(save.employees)) {
    if (!emp.role) add('员工', false, `「${id}」缺少岗位`, 'warn');
    if (!emp.currentState) add('员工', false, `「${id}」缺少当前状态`, 'warn');
  }

  // ─── 6. 关系 ───
  for (const [id, rel] of Object.entries(save.relationships)) {
    if (rel.affinity < 0 || rel.affinity > 100) {
      add('关系', false, `「${id}」好感度 = ${rel.affinity}（应为 0-100）`, 'error');
    }
    if (rel.intimacyStage < 1 || rel.intimacyStage > 8) {
      add('关系', false, `「${id}」亲密度阶段 = ${rel.intimacyStage}（应为 1-8）`, 'error');
    }
    if (rel.dailyAffinityChange < -20 || rel.dailyAffinityChange > 20) {
      add('关系', false, `「${id}」每日好感变化 = ${rel.dailyAffinityChange}（异常）`, 'warn');
    }
  }

  // ─── 7. 玩家 ───
  if (save.player.cookingLevel < 1 || save.player.cookingLevel > 8) {
    add('玩家', false, `烹饪等级 = ${save.player.cookingLevel}（应为 1-8）`, 'error');
  }
  if (save.player.cookingCount < 0) {
    add('玩家', false, `累计做菜次数 = ${save.player.cookingCount}（负值）`, 'error');
  }

  // ─── 8. 世界 ───
  if (!save.world.date || save.world.date.trim() === '') {
    add('世界', false, '缺少当前日期', 'warn');
  }
  if (!save.world.currentCity || save.world.currentCity.trim() === '') {
    add('世界', false, '缺少当前城市', 'warn');
  }

  // ─── 9. 酒馆区域 ───
  for (const [name, region] of Object.entries(save.tavern.regions)) {
    if (!region.status) add('酒馆', false, `区域「${name}」缺少状态`, 'warn');
  }

  // ─── 10. 元数据 ───
  if (!save.meta.schemaVersion) {
    add('元数据', false, '缺少 schemaVersion', 'warn');
  }

  // ─── 汇总 ───
  const errors = checks.filter(c => c.severity === 'error' && !c.pass);
  const warns = checks.filter(c => c.severity === 'warn' && !c.pass);
  const ok = errors.length === 0;
  const summaryParts: string[] = [];
  if (errors.length) summaryParts.push(`${errors.length} 个错误`);
  if (warns.length) summaryParts.push(`${warns.length} 个警告`);
  const summary = ok
    ? `✅ 健康检查通过${warns.length ? `（${warns.length} 个警告）` : ''}`
    : `❌ ${summaryParts.join('，')}`;

  return { ok, checks, summary };
}
