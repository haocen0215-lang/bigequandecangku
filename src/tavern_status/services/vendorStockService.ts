// ── 购物货品生成 ──
// AI 根据当前区域/季节/摊贩类型生成 4-8 种本地当季食材
// 由 REQUEST_VENDOR_STOCK Action 触发
// 不在此处调用 generate，而是构建 AI 需要的上下文后返回
import { GameSave } from '../engine/saveSchema';
import { buildSituationSummary } from './situationBuilder';

/**
 * 构建购物 AI 的局势摘要
 * 告诉 AI：当前城市、季节、摊贩类型，让它生成今日货品
 */
export function buildVendorPrompt(save: GameSave, vendorType: string): string {
  const city = save.world.currentCity;
  const season = save.world.season;

  return [
    `[购物场景]`,
    `当前城市: ${city}`,
    `季节: ${season}`,
    `摊贩类型: ${vendorType || '综合食材摊'}`,
    ``,
    `请根据以上城市和季节生成今日摊位上可购买的商品。`,
    `规则：`,
    `- 生成 4-8 种商品（不要全列，随机挑选当地当季的）`,
    `- 每种商品包含：名称、单位、单价（铜币）`,
    `- 简单描述一下商品的新鲜程度或特色（一句话即可）`,
    `- 不能出售深界稀有材料——那些要去冒险者公会附近才能买到`,
    `- 输出格式简洁，直接列出即可`,
  ].join('\n');
}
