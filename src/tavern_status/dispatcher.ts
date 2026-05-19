// ── Dispatcher · 统一动作派发入口 ──

import { GameSave } from './engine/saveSchema';
import { GameAction, ActionResult } from './actions';
import { runCookingEngine, addDishToInventory, CookInput } from './engine/cooking';
import { runSauceEngine } from './engine/sauce';
import { runDrinkEngine } from './engine/drink';
import { plantCrop, harvestCrop } from './engine/farming';
import { startBrew, openBrew } from './engine/brewing';
import { tickTavern } from './engine/tavernTick';
import { rollVisitor } from './engine/visitors';
import { moneyLabel, COOKING_LEVELS, AFFINITY_LABELS } from './engine/labels';
import { changeAffinity, resetDailyAffinity, DAILY_AFFINITY_CAP } from './engine/relationships';
import { getRealmLayer, getReturnRule, DEEP_REALMS } from './engine/deeprealms';

export function dispatchAction(save: GameSave, action: GameAction): ActionResult {
  switch (action.type) {
    // ═══════════ 烹饪 ═══════════
    case 'COOK_SINGLE': {
      const input: CookInput = { ingredients: action.ingredients, method: action.method, batchMode: false };
      const r = runCookingEngine(save, input);
      if (!r.ok || !r.tagBag) return { ok: false, message: r.error || '烹饪失败', shouldAskAI: false };
      addDishToInventory(save, r.tagBag, r.tagBag.yield);
      save.player.cookingCount++;
      if (save.player.cookingCount >= [0, 15, 45, 100, 200][save.player.cookingLevel]) {
        const n = Math.min(8, save.player.cookingLevel + 1);
        save.player.cookingLevel = n;
        save.player.cookingLevelTitle = COOKING_LEVELS[n].title;
        save.player.cookingLevelDesc = COOKING_LEVELS[n].desc;
      }
      return {
        ok: true,
        message: `${r.tagBag.dishName}做好了。${r.tagBag.narrative}（${r.tagBag.price}铜/份）`,
        shouldAskAI: true,
      };
    }

    case 'COOK_BATCH': {
      const input: CookInput = {
        ingredients: action.ingredients,
        method: action.method,
        batchMode: true,
        batchQty: action.qty,
      };
      const r = runCookingEngine(save, input);
      if (!r.ok || !r.tagBag) return { ok: false, message: r.error || '批量做菜失败', shouldAskAI: false };
      addDishToInventory(save, r.tagBag, r.tagBag.yield);
      save.player.cookingCount++;
      return {
        ok: true,
        message: `批量做了${r.tagBag.yield}份${r.tagBag.dishName}。${r.tagBag.narrative}（${r.tagBag.price}铜/份）`,
        shouldAskAI: true,
      };
    }

    case 'MAKE_SAUCE': {
      const r = runSauceEngine(save, { ingredients: action.ingredients, method: action.method });
      if (!r.ok || !r.tagBag) return { ok: false, message: '制酱失败', shouldAskAI: false };
      save.inventory[r.tagBag.name] = {
        数量: r.tagBag.yield,
        单位: '份',
        分类: '调料',
        风味标签: [
          ...Object.entries(r.tagBag.flavorGrids).map(([k, v]) => `${k}:${v}`),
          ...r.tagBag.aromaTags,
          ...r.tagBag.textureTags,
        ],
        烹饪手法: '',
        售价铜币: 0,
      };
      return { ok: true, message: `${r.tagBag.name}做好了，${r.tagBag.yield}份。`, shouldAskAI: true };
    }

    case 'MAKE_DRINK': {
      const r = runDrinkEngine(save, { ingredients: action.ingredients, method: action.method });
      if (!r.ok || !r.tagBag) return { ok: false, message: '做饮品失败', shouldAskAI: false };
      save.inventory[r.tagBag.name] = {
        数量: r.tagBag.yield,
        单位: '杯',
        分类: '成品',
        风味标签: [
          ...Object.entries(r.tagBag.flavorGrids).map(([k, v]) => `${k}:${v}`),
          ...r.tagBag.aromaTags,
          ...r.tagBag.textureTags,
        ],
        烹饪手法: r.tagBag.category,
        售价铜币: r.tagBag.price,
      };
      return {
        ok: true,
        message: `${r.tagBag.name}做好了，${r.tagBag.yield}杯。${r.tagBag.drunkenness ? `醉度: ${r.tagBag.drunkenness}` : ''}`,
        shouldAskAI: true,
      };
    }

    case 'SERVE_DISH': {
      const item = save.inventory[action.dishName];
      if (!item || item.数量 < action.portions)
        return { ok: false, message: `${action.dishName}不够（剩${item?.数量 ?? 0}份）`, shouldAskAI: false };
      item.数量 -= action.portions;
      const revenue = (item.售价铜币 || 0) * action.portions;
      save.player.money.铜币 += revenue;
      return {
        ok: true,
        message: `上了${action.portions}份${action.dishName}，收入${revenue}铜。`,
        shouldAskAI: true,
        coinChange: revenue,
      };
    }

    // ═══════════ 种田 ═══════════
    case 'PLANT_CROP': {
      const r = plantCrop(save, action.cropName, action.plot);
      return { ok: r.ok, message: r.message, shouldAskAI: r.ok };
    }
    case 'HARVEST': {
      const r = harvestCrop(save, action.cropName);
      return { ok: r.ok, message: r.message, shouldAskAI: r.ok };
    }

    // ═══════════ 酿酒 ═══════════
    case 'START_BREW': {
      const r = startBrew(save, action.name, action.ingredients, action.container);
      return { ok: r.ok, message: r.message, shouldAskAI: r.ok };
    }
    case 'OPEN_BREW': {
      const r = openBrew(save, action.brewId);
      return { ok: r.ok, message: r.message, shouldAskAI: r.ok };
    }

    // ═══════════ 购物 ═══════════
    case 'REQUEST_VENDOR_STOCK':
      return { ok: true, message: '', shouldAskAI: true };

    case 'BUY_ITEMS': {
      let total = 0;
      for (const it of action.items) {
        const price = { 大白菜: 3, 萝卜: 2, 菠菜: 4, 深界翠菌: 12 }[it.name] ?? 5;
        total += price * it.qty;
        const ex = save.inventory[it.name];
        if (ex) {
          ex.数量 += it.qty;
        } else {
          save.inventory[it.name] = { 数量: it.qty, 单位: '份', 分类: '食材', 风味标签: [], 烹饪手法: '', 售价铜币: 0 };
        }
      }
      if (save.player.money.铜币 < total)
        return { ok: false, message: `钱不够——需${total}铜，有${save.player.money.铜币}铜。`, shouldAskAI: false };
      save.player.money.铜币 -= total;
      return { ok: true, message: `采购完成，花${total}铜。`, shouldAskAI: true, coinChange: -total };
    }

    // ═══════════ 建造 ═══════════
    case 'BUY_FACILITY': {
      if (save.player.money.铜币 < action.cost)
        return { ok: false, message: `钱不够——需${action.cost}铜。`, shouldAskAI: false };
      save.player.money.铜币 -= action.cost;
      const reg = save.tavern.regions[action.regionId];
      if (reg) {
        if (!reg.facilities.includes(action.facilityName)) reg.facilities.push(action.facilityName);
      } else {
        save.tavern.regions[action.regionId] = {
          facilities: [action.facilityName],
          decorations: [],
          status: '整洁',
          vibe: '',
        };
      }
      return {
        ok: true,
        message: `在${action.regionId}安装了${action.facilityName}。`,
        shouldAskAI: true,
        coinChange: -action.cost,
      };
    }

    case 'ADD_DECORATION': {
      const reg = save.tavern.regions[action.regionId];
      if (!reg) return { ok: false, message: `区域${action.regionId}不存在。`, shouldAskAI: false };
      if (!reg.decorations.includes(action.decoration)) reg.decorations.push(action.decoration);
      return { ok: true, message: `在${action.regionId}摆上了${action.decoration}。`, shouldAskAI: true };
    }

    case 'RENOVATE': {
      const reg = save.tavern.regions[action.regionId];
      if (!reg) return { ok: false, message: `区域${action.regionId}不存在。`, shouldAskAI: false };
      reg.vibe = action.newStyle;
      return { ok: true, message: `${action.regionId}重新装修了。`, shouldAskAI: true };
    }

    // ═══════════ 员工 ═══════════
    case 'HIRE_EMPLOYEE': {
      save.employees[action.id] = {
        race: action.race,
        role: action.role,
        personality: action.personality,
        currentState: '刚来不久，还在熟悉环境',
        wage: action.wage,
      };
      return { ok: true, message: `${action.name}（${action.role}）入职了。`, shouldAskAI: true };
    }

    case 'FIRE_EMPLOYEE': {
      if (!save.employees[action.employeeId]) return { ok: false, message: '找不到这个员工。', shouldAskAI: false };
      delete save.employees[action.employeeId];
      return { ok: true, message: '该员工已离职。', shouldAskAI: true };
    }

    // ═══════════ 产业 ═══════════
    case 'START_BUSINESS': {
      save.businesses[action.id] = {
        type: action.type,
        status: '运营中',
        investment: action.investment,
        incomeNote: action.incomeNote,
        note: '',
      };
      return { ok: true, message: `${action.name}开张了。`, shouldAskAI: true };
    }

    // ═══════════ 冒险/旅行 ═══════════
    case 'GO_ADVENTURE': {
      // 解析目的地：可能是层域名（如"翠风原野"）或层序数字（如"1"）
      const dest = action.destination.trim();
      const realm = getRealmLayer(Number(dest)) || DEEP_REALMS.find(r => r.name === dest || r.aliases.includes(dest));
      if (!realm) {
        // 允许自由探索，仍然通行
        return {
          ok: true,
          message: `出发前往「${action.destination}」——未知区域。`,
          shouldAskAI: true,
        };
      }

      const returnRule = getReturnRule(realm.level);
      const partyStr = action.party.length ? `，队伍：${action.party.join('、')}` : '';
      const lines = [
        `⚔️ 进入深界第${realm.level}层「${realm.name}」${partyStr}`,
        `定位：${realm.tagline}`,
        `等级要求：${realm.rankRequired} | ${returnRule}`,
        `第一印象：${realm.firstImpression}`,
        `已知资源：${realm.resources.slice(0, 5).join('、')}`,
        `已知生物：${realm.creatures.slice(0, 3).join('、')}`,
      ];
      return {
        ok: true,
        message: lines.join('\n'),
        shouldAskAI: true,
      };
    }

    case 'COMMISSION_ADVENTURERS': {
      if (save.player.money.铜币 < action.budget)
        return {
          ok: false,
          message: `预算${action.budget}铜不够——身上${save.player.money.铜币}铜。`,
          shouldAskAI: false,
        };
      save.player.money.铜币 -= action.budget;
      return {
        ok: true,
        message: `花了${action.budget}铜委托冒险者去${action.destination}。`,
        shouldAskAI: true,
        coinChange: -action.budget,
      };
    }

    case 'TRAVEL': {
      save.world.currentCity = action.city || action.destination;
      save.world.currentLocation = action.destination;
      return { ok: true, message: `抵达${action.destination}。`, shouldAskAI: true };
    }

    // ═══════════ 互动 ═══════════
    case 'INTERACT_NPC': {
      // 互动可能影响好感度——友好互动 +3，冒犯 -5，普通聊天 +1
      const affMap: Record<string, number> = { 聊天: 1, 帮助: 3, 夸奖: 3, 冒犯: -5, 冷落: -3, 安慰: 4 };
      const affDelta = affMap[action.action] ?? 1;
      const r = changeAffinity(save, action.npcId, affDelta, action.action);
      return { ok: true, message: r.message, shouldAskAI: true };
    }

    case 'GIFT_NPC': {
      const inv = save.inventory[action.item];
      if (!inv || inv.数量 <= 0) return { ok: false, message: `没有${action.item}可以送。`, shouldAskAI: false };
      inv.数量 -= 1;
      // 送礼 +5~8 好感（随机），稀有物品可能更高
      const giftDelta = 5 + Math.floor(Math.random() * 4);
      const r = changeAffinity(save, action.npcId, giftDelta, `送礼:${action.item}`);
      return { ok: true, message: r.message, shouldAskAI: true };
    }

    // ═══════════ 经营 ═══════════
    case 'OPEN_TAVERN':
      return { ok: true, message: '酒馆开门了。', shouldAskAI: true };
    case 'CLOSE_TAVERN':
      resetDailyAffinity(save);
      return { ok: true, message: '打烊了。今日好感变化已重置。', shouldAskAI: true };

    case 'FAST_FORWARD': {
      const t = tickTavern(save, action.hours);
      if (t.interrupted) return { ok: true, message: t.interruptionVisitor || '被事件打断。', shouldAskAI: true };
      return { ok: true, message: t.summary, shouldAskAI: true, coinChange: t.revenue };
    }

    case 'ROLL_VISITOR': {
      const v = rollVisitor();
      return { ok: true, message: v.tagLine, shouldAskAI: true };
    }

    // ═══════════ 自由输入 ═══════════
    case 'CHAT':
      return { ok: true, message: action.text, shouldAskAI: true };

    default:
      return { ok: false, message: '未知操作类型。', shouldAskAI: false };
  }
}
