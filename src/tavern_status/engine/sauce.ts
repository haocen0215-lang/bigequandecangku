import { conflictNarrative } from './labels';

export interface SauceTagBag {
  name: string;
  flavorGrids: Record<string, string>;
  aromaTags: string[];
  textureTags: string[];
  category: string;
  yield: number;
  narrative: string;
}

export function runSauceEngine(
  _save: { player: { cookingLevel: number } },
  input: { ingredients: { name: string; amount: number }[]; method?: string },
): { ok: boolean; tagBag?: SauceTagBag; error?: string } {
  const main = input.ingredients[0]?.name || '混合';
  const name = `${main}酱`;
  const grids: Record<string, string> = {};
  for (const ing of input.ingredients) {
    if (ing.name === '盐') grids['咸'] = '提味';
    if (ing.name === '糖' || ing.name === '蜂蜜') grids['甜'] = ing.amount >= 2 ? '明确愉悦' : '若有若无';
    if (ing.name === '醋') grids['酸'] = ing.amount >= 2 ? '生津开胃' : '提亮清新';
    if (ing.name === '辣椒') {
      grids['辣'] = '尾端温热';
      grids['辛'] = '鼻腔打开';
    }
    if (ing.name === '蒜') grids['辛'] = '微微提神';
  }
  const method = input.method || '搅拌混合';
  const textures =
    method === '收汁浓缩' ? ['浓稠', '挂壁'] : method === '研磨捣碎' ? ['颗粒感', '粗粝'] : ['丝滑', '均匀'];
  const aromas = method === '熬煮' ? ['复合暖香'] : method === '发酵' ? ['酱香', '发酵酸香'] : [];
  const lv = _save.player.cookingLevel;
  const y_ = Math.max(1, [0, 1, 1, 2, 2, 3, 4, 5, 6][lv]);
  return {
    ok: true,
    tagBag: {
      name,
      flavorGrids: grids,
      aromaTags: aromas,
      textureTags: textures,
      category: '佐餐酱汁',
      yield: y_,
      narrative: conflictNarrative('无冲突'),
    },
  };
}
