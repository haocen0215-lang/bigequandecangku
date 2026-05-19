// ── 好感度/关系阶段引擎 ──
// 规则：
//   - 好感度 0-100，满 100 触发阶段晋升（阶段1→8）
//   - 每日好感变化上限 DAILY_AFFINITY_CAP（防止一天攻略到满）
//   - 说错话/冷落会降好感
//   - 阶段转换时重置 dailyAffinityChange 计数器

import { GameSave } from './saveSchema';
import { AFFINITY_STAGES, AFFINITY_LABELS } from './labels';
import { HeroineBase } from './heroines';

// ═══════════════════════ 常量 ═══════════════════════
export const DAILY_AFFINITY_CAP = 15; // 每日最大好感变化（正负累计绝对值）
export const STAGE_UP_THRESHOLD = 100; // 进入下一阶段所需好感度

export const HEROINE_STAGES: Record<string, readonly string[]> = {
  juqi: ['陌生人', '雇主', '相熟', '在意', '暧昧', '恋人初期', '恋人深层', '不可分割'],
  miannuan: ['初访', '常客', '心安', '不自知', '自知', '托付', '坦诚', '归属'],
  adaila: ['审视', '放行', '在场', '失算', '两难', '交底', '初学', '放手'],
};

// ═══════════════════════ 类型 ═══════════════════════
export interface AffinityResult {
  ok: boolean;
  message: string;
  change: number; // 实际变化量
  newAffinity: number; // 更新后的好感度
  stageChanged: boolean;
  newStage?: number;
  newStageName?: string;
  capped: boolean; // 是否被每日上限截断
}

// ═══════════════════════ 核心函数 ═══════════════════════

/**
 * 修改好感度（正=加，负=减）
 * 每次调用前先检查每日上限
 */
export function changeAffinity(save: GameSave, heroineId: string, delta: number, reason: string): AffinityResult {
  const rel = save.relationships[heroineId];
  if (!rel)
    return {
      ok: false,
      message: `角色 ${heroineId} 不存在`,
      change: 0,
      newAffinity: 0,
      stageChanged: false,
      capped: false,
    };

  const oldAffinity = rel.affinity;
  const oldStage = rel.intimacyStage;
  const absDailyChange = Math.abs(rel.dailyAffinityChange);
  const remainingDaily = DAILY_AFFINITY_CAP - absDailyChange;

  // ═══ 每日上限检查 ═══
  let capped = false;
  let actualDelta = delta;

  if (delta > 0 && remainingDaily <= 0) {
    return {
      ok: true,
      message: `今天和${rel.displayName}已经走得够近了——好感变化已达每日上限（±${DAILY_AFFINITY_CAP}）。`,
      change: 0,
      newAffinity: oldAffinity,
      stageChanged: false,
      capped: true,
    };
  }

  if (delta > 0 && delta > remainingDaily) {
    actualDelta = remainingDaily;
    capped = true;
  }

  if (delta < 0) {
    // 负面变化不设下限（但 total daily 绝对值仍有限制）
    if (absDailyChange + Math.abs(delta) > DAILY_AFFINITY_CAP) {
      actualDelta = -(DAILY_AFFINITY_CAP - absDailyChange);
      capped = true;
    }
  }

  // ═══ 计算新值 ═══
  let newAffinity = oldAffinity + actualDelta;

  // 边界钳位
  if (newAffinity < 0) newAffinity = 0;
  if (newAffinity > STAGE_UP_THRESHOLD) newAffinity = STAGE_UP_THRESHOLD;

  rel.affinity = newAffinity;
  rel.dailyAffinityChange += actualDelta;

  // ═══ 阶段晋升检查 ═══
  const stageNames = HEROINE_STAGES[heroineId] || ['初识', '面熟', '点头之交', '熟人', '朋友', '知交', '挚友', '至亲'];
  let stageChanged = false;
  let newStage = oldStage;
  let newStageName = '';

  if (newAffinity >= STAGE_UP_THRESHOLD && oldStage < 8) {
    newStage = oldStage + 1;
    rel.intimacyStage = newStage;
    rel.affinity = 0; // 进入新阶段后好感度重置
    rel.dailyAffinityChange = 0; // 新阶段重置每日计数
    newStageName = stageNames[newStage - 1] || `阶段${newStage}`;
    stageChanged = true;
  }

  // ═══ 更新文字标签 ═══
  const stageIdx = Math.min(rel.intimacyStage, 8);
  rel.affinityLabel = AFFINITY_LABELS?.[stageIdx - 1] || AFFINITY_STAGES[Math.min(stageIdx - 1, 8)] || '初次见面';

  // ═══ 结果消息 ═══
  let message = '';
  if (stageChanged) {
    message = `「${rel.displayName}」的关系进入新阶段：${newStageName}！`;
  } else if (delta > 0) {
    message = `「${rel.displayName}」好感 ${actualDelta > 0 ? '+' : ''}${actualDelta}（${reason}）`;
    if (capped) message += '（已达每日上限）';
  } else {
    message = `「${rel.displayName}」好感 ${actualDelta}（${reason}）`;
  }

  return {
    ok: true,
    message,
    change: actualDelta,
    newAffinity,
    stageChanged,
    newStage: stageChanged ? newStage : undefined,
    newStageName: stageChanged ? newStageName : undefined,
    capped,
  };
}

/**
 * 重置每日好感变化计数器（日结时调用，或新一天开始时调用）
 */
export function resetDailyAffinity(save: GameSave): void {
  for (const rel of Object.values(save.relationships)) {
    rel.dailyAffinityChange = 0;
  }
}

/**
 * 获取当前城市里所有已解锁的女主
 */
export function getLocalHeroines(save: GameSave): Array<{ id: string; name: string; stage: number; affinity: number }> {
  const city = save.world.currentCity;
  return Object.entries(save.relationships)
    .filter(([, r]) => r.city === city)
    .map(([id, r]) => ({ id, name: r.displayName, stage: r.intimacyStage, affinity: r.affinity }));
}
