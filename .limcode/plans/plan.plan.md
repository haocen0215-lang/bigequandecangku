<!-- LIMCODE_SOURCE_ARTIFACT_START -->
{"type":"design","path":".limcode/design/s1-玩法边界定义与ai权限.md","contentHash":"sha256:1eda26d20f9f1c3b9206a8dd9b4da06e69cdaefe6254ef8835f87498b63faa4b"}
<!-- LIMCODE_SOURCE_ARTIFACT_END -->

## TODO LIST

<!-- LIMCODE_TODO_LIST_START -->
- [x] 存档系统：主存档 Schema + 读写服务 + 迁移  `#1`
- [x] 引擎层：标签映射表 + 8个引擎  `#2`
- [x] Action 类型定义 + dispatcher  `#3`
- [x] AI 生成服务：局势摘要 + generate + 购物货品 + 世界书路由  `#4`
- [x] 前端 UI：新增7个面板 + 导航 + 按钮绑定  `#5`
- [ ] 调试面板：存档查看/日志/健康检查  `#6`
- [ ] 设定补全：女主分布 + 深界8+层域  `#7`
<!-- LIMCODE_TODO_LIST_END -->

# 普利莫迪亚酒馆经营沙盒卡 — 实施计划 (V7)

> 基于 S1·V7「伪0层架构版」：前端是客户端，脚本是引擎裁判，AI 只做叙述者。
> 灶火行会版引擎规则是脚本实现的参考规范。

---

## 架构总览

```
前端(index.html + script.js)
    │  玩家点击按钮：做菜/种田/采购/建造/冒险/互动
    ▼
dispatcher (动作入口)
    │  校验 Action、检查前置条件、扣材料/金币
    ▼
engine (脚本引擎 — TypeScript)
    │  结算：菜品标签包/价格/冲突判定/产量/好感/金钱/声望
    │  产出：文字标签（给AI看）+ 数字（引擎自用）
    ▼
chat 变量存档 → 触发 MESSAGE_UPDATED → UI刷新
    │
    ▼
situationBuilder → 局势摘要（全是文字标签，无数字）
    │
    ▼
generate → AI叙事（纯叙述，不改任何变量）
    │
    ▼
前端显示AI回复 + 刷新界面
```

---

## 第一阶段：存档系统

### 任务 1：主存档 Schema (`engine/saveSchema.ts`)

存档用 chat 变量，一局游戏绑定一个聊天文件。全部字段分两类：
- **引擎用数字**（金币/数量/份量格位/好感度数值）：不暴露给 AI
- **AI 用文字标签**（状态描述/氛围/陈酿阶段/好感状态）：注入到局势摘要

核心结构：world / player（+ 8级烹饪体系+穿着+精力HP） / tavern（区域+设施+装饰+氛围标签） / 库存 / 农田 / 酿酒桶 / 员工（纯文字） / 产业 / 关系（女主·好感文字+每日上限） / 声望（文字标签） / 食谱笔记 / 账本

### 任务 2：存档读写服务 (`services/saveService.ts`)

loadSave / writeSave / createInitialSave。用 `getVariables({type:'chat'})` + `updateVariablesWith`。

### 任务 3：存档迁移 (`services/migration.ts`)

Schema version 变更时自动迁移旧存档结构。

---

## 第二阶段：引擎层

### 任务 4：文字标签映射表 (`engine/labels.ts`)

- 烹饪8级标签（烧火工→灶火宗师，每级的能力描述文字）
- 作物生长状态标签（7阶段轮转）
- 陈酿状态标签（6阶段轮转）
- 好感度状态标签（8阶段，每阶段1句话）
- 搭配等级标签（灾难→奇迹，7级）
- 份量格位标签（5格维度+4格维度）
- 顾客满意度标签

### 任务 5：烹饪引擎 (`engine/cooking.ts`)

参考灶火行会版11步引擎规则，TypeScript 实现：

