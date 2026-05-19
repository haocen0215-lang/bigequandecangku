# 大型前端卡AIRP伪0层玩法教程

写在前面：这不是戴森球教程。

戴森球只是一个样板。真正重要的是它背后的结构。

这个结构可以做沙盒，可以做RPG，可以做MMORP，可以做大世界探索，可以做战斗，也可以做修仙世界。

它的核心不是“前端好看一点”，也不是“状态栏功能多一点”。

核心是：

```
酒馆负责后端能力。
前端负责玩法客户端。
脚本负责规则裁判。
AI只负责AIRP、叙述、建议、气氛和角色感。
```

这就是我这里说的`伪0层`。

不是模型真的多了一层，也不是酒馆真的变成了游戏服务器。

而是玩家的体验上，原本的酒馆输入框和AI变量更新都退到后面去了。

玩家第一眼看到的是一个完整前端。

玩家点按钮、切地图、打怪、修炼、建造、接任务、开背包、看世界。

前端先把这些事处理完，再把结果告诉AI。

AI不再负责“算对不对”。

AI只负责把已经发生的事讲得像真的。

---

## 一：为什么需要伪0层

传统酒馆玩法的问题很明显。

玩家输入一句话，AI输出一段剧情，顺便输出变量更新。

看起来很自由，但只要玩法变大，就会出问题。

最常见的就是这几个：

```
AI忘记更新变量。
AI把变量名写错。
AI把数值算错。
AI给了不该给的奖励。
AI让玩家跳过了前置条件。
AI把世界书、变量、剧情三件事混在一起。
```

小卡还能靠提示词压住。

大型玩法压不住。

因为大型玩法里，错误不是一句话写崩那么简单。

一个资源数错了，后面的建造全错。

一个地点没更新，地图和剧情全错。

一次战斗奖励乱发，装备、经验、经济系统全错。

一次修炼境界乱跳，后面整个修仙世界都会变味。

所以大型前端卡的第一原则就是：

```
凡是会影响玩法连续性的东西，都不要交给AI。
```

AI可以写“你感到灵气在经脉里奔涌”。

AI不该决定`修炼进度+17`。

AI可以写“敌人的剑光擦过肩头”。

AI不该决定`玩家扣血31点，敌人进入流血状态`。

AI可以写“莱姆建议你补一条铜线产线”。

AI不该直接把`铜线+300`写进存档。

这个边界一旦立住，大型玩法才会稳定。

---

## 二：伪0层到底是什么

伪0层就是把原本“AI输出驱动世界”的顺序反过来。

传统顺序是：

```
玩家输入
→ AI理解玩家想做什么
→ AI写剧情
→ AI顺便更新变量
→ 前端读取变量显示结果
```

伪0层顺序是：

```
玩家在前端操作
→ 前端把操作变成Action
→ 脚本先tick现实时间
→ dispatcher校验Action是否合法
→ engine结算资源/战斗/地点/队列/状态
→ 写入chat变量存档
→ 构造局势摘要
→ 请求AI叙述
→ AI只根据局势说话
→ 前端显示回复
→ 可选写入酒馆聊天楼层
```

区别就在这里。

传统玩法里，AI是世界裁判。

伪0层里，AI是叙述者。

`裁判权`从AI手里拿回来，交给前端脚本。

这不是削弱AIRP。

恰恰相反，这是保留AIRP。

因为AI不用再分心算资源、算冷却、算境界、算伤害，它反而可以专心做人、做NPC、做旁白、做气氛。

---

## 三：AIRP的核心保留在哪里

很多人会误解，觉得“AI不改变量”就等于AI没用了。

不是。

AI最擅长的东西从来不是算数。

AI最擅长的是：

```
角色语气。
场景气氛。
NPC反应。
情绪流动。
对玩家行为的解释。
把冷冰冰的结算结果写成活着的世界。
```

所以大型前端卡里，AI应该被放在它最强的位置上。

举个例子。

前端结算完战斗：

```
玩家行动: 横斩
命中: true
伤害: 37
敌人状态: 破甲1层
玩家生命: 82/100
敌人生命: 41/120
地形: 雨夜山道
在场NPC: 沈若水
```

