// ── 种田引擎 ──
// 作物状态以文字标签轮转，受季节和时间推进影响

import { CROP_STATUSES } from './labels';
import { GameSave } from './saveSchema';

export function advanceCropStatus(current: string): string {
  const idx = CROP_STATUSES.indexOf(current);
  if (idx < 0 || idx >= CROP_STATUSES.length - 1) return current;
  return CROP_STATUSES[idx + 1];
}

export function plantCrop(save: GameSave, cropName: string, plot: string): { ok: boolean; message: string } {
  const key = `${plot}:${cropName}`;
  if (save.farms[key]) {
    return { ok: false, message: `${plot}上已经种了东西，先收了再种新的吧。` };
  }
  save.farms[key] = { type: '作物', status: CROP_STATUSES[0], plantedAt: save.world.date };
  return { ok: true, message: `在${plot}上种下了${cropName}。${CROP_STATUSES[0]}` };
}

export function harvestCrop(save: GameSave, cropName: string): { ok: boolean; message: string; y_: number } {
  const entry = Object.entries(save.farms).find(([k]) => k.endsWith(`:${cropName}`));
  if (!entry) return { ok: false, message: `没有找到${cropName}的种植记录。`, y_: 0 };
  const [key, farm] = entry;
  const last = CROP_STATUSES[CROP_STATUSES.length - 1];
  if (farm.status !== last) return { ok: false, message: `${cropName}还没熟透。`, y_: 0 };
  const y_ = 3 + Math.floor(Math.random() * 5);
  const ex = save.inventory[cropName];
  if (ex) {
    ex.数量 += y_;
  } else {
    save.inventory[cropName] = { 数量: y_, 单位: '份', 分类: '食材', 风味标签: [], 烹饪手法: '', 售价铜币: 0 };
  }
  delete save.farms[key];
  return { ok: true, message: `收了${y_}份${cropName}。`, y_ };
}

export function farmRandomEvent(save: GameSave): string | null {
  const keys = Object.keys(save.farms);
  if (Math.random() < 0.05 && keys.length > 0) {
    const k = keys[Math.floor(Math.random() * keys.length)];
    return `${k.split(':')[1]}的叶子上爬了几只虫——得处理一下。`;
  }
  if (Math.random() < 0.08) return '昨晚那场雨下得好——后院的菜明显蹿了一截。';
  return null;
}
