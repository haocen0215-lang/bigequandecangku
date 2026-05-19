// ── 深界层域静态数据表 ──
// 来源：普利莫迪亚 深界层域原始设定 + 层域档案生成器
// 深度递进法则：越深层越壮丽、越危险、资源越稀有、魔力场越高

export interface DeepRealmLayer {
  level: number;
  name: string;
  aliases: string[];
  rankRequired: string;
  zone: 'commute' | 'expedition';
  tagline: string;
  resources: string[];
  creatures: string[];
  firstImpression: string;
}

/** 深界 1-7 层已知层域 */
export const DEEP_REALMS: DeepRealmLayer[] = [
  {
    level: 1,
    name: '翠风原野',
    aliases: ['初层', '新手牧场', '绿门外'],
    rankRequired: '无要求',
    zone: 'commute',
    tagline: '比地表更纯净的温带草原——"什么都对了"的感觉。',
    resources: ['翠风莓', '光蜂蜜', '野花蜜', '溪鸣鸟蛋', '翠角鹿茸', '各色野菌', '溪鱼'],
    creatures: ['绿牙精（哥布林系）', '铁頜猪', '光蝶', '翠角鹿', '溪鸣鸟'],
    firstImpression: '踏出通道的瞬间，空气像冰凉的泉水灌进肺里。草比你见过的任何草都绿，天空蓝得有点不真实。',
  },
  {
    level: 2,
    name: '深岩矿域',
    aliases: ['二层', '矿工走道', '铁饭碗', '矮人的后花园'],
    rankRequired: '无要求',
    zone: 'commute',
    tagline: '穹顶嵌满发光矿纹的地下网络——翠绿铜、暗红铁、银白锡。',
    resources: ['深岩铁', '辉铜矿', '锡矿', '晶洞石英', '矿灯菇', '矿泉盐', '穴蝠皮'],
    creatures: ['矿蜈（巨虫系）', '岩蛛', '塌岩泥怪', '穴蝠', '矿气蛾'],
    firstImpression: '矿灯照不到穹顶。抬头只看到黑暗里蜿蜒的翠绿和暗红的光纹在缓缓呼吸。',
  },
  {
    level: 3,
    name: '千柱深林',
    aliases: ['三层', '巨木海', '树冠迷宫'],
    rankRequired: '无要求',
    zone: 'commute',
    tagline: '数百米高的巨树构成的大地——地面是根系和落叶层，天空是枝叶间透下的光柱。',
    resources: ['树冠蜜', '巨树松脂', '深林菌', '根脉香料', '光苔', '千柱藤'],
    creatures: ['树冠拟态怪', '巨蛛', '叶隼', '光苔萤'],
    firstImpression: '一棵树干比教堂还粗。往上望不见树冠，只有一层又一层的光柱从枝叶间刺下来。',
  },
  {
    level: 4,
    name: '万蔓雨林',
    aliases: ['四层', '无尽绿', '湿梦'],
    rankRequired: '黑铁',
    zone: 'expedition',
    tagline: '被藤蔓和雾气包裹的热带世界——万物都在生长、缠绕、腐烂、再生。',
    resources: ['蔓心果', '雨林香料', '藤汁酒', '巨蕨嫩芽', '林底硝石', '彩羽'],
    creatures: ['藤蟒', '雾隐猎手', '毒箭蛙', '琉璃蝶', '巨蕨龟'],
    firstImpression: '湿热的空气像一块湿毛巾捂在脸上。四面八方都是藤蔓——没有天空、没有地面、只有绿。',
  },
  {
    level: 5,
    name: '焰潮群岛',
    aliases: ['五层', '翻转之后', '黑沙海', '蓝色的底'],
    rankRequired: '青铜',
    zone: 'expedition',
    tagline: '火山群岛散落碧蓝热带海——经历四个封闭层域后，天空突然变回了完整的半球。',
    resources: ['焰潮珍珠', '黑沙盐', '礁王蟹肉', '火口湖淡水', '珊瑚虫珀', '星潮夜光藻'],
    creatures: ['礁王蟹', '深蓝鲨', '焰环海蛇', '岩隐章鱼', '风暴翼龙', '海豚群'],
    firstImpression: '从通道里摔出来，膝盖跪在黑色火山沙上。抬头——一整片海。一整片蓝。你已经一个月没看到完整的天空了。',
  },
  {
    level: 6,
    name: '澄镜牧野',
    aliases: ['六层', '镜原', '倒悬草原'],
    rankRequired: '白银',
    zone: 'expedition',
    tagline: '金色草原倒映在无风如镜的浅湖上——天地之间只剩一条极细的地平线。',
    resources: ['镜湖盐', '牧野金谷', '澄镜草汁', '天镜石', '镜湖鱼', '牧野野马'],
    creatures: ['镜面拟态兽', '草原狮鹫', '浅湖巨鳄', '牧野野马', '镜湖光鳐'],
    firstImpression: '你以为是两片天。看了很久才发现脚下是水——薄薄一层，刚好没过脚踝，映出来的天空和头顶的一模一样。',
  },
  {
    level: 7,
    name: '苍嶂群峰',
    aliases: ['七层', '云上山脉', '龙脊'],
    rankRequired: '黄金',
    zone: 'expedition',
    tagline: '云海之上的连绵山脉——峰顶如孤岛浮在白色云海上，空气稀薄但魔力浓稠。',
    resources: ['苍嶂水晶', '云海冰露', '龙骨花', '山铜矿脉', '云裂鹫羽', '峰顶雪莲'],
    creatures: ['云裂鹫（通道守护者）', '山铜石像鬼', '云海巨鳐', '冰峰雪猿', '雷翼龙'],
    firstImpression: '冷。喘不过气。但云海在晨光中翻涌，每一座峰顶都像海上的孤岛。魔力浓到皮肤发麻。',
  },
];

/** 查找层域 */
export function getRealmLayer(level: number): DeepRealmLayer | undefined {
  return DEEP_REALMS.find(r => r.level === level);
}

const RANK_ORDER = ['无要求', '黑铁', '青铜', '白银', '黄金', '秘银', '山铜', '精金'];

/** 获取玩家可进入的层域 */
export function getAccessibleRealms(rank: string): DeepRealmLayer[] {
  const idx = RANK_ORDER.indexOf(rank);
  if (idx < 0) return DEEP_REALMS.filter(r => r.rankRequired === '无要求');
  return DEEP_REALMS.filter(r => {
    const reqIdx = RANK_ORDER.indexOf(r.rankRequired);
    return reqIdx >= 0 && reqIdx <= idx;
  });
}

/** 返回法则说明 */
export function getReturnRule(level: number): string {
  if (level <= 3) return '通勤区：24小时内可从原入口返回。如同出门上山采蘑菇。';
  return '远征区：单程超24小时。返回时所有通道只通向纳维里斯主入口。';
}