这时候AI不需要再算伤害。

AI只需要把它写成：

```
刀锋压着雨线横过去，撞上对方护体灵光的那一刻，灵光像瓷片一样裂开一层。

沈若水没有出声，只是往你这边踏了半步。

对方的肩膀被震得一偏，气息终于乱了。
```

这才是AIRP。

AI没有控制战斗，但它让战斗变得像真的。

再比如修仙。

脚本已经决定：

```
修炼方式: 闭关打坐
消耗: 聚气丹x1
进度: 68 → 82
心魔风险: 未触发
寿元变化: 0
地点: 青玄宗后山洞府
```

AI只负责叙述：

```
洞府里的灵气被阵纹一圈圈压低，最后像潮水一样贴着地面涌过来。

那枚聚气丹化开的速度比你预想中更快。

经脉没有刺痛，只是发热。

这次很稳。
```

这比让AI自己决定“修炼成功没有、加多少进度、扣不扣丹药”稳定太多。

---

## 四：酒馆接口在这里各自负责什么

大型前端卡不是脱离酒馆。

恰好相反，它是把酒馆的能力拆开用。

每个接口都有自己的位置。

### 变量接口

变量接口负责存档。

最重要的是`chat变量`。

因为一局游戏通常绑定一个聊天文件。

大型玩法的主存档，应该优先放在`chat变量`里。

```
chat变量:
  当前一局游戏的主存档
  地点、资源、任务、战斗、队列、科技、NPC状态、世界阶段

character变量:
  跨聊天长期内容
  默认设置、玩家偏好、已解锁主题、长期成就

script变量:
  UI设置
  窗口位置、主题、音量、面板折叠、快捷键

message变量/MVU:
  楼层快照
  兼容状态栏、回放、某一楼的展示数据
```

关键点：

```
主存档不要放在AI输出里。
主存档不要依赖AI写MVU命令。
主存档应该由脚本用变量接口读写。
```

常见写法是：

```ts
const SAVE_KEY = 'myLargeFrontendCard';

async function loadSave() {
  const variables = getVariables({ type: 'chat' });
  return SaveSchema.parse(variables[SAVE_KEY] ?? createInitialSave());
}

async function writeSave(save: GameSave) {
  await updateVariablesWith(variables => {
    variables[SAVE_KEY] = {
      schemaVersion: SAVE_SCHEMA_VERSION,
      savedAt: Date.now(),
      save,
    };
    return variables;
  }, { type: 'chat' });
}
```

注意这里的重点不是代码本身。

重点是：

```
读存档和写存档都从同一个入口走。
所有写入都带schemaVersion。
所有读取都先经过zod校验和迁移。
```

### 聊天楼层接口

聊天楼层接口负责记录。

它不是主存档。

它更像“战报”和“剧本回放”。

比如玩家在前端和莱姆说话，最后可以写入酒馆楼层：

```ts
await createChatMessages([
  {
    role: 'user',
    name: '指挥官',
    message: userText,
    data: {},
    extra: {
      frontendCard: {
        type: 'player_input',
        savedAt: Date.now(),
      },
    },
  },
  {
    role: 'assistant',
    name: '莱姆',
    message: assistantText,
    data: {},
    extra: {
      frontendCard: {
        type: 'ai_reply',
        savedAt: Date.now(),
      },
    },
  },
]);
```

这样做的好处是：

```
酒馆聊天记录仍然完整。
玩家可以回看剧情。
AI下次生成可以读到最近对话。
但真正的资源、地点、任务、战斗结果仍然以chat变量为准。
```

### 生成接口

生成接口负责请AI说话。

`generate`适合保留酒馆预设和角色卡氛围。

`generateRaw`适合你想完全自己构造提示词时使用。

大型前端卡通常优先用`generate`。

因为我们不是要抛弃酒馆预设，而是要让酒馆预设服务于AIRP。

典型生成流程：

