// ── 访客生成引擎 ──
// 1d10000 → 四位 ABCD 解码
// 参考普利莫迪亚 酒馆访客生成引擎（村庄版）

export type VisitorTag = {
  headCount: number;
  headLabel: string;
  level: string;
  demand: string;
  moodOrGroup: string;
  tagLine: string;
  raw: number;
};

export function rollVisitor(): VisitorTag {
  const raw = Math.floor(Math.random() * 10000);
  const abcd = String(raw).padStart(4, '0');
  const A = parseInt(abcd[0], 10);
  const B = parseInt(abcd[1], 10);
  const C = parseInt(abcd[2], 10);
  const D = parseInt(abcd[3], 10);

  let headCount: number, headLabel: string;
  if (A <= 4) {
    headCount = 1;
    headLabel = '1人（单人，A=0-4）';
  } else if (A <= 7) {
    headCount = 2;
    headLabel = '2人（A=5-7）';
  } else if (A === 8) {
    headCount = 3;
    headLabel = '3人（A=8）';
  } else {
    headCount = 4;
    headLabel = '4人（A=9）';
  }

  const levelByB = [
    'T1·底层 [流浪者/乞丐/逃兵/囊中羞涩/潜在麻烦/警惕麻木]',
    'T2·普通民众 [农夫/牧民/矿工/日常主客流/消费求实/朴实]',
    'T2·普通民众 [农夫/牧民/矿工/日常主客流/消费求实/朴实]',
    'T2·普通民众 [农夫/牧民/矿工/日常主客流/消费求实/朴实]',
    'T3·技术民众 [匠人/伙计/学徒/略有闲钱/偶尝新奇]',
    'T3·技术民众 [匠人/伙计/学徒/略有闲钱/偶尝新奇]',
    'T4·专业人士 [行商/低级冒险者/巡逻兵/见多识广/中等消费]',
    'T4·专业人士 [行商/低级冒险者/巡逻兵/见多识广/中等消费]',
    'T5·有影响力 [富商/中级冒险者/骑士/学者/引人注目/高消费]',
    'T6+·区域重要 [大商人/高级冒险者/贵族/大事件/极高消费/可能隐瞒身份]',
  ];
  const level = levelByB[B] || levelByB[0];

  const demandByC = [
    'A·基础消费 [吃饭/喝酒/住宿/避雨/歇脚/打包]',
    'B·社交聚会 [等人/庆祝/买醉/闲聊/约会/带人体验]',
    'C·信息流通 [打听/散播传闻/送信/寻人/听故事]',
    'D·商务交易 [推销/谈生意/雇人/卖情报/寻货]',
    'E·求助庇护 [受伤/躲避/走投无路/求建议/藏物]',
    'F·冲突敌意 [找茬/催债/查访/盯梢/偷窃/勒索]',
    'G·特殊需求 [定制/挑战厨艺/包场/求职/投诉/带稀有食材]',
    'H·无特定目的 [路过好奇/陪同/习惯性常客]',
    'X·复合诉求 [结合上述任意两类，如喝酒+打听]',
    'Y·意外突发 [打破常规/情境驱动/深界生物/罕见事件]',
  ];
  const demand = demandByC[C] || demandByC[0];

  let moodOrGroup: string;
  const solo = headCount === 1;
  if (solo) {
    const moodByD = [
      '无特殊 [正常状态/自然表现]',
      '无特殊 [正常状态/自然表现]',
      '无特殊 [正常状态/自然表现]',
      '友善健谈 [心情好/主动搭话/赞美/分享见闻]',
      '友善健谈 [心情好/主动搭话/赞美/分享见闻]',
      '疲惫焦急 [赶路/急事/没耐心/状态不佳]',
      '疲惫焦急 [赶路/急事/没耐心/状态不佳]',
      '警惕沉默 [不愿多言/暗中观察/可能有秘密]',
      '携带传闻 [主动或被动透露外部世界/深界/商路的新消息]',
      '特殊状况 [带伤/伪装/异常物品/魔法影响/血族]',
    ];
    moodOrGroup = moodByD[D] || moodByD[0];
  } else {
    const groupByD = [
      '冒险队伍 [明确分工/战友默契/粗犷调侃]',
      '冒险队伍 [明确分工/战友默契/粗犷调侃]',
      '商旅同行 [利益绑定/表面和气/各有算盘]',
      '家人亲属 [血缘婚姻/亲昵摩擦/外人难融]',
      '朋友同伴 [私人交情/放松自然/吵闹默契]',
      '师徒上下级 [等级差/服从权威/严厉或温和]',
      '雇佣关系 [雇主与护卫帮工/责任边界明确/金钱维系]',
      '临时结伴 [拘谨客气/互不了解/潜在化学反应]',
      '暗中对立 [表面同行/内部矛盾/监视利用/暗流涌动]',
      '特殊关系 [囚犯与押送/仇敌被迫同行/政治联姻随行]',
    ];
    moodOrGroup = groupByD[D] || groupByD[0];
  }

  const tagLine = solo
    ? `【单人·${level}·${demand}·${moodOrGroup}】`
    : `【${headCount}人·${level}·${demand}·${moodOrGroup}】`;

  return { headCount, headLabel, level, demand, moodOrGroup, tagLine, raw };
}