1. **食材角色分配** — 主料/副主料/配菜/配味/芳香底味。未分类物品按物理特性推导
2. **份量确认** — 核心机制。调味类份量→格位映射（5格/4格维度表）。多维度调味料独立计算。主料配菜不受格数控制
3. **烹饪方式选择** — 从当前等级已解锁手法中选择。工序可组合
4. **菜名生成** — 按公式或自由发挥
5. **搭配等级检测**（7级）— 负面优先判定。严重冲突条件表。奇迹双路径
6. **标签推导** — 味觉=份量格位。气息=食材+工序。口感=工序产出。结构型风味=搭配等级
7. **菜品分类** — 下酒菜/简餐/正餐/招牌菜/甜品
8. **等级修正** — 影响工序精度和失误率
9. **产量计算** — 同样食材，等级越高产出越多（×1→×6）
10. **定价** — `Σ食材成本 ÷ 产量 × 等级倍率 × 地点系数`
11. **标签包输出与保存** — 结构化标签包写入变量

### 任务 6：酱料引擎 (`engine/sauce.ts`)

独立引擎。输出标签包挂载到菜品引擎 [自制酱料] 下。特有质量维度：挂壁包裹感/浓稀度/融合度。化学冲突条件表。不单独定价。

### 任务 7：饮品引擎 (`engine/drink.ts`)

独立引擎。醉度机制（仅酒类，5格，蒸馏酒+1格，加热-1格）。时间维度（即饮/浸制/酿造）。时间倍率影响定价。可被菜品引擎引用。

使用分析工具检查 `示例/普利莫迪亚/角色卡示例/🧩食味体验第二版.txt` 以确保标签词汇正确映射。

### 任务 8：种田引擎 (`engine/farming.ts`)

作物状态文字标签轮转。随机事件（虫害/暴风雨/意外丰收）。收获→自动写入库存。

### 任务 9：酿酒引擎 (`engine/brewing.ts`)

陈酿状态文字标签轮转。开桶→售价倍率。与饮品引擎的发酵/陈酿路径协调。

### 任务 10：顾客满意引擎 (`engine/customer.ts`)

输入：菜品标签包+顾客种族+氛围标签。输出：满意/不满+小费概率。

### 任务 11：访客生成引擎 (`engine/visitors.ts`)

1d10000→四位ABCD解码→人数/等级/诉求/氛围或团体关系。种族由城市人口构成决定。AI即兴人设。

### 任务 12：经营快进引擎 (`engine/tavernTick.ts`)

跳过期间→客流判定→售出分配→库存扣减→收支结算→声望结算→经营日报。打断骰触发访客事件。

---

## 第三阶段：动作派发

### 任务 13：Action 类型定义 (`actions.ts`)

```typescript
type GameAction =
  | { type:'COOK_SINGLE'; ingredients:string[]; method:string; target?:string }
  | { type:'COOK_BATCH'; ingredients:string[]; method:string; quantity:number }
  | { type:'MAKE_SAUCE'; ingredients:string[]; method:string }
  | { type:'MAKE_DRINK'; ingredients:string[]; method:string }
  | { type:'SERVE_DISH'; dishName:string; portions:number }
  | { type:'PLANT_CROP'; cropName:string; plot:string }
  | { type:'HARVEST'; cropName:string }
  | { type:'START_BREW'; ingredients:string[]; container:string }
  | { type:'OPEN_BREW'; brewId:string }
  | { type:'BUY_ITEMS'; items:{name:string;qty:number}[]; vendorId:string }
  | { type:'BUY_FACILITY'; facilityName:string; regionId:string }
  | { type:'ADD_DECORATION'; decoration:string; regionId:string }
  | { type:'RENOVATE'; regionId:string; newStyle:string }
  | { type:'HIRE_EMPLOYEE'; name:string; role:string; wage:string }
  | { type:'FIRE_EMPLOYEE'; employeeId:string }
  | { type:'START_BUSINESS'; businessName:string; type:string; investment:string }
  | { type:'GO_ADVENTURE'; destination:string; party:string[] }
  | { type:'COMMISSION_ADVENTURERS'; destination:string; budget:number }
  | { type:'TRAVEL'; destination:string }
  | { type:'INTERACT_NPC'; npcId:string; action:string }
  | { type:'GIFT_NPC'; npcId:string; item:string }
  | { type:'OPEN_TAVERN'; hours:number }
  | { type:'CLOSE_TAVERN' }
  | { type:'FAST_FORWARD'; hours:number }
  | { type:'ROLL_VISITOR' }
  | { type:'CHAT'; text:string }
  | { type:'REQUEST_VENDOR_STOCK' };  // 走到摊贩前→AI 生成货品列表
```