```ts
const reply = await generate({
  user_input: playerText,
  should_stream: true,
  max_chat_history: 24,
  injects: buildInjects(save),
  overrides: {
    temperature: 0.8,
  },
});
```

但必须记住：

```
generate返回的是叙述文本。
不是变量更新。
不是存档补丁。
不是函数调用结果。
```

如果AI说“我已经帮你建好了采矿机”，那也只是它说了这句话。

真正有没有建好，看脚本存档。

### 注入接口

注入接口负责把当前局势告诉AI。

这里有两个核心用法。

第一个是`世界书扫描`。

你可以注入一段不直接进入上下文、只用于激活世界书条目的扫描文本。

```ts
{
  position: 'none',
  depth: 0,
  role: 'system',
  should_scan: true,
  content: [
    '[大型前端卡]',
    '区域:东荒妖域',
    '地点:青玄宗后山',
    '阶段:筑基期',
    '玩法:修炼',
    '危机:心魔潜伏',
  ].join('\n'),
}
```

这很重要。

因为大世界不能把所有设定都常驻。

脚本知道玩家在哪，所以脚本决定激活哪些世界书。

AI不需要自己翻世界书。

第二个是`局势摘要`。

这段会直接告诉AI当前发生了什么。

```ts
{
  position: 'in_chat',
  depth: 0,
  role: 'system',
  should_scan: false,
  content: [
    '你现在只负责AIRP、叙述、建议和角色互动。',
    '所有资源、战斗、修炼、地点、任务结果都由前端脚本决定。',
    '不要输出变量更新、JSON、MVU命令、函数调用或世界书编辑指令。',
    '',
    '当前权威局势:',
    buildSituationSummary(save),
  ].join('\n'),
}
```

这里的关键词是`权威局势`。

AI只能围绕它说话。

不能反过来改它。

### 世界书接口

世界书接口负责安装、维护和调试设定。

它可以做：

```
创建世界书。
读取世界书。
更新条目。
删除条目。
调整启用状态。
做作者调试面板。
```

但不建议把世界书写入能力交给AI。

原因很简单：

```
世界书是设定层。
AI是叙述层。
设定层不能让叙述层随手改。
```

更好的做法是：

```
作者或玩家在调试面板里管理世界书。
脚本根据当前地点、阶段、任务、NPC、危机生成扫描词。
世界书被动响应扫描词。
AI只读被激活的内容。
```

### 事件接口

事件接口负责监听酒馆和生成过程。

常用场景：

```
监听流式生成，把AI回复实时显示在前端通讯区。
监听聊天切换，重载或重新读取存档。
监听消息更新，刷新楼层快照。
监听脚本按钮，打开全屏前端。
```

典型流式写法：

```ts
const stop = eventOn(iframe_events.STREAM_TOKEN_RECEIVED_FULLY, (fullText, generationId) => {
  if (generationId !== currentGenerationId) return;
  updateFrontendMessage(fullText);
});

try {
  await generate({ generation_id: currentGenerationId, should_stream: true });
} finally {
  stop.stop();
}
```

事件接口的作用是让体验顺。

不是让AI重新变成裁判。

### 酒馆接口和酒馆助手接口怎么分

这里要讲清楚。

大型前端卡里，优先级应该是：

```
第一优先级：酒馆助手接口
第二优先级：酒馆原生导出的接口
第三优先级：STScript命令
```

原因很简单。

酒馆助手接口已经把很多酒馆能力包装成更适合代码调用的函数。

比如：

```text
变量读写 → getVariables / updateVariablesWith / replaceVariables
聊天楼层 → getChatMessages / createChatMessages / setChatMessages
AI生成 → generate / generateRaw
提示词注入 → injects / injectPrompts
世界书 → getWorldbook / updateWorldbookWith / createWorldbookEntries
事件监听 → eventOn
```

这些接口在前端界面或脚本里通常可以直接用。

不要每次都自己从`window.parent`里翻酒馆对象。

也不要一上来就写`triggerSlash`。

`triggerSlash`适合做最后兜底。

比如某个能力只有酒馆斜杠命令能做，才考虑它。

大型前端卡的稳定写法是：

