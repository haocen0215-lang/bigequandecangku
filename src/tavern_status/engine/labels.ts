// ── 文字标签映射表 ──
// 引擎用这些文字标签产出（给 AI 注入局势摘要），也用于自身判定逻辑
// 标签词汇全部来自食味体验第二版和气味标签，不发明新词

// ═══════════════════════ 烹饪等级 ═══════════════════════
export const COOKING_LEVELS: Record<number, { title: string; desc: string; errorRate: string; yieldMul: number }> = {
  1: {
    title: '烧火工',
    desc: '刚会生火，能把东西煮熟烤熟。调味全靠感觉，盐多盐少看运气。',
    errorRate: '高',
    yieldMul: 1,
  },
  2: {
    title: '守灶童',
    desc: '分得清大火小火，但转换不够稳。两三种调味能配合，咸淡开始稳定。',
    errorRate: '较高',
    yieldMul: 1,
  },
  3: { title: '灶台学徒', desc: '能判断油热和锅热，但还不够老练。开始理解先后顺序。', errorRate: '中等', yieldMul: 2 },
  4: {
    title: '行炉工',
    desc: '能同时照看多种火力。复合调味开始成形，酱汁和汤底更稳定。',
    errorRate: '较低',
    yieldMul: 2,
  },
  5: {
    title: '持勺匠',
    desc: '手感明显成熟，能让焦香油香酱香互相配合。不同调味互相托住。',
    errorRate: '低',
    yieldMul: 3,
  },
  6: {
    title: '灶台师傅',
    desc: '能处理慢火蒸汽热油炭火炉温。酸咸香甜油脂酒气形成完整风味。',
    errorRate: '很低',
    yieldMul: 4,
  },
  7: {
    title: '首席灶师',
    desc: '对炉火糖浆油温蒸汽都有老练直觉。能把复杂味道做得不乱。',
    errorRate: '极低',
    yieldMul: 5,
  },
  8: {
    title: '灶火宗师',
    desc: '看到食材炉灶就知道该用什么火什么锅什么顺序。独创首次仍可能失败。',
    errorRate: '近乎零',
    yieldMul: 6,
  },
};

// ═══════════════════════ 作物状态 ═══════════════════════
export const CROP_STATUSES = [
  '刚播下种子，土还是湿的',
  '嫩芽冒出来了，绿得发亮',
  '叶子展开了，开始往上蹿',
  '花苞鼓起来了，再几天就开了',
  '果子开始成形，青色的，藏在叶子底下',
  '开始变色了，再一场雨就该摘了',
  '熟透了，沉甸甸地坠在藤上，不摘明天就烂了',
];

// ═══════════════════════ 陈酿状态 ═══════════════════════
export const AGING_STAGES = [
  '刚封桶——闻着还是原料的味道',
  '初现酒香——开始有点意思了',
  '风味饱满——香气越来越浓',
  '巅峰状态——现在开桶是最好的时候',
  '开始走下坡——再不开就晚了',
  '过了最佳期——酸味开始盖过酒香了',
];

// ═══════════════════════ 好感度状态 ═══════════════════════
export const AFFINITY_STAGES = [
  '初次见面，还在互相打量',
  '见面会点头打个招呼，但还没真正聊过',
  '偶尔能聊上几句，气氛还算自然',
  '开始主动来找你说话，会问一些关于你的事',
  '会找借口多待一会儿，有时候什么都不说只是坐在店里',
  '递东西时手指会不经意碰到，然后假装没发生',
  '会为了你和别人争辩，语气里带着自己也说不清的在意',
  '愿意为你做超出本分的事，不求回报那种',
];

/** 按阶段索引取好感文字标签（1-based），供 engine/relationships.ts 使用 */
export const AFFINITY_LABELS: Record<number, string> = {
  1: '初次见面，还在互相打量',
  2: '见面会点头打个招呼，但还没真正聊过',
  3: '偶尔能聊上几句，气氛还算自然',
  4: '开始主动来找你说话，会问一些关于你的事',
  5: '会找借口多待一会儿，有时候什么都不说只是坐在店里',
  6: '递东西时手指会不经意碰到，然后假装没发生',
  7: '会为了你和别人争辩，语气里带着自己也说不清的在意',
  8: '愿意为你做超出本分的事，不求回报那种',
};

// ═══════════════════════ 搭配等级 ═══════════════════════
export const CONFLICT_LEVELS = ['灾难级', '严重冲突', '轻微冲突', '无冲突', '经典搭配', '绝佳搭配', '奇迹'] as const;
export type ConflictLevel = (typeof CONFLICT_LEVELS)[number];

// ═══════════════════════ 份量格位维度 ═══════════════════════
export const GRID_5: Record<string, string[]> = {
  咸: ['寡淡', '提味', '口重', '齁咸', '咸苦发涩'],
  甜: ['若有若无', '明确愉悦', '发腻', '齁甜', '甜到反胃'],
  酸: ['提亮清新', '生津开胃', '面部紧缩', '酸倒牙', '胃酸上涌'],
  苦: ['增添深度', '入口苦随即回甘', '明确苦涩', '本能想吐', '嘴里残留苦味'],
  鲜: ['说不上来但好吃', '每一口都满足', '鲜味过密', '腥味浮现', '鲜到不适'],
  辣: ['尾端温热', '嘴唇发麻', '满头大汗', '口腔丧失味觉', '只剩灼痛'],
  辛: ['微微提神', '鼻腔打开', '喉头发热', '呛咳', '刺激压倒味觉'],
  凉: ['舌尖微凉', '口腔清爽', '鼻腔通透', '凉到刺舌', '冷感破坏风味'],
};

export const GRID_4: Record<string, string[]> = {
  甘: ['隐约回甜', '喉间生津', '余味悠长', '甘腻黏喉'],
  麻: ['嘴唇轻酥', '持续震颤', '说话受影响', '口腔麻木'],
  涩: ['干净收束', '切油腻', '嘴巴塞棉花', '无法吞咽'],
};

/** 根据份量和维度名获取格位标签 */
export function getGridLabel(dimension: string, amount: number): string | null {
  if (amount <= 0) return null;
  if (dimension in GRID_5) {
    const arr = GRID_5[dimension];
    return arr[Math.min(amount - 1, arr.length - 1)];
  }
  if (dimension in GRID_4) {
    const arr = GRID_4[dimension];
    return arr[Math.min(amount - 1, arr.length - 1)];
  }
  return null;
}

// ═══════════════════════ 搭配等级→叙事方向 ═══════════════════════
export function conflictNarrative(level: ConflictLevel): string {
  const map: Record<ConflictLevel, string> = {
    灾难级: '无法下咽',
    严重冲突: '很难吃',
    轻微冲突: '有点奇怪但能吃',
    无冲突: '能吃，不惊艳',
    经典搭配: '好吃，让人满足',
    绝佳搭配: '非常好吃，每一口都有变化',
    奇迹: '超出预期',
  };
  return map[level];
}

// ═══════════════════════ 金钱→粗略文字 ═══════════════════════
export function moneyLabel(copper: number): string {
  if (copper < 100) return '手头很紧';
  if (copper < 500) return '勉强维持';
  if (copper < 2000) return '日子过得去';
  if (copper < 10000) return '攒了些钱';
  if (copper < 50000) return '手头宽裕';
  return '相当富有';
}
