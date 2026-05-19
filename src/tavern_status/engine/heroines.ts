// ── 女主静态数据 ──
// 从普利莫迪亚原始设定整理：每个女主的种族、城市分布、8阶段名称
// 初始数据由开局流程产生，此文件仅定义结构

/** 每个女主的核心身份数据（开局后写入 relationships） */
export interface HeroineBase {
  id: string;
  displayName: string;
  race: string;
  city: string; // 当前所在城市
  personality: string; // 性格标签（AI 参考用）
  stages: readonly string[]; // 8 阶段名称（阶段控制器用）
  unlockHint: string; // 解锁条件提示
}

/** 城市 → 可遇见的女主列表 */
export const CITY_HEROINES: Record<string, HeroineBase[]> = {
  布拉姆维克: [
    {
      id: 'juqi',
      displayName: '橘柒',
      race: '狐族',
      city: '布拉姆维克',
      personality: '贪财嗜甜、嘴甜懒散、受到善意不道谢但默默多做事、被逼急了会动手爆粗口',
      stages: ['陌生人', '雇主', '相熟', '在意', '暧昧', '恋人初期', '恋人深层', '不可分割'],
      unlockHint: '布拉姆维克村口告示牌"招人，包吃包住"——她看见这几个字就会推门进来。',
    },
    // 绵暖作为旅行推销员，可在多个城市遇到。布拉姆维克是韦斯托利亚南部村庄，她在跑南线时可能经过。
    {
      id: 'miannuan',
      displayName: '绵暖',
      race: '羊族（瓦莱黑鼻羊型）',
      city: '布拉姆维克',
      personality: '声音极小语速慢、极易害羞、谈论气味和酿酒时专注话多、沾酒即断片、胸前挂"请不要让我喝酒"木牌',
      stages: ['初访', '常客', '心安', '不自知', '自知', '托付', '坦诚', '归属'],
      unlockHint: '酿造师公会推销员，跑韦斯托利亚南部线路时会路过布拉姆维克的小酒馆来推销新酒。',
    },
    {
      id: 'adaila',
      displayName: '阿黛拉',
      race: '人类',
      city: '布拉姆维克',
      personality: '中低音域、说话清晰高效不废话、偶尔贵族用词、对男性示好完全无视、唯独在养女绵暖面前变成话痨',
      stages: ['审视', '放行', '在场', '失算', '两难', '交底', '初学', '放手'],
      unlockHint: '韦斯托利亚酿造师公会品鉴执事，绵暖的养母。绵暖在南线跑推销时，她偶尔会跟来"顺便看看"。',
    },
  ],

  // ═══════════════════ 以下城市待补全 ═══════════════════
  克朗港: [],
  费尔马克: [],
  纳维里斯: [],
  白崖城: [],
  王冠堡: [],
  铁砧渡: [],
  麦穗原: [],
  白石修道院: [],
  忠风城: [],
  翡叶城: [],
  金曦城: [],
  灶安城: [],
  灶源: [],
  雾坂: [],
  萩霞台: [],
  嗥风城: [],
  松脂镇: [],
  // ... 更多城市待后续补全
};

/** 获取某个城市可遇见的女主列表 */
export function getCityHeroines(city: string): HeroineBase[] {
  return CITY_HEROINES[city] || [];
}

/** 获取所有已分配到城市的女主 id */
export function getAllAssignedHeroineIds(): string[] {
  const ids = new Set<string>();
  for (const list of Object.values(CITY_HEROINES)) {
    for (const h of list) ids.add(h.id);
  }
  return [...ids];
}
