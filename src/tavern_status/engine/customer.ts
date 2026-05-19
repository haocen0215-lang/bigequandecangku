// ── 顾客满意引擎 ──
// 输入菜品标签包 + 顾客种族 + 氛围标签 → 满意/不满

import { ConflictLevel } from './labels';

export type CustomerResult = {
  satisfaction: '非常满意' | '满意' | '一般' | '不满' | '非常不满';
  tipChance: number;
  willSpreadGoodWord: boolean;
  willSpreadBadWord: boolean;
  narrative: string;
};

export function evaluateCustomer(conflictLevel: ConflictLevel, _customerRace: string, vibe: string): CustomerResult {
  const vibeBonus = vibe ? 0.1 : 0;

  const map: Record<ConflictLevel, CustomerResult> = {
    奇迹: {
      satisfaction: '非常满意',
      tipChance: 0.7 + vibeBonus,
      willSpreadGoodWord: true,
      willSpreadBadWord: false,
      narrative: '客人吃完之后愣了几秒，然后默默地加了一份。旁边的人看见了，也跟着点了一份。',
    },
    绝佳搭配: {
      satisfaction: '非常满意',
      tipChance: 0.5 + vibeBonus,
      willSpreadGoodWord: true,
      willSpreadBadWord: false,
      narrative: '客人吃完最后一口才放下筷子，走的时候特意绕到吧台前说了句"今晚的菜不错"。',
    },
    经典搭配: {
      satisfaction: '满意',
      tipChance: 0.3 + vibeBonus,
      willSpreadGoodWord: true,
      willSpreadBadWord: false,
      narrative: '盘子干净了。客人靠在椅背上，脸上带着吃饱了的那种放松表情。',
    },
    无冲突: {
      satisfaction: '一般',
      tipChance: 0.1,
      willSpreadGoodWord: false,
      willSpreadBadWord: false,
      narrative: '客人吃完了，没什么特别的反应。好吃但没什么印象——下次可能来也可能不来。',
    },
    轻微冲突: {
      satisfaction: '不满',
      tipChance: 0,
      willSpreadGoodWord: false,
      willSpreadBadWord: true,
      narrative: '客人嚼了几下，眉头皱了起来。放下了筷子又拿起来，最后叹了口气吃完了。出门的时候跟同伴嘀咕了句什么。',
    },
    严重冲突: {
      satisfaction: '非常不满',
      tipChance: 0,
      willSpreadGoodWord: false,
      willSpreadBadWord: true,
      narrative:
        '客人第一口就停住了。他盯着盘子看了几秒，然后把筷子搁在碗边上——那个动作很慢，很郑重。他什么都没说就走了。',
    },
    灾难级: {
      satisfaction: '非常不满',
      tipChance: 0,
      willSpreadGoodWord: false,
      willSpreadBadWord: true,
      narrative:
        '客人只咬了一口就放下了。他喝了大半杯水，起身的时候椅子在地上刮出了很响的一声。门口的人都转头看了过来。',
    },
  };

  return map[conflictLevel] || map['无冲突'];
}