```
能用酒馆助手接口，就用酒馆助手接口。
酒馆助手没有，再考虑酒馆原生接口。
酒馆原生也没有，再考虑STScript。
```

脚本和前端界面还有一个区别。

```
前端界面:
  运行在自己的iframe里
  适合做楼层内界面或完整客户端界面

脚本:
  后台运行
  可以操纵酒馆页面
  适合创建全屏iframe、挂载按钮、监听酒馆事件
```

大型前端卡通常用`脚本做入口`。

脚本负责把全屏客户端挂到酒馆页面上。

真正的玩法界面在iframe里运行。

这样既能接管体验，也能保留酒馆后端能力。

---

## 五：大型前端卡的真正目录结构

大型玩法不要把所有东西塞进一个组件。

也不要让一个store同时负责UI、存档、规则、生成、世界书、战斗。

大型前端卡应该像一个游戏客户端。

最稳的拆法是：

```text
components/
  只负责显示和发出玩家意图

data/
  静态配置
  资源表、建筑表、技能表、敌人表、地点表、任务表、境界表

engine/
  规则层
  tick、战斗、修炼、生产、任务、掉落、冷却、校验

stores/
  状态层
  Pinia读取存档、计算展示数据、调用dispatcher

services/
  酒馆接口适配层
  存档读写、AI生成、聊天楼层、世界书路由

types/
  类型定义
```

最重要的是`engine`。

`engine`是玩法裁判。

组件不能直接改资源。

组件不能直接改境界。

组件不能直接给经验。

组件只能发出意图。

```
玩家点击“修炼”
→ 组件发出 CULTIVATION_START
→ dispatcher校验丹药、地点、状态
→ engine扣除材料并设置修炼队列
→ store刷新界面
```

这样未来玩法变大时，你才不会炸。

因为你知道所有规则都在哪里。

---

## 六：Action是大型玩法的骨架

大型前端卡最怕的是“到处都能改存档”。

今天按钮A改一次资源。

明天按钮B改一次任务。

后天AI回复事件里又改一次状态。

最后你根本不知道某个数是谁改的。

所以必须有`统一动作派发`。

```ts
type GameAction =
  | { type: 'LOCATION_CHANGE'; locationId: string }
  | { type: 'QUEST_ACCEPT'; questId: string }
  | { type: 'COMBAT_SKILL_USE'; skillId: string; targetId: string }
  | { type: 'CULTIVATION_START'; methodId: string; itemIds: string[] }
  | { type: 'CRAFT_START'; recipeId: string; count: number }
  | { type: 'COMMS_SEND'; text: string }
  | { type: 'TICK_NOW' };
```

然后只有一个入口：

```ts
function dispatchAction(save: GameSave, action: GameAction): ActionResult {
  tickSave(save, Date.now());

  switch (action.type) {
    case 'CULTIVATION_START':
      return startCultivation(save, action);

    case 'COMBAT_SKILL_USE':
      return useCombatSkill(save, action);

    case 'QUEST_ACCEPT':
      return acceptQuest(save, action);

    case 'COMMS_SEND':
      return sendToNarrator(save, action);

    default:
      return { ok: false, tone: 'red', message: '未知动作。' };
  }
}
```

`ActionResult`也要固定。

```ts
type ActionResult = {
  ok: boolean;
  tone: 'green' | 'amber' | 'red' | 'cyan' | 'violet';
  message: string;
  shouldAskAI?: boolean;
  logs?: GameLog[];
};
```

这么做有一个巨大的好处。

所有玩法都能统一成一句话：

```
玩家不是直接改世界。
玩家只是提交动作。
世界由脚本判断动作是否成立。
```

这就是RPG、MMO、战斗、修仙、沙盒都能通用的骨架。

---

## 七：tick是世界活着的方式

大型玩法需要时间。

建造要时间。

研究要时间。

修炼要时间。

任务派遣要时间。

疗伤、冷却、旅行、炼丹、锻造、市场刷新都要时间。

不要让AI来判断“过了多久”。

脚本自己算。

