// ── 烹饪引擎 · 灶火行会版 11 步 ──
// 参考：普利莫迪亚 菜品生成引擎（灶火行会版）

import { ConflictLevel, conflictNarrative, COOKING_LEVELS, GRID_4, GRID_5 } from './labels';
import { GameSave } from './saveSchema';

export interface CookInput {
  ingredients: { name: string; amount: number }[];
  method?: string;
  batchMode: boolean;
  batchQty?: number;
}

export interface DishTagBag {
  dishName: string;
  conflictLevel: ConflictLevel;
  flavorGrids: Record<string, string>;
  aromaTags: string[];
  textureTags: string[];
  structuredFlavors: string[];
  craftFlavor: string;
  category: string;
  yield: number;
  price: number;
  narrative: string;
}

const ING_MAP: Record<string, { priority: number; dims: string[] }> = {
  猪五花: { priority: 1, dims: ['鲜', '脂'] },
  面粉: { priority: 5, dims: [] },
  盐: { priority: 9, dims: ['咸'] },
  糖: { priority: 9, dims: ['甜'] },
  深界翠菌: { priority: 4, dims: ['鲜'] },
  萝卜: { priority: 7, dims: [] },
  大白菜: { priority: 7, dims: [] },
  土豆: { priority: 6, dims: [] },
  胡萝卜: { priority: 7, dims: ['甜'] },
  菠菜: { priority: 7, dims: [] },
  洋葱: { priority: 10, dims: [] },
  蒜: { priority: 10, dims: ['辛'] },
  鸡腿: { priority: 2, dims: ['鲜'] },
  牛腱子: { priority: 1, dims: ['鲜'] },
  羊排: { priority: 1, dims: ['鲜', '膻'] },
  鲜鱼: { priority: 3, dims: ['鲜', '腥'] },
  培根: { priority: 1, dims: ['鲜', '咸', '烟熏'] },
  猪骨: { priority: 1, dims: ['鲜'] },
  干香菇: { priority: 4, dims: ['鲜'] },
  黑胡椒: { priority: 9, dims: ['辛'] },
  酱油: { priority: 9, dims: ['咸', '鲜'] },
  醋: { priority: 9, dims: ['酸'] },
  麦芽: { priority: 5, dims: [] },
  啤酒花: { priority: 9, dims: ['苦'] },
  薄荷叶: { priority: 9, dims: ['凉'] },
  辣椒: { priority: 9, dims: ['辣', '辛'] },
  姜: { priority: 9, dims: ['辛'] },
  米: { priority: 5, dims: [] },
  蛋: { priority: 3, dims: ['鲜'] },
  奶: { priority: 9, dims: ['甜'] },
  蜂蜜: { priority: 9, dims: ['甜'] },
  葡萄酒: { priority: 9, dims: ['酸', '酒'] },
  黑麦淡啤: { priority: 9, dims: ['苦', '酒'] },
};

function ingType(name: string) {
  return ING_MAP[name] || { priority: 5, dims: [] };
}

const METHOD_MAP: Record<string, { txt: string[]; aroma: string[]; craft: string }> = {
  煮: { txt: ['绵软'], aroma: [], craft: '水熟清润感' },
  烤: { txt: ['焦脆', '有嚼劲'], aroma: ['焦香'], craft: '明火炙烤感' },
  凉拌: { txt: ['清脆'], aroma: [], craft: '冷制凝结感' },
  腌制: { txt: ['Q弹'], aroma: ['发酵酸香'], craft: '渗透腌渍感' },
  炖: { txt: ['入口即化'], aroma: ['复合暖香'], craft: '长时软化感' },
  煎: { txt: ['焦脆'], aroma: ['焦香'], craft: '表面焦壳感' },
  炒: { txt: ['酥脆'], aroma: ['焦香', '锅气'], craft: '镬气爆香感' },
  焖: { txt: ['入口即化', '绵软'], aroma: ['复合暖香'], craft: '长时软化感' },
  炸: { txt: ['外酥里嫩'], aroma: ['焦香', '麦香'], craft: '油炸酥脆感' },
  蒸: { txt: ['丝滑', '绵软'], aroma: [], craft: '蒸汽保湿感' },
  红烧: { txt: ['挂壁', '浓厚'], aroma: ['酱香', '焦香'], craft: '收汁浓缩感' },
  清蒸: { txt: ['嫩', '湿润'], aroma: [], craft: '蒸汽保湿感' },
  卤: { txt: ['入味', '紧实'], aroma: ['酱香', '香料暖香'], craft: '卤浸熟成感' },
};

function mInfo(m: string) {
  return METHOD_MAP[m] || { txt: ['绵软'], aroma: [], craft: '水熟清润感' };
}