### 任务 14：dispatcher (`dispatcher.ts`)

统一的 `dispatchAction(save, action) → ActionResult`。校验前置条件→调用对应引擎→产出文字结果+更新save→日志写入chat楼层（战报）→返回 ActionResult（含 shouldAskAI 标志）。所有 Action 走这个唯一入口。

---

## 第四阶段：AI 生成服务

### 任务 15：局势摘要构建 (`services/situationBuilder.ts`)

从存档提取 AI 叙事需要的一切——**全部是文字标签，没有数字**：

```
[权威局势]
时间/天气/季节 | 当前位置
酒馆名 | 风格 | 氛围标签
玩家（姓名/种族/烹饪等级+等级说明/HP/精力/穿着）
在场员工（名字+当前状态文字）
在场女主（名字+好感状态文字+当前行为）
在场客人描述
刚发生的事（引擎结算摘要）

[AI权限提示]
你只负责AIRP和叙事。不要改变量、不要给数字结论。
把所有引擎结果写成自然的场景描写。
```

### 任务 16：AI 生成服务 (`services/generateService.ts`)

封装 generate 调用。局势摘要作为用户输入注入。支持流式生成。AI 回复写入 chat 楼层（不写变量——变量由引擎管理）。

### 任务 17：购物货品生成 (`services/vendorStockService.ts`)

接到 `REQUEST_VENDOR_STOCK`→构建局势摘要（当前城市/季节/摊贩类型）→调用 AI 生成 4-8 种本地当季食材列表（带价格）→前端展示→用户选购→ `BUY_ITEMS` Action 结算。

### 任务 18：世界书路由 (`services/worldbookRouter.ts`)

根据当前城市/季节/在场种族/活动类型生成扫描文本，激活对应的世界书条目。普利莫迪亚使用 §锚点引用体系。

---

## 第五阶段：前端 UI

### 任务 19：新增面板

当前已有：剧情/酒馆/库存/购物/账本/玩家档案/角色/地图。

新增：**种田面板**（作物列表+生长状态文字+种新/收获） | **酿酒面板**（发酵桶+陈酿状态+开桶） | **建造面板**（区域+设施标签+装饰品+翻修风格） | **员工面板**（员工列表文字+招聘/解雇） | **产业面板**（产业列表+新建） | **冒险面板**（委托+组队+深界层域） | **女主面板**（好感状态文字+互动入口）

### 任务 20：全局 UI 改造

剧情页→AI 回复流式显示区。HUD 和所有面板从读 MVU 变量改为读 chat 变量。按钮触发 dispatchAction→引擎结算→局势摘要→AI 叙事→刷新。输出区改为 AI 回复显示。

### 任务 21：开局界面

新聊天检测（楼层=0）→显示开局对话界面→<user> 输入设定→AI 追问→确认→脚本写入初始变量→AI 生成第一条消息→进入正常营业。

---

## 第六阶段：调试面板

### 任务 22：调试面板 UI + 健康检查

当前存档 JSON（只读）/ 导出导入存档 / 最近 Action 日志 / 局势摘要预览 / 健康检查（金钱非负、引用完整性、标签有效性）。创建 `engine/healthCheck.ts`。

---

## 第七阶段：设定补全

### 任务 23：女主分配各城市 + 阶段控制器 + 世界书补全

从普利莫迪亚已有设定整理。新增女主按城市分配。阶段控制器参考橘柒/绵暖/阿黛拉模式。补齐深界 8+ 层域生成规则。