```ts
function tickSave(save: GameSave, now = Date.now()) {
  const elapsedMs = Math.max(0, Math.min(now - save.lastTickAt, OFFLINE_LIMIT_MS));
  if (elapsedMs <= 0) return save;

  const seconds = elapsedMs / 1000;

  runTravel(save, seconds, now);
  runCombatCooldown(save, seconds, now);
  runCultivation(save, seconds, now);
  runCrafting(save, seconds, now);
  runQuestDispatch(save, seconds, now);
  runWorldEvents(save, seconds, now);

  save.lastTickAt = now;
  return save;
}
```

注意`OFFLINE_LIMIT_MS`。

必须有离线上限。

不然玩家关掉酒馆三天再打开，脚本直接结算三天资源、三天任务、三天伤害，世界可能当场爆炸。

```
现实时间可以推进世界。
但必须有限制。
大型玩法要有离线结算上限。
```

---

## 八：为什么旧式“脚本和AI联动”容易失败

以前那种做法通常是：

```
前端扣材料。
前端设置状态变量。
发送消息给AI。
AI描写过程。
AI用MVU命令更新结果。
前端再读变量显示。
```

这比纯文本强很多，但大型玩法还是会出问题。

因为权威被分成了两半。

前端负责一半。

AI负责一半。

中间还要靠变量规则、EJS控制器、MVU更新时序把两边接起来。

任何一个环节抖一下，状态就会错。

典型问题：

```
前端已经扣了丹药，但AI忘记给修炼结果。
前端设置了当前位置，但AI没更新位置变量。
AI写了境界，但格式和前端判断不一致。
变量保存还没完成，消息已经发出去了。
schema两边字段不一致。
AI把只读变量也改了。
```

这不是某个提示词写得不够好。

这是架构问题。

解决办法不是继续加提示词。

解决办法是把权威收回来。

```
前端扣材料。
前端判定成功失败。
前端给经验。
前端更新时间。
前端改变地点。
前端写入存档。
AI只写过程和感受。
```

如果真的需要AI给“创意结果”，也不要让它直接写存档。

可以让AI输出候选内容，再由脚本接住。

例如奇遇奖励：

```
AI可以描述：
你在溪水边发现一枚带裂纹的青色玉简。

脚本决定：
是否加入物品栏。
物品叫什么。
品级是多少。
能不能被识别。
是否触发任务。
```

AI给灵感。

脚本落规则。

这就是大型玩法的稳定边界。

---

## 九：修仙世界应该怎么改成伪0层

修仙最适合这个结构。

因为修仙玩法天然有大量规则：

```
境界。
小境界。
修炼进度。
寿元。
灵根。
功法层数。
丹药。
法器。
伤势。
心魔。
因果。
地图。
宗门。
任务。
战斗。
奇遇。
```

如果这些都让AI更新，变量一定会失败。

新做法应该是：

```
AI负责:
  洞府气氛
  修炼体感
  NPC态度
  心魔对白
  战斗画面
  奇遇氛围
  宗门人情味

脚本负责:
  境界变化
  修炼进度
  丹药消耗
  突破概率
  天劫伤害
  掉落奖励
  寿元计算
  地点移动
  任务状态
  战斗胜负
```

修炼可以这样走：

```text
玩家选择修炼方式
→ 选择丹药/地点/时长
→ dispatcher检查状态
→ engine扣除丹药
→ engine生成修炼队列
→ tick推进进度
→ 到点后engine判定结果
→ AI叙述这次修炼的过程
```

突破可以这样走：

```text
玩家点击突破
→ 检查境界是否满进度
→ 检查突破丹/灵地/心魔风险
→ engine计算成功率和后果
→ 成功则更新境界
→ 失败则更新伤势/心魔/冷却
→ AI叙述突破场面
```

战斗可以这样走：

```text
玩家选择术法或行动
→ engine计算命中、伤害、状态
→ 更新双方生命、护盾、灵力、负面状态
→ 检查胜负、掉落、逃跑
→ AI叙述这一回合
```

这样AI仍然很重要。

但它不再是变量工人。