// ── 步骤5：搭配等级检测 ──
function detectConflict(ings: { name: string; amount: number }[]): ConflictLevel {
  const sweetFruit = ings.some(i => ingType(i.name).dims.includes('甜') && i.amount >= 3);
  const seafood = ings.some(i => ingType(i.name).dims.includes('腥'));
  const strongMeat = ings.some(i => ingType(i.name).dims.includes('膻'));
  const dairy = ings.some(i => ingType(i.name).dims.includes('甜') && i.name.includes('奶'));
  const strongAcid = ings.some(i => ingType(i.name).dims.includes('酸') && i.amount >= 3);
  const multiFerment = ings.filter(i => ['酱油', '醋', '黑麦淡啤', '葡萄酒'].includes(i.name)).length >= 3;

  let bad = 0;
  if (sweetFruit && seafood) bad++;
  if (sweetFruit && strongMeat) bad++;
  if (strongAcid && dairy) bad++;
  if (multiFerment) bad++;
  if (bad >= 2) return '灾难级';
  if (bad === 1) return '严重冲突';

  const umami = ings.some(i => ingType(i.name).dims.includes('鲜'));
  const salty = ings.some(i => ingType(i.name).dims.includes('咸'));
  const sweet = ings.some(i => ingType(i.name).dims.includes('甜'));
  const sour = ings.some(i => ingType(i.name).dims.includes('酸'));
  const spicy = ings.some(i => ingType(i.name).dims.includes('辣'));
  const struct = [umami && salty, sweet && sour, spicy && umami, sweet && salty].filter(Boolean).length;
  if (struct >= 2) return '绝佳搭配';
  if (struct === 1) return '经典搭配';
  return '无冲突';
}

// ── 完整引擎执行 ──
export function runCookingEngine(
  save: GameSave,
  input: CookInput,
): { ok: boolean; tagBag?: DishTagBag; error?: string } {
  const lv = save.player.cookingLevel;
  const ld = COOKING_LEVELS[lv];
  if (!ld) return { ok: false, error: '烹饪等级数据异常' };

  // 步骤2: 份量→格位
  // 注意：只有 GRID_5 / GRID_4 中存在的维度才参与格位映射
  // '酒','腥','膻','烟熏','脂' 只参与冲突检测，不写入 flavorGrids
  const grids: Record<string, string> = {};
  for (const ing of input.ingredients) {
    for (const dim of ingType(ing.name).dims) {
      if (dim in grids) continue;
      const arr = dim in GRID_5 ? GRID_5[dim] : GRID_4[dim];
      if (!arr) continue;
      grids[dim] = arr[Math.min(ing.amount - 1, arr.length - 1)];
    }
  }

  // 步骤3-4
  const method = input.method || '煮';
  const mi = mInfo(method);
  const sorted = [...input.ingredients].sort((a, b) => ingType(a.name).priority - ingType(b.name).priority);
  const main = sorted[0]?.name || '什锦';
  const dishName = method === '凉拌' ? `凉拌${main}` : `${method}${main}`;

  // 步骤5
  const conflict = detectConflict(input.ingredients);

  // 步骤6: 标签
  const aroma = [...mi.aroma];
  const txt = [...mi.txt];
  const structFlav: string[] = [];
  if (grids['咸'] && grids['鲜']) structFlav.push('咸鲜');
  if (grids['甜'] && grids['酸']) structFlav.push('酸甜');
  if (grids['辣'] && grids['麻']) structFlav.push('麻辣');

  // 步骤7-10
  const cat = input.ingredients.length <= 2 ? '简餐' : input.ingredients.length <= 4 ? '正餐' : '招牌菜';
  const y_ = input.batchMode ? Math.max(1, (input.batchQty || 10) * ld.yieldMul) : ld.yieldMul;
  const cost = input.ingredients.reduce((s, i) => s + i.amount * 3, 0);
  const lvMul = [0, 1.0, 1.2, 1.5, 2.0, 2.5, 3.0, 4.0, 5.0][lv];
  const price = Math.max(1, Math.round((cost / Math.max(1, y_)) * lvMul));

  const tagBag: DishTagBag = {
    dishName,
    conflictLevel: conflict,
    flavorGrids: grids,
    aromaTags: aroma,
    textureTags: txt,
    structuredFlavors: structFlav,
    craftFlavor: mi.craft,
    category: cat,
    yield: y_,
    price,
    narrative: conflictNarrative(conflict),
  };
  return { ok: true, tagBag };
}

export function addDishToInventory(save: GameSave, tag: DishTagBag, qty: number): void {
  const ex = save.inventory[tag.dishName];
  if (ex) {
    ex.数量 += qty;
  } else {
    save.inventory[tag.dishName] = {
      数量: qty,
      单位: '份',
      分类: '成品',
      风味标签: [
        ...Object.entries(tag.flavorGrids).map(([k, v]) => `${k}:${v}`),
        ...tag.aromaTags,
        ...tag.textureTags,
        ...tag.structuredFlavors,
      ],
      烹饪手法: tag.craftFlavor,
      售价铜币: tag.price,
    };
  }
  if (!save.recipes[tag.dishName]) {
    save.recipes[tag.dishName] = {
      ingredients: [],
      method: tag.craftFlavor,
      result: tag.narrative,
      conflictLevel: tag.conflictLevel,
      createdAt: save.world.date,
    };
  }
}
