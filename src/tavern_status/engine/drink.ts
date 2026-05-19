import { conflictNarrative } from './labels';

export interface DrinkTagBag {
  name: string;
  flavorGrids: Record<string, string>;
  aromaTags: string[];
  textureTags: string[];
  drunkenness: string | null;
  category: string;
  yield: number;
  price: number;
  narrative: string;
}

export function runDrinkEngine(
  _save: { player: { cookingLevel: number } },
  input: { ingredients: { name: string; amount: number }[]; method?: string },
): { ok: boolean; tagBag?: DrinkTagBag; error?: string } {
  const main = input.ingredients[0]?.name || '水';
  const method = input.method || '混合';
  const name = `${method}${main}`;

  // 醉度计算：有酒精基底时，根据含酒精食材的份量和工序推算
  const alcoholNames = ['葡萄酒', '黑麦淡啤', '麦芽'];
  const drunkBase = input.ingredients.filter(i => alcoholNames.includes(i.name)).reduce((s, i) => s + i.amount, 0);
  const hasAlcohol = drunkBase > 0;
  const isDistilled = method === '蒸馏';
  const isHeated = ['加热', '冲泡'].includes(method);
  const rawDrunk = drunkBase + (isDistilled ? 1 : 0) - (isHeated ? 1 : 0);
  const drunk = Math.max(0, Math.min(5, rawDrunk));
  const drunkLabels: (string | null)[] = [null, '微醺', '脸红话多', '上头', '脚步不稳', '断片'];
  const drunkenness = hasAlcohol ? drunkLabels[drunk] : null;

  // 味觉格位
  const grids: Record<string, string> = {};
  for (const ing of input.ingredients) {
    if (ing.name === '糖' || ing.name === '蜂蜜') grids['甜'] = ing.amount >= 2 ? '明确愉悦' : '若有若无';
    if (ing.name === '醋') grids['酸'] = '提亮清新';
    if (ing.name === '薄荷叶') grids['凉'] = '口腔清爽';
    if (ing.name === '啤酒花') grids['苦'] = '增添深度';
  }

  // 口感/香气/分类
  const textures =
    method === '过滤'
      ? ['纯净', '清透']
      : method === '压榨'
        ? ['浓稠', '果肉感']
        : method === '冲泡'
          ? ['温热', '顺喉']
          : method === '陈酿'
            ? ['圆润', '醇厚']
            : ['清爽', '顺喉'];
  const aromas =
    method === '发酵'
      ? ['发酵酸香', '酱香']
      : method === '蒸馏'
        ? ['酒香', '清透']
        : method === '冲泡'
          ? ['草本香']
          : [];
  const cat = method === '发酵' || method === '陈酿' ? '酿造饮品' : method === '浸泡' ? '浸制饮品' : '即饮';

  // 定价
  const isTimeHeavy = ['发酵', '陈酿'].includes(method);
  const isMedium = method === '浸泡';
  const cost = input.ingredients.reduce((s, i) => s + i.amount * 3, 0);
  const lv = _save.player.cookingLevel;
  const lvMul = [0, 1.0, 1.2, 1.5, 2.0, 2.5, 3.0, 4.0, 5.0][lv];
  const timeMul = isTimeHeavy ? 2.0 : isMedium ? 1.2 : 1.0;
  const y_ = Math.max(1, [0, 1, 1, 2, 2, 3, 4, 5, 6][lv]);
  const price = Math.max(1, Math.round((cost / Math.max(1, y_)) * lvMul * timeMul));

  return {
    ok: true,
    tagBag: {
      name,
      flavorGrids: grids,
      aromaTags: aromas,
      textureTags: textures,
      drunkenness,
      category: cat,
      yield: y_,
      price,
      narrative: conflictNarrative('无冲突'),
    },
  };
}