它是修仙世界的呼吸。

---

## 十：RPG怎么做

RPG的核心是角色成长和任务。

伪0层RPG可以这样拆：

```yaml
主存档:
  玩家:
    等级:
    经验:
    属性:
    技能:
    装备:
    背包:
  世界:
    当前地点:
    已解锁区域:
    时间:
    世界阶段:
  任务:
    已接:
    进行中:
    已完成:
    失败:
  NPC:
    好感:
    状态:
    所在地:
    记忆摘要:
  战斗:
    当前遭遇:
    冷却:
    状态:
```

AI负责：

```
NPC说话。
任务对白。
场景描写。
玩家选择后的情绪反馈。
让任务不只是按钮。
```

脚本负责：

```
任务能不能接。
任务目标是否完成。
经验给多少。
装备能不能穿。
技能是否冷却。
战斗是否胜利。
```

任务系统不要让AI自由更新。

应该是：

```ts
function completeQuest(save: GameSave, questId: string) {
  const quest = getQuest(questId);
  if (!isQuestGoalDone(save, quest)) {
    return { ok: false, message: '任务目标尚未完成。' };
  }

  giveReward(save, quest.reward);
  markQuestCompleted(save, questId);
  return { ok: true, shouldAskAI: true, message: '任务已完成。' };
}
```

AI再把“任务完成”写成剧情。

不是AI说完成了，就完成了。

---

## 十一：MMORP怎么做

MMORP不是一定要联网。

在酒馆前端卡里，MMORP更像是“伪多人在线世界”。

玩家感觉自己在一个有很多人、很多事件、很多队伍的大世界里。

但它的本质仍然是脚本状态机。

你可以做：

```
区域频道。
公会。
副本队列。
世界Boss。
拍卖行。
每日任务。
玩家排行榜幻象。
NPC玩家。
赛季事件。
```

这些都不需要真服务器。

存档里保存世界状态即可。

```yaml
mmorp存档:
  服务器时间:
  当前频道:
  世界事件:
  公会:
  市场:
  副本:
  世界Boss:
  NPC玩家:
  排行榜快照:
```

AI负责让这些“像活人”。

比如脚本决定：

```
世界Boss血量: 43%
参与队伍: 12
玩家贡献: 7.4%
当前阶段: 狂暴前
```

AI叙述：

```
区域频道里已经吵成一团。

有人在喊治疗别贪输出，也有人把刚才被秒的队伍刷了三遍。

Boss的血线压到四成出头时，地面那圈红纹终于开始亮了。
```

MMORP的秘诀是：

```
脚本做服务器。
AI做世界噪音和人味。
前端做客户端。
```

---

## 十二：大世界怎么做

大世界最大的问题不是地图大。

而是设定太多。

如果全部常驻，AI会被撑死。

所以大世界必须做`世界书路由`。

前端存档里应该有：

```yaml
导航:
  当前大区:
  当前子区:
  当前地点:
  当前室内外:
  在场角色:
  当前事件:
  世界阶段:
  已探索地点:
```

然后脚本把这些变成扫描文本：

```text
[大世界]
大区:中央神州
子区:青玄宗
地点:后山洞府
在场角色:沈若水
阶段:筑基期
事件:闭关修炼
危机:心魔潜伏
```

世界书条目按关键词或标签被激活。

不要让AI自己决定该读哪个区域。

不要把北原、东海、南疆、魔土、天庭、地府全部塞进常驻。

正确做法是：

```
常驻:
  世界总纲
  区域速览
  核心规则

按需:
  当前地区详情
  当前势力详情
  当前NPC详情
  当前任务详情
  当前玩法规则
```

大世界要像地图加载。

玩家在哪里，加载哪里。

玩家不在那里，就不要浪费上下文。

---

## 十三：战斗怎么做

战斗一定不能让AI当裁判。

因为战斗需要公平。

战斗最小结构：

```yaml
战斗:
  回合:
  参战者:
    玩家:
      生命:
      灵力:
      护盾:
      状态:
      冷却:
    敌人:
      生命:
      灵力:
      护盾:
      状态:
      意图:
  日志:
```

