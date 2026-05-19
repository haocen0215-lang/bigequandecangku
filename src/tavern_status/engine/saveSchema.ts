// ── 主存档 Schema · 普利莫迪亚酒馆经营沙盒卡 ──
// 存档存储在 chat 变量中（一局游戏 = 一个聊天文件）
// 字段分两类：引擎用数字（不暴露给 AI） / AI 用文字标签（注入局势摘要）
// zod 4 的 z.object 需要 .default({}) 以允许空对象输入

export const SaveSchema = z.object({
  world: z
    .object({
      date: z.string().default('绿涨月15日 周三'),
      time: z.string().default('14:35'),
      weather: z.string().default('阵雨'),
      season: z.string().default('暮春'),
      currentCity: z.string().default('布拉姆维克'),
      currentLocation: z.string().default('布拉姆维克 · 灶源 · 厨房'),
    })
    .default({}),

  player: z
    .object({
      name: z.string().default(''),
      race: z.string().default('人类'),
      age: z.string().default(''),
      gender: z.string().default(''),
      background: z.string().default(''),
      cookingLevel: z.coerce
        .number()
        .default(1)
        .transform(v => _.clamp(v, 1, 8)),
      cookingLevelTitle: z.string().default('烧火工'),
      cookingCount: z.coerce.number().default(0),
      cookingLevelDesc: z.string().default('刚会生火，能把东西煮熟烤熟。'),
      hp: z.string().default('健康'),
      stamina: z.string().default('精力充沛'),
      outfit: z.string().default(''),
      money: z
        .object({
          秘银币: z.coerce.number().default(0),
          铂金币: z.coerce.number().default(0),
          金币: z.coerce.number().default(0),
          银币: z.coerce.number().default(0),
          铜币: z.coerce.number().default(0),
        })
        .default({}),
    })
    .default({}),

  tavern: z
    .object({
      name: z.string().default('铁壶酒馆'),
      city: z.string().default('布拉姆维克'),
      style: z.string().default(''),
      regions: z
        .record(
          z.string(),
          z
            .object({
              facilities: z.array(z.string()).default([]),
              decorations: z.array(z.string()).default([]),
              status: z.string().default('整洁'),
              vibe: z.string().default(''),
            })
            .default({}),
        )
        .default({}),
    })
    .default({}),

  inventory: z
    .record(
      z.string(),
      z
        .object({
          数量: z.coerce.number().default(0),
          单位: z.string().default('份'),
          分类: z.string().default('其他'),
          风味标签: z.array(z.string()).default([]),
          烹饪手法: z.string().default(''),
          售价铜币: z.coerce.number().default(0),
        })
        .default({}),
    )
    .default({}),

  farms: z
    .record(
      z.string(),
      z
        .object({
          type: z.string().default('作物'),
          status: z.string().default('刚播下种子，土还是湿的'),
          plantedAt: z.string().default(''),
        })
        .default({}),
    )
    .default({}),

  brews: z
    .record(
      z.string(),
      z
        .object({
          ingredients: z.array(z.string()).default([]),
          container: z.string().default(''),
          aging: z.string().default('刚封桶——闻着还是原料的味道'),
          startedAt: z.string().default(''),
        })
        .default({}),
    )
    .default({}),

  employees: z
    .record(
      z.string(),
      z
        .object({
          race: z.string().default(''),
          role: z.string().default(''),
          personality: z.string().default(''),
          currentState: z.string().default(''),
          wage: z.string().default(''),
        })
        .default({}),
    )
    .default({}),

  businesses: z
    .record(
      z.string(),
      z
        .object({
          type: z.string().default(''),
          status: z.string().default('运营中'),
          investment: z.string().default(''),
          incomeNote: z.string().default(''),
          note: z.string().default(''),
        })
        .default({}),
    )
    .default({}),

  relationships: z
    .record(
      z.string(),
      z
        .object({
          displayName: z.string().default(''),
          race: z.string().default(''),
          city: z.string().default(''),
          personality: z.string().default(''),
          affinity: z.coerce
            .number()
            .default(0)
            .transform(v => _.clamp(v, 0, 100)),
          intimacyStage: z.coerce
            .number()
            .default(1)
            .transform(v => _.clamp(v, 1, 8)),
          affinityLabel: z.string().default('初次见面，还在互相打量'),
          intimacyDesc: z.string().default(''),
          dailyAffinityChange: z.coerce.number().default(0),
          currentActivity: z.string().default(''),
          stamina: z.string().default('状态良好'),
          bladder: z.string().default('舒适'),
          outfit: z.string().default(''),
        })
        .default({}),
    )
    .default({}),

  reputation: z
    .object({
      tavernFame: z.string().default('略有耳闻'),
      adventurerFame: z.string().default('无名'),
      businessFame: z.string().default('无名'),
      factionStandings: z.record(z.string(), z.string()).default({}),
    })
    .default({}),

  recipes: z
    .record(
      z.string(),
      z
        .object({
          ingredients: z.array(z.string()).default([]),
          method: z.string().default(''),
          result: z.string().default(''),
          conflictLevel: z.string().default(''),
          createdAt: z.string().default(''),
        })
        .default({}),
    )
    .default({}),

  ledger: z
    .object({
      totalDays: z.coerce.number().default(0),
      totalGuests: z.coerce.number().default(0),
      totalRoomNights: z.coerce.number().default(0),
      totalRevenueCopper: z.coerce.number().default(0),
    })
    .default({}),

  meta: z
    .object({
      schemaVersion: z.coerce.number().default(1),
      lastTickAt: z.string().default(''),
      createdAt: z.string().default(''),
    })
    .default({}),
});

export type GameSave = z.infer<typeof SaveSchema>;
