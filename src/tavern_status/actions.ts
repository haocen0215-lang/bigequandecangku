// ── Action 类型定义 ──
// 所有玩家操作走这个类型，dispatcher 统一派发

export type GameAction =
  // ── 烹饪 ──
  | { type: 'COOK_SINGLE'; ingredients: { name: string; amount: number }[]; method?: string }
  | { type: 'COOK_BATCH'; ingredients: { name: string; amount: number }[]; method?: string; qty: number }
  | { type: 'MAKE_SAUCE'; ingredients: { name: string; amount: number }[]; method?: string }
  | { type: 'MAKE_DRINK'; ingredients: { name: string; amount: number }[]; method?: string }
  | { type: 'SERVE_DISH'; dishName: string; portions: number; target?: string }

  // ── 种田 ──
  | { type: 'PLANT_CROP'; cropName: string; plot: string }
  | { type: 'HARVEST'; cropName: string }

  // ── 酿酒 ──
  | { type: 'START_BREW'; name: string; ingredients: string[]; container: string }
  | { type: 'OPEN_BREW'; brewId: string }

  // ── 购物 ──
  | { type: 'REQUEST_VENDOR_STOCK'; vendorId?: string }
  | { type: 'BUY_ITEMS'; items: { name: string; qty: number }[]; totalCost: number }

  // ── 建造 ──
  | { type: 'BUY_FACILITY'; facilityName: string; regionId: string; cost: number }
  | { type: 'ADD_DECORATION'; decoration: string; regionId: string }
  | { type: 'RENOVATE'; regionId: string; newStyle: string }

  // ── 员工 ──
  | { type: 'HIRE_EMPLOYEE'; id: string; name: string; role: string; race: string; personality: string; wage: string }
  | { type: 'FIRE_EMPLOYEE'; employeeId: string }

  // ── 产业 ──
  | { type: 'START_BUSINESS'; id: string; name: string; type: string; investment: string; incomeNote: string }

  // ── 冒险 ──
  | { type: 'GO_ADVENTURE'; destination: string; party: string[] }
  | { type: 'COMMISSION_ADVENTURERS'; destination: string; budget: number }

  // ── 旅行 ──
  | { type: 'TRAVEL'; destination: string; city?: string }

  // ── 互动 ──
  | { type: 'INTERACT_NPC'; npcId: string; action: string }
  | { type: 'GIFT_NPC'; npcId: string; item: string }

  // ── 经营 ──
  | { type: 'OPEN_TAVERN' }
  | { type: 'CLOSE_TAVERN' }
  | { type: 'FAST_FORWARD'; hours: number }
  | { type: 'ROLL_VISITOR' }

  // ── 自由输入 ──
  | { type: 'CHAT'; text: string };

export interface ActionResult {
  ok: boolean;
  message: string; // 给用户看的简短结果
  shouldAskAI: boolean; // 是否需要 AI 叙事
  situationSummary?: string; // 已拼接好的局势摘要（给 AI 注入用）
  coinChange?: number; // 金钱变化（正=收入，负=支出）
  logs?: string[]; // 引擎日志
}