玩家行动：

```ts
dispatchAction({
  type: 'COMBAT_SKILL_USE',
  skillId: 'moon_slash',
  targetId: 'enemy_0',
});
```

脚本结算：

```ts
function useCombatSkill(save: GameSave, action: CombatAction): ActionResult {
  const actor = getPlayer(save);
  const target = getCombatant(save, action.targetId);
  const skill = getSkill(action.skillId);

  if (!canUseSkill(actor, skill)) {
    return { ok: false, tone: 'red', message: '灵力不足或技能冷却中。' };
  }

  const result = resolveSkill(actor, target, skill);
  applyCombatResult(save, result);

  return {
    ok: true,
    tone: 'green',
    message: result.summary,
    shouldAskAI: true,
  };
}
```

给AI的不是“请判断我打中了吗”。

给AI的是：

```yaml
本回合权威结果:
  玩家行动: 月影横斩
  命中: 是
  伤害: 37
  敌人剩余生命: 41/120
  附加状态: 破甲1层
  玩家消耗: 灵力12
  场景: 雨夜山道
```

然后AI写这一刀有多漂亮。

这就是区别。

---

## 十四：前端应该怎么接管酒馆

大型前端卡不适合做小状态栏。

状态栏适合“展示变量”。

大型玩法需要`全屏客户端`。

入口可以是脚本。

脚本加载后创建一个全屏iframe，挂到酒馆页面上。

```ts
$(() => {
  const iframe = document.createElement('iframe');
  iframe.style.cssText = [
    'position:fixed',
    'inset:0',
    'width:100vw',
    'height:100vh',
    'z-index:99999',
    'border:none',
  ].join(';');

  window.parent.document.body.appendChild(iframe);

  iframe.addEventListener('load', () => {
    const app = createApp(App).use(createPinia());
    app.mount(iframe.contentDocument!.body);
  });
});
```

但要记得留逃生口。

```
必须有退出按钮。
必须在pagehide时卸载Vue。
必须清理事件监听。
必须清理计时器。
必须清理复制过去的style。
```

大型前端卡会挡住酒馆。

如果没有退出按钮，一次bug就会让玩家很难受。

---

## 十五：AI提示词应该怎么写

大型前端卡的AI提示词不需要很长。

但权限边界必须硬。

可以直接这样写：

```text
你现在只负责AIRP、角色互动、叙述、建议和气氛。

以下内容由前端脚本决定，你不能更改、伪造或宣称已经完成：
- 资源
- 物品
- 经验
- 境界
- 战斗伤害
- 任务状态
- 地点移动
- 建筑完成
- 科技解锁
- 世界书内容

你可以：
- 根据权威局势进行角色扮演
- 描述场景、动作、情绪、NPC反应
- 解释当前局势
- 给出下一步建议
- 承认玩家操作已经提交给系统

你不可以：
- 输出MVU更新命令
- 输出JSON存档
- 输出函数调用
- 要求玩家手动改变量
- 宣称自己已经修改存档
- 编造脚本没有给出的奖励或结果

最终回复只保留角色对玩家说的话或场景叙述。
```

注意最后一句。

`最终回复只保留角色对玩家说的话或场景叙述。`

这能减少模型输出提示词分析、自检、JSON、变量命令之类的东西。

---

## 十六：怎么把AI回复接回前端

AI回复不要直接当世界状态。

AI回复应该当`消息`。

前端通讯区可以有几类消息：

```yaml
消息类型:
  玩家指令:
    来源: 前端输入
    是否权威: 是，表示玩家提交过这个动作

  系统结算:
    来源: 脚本
    是否权威: 是

  AI叙述:
    来源: generate
    是否权威: 否，只是叙述

  告警:
    来源: engine
    是否权威: 是
```

这样玩家能分清：

```
绿色标签: 脚本结算
蓝色标签: AIRP叙述
黄色标签: 等待确认
红色标签: 操作失败
```

大型卡的前端不是只显示AI文本。

它要显示`系统真实状态`和`AI叙述层`的区别。

---

## 十七：调试面板不是可选项

大型前端卡一定要有调试面板。

不然存档坏了你不知道。

至少要有：

```text
当前存档JSON
导出存档
导入存档
当前schema版本
迁移状态
世界书扫描文本预览
本次AI注入内容预览
最近Action日志
健康检查
```

健康检查应该查：

```text
schema版本是否正确
资源是否非负
地点id是否存在
任务引用是否存在
装备引用是否存在
队列时间是否异常
战斗状态是否卡死
当前地点是否解锁
世界书扫描词是否为空
```

调试面板是作者工具。

它不是给AI用的。

不要让AI编辑调试面板里的内容。

---

## 十八：大型前端卡的制作顺序

不要一上来写AI提示词。

也不要一上来画UI。

真正顺序应该是：

```text
1. 定义玩法边界
2. 定义AI权限
3. 定义主存档结构
4. 写zod schema和迁移
5. 写静态数据表
6. 写engine规则
7. 写dispatcher动作入口
8. 写Pinia store
9. 写酒馆变量读写服务
10. 写前端壳和主要界面
11. 接generate和流式显示
12. 接世界书路由
13. 写调试面板
14. 做只读自检
15. 最后再丰富AI人设和世界书
```

很多人会反过来。

先写世界观，先写角色，先写AI规则。

结果玩法没稳定，设定越写越多，变量越跑越乱。

大型前端卡要先做骨架。

骨架稳了，AI才有东西可以附着。

---

## 十九：判断一个玩法该不该交给AI

标准很简单。

问一句：

```
这个结果如果错了，会不会影响后续玩法？
```

如果会，就交给脚本。

如果不会，就可以交给AI。

例子：

```yaml
交给脚本:
  - 背包数量
  - 经验值
  - 战斗伤害
  - 任务完成
  - 地点移动
  - 境界突破
  - 建筑完成
  - 科技解锁
  - 冷却时间
  - 市场价格

交给AI:
  - NPC怎么说话
  - 玩家挥剑时的画面
  - 修炼时的体感
  - 城市街道的气氛
  - 莱姆的建议
  - 队友的吐槽
  - 敌人败退时的反应
```

再压缩成一句话：

```
可回滚、可校验、可计算的东西给脚本。
需要人味、语气、气氛、余韵的东西给AI。
```

---

## 二十：最小可行版本怎么做

不要一开始就做完整MMO。

先做一个最小闭环。

比如修仙：

```text
地图只有三个地点。
资源只有灵石、丹药、灵草。
玩法只有修炼、突破、战斗。
敌人只有三种。
任务只有一条主线。
AI只扮演旁白和一个随行角色。
```

只要闭环成立，后面就能扩。

最小闭环必须包含：

```text
玩家能打开全屏前端。
玩家能看到存档状态。
玩家能执行一个Action。
脚本能校验并结算。
存档能写入chat变量。
AI能收到局势摘要并回复。
聊天楼层能记录玩家和AI对话。
刷新后能继续游戏。
```

这七件事打通了，才叫大型前端卡的地基打好了。

---

## 二十一：大白话总结

大型前端卡不是“状态栏加强版”。

它是把酒馆变成一个可存档、可叙述、可扩展的AIRP游戏壳。

真正的原则只有几条。

```
前端是客户端。
chat变量是数据库。
engine是规则裁判。
dispatcher是唯一动作入口。
世界书由脚本路由。
AI只做叙述者和角色。
聊天楼层是记录，不是主存档。
MVU可以做楼层快照，但不要做大型玩法主权威。
```

戴森球能做，是因为资源、建筑、科技、物流、时间推进都被脚本接管了。

修仙能做，也必须这样做。

RPG能做，也必须这样做。

MMORP、大世界、战斗、经营、末日、生存、学院、城市模拟，本质都一样。

先把会错的东西从AI手里拿回来。

再把AI放回它最擅长的位置。

最后得到的不是“没有AI的游戏”。

而是：

```
一个规则稳定、状态可靠、世界书可路由、AI有空间好好演的AIRP大型前端卡。
```
