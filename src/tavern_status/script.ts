import { Schema as SchemaZod } from './schema';

// ---- util functions ----
import { loadSave, writeSave } from './services/saveService';
import { dispatchAction } from './dispatcher';
import type { GameSave } from './engine/saveSchema';
import { runHealthCheck } from './engine/healthCheck';
import type { ActionResult } from './actions';
import { buildSituationSummary } from './services/situationBuilder';
import { requestAINarration, writeAIReplyToChat } from './services/generateService';
import { DEEP_REALMS } from './engine/deeprealms';

let currentSave: GameSave | null = null;
const actionLog: Array<{ time: string; action: string; ok: boolean; msg: string }> = [];

function logAction(actionType: string, result: ActionResult) {
  const now = new Date();
  const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
  actionLog.unshift({ time, action: actionType, ok: result.ok, msg: result.message || '' });
  if (actionLog.length > 20) actionLog.length = 20;
}

function dispatchAndLog(
  save: GameSave,
  action: { type: string; [k: string]: any },
  fn?: (result: ActionResult) => void,
) {
  const result = dispatchAction(save, action as any);
  logAction(action.type, result);
  if (fn) fn(result);
  return result;
}

/** 引擎结算 → 局势摘要 → AI 叙事 → 写入聊天楼层 → 刷新剧情页 */
async function dispatchAndNarrate(action: { type: string; [k: string]: any }, userLabel?: string) {
  if (!currentSave) {
    loadCurrentSave();
  }
  if (!currentSave) {
    setOutput('提示', '存档未加载。');
    return;
  }

  const result = dispatchAndLog(currentSave, action);
  if (!result.ok || !result.shouldAskAI) {
    setOutput(result.ok ? '结果' : '操作失败', result.message);
    return;
  }

  // 写存档
  try {
    await writeSave(currentSave);
  } catch {
    /* writeSave 失败时静默 */
  }

  // 请求 AI 叙事
  setOutput('⚙️ 等待AI叙事……', result.message);
  const ai = await requestAINarration({ save: currentSave, actionMessage: result.message });
  if (!ai.ok || !ai.reply) {
    setOutput('结果', result.message);
    return;
  }

  // 写入聊天楼层
  try {
    await writeAIReplyToChat(ai.reply, userLabel || action.type);
  } catch {
    /* writeSave 失败时静默 */
  }

  // 刷新剧情显示（剧情页监听 MESSAGE_RECEIVED 会自动刷新）
  renderAllExtended();
  setOutput('✅ 完成', result.message);
}

function loadCurrentSave() {
  try {
    currentSave = loadSave();
  } catch (e) {
    console.warn('[tavern_status] 加载存档失败', e);
    currentSave = null;
  }
}

function sget(path: string, fallback?: any): any {
  if (!currentSave) return fallback;
  const keys = path.split('.');
  let cur: any = currentSave;
  for (const k of keys) {
    if (cur == null || typeof cur !== 'object') return fallback;
    cur = (cur as any)[k];
  }
  return cur !== undefined ? cur : fallback;
}

function esc(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** 简易 _.get 替代 */
function getIn(obj: any, path: string, fallback?: any): any {
  const keys = path.split('.');
  let cur = obj;
  for (const k of keys) {
    if (cur == null || typeof cur !== 'object') return fallback;
    cur = cur[k];
  }
  return cur !== undefined ? cur : fallback;
}

const COIN_TIERS = [
  { name: '秘银', value: 250_000_000 },
  { name: '铂', value: 500_000 },
  { name: '金', value: 1_000 },
  { name: '银', value: 100 },
  { name: '铜', value: 1 },
] as const;

function fmtCopper(total: number): string {
  if (!total || total <= 0) return '0铜';
  let rem = total;
  const parts: string[] = [];
  for (const tier of COIN_TIERS) {
    const c = Math.floor(rem / tier.value);
    if (c > 0) {
      parts.push(`${c}${tier.name}`);
      rem -= c * tier.value;
    }
  }
  return parts.join(' ');
}

// ---- Schema type (runtime data shape, distinct from Zod Schema) ----

interface Schema {
  [key: string]: any;
}

// ---- MVU data ----
let cachedData: Schema = {};

async function refreshData(): Promise<Schema> {
  let rawData: Record<string, any> = {};
  try {
    await waitGlobalInitialized('Mvu');
    const mvuData = Mvu.getMvuData({ type: 'message', message_id: getCurrentMessageId() });
    rawData = (getIn(mvuData, 'stat_data') || {}) as Record<string, any>;
  } catch (e) {
    console.warn('[tavern_status] MVU not ready yet', e);
    cachedData = {};
    return cachedData;
  }

  // 使用 Zod schema 校验和补缺，确保所有字段符合定义
  try {
    cachedData = SchemaZod.parse(rawData) as unknown as Schema;
  } catch (e) {
    console.warn('[tavern_status] Schema validation failed, falling back to raw data', e);
    cachedData = rawData as Schema;
  }
  return cachedData;
}

function get(path: string, fallback?: any): any {
  return getIn(cachedData, path, fallback);
}

function getDeep(...paths: string[]): any {
  let val: any = cachedData;
  for (const p of paths) {
    if (val == null || typeof val !== 'object') return undefined;
    val = val[p];
  }
  return val;
}

// ---- Navigation ----
function setupNavigation() {
  const menu = document.getElementById('menu');
  if (!menu) return;
  const buttons = [...menu.querySelectorAll<HTMLElement>('.nav-btn')];
  const pages = [...document.querySelectorAll<HTMLElement>('.page')];
  function setActive(pageId: string) {
    buttons.forEach(b => {
      const act = b.dataset.page === pageId;
      b.classList.toggle('active', act);
      b.setAttribute('aria-current', act ? 'page' : 'false');
    });
    pages.forEach(p => {
      const act = p.id === pageId;
      p.classList.toggle('active', act);
      p.hidden = !act;
    });
  }
  const def = menu.querySelector<HTMLElement>('.nav-btn.active') || buttons[0];
  if (def && def.dataset.page) setActive(def.dataset.page);
  menu.addEventListener('click', e => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>('.nav-btn');
    if (btn && btn.dataset.page) setActive(btn.dataset.page);
  });
}

// ---- Global output ----
function setOutput(title: string, text: string) {
  const label = document.getElementById('globalOutputLabel');
  const output = document.getElementById('globalOutput') as HTMLTextAreaElement | null;
  if (label) label.textContent = title;
  if (output) {
    output.value = text;
    output.scrollTop = 0;
    const dock = document.getElementById('outputDock');
    if (dock) dock.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

function setupCopyButton() {
  const btn = document.getElementById('globalOutputCopy');
  const out = document.getElementById('globalOutput') as HTMLTextAreaElement | null;
  if (btn && out) {
    btn.addEventListener('click', async () => {
      const t = out.value || '';
      if (!t) return;
      try {
        await navigator.clipboard.writeText(t);
        const o = btn.textContent;
        btn.textContent = '✓ 已复制';
        setTimeout(() => {
          btn.textContent = o;
        }, 1500);
      } catch {
        out.focus();
        out.select();
      }
    });
  }
}

// ---- Render helpers ----
function renderStoryHud() {
  const w = get('世界');
  if (!w) return;
  const keys = ['当前日期', '当前时间', '天气', '当前位置', '声望'];
  keys.forEach(k => {
    const el = document.querySelector(`[data-bind="world.${k}"]`);
    if (el) el.textContent = w[k] ?? '—';
  });
  ['秘银币', '铂金币', '金币', '银币', '铜币'].forEach(c => {
    const el = document.querySelector(`[data-bind="world.金钱.${c}"]`);
    if (el) el.textContent = String(getIn(w, `金钱.${c}`, 0));
  });
}

function renderTavern() {
  const t = get('酒馆');
  if (!t) return;
  document.querySelectorAll('[data-bind^="tavern."]').forEach(el => {
    const htmlEl = el as HTMLElement;
    const key = (htmlEl.dataset.bind || '').replace('tavern.', '');
    htmlEl.textContent = esc(getIn(t, key, '—'));
  });

  const regionsEl = document.getElementById('tavernRegions');
  if (regionsEl && t['区域列表']) {
    const regions = t['区域列表'] as Record<string, any>;
    regionsEl.innerHTML = Object.entries(regions)
      .map(
        ([name, region]) => `
      <details class="region-card" open>
        <summary class="region-summary"><div class="region-head"><h4>${esc(name)}</h4><span class="state ${region['状态'] === '正常' || region['状态'] === '整洁' ? 'good' : 'warn'}">${esc(region['状态'] || '正常')}</span></div></summary>
        <div class="region-content">
          <p class="region-desc">${esc(region['描述'])}</p>
          ${region['设施标签']?.length ? `<div class="region-tools">${region['设施标签'].map((t: string) => `<span class="tag">${esc(t)}</span>`).join('')}</div>` : ''}
          ${
            region['子空间'] && Object.keys(region['子空间']).length
              ? `<div class="subspace-wrap">${Object.entries(region['子空间'] as Record<string, any>)
                  .map(
                    ([sn, ss]) =>
                      `<div class="subspace-item"><div class="subspace-top"><strong>${esc(sn)}</strong><span class="state ${ss['状态'] === '正常' || ss['状态'] === '空闲' || ss['状态'] === '整洁' ? 'good' : ss['状态'] === '入住' ? 'busy' : 'warn'}">${esc(ss['状态'] || '正常')}</span></div><p class="subspace-desc">${esc(ss['描述'])}</p></div>`,
                  )
                  .join('')}</div>`
              : ''
          }
        </div>
      </details>
    `,
      )
      .join('');
  }

  const brewEl = document.getElementById('brewList');
  if (brewEl && t['进行中的制作']) {
    const brews = t['进行中的制作'] as Record<string, any>;
    const entries = Object.entries(brews);
    brewEl.innerHTML = entries.length
      ? entries
          .map(
            ([name, b]) => `
        <div class="brew-item">
          <div class="brew-head"><strong>${esc(name)}</strong><span class="countdown">${esc(b['剩余量感'] || b['当前状态'] || '')}</span></div>
          <div class="brew-meta"><span>容器：${esc(b['容器'])}</span><span>所在区域：${esc(b['所在区域'])}</span><span>状态：${esc(b['当前状态'])}</span><span>开始：${esc(b['开始'])}</span><span>预计完成：${esc(b['预计完成'])}</span></div>
        </div>
      `,
          )
          .join('')
      : '<p style="color:var(--ink-faint);font-style:italic;padding:8px 0;">暂无进行中的制作。</p>';
  }
}

// ---- Tavern actions (经营快进 + 访客骰) ----
function setupTavernActions() {
  // 经营快进 → 引擎结算 + AI 叙事
  const ffBtn = document.getElementById('ffRunBtn');
  if (ffBtn) {
    ffBtn.addEventListener('click', () => {
      const raw = parseInt((document.getElementById('ffHours') as HTMLInputElement)?.value || '3', 10);
      const hours = Number.isFinite(raw) ? Math.max(1, Math.min(48, raw)) : 3;
      dispatchAndNarrate({ type: 'FAST_FORWARD', hours }, `⏩ 经营快进 ${hours}h`);
    });
  }

  // 访客骰 → 引擎结算 + AI 叙事
  const rollBtn = document.getElementById('visitorRollBtn');
  if (rollBtn) {
    rollBtn.addEventListener('click', () => {
      dispatchAndNarrate({ type: 'ROLL_VISITOR' }, '🎲 访客骰 1d10000');
    });
  }
}

// ---- Inventory: 从 MVU 数据填充 HTML 骨架，保持 index.html 结构 ----
function renderInventory() {
  const inv = get('库存') as Record<string, any> | undefined;
  if (!inv || !Object.keys(inv).length) return;

  // 首次：填充 #invMatGrid 食材/调料 和 #invRows 成品/其他
  const matGrid = document.getElementById('invMatGrid');
  const invRows = document.getElementById('invRows');
  if (!matGrid || !invRows) return;

  // 仅填充一次（清空再填充以同步 MVU 数据）
  matGrid.innerHTML = '';
  invRows.innerHTML = '';

  const entries = Object.entries(inv);
  for (const [name, v] of entries) {
    const cat = v['分类'] || '其他';
    const qtyStr = `${v['数量'] ?? 0}${v['单位'] || '份'}`;
    if (cat === '食材' || cat === '调料') {
      const div = document.createElement('div');
      div.className = 'inv-mat-tile inv-item';
      div.dataset.cat = cat;
      div.dataset.name = name;
      div.dataset.qty = qtyStr;
      div.dataset.selected = '0';
      div.innerHTML = `<div class="inv-mat-tile-top"><span class="inv-mat-tile-name">${esc(name)}</span><span class="inv-mat-tile-qty">${qtyStr}</span></div><div class="inv-name-cell"><button type="button" class="inv-name-btn" aria-label="选择 ${esc(name)}，每次点击加 1 份"><span class="inv-name-text">加选</span><span class="inv-sel-badge" data-sel-badge aria-hidden="true">×0</span></button><button type="button" class="inv-name-dec" aria-label="减少 ${esc(name)} 1 份" hidden>−</button></div>`;
      matGrid.appendChild(div);
    } else {
      const tr = document.createElement('tr');
      tr.className = 'inv-item';
      tr.dataset.cat = cat;
      tr.dataset.name = name;
      tr.dataset.qty = qtyStr;
      tr.dataset.selected = '0';
      tr.dataset.priceCopper = String(v['售价铜币'] ?? '');
      tr.dataset.flavorTags = (v['风味标签'] || []).join(',');
      tr.dataset.cookMethod = v['烹饪手法'] || '';
      const price = v['售价铜币']
        ? `<span class="inv-price">${v['售价铜币']}铜<span class="inv-price-unit">/${v['单位'] || '份'}</span></span>`
        : '<span class="inv-price-empty">—</span>';
      tr.innerHTML = `<td><div class="inv-name-cell"><button type="button" class="inv-name-btn" aria-label="选择 ${esc(name)}"><span class="inv-name-text">${esc(name)}</span><span class="inv-sel-badge" data-sel-badge aria-hidden="true">×0</span></button><button type="button" class="inv-name-dec" aria-label="减少 ${esc(name)} 1 份" hidden>−</button></div></td><td>${qtyStr}</td><td class="inv-col-price">${price}</td><td><span class="inv-badge">${esc(cat)}</span></td>`;
      invRows.appendChild(tr);
    }
  }

  // 绑定事件（仅一次）
  const invPage = document.getElementById('inventory');
  if (invPage && !(invPage as HTMLElement).dataset.invBound) {
    (invPage as HTMLElement).dataset.invBound = 'true';

    // 筛选
    document.getElementById('invFilter')?.addEventListener('click', (e: Event) => {
      const tab = (e.target as HTMLElement).closest<HTMLElement>('.inv-tab');
      if (!tab || !tab.dataset.cat) return;
      document.querySelectorAll('#invFilter .inv-tab').forEach(b => b.classList.toggle('active', b === tab));
      applyInvTabFilter(tab.dataset.cat);
    });

    // 加选/减选
    invPage.addEventListener('click', (e: Event) => {
      const incBtn = (e.target as HTMLElement).closest<HTMLElement>('.inv-name-btn');
      const decBtn = (e.target as HTMLElement).closest<HTMLElement>('.inv-name-dec');
      if (!incBtn && !decBtn) return;
      const row = (e.target as HTMLElement).closest<HTMLElement>('.inv-item');
      if (!row) return;
      const max = parseInt(row.dataset.qty || '0', 10);
      let cur = parseInt(row.dataset.selected || '0', 10);
      if (incBtn) {
        if (cur < max) cur++;
      } else if (decBtn) {
        if (cur > 0) cur--;
      }
      row.dataset.selected = String(cur);
      updateInvRow(row);
    });

    // 操作按钮 — 引擎结算 → AI 叙事
    document.querySelectorAll('#inventory .inv-act-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const items = collectInvSelected();
        if (!items.length) {
          setOutput('库存 · 操作提示', '请先点击物品名按钮添加要使用的份数。');
          return;
        }
        const action = (btn as HTMLElement).dataset.action;
        if (action === 'serve') {
          // 上菜结账：对每个成品做 SERVE_DISH
          const priced = items.filter(it => it.priceCopper != null);
          const unpriced = items.filter(it => it.priceCopper == null);
          if (!priced.length) {
            setOutput(
              '库存 · 上菜结账',
              unpriced.length
                ? '当前所选都是无定价物品，请勾选「成品」类目下的菜品/酒水再上菜。'
                : '请先点击「成品」分类下物品的名字累加份数，再点上菜结账。',
            );
            return;
          }
          // 逐份上菜，合并成一个叙事请求
          const msgs: string[] = [];
          for (const it of priced) {
            const r = dispatchAndLog(currentSave!, { type: 'SERVE_DISH', dishName: it.name, portions: it.sel });
            msgs.push(r.message);
          }
          const summary = msgs.join('\n');
          dispatchAndNarrate(
            { type: 'CHAT', text: `上了${priced.map(it => `${it.name}×${it.sel}`).join('、')}。引擎结算：${summary}` },
            '🍽️ 上菜结账',
          );
        } else {
          // 做菜/做酱/做喝的：取已选食材 → 构造 Action → 引擎+AI
          const ingredients = items.map(it => ({ name: it.name, amount: it.sel }));
          const actionMap: Record<string, { type: string; label: string }> = {
            cook: { type: 'COOK_SINGLE', label: '🥘 做菜' },
            sauce: { type: 'MAKE_SAUCE', label: '🫙 做酱' },
            drink: { type: 'MAKE_DRINK', label: '🍷 做喝的' },
          };
          const map = actionMap[action];
          if (!map) {
            setOutput('库存 · 操作提示', `未知操作: ${action}`);
            return;
          }
          dispatchAndNarrate({ type: map.type, ingredients }, map.label);
        }
      });
    });

    // 清空选择
    document.getElementById('invClearSel')?.addEventListener('click', () => {
      document.querySelectorAll('#inventory .inv-item').forEach(row => {
        (row as HTMLElement).dataset.selected = '0';
        updateInvRow(row as HTMLElement);
      });
    });
  }

  // 应用当前筛选
  const activeTab = document.querySelector('#invFilter .inv-tab.active');
  applyInvTabFilter(activeTab ? (activeTab as HTMLElement).dataset.cat! : '全部');
}

function parseInvQty(str: string) {
  const m = String(str || '').match(/^(\d+)(.*)$/);
  return { max: m ? parseInt(m[1], 10) : 0, unit: m ? m[2].trim() : '' };
}

function updateInvRow(row: HTMLElement) {
  const sel = parseInt(row.dataset.selected || '0', 10);
  const { max } = parseInvQty(row.dataset.qty || '');
  const nameBtn = row.querySelector('.inv-name-btn') as HTMLElement | null;
  const decBtn = row.querySelector('.inv-name-dec') as HTMLElement | null;
  const badge = row.querySelector('[data-sel-badge]') as HTMLElement | null;
  if (nameBtn) {
    nameBtn.classList.toggle('is-selected', sel > 0);
    nameBtn.classList.toggle('is-max', sel >= max && sel > 0);
  }
  if (badge) badge.textContent = `×${sel}`;
  if (decBtn) decBtn.hidden = sel <= 0;
  row.classList.toggle('is-selected', sel > 0);
}

function collectInvSelected() {
  const items: Array<{
    name: string;
    cat: string;
    sel: number;
    unit: string;
    priceCopper: number | null;
    flavorTags: string[];
    cookMethod: string;
  }> = [];
  document.querySelectorAll('#inventory .inv-item').forEach(row => {
    const el = row as HTMLElement;
    const sel = parseInt(el.dataset.selected || '0', 10);
    if (sel <= 0) return;
    const { unit } = parseInvQty(el.dataset.qty || '');
    const priceRaw = el.dataset.priceCopper;
    const priceCopper = priceRaw == null || priceRaw === '' ? null : parseInt(priceRaw, 10);
    const tags = (el.dataset.flavorTags || '')
      .split(/[,，、]/)
      .map(s => s.trim())
      .filter(Boolean);
    items.push({
      name: el.dataset.name || '',
      cat: el.dataset.cat || '',
      sel,
      unit: unit || '份',
      priceCopper: Number.isFinite(priceCopper) ? priceCopper : null,
      flavorTags: tags,
      cookMethod: el.dataset.cookMethod || '',
    });
  });
  return items;
}

function applyInvTabFilter(cat: string) {
  const showMat = cat === '全部' || cat === '食材' || cat === '调料';
  const showTbl = cat === '全部' || cat === '成品' || cat === '其他';
  const matBlock = document.getElementById('invMatBlock');
  const tblWrap = document.getElementById('invTableWrap');
  if (matBlock) matBlock.hidden = !showMat;
  if (tblWrap) tblWrap.hidden = !showTbl;
  document.querySelectorAll('#invMatGrid .inv-item').forEach(el => {
    if (showMat) (el as HTMLElement).hidden = !(cat === '全部' || (el as HTMLElement).dataset.cat === cat);
  });
  document.querySelectorAll('#invRows tr.inv-item').forEach(row => {
    if (showTbl) (row as HTMLElement).hidden = !(cat === '全部' || (row as HTMLElement).dataset.cat === cat);
  });
}

// ---- Render Ledger ----
function renderLedger() {
  const l = get('账本');
  const statsEl = document.getElementById('ledgerStats');
  if (statsEl) {
    const foot = l?.['经营足迹'];
    statsEl.innerHTML = `
      <div class="stat-card"><div class="stat-icon">📅</div><div class="stat-meta"><div class="stat-k">累计营业天数</div><div class="stat-v">${foot?.['累计营业天数'] ?? 0}<span class="stat-unit"> 天</span></div></div></div>
      <div class="stat-card"><div class="stat-icon">👥</div><div class="stat-meta"><div class="stat-k">累计接待客人数</div><div class="stat-v">${foot?.['累计接待客人数'] ?? 0}<span class="stat-unit"> 位</span></div></div></div>
      <div class="stat-card"><div class="stat-icon">🛏️</div><div class="stat-meta"><div class="stat-k">累计客房入住</div><div class="stat-v">${foot?.['累计客房入住'] ?? 0}<span class="stat-unit"> 间夜</span></div></div></div>
    `;
  }
  const incomeEl = document.getElementById('ledgerIncome');
  if (incomeEl) {
    const totalCopper = l?.['金银流转']?.['累计总收入铜币'] ?? 0;
    incomeEl.innerHTML = `<div class="stat-card stat-income"><div class="stat-icon">📈</div><div class="stat-meta"><div class="stat-k">累计总收入</div><div class="stat-v">${fmtCopper(totalCopper)}</div><div class="stat-sub">${totalCopper.toLocaleString('zh-CN')} 铜</div></div></div>`;
  }
  const assetsEl = document.getElementById('ledgerAssets');
  if (assetsEl) {
    const a = l?.['当前总资产'];
    let total = 0;
    const mapKey: Record<string, string> = { 秘银: '秘银币', 铂: '铂金币', 金: '金币', 银: '银币', 铜: '铜币' };
    const clsMap: Record<string, string> = { 秘银: 'myth', 铂: 'plat', 金: 'gold', 银: 'silv', 铜: 'copp' };
    const coinHtml = COIN_TIERS.map(tier => {
      const count = a?.[mapKey[tier.name]] ?? 0;
      total += count * tier.value;
      return `<span class="coin ${clsMap[tier.name]}">${tier.name}币 ${count}</span>`;
    }).join('');
    const fromCoins = a?.['折算合计铜币'] ?? total;
    assetsEl.innerHTML = `<div class="asset-coins">${coinHtml}</div><div class="asset-total"><span class="asset-total-k">折算合计</span><span class="asset-total-v">${fmtCopper(fromCoins)}</span></div>`;
  }
}

// ---- Render Profile ----
function renderProfile() {
  const p = get('玩家');
  const dynamicContent = document.getElementById('profileDynamicContent');
  if (!dynamicContent) return;
  if (!p) {
    dynamicContent.innerHTML =
      '<p style="color:var(--ink-faint);font-style:italic;padding:16px;">暂无玩家档案数据。</p>';
    return;
  }
  const bio = p['基本信息'] || {};
  const st = p['状态'] || {};
  const cook = p['烹饪等级'] || {};
  const hp = st['生命值'] || {};
  const stam = st['精力'] || {};
  const nameEl = document.querySelector('#profileBody .profile-name');
  const cookRem = (cook['升级所需次数'] ?? 10) - (cook['累计做菜次数'] ?? 0);
  if (nameEl) nameEl.textContent = bio['姓名'] || '未知';
  const metaEl = document.querySelector('#profileBody .profile-meta');
  if (metaEl) {
    metaEl.innerHTML = `
      <span class="profile-meta-pill">${esc(bio['种族'] || '人类')}</span>
      <span class="profile-meta-pill">${bio['年龄'] ?? '?'} 岁</span>
      <span class="profile-meta-pill profile-title">${esc(bio['称号'] || '★ 略有耳闻')}</span>
    `;
  }
  const taglineEl = document.querySelector('#profileBody .profile-tagline');
  if (taglineEl) taglineEl.textContent = bio['简介标语'] || '';

  dynamicContent.innerHTML = `
    <h3 class="profile-h3">基本信息</h3>
    <div class="info-grid">
      <div class="info-cell"><span class="info-k">姓名</span><span class="info-v">${esc(bio['姓名'] || '—')}</span></div>
      <div class="info-cell"><span class="info-k">种族</span><span class="info-v">${esc(bio['种族'] || '—')}</span></div>
      <div class="info-cell"><span class="info-k">年龄</span><span class="info-v">${bio['年龄'] ?? '—'} 岁</span></div>
    </div>
    <h3 class="profile-h3">状态</h3>
    <div class="profile-stats-grid">
      <div class="status-card status-hp${(hp['当前'] ?? 0) / (hp['上限'] ?? 1) < 0.3 ? ' is-low' : ''}">
        <div class="status-row"><span class="status-icon">❤️</span><span class="status-name">生命值 HP</span><span class="status-num">${hp['当前'] ?? 0} / ${hp['上限'] ?? 100}</span></div>
        <div class="status-bar"><i style="width:${Math.min(100, ((hp['当前'] ?? 0) / (hp['上限'] ?? 1)) * 100)}%"></i></div>
      </div>
      <div class="status-card status-stamina${(stam['当前'] ?? 0) / (stam['上限'] ?? 1) < 0.3 ? ' is-low' : ''}">
        <div class="status-row"><span class="status-icon">⚡</span><span class="status-name">精力</span><span class="status-num">${stam['当前'] ?? 0} / ${stam['上限'] ?? 100}</span></div>
        <div class="status-bar"><i style="width:${Math.min(100, ((stam['当前'] ?? 0) / (stam['上限'] ?? 1)) * 100)}%"></i></div>
      </div>
    </div>
    <h3 class="profile-h3">烹饪等级</h3>
    <div class="cook-card">
      <div class="cook-row">
        <div class="cook-icon">🍳</div>
        <div class="cook-meta">
          <div class="cook-title"><span class="cook-lv">LV.${cook['等级'] ?? 1}</span><span class="cook-rank-name">${esc(cook['等级称号'] || '学徒')}</span></div>
          <div class="cook-sub">累计做菜 <strong>${cook['累计做菜次数'] ?? 0}</strong> 次 · 距 LV.${(cook['等级'] ?? 1) + 1}「${esc(cook['下一级称号'] || '—')}」还需 <strong>${Math.max(0, cookRem)}</strong> 次</div>
        </div>
      </div>
      <div class="status-bar cook-bar"><i style="width:${Math.min(100, ((cook['累计做菜次数'] ?? 0) / (cook['升级所需次数'] ?? 10)) * 100)}%"></i></div>
    </div>
    <h3 class="profile-h3">当前穿着</h3>
    <div class="role-section-card"><p class="role-outfit-line">${esc(p['当前穿着'] || '待初始化')}</p></div>
  `;
}
function renderRoles() {
  const roles = get('角色') as Record<string, any> | undefined;
  const grid = document.getElementById('roleCardGrid');
  if (!grid || roles === undefined) return;
  if (!roles || !Object.keys(roles).length) {
    grid.innerHTML = '<p style="color:var(--ink-faint);font-style:italic;padding:16px;">暂无角色数据。</p>';
    return;
  }
  const STAGE_NAMES: Record<number, string> = {
    1: '初识',
    2: '面熟',
    3: '点头之交',
    4: '熟人',
    5: '朋友',
    6: '知交',
    7: '挚友',
    8: '至亲',
  };
  const STAMINA_CLASS: Record<string, string> = {
    精力充沛: 'st-energetic',
    状态良好: 'st-good',
    一般: 'st-normal',
    疲惫: 'st-tired',
    筋疲力竭: 'st-exhausted',
  };
  grid.innerHTML = Object.entries(roles)
    .map(([id, r]) => {
      const stage = r['亲密度阶段'] ?? 1;
      const fv = r['好感度'] || {};
      const favorPct = Math.min(100, Math.round(((fv['当前'] ?? 0) / (fv['上限'] ?? 100)) * 100));
      let dots = '';
      for (let i = 1; i <= 8; i++) dots += `<span class="intimacy-dot${i <= stage ? ' filled' : ''}"></span>`;
      const staminaCls = STAMINA_CLASS[r['精力状态']] || 'st-normal';
      return `
      <div class="role-card" role="button" tabindex="0" data-role-id="${esc(id)}">
        <div class="role-card-top">
          <div class="role-card-avatar" style="font-size:26px;display:grid;place-items:center;">${r['头像'] || '👤'}</div>
          <div class="role-card-id">
            <h4 class="role-card-name">${esc(r['显示名'] || id)}</h4>
            <div class="role-card-meta">${esc(r['种族'] || '')}</div>
            <div class="role-card-loc">📍 ${esc(r['当前位置'] || '未知')}</div>
            <span class="stamina-state-tag ${staminaCls}" style="margin-top:4px;display:inline-block">${esc(r['精力状态'] || '一般')}</span>
          </div>
        </div>
        <div class="role-card-divider"></div>
        <div class="intimacy-row">
          <span class="intimacy-stage-badge">LV.${stage} · ${STAGE_NAMES[stage] || '初识'}</span>
          <span class="intimacy-dots">${dots}</span>
        </div>
        <div class="status-card" style="margin-top:6px;">
          <div class="status-row"><span class="status-icon">💛</span><span class="status-name">好感度</span><span class="status-num">${fv['当前'] ?? 0} / ${fv['上限'] ?? 100}</span></div>
          <div class="status-bar"><i style="width:${favorPct}%;background:linear-gradient(90deg,#e8c36a,#d4944a);"></i></div>
        </div>
        <p class="intimacy-quote">「${esc(r['亲密度描述'] || '')}」</p>
      </div>
    `;
    })
    .join('');
}

function setupRoleClickDelegation() {
  const grid = document.getElementById('roleCardGrid');
  if (!grid || (grid as HTMLElement).dataset.rolesDelegated) return;
  (grid as HTMLElement).dataset.rolesDelegated = 'true';
  grid.addEventListener('click', e => {
    const card = (e.target as HTMLElement).closest<HTMLElement>('.role-card');
    if (!card || !card.dataset.roleId) return;
    const roles = get('角色') as Record<string, any> | undefined;
    if (roles && roles[card.dataset.roleId]) showRoleDetail(card.dataset.roleId, roles[card.dataset.roleId]);
  });
}

function showRoleDetail(id: string, r: any) {
  if (!r) return;
  const lv = document.getElementById('rolesListView');
  const dv = document.getElementById('rolesDetailView');
  const content = document.getElementById('roleDetailContent');
  if (!lv || !dv || !content) return;
  const STAGE_NAMES: Record<number, string> = {
    1: '初识',
    2: '面熟',
    3: '点头之交',
    4: '熟人',
    5: '朋友',
    6: '知交',
    7: '挚友',
    8: '至亲',
  };
  const stage = r['亲密度阶段'] ?? 1;
  const bladder = r['膀胱值']?.['当前'] ?? 0;
  let bLabel: string, bCls: string;
  if (bladder < 50) {
    bLabel = '舒适';
    bCls = 'low';
  } else if (bladder < 80) {
    bLabel = '微胀';
    bCls = 'mid';
  } else if (bladder < 95) {
    bLabel = '急迫';
    bCls = 'high';
  } else {
    bLabel = '紧绷';
    bCls = 'critical';
  }
  let dots = '';
  for (let i = 1; i <= 8; i++) dots += `<span class="intimacy-dot${i <= stage ? ' filled' : ''}"></span>`;
  content.innerHTML = `
    <section class="role-detail-hero">
      <div class="role-avatar-wrap"><div class="role-detail-avatar-btn" style="font-size:38px;display:grid;place-items:center;width:78px;height:78px;border-radius:999px;background:radial-gradient(circle at 30% 25%,#f0d999,#b58a3a);border:2px solid rgba(111,74,33,.45);">${r['头像'] || '👤'}</div></div>
      <div class="role-detail-id">
        <h3 class="role-detail-name">${esc(r['显示名'] || id)}</h3>
        <div class="role-detail-meta">
          <span class="profile-meta-pill">${esc(r['种族'] || '')}</span>
          <span class="profile-meta-pill">${r['年龄'] ?? '?'} 岁</span>
          <span class="profile-meta-pill profile-title">📍 ${esc(r['当前位置'] || '未知')}</span>
        </div>
        <p class="role-detail-tagline">${esc(r['简介标语'] || '')}</p>
      </div>
    </section>
    <h3 class="profile-h3">关系状态</h3>
    <div class="role-section-card">
      <div class="intimacy-row">
        <span class="intimacy-stage-badge">亲密度 LV.${stage} / 8 · ${STAGE_NAMES[stage] || '初识'}</span>
        <span class="intimacy-dots">${dots}</span>
      </div>
      <p class="intimacy-quote">「${esc(r['亲密度描述'] || '')}」</p>
    </div>
    <h3 class="profile-h3">当前穿着</h3>
    <div class="role-section-card"><p class="role-outfit-line">${esc(r['穿着'] || '')}</p></div>
    <h3 class="profile-h3">状态</h3>
    <div class="profile-stats-grid">
      <div class="status-card"><div class="status-row"><span class="status-icon">⚡</span><span class="status-name">精力</span><span class="stamina-state-tag">${esc(r['精力状态'] || '一般')}</span></div></div>
      <div class="status-card"><div class="status-row"><span class="status-icon">💧</span><span class="status-name">膀胱</span><span class="status-num">${bladder} / 100</span><span class="bladder-state-tag ${bCls}">${bLabel}</span></div></div>
    </div>
    <h3 class="profile-h3">当前位置</h3>
    <div class="role-section-card"><div class="role-loc-line">📍 ${esc(r['当前位置'] || '未知')}</div></div>
  `;
  lv.hidden = true;
  dv.hidden = false;
}

function setupRoleBackButton() {
  document.getElementById('roleBackBtn')?.addEventListener('click', () => {
    const lv = document.getElementById('rolesListView');
    const dv = document.getElementById('rolesDetailView');
    if (lv) lv.hidden = false;
    if (dv) dv.hidden = true;
  });
}

// ---- Shopping ----
function setupShopping() {
  const tabsEl = document.getElementById('shopTabs');
  const productsEl = document.getElementById('shopProducts');
  const cartEl = document.getElementById('shopCart');
  const countEl = document.getElementById('shopCartCount');
  const totalEl = document.getElementById('shopCartTotal');
  if (!tabsEl || !productsEl) return;
  const shops = (get('购物') as any)?.['店铺列表'];
  if (!shops || !Object.keys(shops).length) {
    tabsEl.innerHTML = '';
    productsEl.innerHTML = '<p style="color:var(--ink-faint);font-style:italic;">暂无店铺数据</p>';
    return;
  }
  const shopEntries = Object.entries(shops);
  let currentId = shopEntries[0][0];
  const cart = new Map<string, { qty: number; shopId: string; itemName: string; price: number; unit: string }>();
  function renderTabs() {
    tabsEl.innerHTML = shopEntries
      .map(
        ([id, s]: [string, any]) =>
          `<button type="button" class="shop-tab${id === currentId ? ' active' : ''}" data-shop="${id}" role="tab">${esc(s['描述']?.slice(0, 12) || id)}</button>`,
      )
      .join('');
  }
  function renderProducts() {
    const shop = shops[currentId];
    if (!shop) return;
    const count = document.getElementById('shopProductCount');
    if (count) count.textContent = `${Object.keys(shop['商品列表'] || {}).length} 种`;
    const items = shop['商品列表'] || {};
    productsEl.innerHTML = Object.entries(items)
      .map(([name, it]: [string, any]) => {
        const cartKey = `${currentId}::${name}`;
        const inCart = cart.has(cartKey);
        const qty = cart.get(cartKey)?.qty ?? 0;
        return `<button type="button" class="shop-product" data-name="${esc(name)}" data-in-cart="${inCart ? '1' : '0'}">
        <span class="shop-product-badge">×${qty}</span>
        <div class="shop-product-name">${esc(name)}</div>
        <div class="shop-product-meta">
          <span class="shop-product-cat">${esc(it['分类'] || '其他')}</span>
          <span class="shop-product-price">${fmtCopper(it['单价铜币'] ?? 0)} / ${it['单位'] || '份'}</span>
        </div>
        ${it['备注'] ? `<div class="shop-product-note">${esc(it['备注'])}</div>` : ''}
      </button>`;
      })
      .join('');
  }
  function renderCart() {
    if (!cartEl || !countEl || !totalEl) return;
    const lines = [...cart.values()];
    countEl.textContent = `${lines.reduce((a, l) => a + l.qty, 0)} 件`;
    if (!lines.length) {
      cartEl.innerHTML = '<p class="shop-cart-empty">点商品名加入篮子。</p>';
      totalEl.textContent = '0铜';
      return;
    }
    let total = 0;
    cartEl.innerHTML = lines
      .map(l => {
        const sub = l.qty * l.price;
        total += sub;
        return `<div class="cart-line" data-key="${l.shopId}::${l.itemName}">
        <div><div class="cart-line-name">${esc(l.itemName)}</div></div>
        <div class="cart-line-price">${fmtCopper(l.price)} × ${l.qty}<br><b>= ${fmtCopper(sub)}</b></div>
        <div class="cart-line-ctrl">
          <button type="button" class="cart-step" data-act="dec">−</button>
          <span class="cart-qty">${l.qty} ${l.unit}</span>
          <button type="button" class="cart-step" data-act="inc">+</button>
          <button type="button" class="cart-line-rm" data-act="rm">移除</button>
        </div>
      </div>`;
      })
      .join('');
    totalEl.textContent = fmtCopper(total);
  }
  tabsEl.addEventListener('click', e => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>('.shop-tab');
    if (!btn || !btn.dataset.shop) return;
    currentId = btn.dataset.shop;
    renderTabs();
    renderProducts();
  });
  productsEl.addEventListener('click', e => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>('.shop-product');
    if (!btn || !btn.dataset.name) return;
    const name = btn.dataset.name;
    const shop = shops[currentId];
    const item = shop?.['商品列表']?.[name];
    if (!item) return;
    const key = `${currentId}::${name}`;
    const existing = cart.get(key);
    if (existing) existing.qty += 1;
    else
      cart.set(key, {
        qty: 1,
        shopId: currentId,
        itemName: name,
        price: item['单价铜币'] ?? 0,
        unit: item['单位'] || '份',
      });
    renderProducts();
    renderCart();
  });
  cartEl?.addEventListener('click', e => {
    const act = (e.target as HTMLElement).closest<HTMLElement>('[data-act]');
    const line = (e.target as HTMLElement).closest<HTMLElement>('.cart-line');
    if (!act || !line || !line.dataset.key) return;
    const entry = cart.get(line.dataset.key);
    if (!entry) return;
    if (act.dataset.act === 'inc') {
      entry.qty += 1;
      renderProducts();
      renderCart();
    } else if (act.dataset.act === 'dec') {
      entry.qty -= 1;
      if (entry.qty <= 0) cart.delete(line.dataset.key);
      renderProducts();
      renderCart();
    } else if (act.dataset.act === 'rm') {
      cart.delete(line.dataset.key);
      renderProducts();
      renderCart();
    }
  });
  document.getElementById('shopClearCart')?.addEventListener('click', () => {
    cart.clear();
    renderProducts();
    renderCart();
  });
  document.getElementById('shopGenerate')?.addEventListener('click', () => {
    const lines = [...cart.values()];
    if (!lines.length) {
      setOutput('购物', '购物篮是空的。');
      return;
    }
    let total = 0;
    const rows = lines
      .map(l => {
        const sub = l.qty * l.price;
        total += sub;
        return `- ${l.itemName} ×${l.qty}${l.unit} @ ${fmtCopper(l.price)}/${l.unit} = ${fmtCopper(sub)}`;
      })
      .join('\n');
    setOutput('购物 · 结账', `[购物清单]\n${rows}\n\n合计支出：${fmtCopper(total)}`);
  });
  renderTabs();
  renderProducts();
  renderCart();
}

// ---- Map (complete with nodes, edges, pan/zoom) ----
function setupMap() {
  const MAP_NODES = `
naveris|纳维里斯|0|0|city|neutral|中立|冒险者工会|内陆盆地|冒险者工会直辖中立城市，深界探险队浮出地表的唯一出口
kronhaven|克朗港|-650|150|city|vestoria|韦斯托利亚|商贸|沿海·港口|银冠河入海口天然避风港，韦斯托利亚首都
weissklippe|白崖城|-720|-80|city|vestoria|韦斯托利亚|学术·教育|沿海·港口|南部海岸白色悬崖顶端
bramwick|布拉姆维克|-520|-80|village|vestoria|韦斯托利亚|农业·牧业|丘陵·缓坡|南部偏远丘陵地带
fairmark|费尔马克|-480|-60|town|vestoria|韦斯托利亚|商贸|沿河·沿湖|发石河畔丘陵集市城镇
kronburg|王冠堡|0|350|city|calderia|卡尔德里亚|行政·首都|沿河·沿湖|银冠河与东支流交汇处
ambossfahre|铁砧渡|-100|250|city|calderia|卡尔德里亚|商贸|沿河·沿湖|银冠河中游最重要渡口
ahrenfeld|麦穗原|80|280|town|calderia|卡尔德里亚|农业·牧业|内陆平原|腹地最肥沃麦田区
weissstein|白石修道院|-50|450|town|calderia|卡尔德里亚|宗教·朝圣|丘陵·缓坡|北部丘陵古老修道院群
zhongfeng|忠风城|450|200|city|beast|兽族·犬邦|行政·首都|内陆平原|鸣原草原核心
feiye|翡叶城|200|-600|city|elf|精灵|行政·首都|森林·密林|翡叶永森最古老巨树树冠层
jinxi|金曦城|-400|-300|city|dragonborn|龙裔|行政·首都|山地·高原|阿什卡纳尔高原绿洲城市
zaoan|灶安城|250|50|city|long|珑族|行政·首都|沿河·沿湖|灶丘温暖河谷珑族祖籍核心城市
`.trim();

  const nodes = MAP_NODES.split('\n').map(line => {
    const p = line.split('|');
    return {
      id: p[0],
      name: p[1],
      x: +p[2],
      y: +p[3],
      type: p[4],
      faction: p[5],
      factionLabel: p[6],
      func: p[7],
      geo: p[8],
      desc: p[9],
    };
  });

  const coords: Record<string, [number, number]> = {
    naveris: [0, 0],
    kronhaven: [-4125, 1050],
    weissklippe: [-4625, -650],
    bramwick: [-3350, -1075],
    fairmark: [-3050, -900],
    kronburg: [-400, 2325],
    ambossfahre: [-1300, 1625],
    ahrenfeld: [300, 1900],
    weissstein: [-825, 3200],
    zhongfeng: [3950, 2450],
    feiye: [-300, -6200],
    jinxi: [-4200, -2950],
    zaoan: [1550, -450],
  };
  nodes.forEach(n => {
    const c = coords[n.id];
    if (c) {
      n.x = c[0];
      n.y = c[1];
    }
  });

  function guessTransport(a: any, b: any) {
    const g = a.geo + b.geo;
    if (g.includes('海') || g.includes('港')) return '海路';
    if (g.includes('河') || g.includes('湖') || g.includes('水')) return '水路';
    if (g.includes('山') || g.includes('地下') || g.includes('高原')) return '山路';
    if (g.includes('森林') || g.includes('密林')) return '林径';
    if (a.type === 'city' || b.type === 'city') return '官道';
    return '乡道';
  }

  function buildEdges(nodes: any[]) {
    const edges: any[] = [],
      set = new Set<string>(),
      byId = new Map(nodes.map(n => [n.id, n]));
    const add = (a: any, b: any, t: string) => {
      const k = [a.id, b.id].sort().join('|');
      if (set.has(k)) return;
      set.add(k);
      const straight = Math.hypot(a.x - b.x, a.y - b.y) * 0.2;
      const roadMult: Record<string, number> = { 官道: 1.25, 乡道: 1.35, 水路: 1.0, 山路: 1.65, 林径: 1.5, 海路: 1.0 };
      const km = Math.round(straight * (roadMult[t] || 1.3));
      const spd: Record<string, number> = { 官道: 50, 乡道: 38, 水路: 90, 山路: 28, 林径: 32, 海路: 140 };
      const d = km / (spd[t] || 40);
      const time = d < 1 ? '约' + Math.max(1, Math.round(d * 24)) + '时' : '约' + d.toFixed(1) + '日';
      edges.push({ from: a.id, to: b.id, distance: km, time, transport: t });
    };
    const groups: Record<string, any[]> = {};
    nodes.forEach(n => (groups[n.faction] || (groups[n.faction] = [])).push(n));
    Object.values(groups).forEach(g => {
      g.forEach(n => {
        const near = g
          .filter(o => o !== n)
          .map(o => ({ n: o, d: Math.hypot(o.x - n.x, o.y - n.y) }))
          .sort((a, b) => a.d - b.d);
        near.slice(0, n.type === 'city' ? 3 : 2).forEach(({ n: o }) => add(n, o, guessTransport(n, o)));
      });
    });
    [
      ['fairmark', 'bramwick', '乡道'],
      ['kronburg', 'fairmark', '官道'],
      ['kronburg', 'naveris', '官道'],
      ['naveris', 'zaoan', '官道'],
      ['naveris', 'jinxi', '官道'],
      ['naveris', 'feiye', '官道'],
      ['weissstein', 'kronburg', '官道'],
      ['ambossfahre', 'kronburg', '官道'],
      ['ambossfahre', 'weissstein', '官道'],
      ['ahrenfeld', 'kronburg', '官道'],
      ['zhongfeng', 'naveris', '官道'],
      ['kronhaven', 'ambossfahre', '水路'],
      ['kronhaven', 'weissklippe', '官道'],
    ].forEach(([fid, tid, t]) => {
      const f = byId.get(fid),
        o = byId.get(tid);
      if (f && o) add(f, o, t);
    });
    return edges;
  }

  const MAP_DATA = { regionName: '卡瑞西亚大陆', playerNode: 'bramwick', nodes, edges: buildEdges(nodes) };
  const TYPE_LABEL: Record<string, string> = { city: '城市', town: '城镇', village: '村庄' };
  const TRANSPORT_CLASS: Record<string, string> = {
    官道: 't-road',
    乡道: 't-trail',
    水路: 't-water',
    山路: 't-mountain',
    林径: 't-forest',
    海路: 't-sea',
  };

  const svg = document.getElementById('worldMap')!;
  const gridG = document.getElementById('mapGrid')!;
  const edgesG = document.getElementById('mapEdges')!;
  const nodesG = document.getElementById('mapNodes')!;
  const detailEl = document.getElementById('mapDetail')!;
  const copyBtn = document.getElementById('mapCopyBtn') as HTMLElement | null;
  const backBtn = document.getElementById('mapBackToPlayer') as HTMLElement | null;
  if (!svg || !edgesG || !nodesG || !gridG || !detailEl) return;

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const nodeById = new Map(MAP_DATA.nodes.map(n => [n.id, n]));
  let selectedId = MAP_DATA.playerNode;

  function getEdgesOf(nodeId: string) {
    return MAP_DATA.edges
      .filter((e: any) => e.from === nodeId || e.to === nodeId)
      .map((e: any) => ({ ...e, neighborId: e.from === nodeId ? e.to : e.from }));
  }

  function getSecondHop(nodeId: string) {
    const direct = new Set(getEdgesOf(nodeId).map((n: any) => n.neighborId));
    direct.add(nodeId);
    const result = new Map<string, any>();
    for (const n1 of getEdgesOf(nodeId)) {
      for (const n2 of getEdgesOf(n1.neighborId)) {
        if (direct.has(n2.neighborId)) continue;
        const total = n1.distance + n2.distance;
        const existing = result.get(n2.neighborId);
        if (!existing || total < existing.distance)
          result.set(n2.neighborId, {
            neighborId: n2.neighborId,
            via: n1.neighborId,
            viaDistance: n1.distance,
            distance: total,
            transport: n2.transport,
            time: n2.time,
          });
      }
    }
    return [...result.values()].sort((a, b) => a.distance - b.distance);
  }

  function renderGrid() {
    gridG.innerHTML = '';
    const SCALE = 2.5,
      STEP = 500;
    const xMin = -3000,
      xMax = 3500,
      yMin = -4000,
      yMax = 4000;
    for (let ox = xMin; ox <= xMax; ox += STEP) {
      const sx = ox * SCALE;
      const l = document.createElementNS(SVG_NS, 'line');
      l.setAttribute('x1', String(sx));
      l.setAttribute('x2', String(sx));
      l.setAttribute('y1', String(-yMax * SCALE));
      l.setAttribute('y2', String(-yMin * SCALE));
      if (ox === 0) l.setAttribute('class', 'axis-origin');
      gridG.appendChild(l);
      const t = document.createElementNS(SVG_NS, 'text');
      t.setAttribute('x', String(sx + 12));
      t.setAttribute('y', String(-yMin * SCALE - 30));
      t.textContent = `x=${ox}`;
      if (ox === 0) t.setAttribute('class', 'axis-origin');
      gridG.appendChild(t);
    }
    for (let oy = yMin; oy <= yMax; oy += STEP) {
      const sy = -oy * SCALE;
      const l = document.createElementNS(SVG_NS, 'line');
      l.setAttribute('x1', String(xMin * SCALE));
      l.setAttribute('x2', String(xMax * SCALE));
      l.setAttribute('y1', String(sy));
      l.setAttribute('y2', String(sy));
      if (oy === 0) l.setAttribute('class', 'axis-origin');
      gridG.appendChild(l);
      const t = document.createElementNS(SVG_NS, 'text');
      t.setAttribute('x', String(xMin * SCALE + 30));
      t.setAttribute('y', String(sy - 12));
      t.textContent = `y=${oy}`;
      if (oy === 0) t.setAttribute('class', 'axis-origin');
      gridG.appendChild(t);
    }
  }

  function renderMap() {
    renderGrid();
    edgesG.innerHTML = '';
    nodesG.innerHTML = '';
    for (const e of MAP_DATA.edges) {
      const a = nodeById.get(e.from),
        b = nodeById.get(e.to);
      if (!a || !b) continue;
      const line = document.createElementNS(SVG_NS, 'line');
      line.setAttribute('class', 'map-edge ' + (TRANSPORT_CLASS[e.transport] || ''));
      line.setAttribute('x1', String(a.x));
      line.setAttribute('y1', String(-a.y));
      line.setAttribute('x2', String(b.x));
      line.setAttribute('y2', String(-b.y));
      line.dataset.from = e.from;
      line.dataset.to = e.to;
      line.dataset.distance = String(e.distance);
      edgesG.appendChild(line);
    }
    for (const n of MAP_DATA.nodes) {
      const g = document.createElementNS(SVG_NS, 'g');
      g.setAttribute('class', 'map-node type-' + n.type);
      g.setAttribute('transform', 'translate(' + n.x + ' ' + -n.y + ')');
      g.dataset.nodeId = n.id;
      if (n.id === MAP_DATA.playerNode) {
        const ring = document.createElementNS(SVG_NS, 'circle');
        ring.setAttribute('class', 'map-player-ring');
        ring.setAttribute('r', '100');
        g.appendChild(ring);
      }
      const r = ({ city: 45, town: 30, village: 20 } as Record<string, number>)[n.type] || 10;
      const c = document.createElementNS(SVG_NS, 'circle');
      c.setAttribute('class', 'map-node-circle faction-' + n.faction);
      c.setAttribute('r', String(r));
      g.appendChild(c);
      if (n.id === MAP_DATA.playerNode) {
        const star = document.createElementNS(SVG_NS, 'path');
        star.setAttribute('class', 'map-player-star');
        star.setAttribute(
          'd',
          'M0 -26 L6.5 -8 L26 -8 L10.5 4.7 L16 24.7 L0 13 L-16 24.7 L-10.5 4.7 L-26 -8 L-6.5 -8 Z',
        );
        g.appendChild(star);
      }
      const label = document.createElementNS(SVG_NS, 'text');
      label.setAttribute('class', 'map-node-label');
      label.setAttribute('y', String(r + 40));
      label.textContent = n.name;
      g.appendChild(label);
      nodesG.appendChild(g);
    }
  }

  function highlightSelection(nodeId: string) {
    const adj = new Set(getEdgesOf(nodeId).map((n: any) => n.neighborId));
    adj.add(nodeId);
    nodesG.querySelectorAll('.map-node').forEach(g => {
      const id = (g as HTMLElement).dataset.nodeId;
      g.classList.toggle('selected', id === nodeId);
      g.classList.toggle('dim', !adj.has(id));
    });
    edgesG.querySelectorAll('.map-edge').forEach(line => {
      const isHit = (line as HTMLElement).dataset.from === nodeId || (line as HTMLElement).dataset.to === nodeId;
      line.classList.toggle('highlight', isHit);
      line.classList.toggle('dim', !isHit);
    });
  }

  function renderDetail(node: any) {
    const adj = getEdgesOf(node.id).sort((a: any, b: any) => a.distance - b.distance);
    const second = getSecondHop(node.id);
    const isPlayer = node.id === MAP_DATA.playerNode;
    const adjList = adj
      .map((n: any) => {
        const nb = nodeById.get(n.neighborId);
        return (
          '<li data-jump="' +
          esc(n.neighborId) +
          '"><b>' +
          esc(nb.name) +
          '</b> <span style="opacity:.6">' +
          esc(nb.factionLabel) +
          '</span> ｜' +
          n.distance +
          'km｜' +
          esc(n.time) +
          '｜' +
          esc(n.transport) +
          '</li>'
        );
      })
      .join('');
    const secondList = second.length
      ? second
          .map((n: any) => {
            const nb = nodeById.get(n.neighborId);
            return (
              '<li data-jump="' +
              esc(n.neighborId) +
              '"><b>' +
              esc(nb.name) +
              '</b> <span style="opacity:.6">' +
              esc(nb.factionLabel) +
              '</span> ｜' +
              n.distance +
              'km｜' +
              esc(n.transport) +
              ' <span class="nb-via">（经 ' +
              esc(nodeById.get(n.via).name) +
              '｜' +
              n.viaDistance +
              'km）</span></li>'
            );
          })
          .join('')
      : '<li style="cursor:default">（无次邻节点）</li>';
    detailEl.innerHTML =
      '<div class="map-detail-head"><h4 class="map-detail-name">' +
      esc(node.name) +
      '</h4><span class="map-detail-pill">' +
      esc(TYPE_LABEL[node.type] || node.type) +
      '</span><span class="map-detail-pill">' +
      esc(node.factionLabel) +
      '</span>' +
      (isPlayer ? '<span class="map-detail-pill is-player">📍 玩家所在</span>' : '') +
      '<span class="map-detail-pill">' +
      esc(node.func) +
      '</span><span class="map-detail-pill">' +
      esc(node.geo) +
      '</span></div><p class="map-detail-desc">' +
      esc(node.desc) +
      '</p><div class="map-detail-section"><h5>相邻节点（' +
      adj.length +
      '）</h5><ul class="map-neighbor-list">' +
      adjList +
      '</ul></div><div class="map-detail-section"><h5>次邻节点（' +
      second.length +
      '）</h5><ul class="map-neighbor-list">' +
      secondList +
      '</ul></div>';
  }

  function buildMapInfoText(nodeId: string) {
    const node = nodeById.get(nodeId);
    if (!node) return '';
    const subLocation = document.querySelector('.story-hud .hud-item.long .v')?.textContent?.trim() || node.name;
    const adj = getEdgesOf(nodeId).sort((a: any, b: any) => a.distance - b.distance);
    const lines: string[] = [];
    lines.push('<map_info>', '<map_loader>');
    lines.push(
      '位置：' + subLocation,
      '节点：' + node.name + '（' + (TYPE_LABEL[node.type] || node.type) + '·' + node.factionLabel + '）',
    );
    lines.push('功能：' + node.func + '｜地理：' + node.geo);
    lines.push('相邻（' + adj.length + '）：');
    for (const n of adj) {
      const nb = nodeById.get(n.neighborId);
      lines.push(
        '- ' +
          nb.name +
          '（' +
          nb.factionLabel +
          '·' +
          (TYPE_LABEL[nb.type] || nb.type) +
          '）｜' +
          n.distance +
          'km｜' +
          n.time +
          '｜' +
          n.transport,
      );
    }
    lines.push('', '周边概览：', '相邻简述：');
    for (const n of adj) {
      const nb = nodeById.get(n.neighborId);
      lines.push('- ' + nb.name + '（' + nb.factionLabel + '）— ' + nb.desc);
    }
    if (second.length) {
      lines.push('次邻简述：');
      for (const n of second) {
        const nb = nodeById.get(n.neighborId),
          via = nodeById.get(n.via);
        lines.push(
          '- ' + nb.name + '（' + nb.factionLabel + '）— ' + nb.desc + '（经 ' + via.name + '｜' + n.distance + 'km）',
        );
      }
    }
    lines.push('</map_loader>', '</map_info>');
    return lines.join('\n');
  }

  function selectNode(nodeId: string) {
    const node = nodeById.get(nodeId);
    if (!node) return;
    selectedId = nodeId;
    highlightSelection(nodeId);
    renderDetail(node);
  }

  detailEl.addEventListener('click', (e: Event) => {
    const li = (e.target as HTMLElement).closest('li[data-jump]');
    if (li) selectNode((li as HTMLElement).dataset.jump!);
  });
  if (backBtn) backBtn.addEventListener('click', () => selectNode(MAP_DATA.playerNode));
  if (copyBtn) {
    copyBtn.addEventListener('click', async () => {
      const text = buildMapInfoText(selectedId);
      setOutput('地图 · map_info 位置摘要', text);
      try {
        await navigator.clipboard.writeText(text);
        const o = copyBtn.textContent;
        copyBtn.textContent = '✓ 已复制';
        setTimeout(() => {
          copyBtn.textContent = o;
        }, 1500);
      } catch {
        /* ignore */
      }
    });
  }

  renderMap();
  selectNode(MAP_DATA.playerNode);

  // Pan & Zoom
  const vb = { x: -7000, y: -9750, w: 16250, h: 19250 };
  function applyVB() {
    svg.setAttribute('viewBox', vb.x + ' ' + vb.y + ' ' + vb.w + ' ' + vb.h);
  }
  let isPanning = false,
    panStart = { x: 0, y: 0 },
    vbStart = { x: 0, y: 0 };
  function svgPt(e: MouseEvent) {
    const r = svg.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * vb.w + vb.x, y: ((e.clientY - r.top) / r.height) * vb.h + vb.y };
  }
  svg.addEventListener('pointerdown', (e: PointerEvent) => {
    // If clicking a map-node, let pointerup handle selection (not drag)
    const clickedNode = (e.target as HTMLElement).closest('.map-node');
    if (clickedNode) {
      (clickedNode as any)._mapMousedown = true;
      return;
    }
    isPanning = true;
    panStart = { x: e.clientX, y: e.clientY };
    vbStart = { x: vb.x, y: vb.y };
    svg.setPointerCapture(e.pointerId);
  });
  svg.addEventListener('pointermove', (e: PointerEvent) => {
    if (!isPanning) return;
    const r = svg.getBoundingClientRect();
    vb.x = vbStart.x - ((e.clientX - panStart.x) / r.width) * vb.w;
    vb.y = vbStart.y - ((e.clientY - panStart.y) / r.height) * vb.h;
    applyVB();
  });
  svg.addEventListener('pointerup', (e: PointerEvent) => {
    // Check if this was a node click (not a drag)
    const target = (e.target as HTMLElement).closest('.map-node');
    if (target && (target as any)._mapMousedown) {
      (target as any)._mapMousedown = false;
      selectNode((target as HTMLElement).dataset.nodeId!);
    }
    isPanning = false;
  });
  svg.addEventListener('pointercancel', () => {
    isPanning = false;
  });
  svg.addEventListener(
    'wheel',
    (e: WheelEvent) => {
      e.preventDefault();
      const pt = svgPt(e);
      const factor = e.deltaY > 0 ? 1.15 : 1 / 1.15;
      const nw = vb.w * factor,
        nh = vb.h * factor;
      if (nw < 1250 || nw > 45000) return;
      vb.x = pt.x - (pt.x - vb.x) * factor;
      vb.y = pt.y - (pt.y - vb.y) * factor;
      vb.w = nw;
      vb.h = nh;
      applyVB();
    },
    { passive: false },
  );
  svg.addEventListener('dblclick', () => {
    vb.x = -7000;
    vb.y = -9750;
    vb.w = 16250;
    vb.h = 19250;
    applyVB();
  });
}

// ---- Maintext extraction ----
function setupStoryMaintext() {
  const bodyEl = document.getElementById('storyPaperBody');
  if (!bodyEl || typeof getChatMessages !== 'function') return;
  function extractMaintext(raw: string): string {
    if (!raw) return '';
    let cleaned = raw.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '');
    cleaned = cleaned.replace(/<think>[\s\S]*?<\/redacted_reasoning>/gi, '');
    const thinkingStart = cleaned.search(/<thinking>/i);
    if (thinkingStart !== -1) {
      cleaned = cleaned.substring(0, thinkingStart);
    }
    const redactedStart = cleaned.search(/<think>/i);
    if (redactedStart !== -1) {
      cleaned = cleaned.substring(0, redactedStart);
    }
    const matches = cleaned.match(/<maintext>([\s\S]*?)<\/maintext>/gi);
    if (!matches || matches.length === 0) return '';
    const last = matches[matches.length - 1];
    const content = last.match(/<maintext>([\s\S]*?)<\/maintext>/i);
    return content ? content[1].trim() : '';
  }
  function latestAssistantMessage(): string {
    for (let d = 1; d <= 500; d++) {
      const arr = getChatMessages(-d, { hide_state: 'unhidden' });
      const m = arr[0];
      if (!m) break;
      if (m.role === 'assistant') return m.message || '';
    }
    return '';
  }
  function render() {
    const inner = extractMaintext(latestAssistantMessage());
    if (!inner) return;
    const parts = inner
      .split(/\n{2,}/)
      .map((s: string) => s.trim())
      .filter(Boolean);
    bodyEl.innerHTML = parts
      .map((para: string, i: number) => {
        const cls = i === 0 ? ' class="dropcap"' : '';
        return `<p${cls}>${esc(para).replace(/\n/g, '<br>')}</p>`;
      })
      .join('');
  }
  render();
  if (typeof eventOn === 'function' && typeof tavern_events !== 'undefined') {
    eventOn(tavern_events.MESSAGE_RECEIVED, render);
    eventOn(tavern_events.MESSAGE_SWIPED, render);
    eventOn(tavern_events.MESSAGE_UPDATED, render);
    eventOn(tavern_events.MESSAGE_EDITED, render);
    eventOn(tavern_events.CHAT_CHANGED, render);
  }
}

// ---- Settings Panel ----
function setupSettingsPanel() {
  const KEY = 'uiSettings';
  const DEFAULTS = { font: 'default', size: '100', theme: 'parchment' };
  const FONT_LINKS: Record<string, string> = {
    lxgw: 'https://fontsapi.zeoseven.com/292/main/result.css',
    noto: 'https://fontsapi.zeoseven.com/285/main/result.css',
  };
  const loadedFonts = new Set<string>();

  function loadFontCss(key: string) {
    if (key === 'default' || loadedFonts.has(key)) return;
    const url = FONT_LINKS[key];
    if (!url) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = url;
    document.head.appendChild(link);
    loadedFonts.add(key);
  }

  function loadSettings() {
    try {
      return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') };
    } catch {
      return { ...DEFAULTS };
    }
  }

  function saveSettings(s: Record<string, string>) {
    try {
      localStorage.setItem(KEY, JSON.stringify(s));
    } catch {
      /* ignore */
    }
  }

  function applySettings(s: Record<string, string>) {
    const b = document.body;
    b.dataset.font = s.font;
    b.dataset.size = s.size;
    b.dataset.theme = s.theme;
    if (s.font !== 'default') loadFontCss(s.font);
  }

  let state = loadSettings();
  applySettings(state);

  const gear = document.getElementById('settingsBtn');
  if (!gear) return;
  gear.addEventListener('click', () => {
    if (document.getElementById('settingsPanel')) return;
    const overlay = document.createElement('div');
    overlay.className = 'settings-overlay';
    overlay.id = 'settingsOverlay';
    const panel = document.createElement('aside');
    panel.className = 'settings-panel';
    panel.id = 'settingsPanel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', '界面设置');
    panel.innerHTML = `
      <header class="settings-head"><h3>设置 <span class="star">✦</span></h3><button type="button" class="settings-close" id="settingsClose" aria-label="关闭">×</button></header>
      <div class="settings-body">
        <p class="settings-hint">字体、大小、主题。选择非默认字体时会按需联网加载。</p>
        <div class="settings-section"><h4>字体大小</h4><div class="settings-options" data-setting="size">${['90', '100', '110', '120', '135'].map(v => `<button type="button" class="settings-option" data-value="${v}">${v === '100' ? '默认' : v + '%'}</button>`).join('')}</div></div>
        <div class="settings-actions"><button type="button" class="settings-reset" id="settingsReset">恢复默认</button><span class="settings-version">设置自动保存</span></div>
      </div>`;
    document.body.appendChild(overlay);
    document.body.appendChild(panel);

    function syncActive() {
      panel.querySelectorAll('.settings-options').forEach(g => {
        const setting = (g as HTMLElement).dataset.setting;
        if (!setting) return;
        const cur = state[setting];
        g.querySelectorAll('.settings-option').forEach(btn =>
          (btn as HTMLElement).classList.toggle('active', (btn as HTMLElement).dataset.value === cur),
        );
      });
    }
    syncActive();

    function closePanel() {
      overlay.remove();
      panel.remove();
    }
    panel.addEventListener('click', e => {
      const opt = (e.target as HTMLElement).closest<HTMLElement>('.settings-option');
      if (opt) {
        const setting = opt.closest<HTMLElement>('.settings-options')?.dataset.setting;
        if (setting) {
          state = { ...state, [setting]: opt.dataset.value! };
          applySettings(state);
          saveSettings(state);
          syncActive();
        }
        return;
      }
      if ((e.target as HTMLElement).closest('#settingsReset')) {
        state = { ...DEFAULTS };
        applySettings(state);
        saveSettings(state);
        syncActive();
      }
      if ((e.target as HTMLElement).closest('#settingsClose')) closePanel();
    });
    overlay.addEventListener('click', closePanel);
  });
}

// ---- Render all ----
async function renderAll() {
  await refreshData();
  renderStoryHud();
  renderTavern();
  renderInventory();
  renderLedger();
  renderProfile();
  renderRoles();
}
// ---- 7个新增面板的渲染函数（读取 chat 变量存档）----
function renderFarming() {
  const farms = sget('farms');
  const el = document.getElementById('farmList');
  if (!el) return;
  const entries = farms ? Object.entries(farms) : [];
  if (!entries.length) {
    el.innerHTML = '<p style="color:var(--ink-faint);font-style:italic;padding:8px 0;">后院还空着。种点什么吧。</p>';
    return;
  }
  el.innerHTML = entries
    .map(
      ([key, c]: [string, any]) =>
        `<div class="brew-item"><div class="brew-head"><strong>${esc(key.split(':')[1] || key)}</strong><span class="countdown">${esc(c.status)}</span></div></div>`,
    )
    .join('');
}

function renderBrewing() {
  const brews = sget('brews');
  const el = document.getElementById('brewList');
  if (!el) return;
  const entries = brews ? Object.entries(brews) : [];
  if (!entries.length) {
    el.innerHTML = '<p style="color:var(--ink-faint);font-style:italic;padding:8px 0;">没有在酿的东西。</p>';
    return;
  }
  el.innerHTML = entries
    .map(
      ([name, b]: [string, any]) =>
        `<div class="brew-item"><div class="brew-head"><strong>${esc(name)}</strong><span class="countdown">${esc(b.aging)}</span></div><div class="brew-meta"><span>容器：${esc(b.container)}</span></div></div>`,
    )
    .join('');
}

function renderConstruction() {
  const regions = sget('tavern.regions');
  const el = document.getElementById('constructionRegions');
  if (!el) return;
  const entries = regions ? Object.entries(regions) : [];
  if (!entries.length) {
    el.innerHTML = '<p style="color:var(--ink-faint);font-style:italic;padding:8px 0;">暂无区域数据。</p>';
    return;
  }
  el.innerHTML = entries
    .map(
      ([name, r]: [string, any]) =>
        `<details class="region-card" open>
      <summary class="region-summary"><div class="region-head"><h4>${esc(name)}</h4><span class="state ${esc(r.status || '')}">${esc(r.status)}</span></div></summary>
      <div class="region-content">
        ${r.facilities?.length ? `<div class="region-tools">${r.facilities.map((f: string) => `<span class="tag">${esc(f)}</span>`).join('')}</div>` : ''}
        ${r.decorations?.length ? `<div class="region-tools" style="margin-top:4px;opacity:.7;">装饰: ${r.decorations.map((d: string) => `<span class="tag">${esc(d)}</span>`).join('')}</div>` : ''}
        ${r.vibe ? `<p class="region-desc" style="margin-top:4px;">${esc(r.vibe)}</p>` : ''}
      </div>
    </details>`,
    )
    .join('');
}

function renderEmployees() {
  const emps = sget('employees');
  const el = document.getElementById('employeeList');
  if (!el) return;
  const entries = emps ? Object.entries(emps) : [];
  if (!entries.length) {
    el.innerHTML = '<p style="color:var(--ink-faint);font-style:italic;padding:8px 0;">还没有员工。</p>';
    return;
  }
  el.innerHTML = entries
    .map(
      ([, e]: [string, any]) =>
        `<div class="brew-item"><div class="brew-head"><strong>${esc(e.role)}</strong><span class="state good">${esc(e.race)}</span></div><div class="brew-meta">${esc((e.personality || '').slice(0, 40))}</div><div class="brew-meta" style="color:var(--ink-mid);font-style:italic;">${esc(e.currentState || '')}</div></div>`,
    )
    .join('');
}

function renderBusiness() {
  const biz = sget('businesses');
  const el = document.getElementById('businessList');
  if (!el) return;
  const entries = biz ? Object.entries(biz) : [];
  if (!entries.length) {
    el.innerHTML = '<p style="color:var(--ink-faint);font-style:italic;padding:8px 0;">暂无产业。</p>';
    return;
  }
  el.innerHTML = entries
    .map(
      ([name, b]: [string, any]) =>
        `<div class="brew-item"><div class="brew-head"><strong>${esc(name)}</strong><span class="state good">${esc(b.type)}</span></div><div class="brew-meta">${esc(b.incomeNote || b.status)}</div></div>`,
    )
    .join('');
}

function renderRelationships() {
  const rels = sget('relationships');
  const el = document.getElementById('relationList');
  if (!el) return;
  const entries = rels ? Object.entries(rels) : [];
  if (!entries.length) {
    el.innerHTML = '<p style="color:var(--ink-faint);font-style:italic;padding:8px 0;">暂无关系记录。</p>';
    return;
  }
  el.innerHTML = entries
    .map(
      ([id, r]: [string, any]) =>
        `<div class="role-card" style="cursor:default;">
      <div class="role-card-top">
        <div class="role-card-avatar" style="font-size:22px;">👤</div>
        <div class="role-card-id"><h4 class="role-card-name">${esc(r.displayName || id)}</h4><div class="role-card-meta">${esc(r.race)}${r.city ? ' · ' + esc(r.city) : ''}</div></div>
      </div>
      <div class="role-card-divider"></div>
      <p class="intimacy-quote">「${esc(r.affinityLabel)}」</p>
    </div>`,
    )
    .join('');
}

function renderAdventure() {
  const el = document.getElementById('adventureRealmList');
  if (!el) return;
  el.innerHTML = DEEP_REALMS.map(r => {
    const zoneLabel = r.zone === 'commute' ? '通勤区（24h内可原路返回）' : '远征区（返回经纳维里斯）';
    const zoneCls = r.zone === 'commute' ? 'good' : 'warn';
    return `<details class="region-card"${r.level <= 3 ? ' open' : ''}>
      <summary class="region-summary">
        <div class="region-head">
          <h4>L${r.level} · ${esc(r.name)}</h4>
          <span class="state ${zoneCls}">${esc(r.zone === 'commute' ? '通勤' : '远征')}</span>
        </div>
      </summary>
      <div class="region-content">
        <p class="region-desc">${esc(r.tagline)}</p>
        <div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px;">
          <span class="tag">等级: ${esc(r.rankRequired)}</span>
          ${r.aliases
            .slice(0, 2)
            .map((a: string) => `<span class="tag">${esc(a)}</span>`)
            .join('')}
        </div>
        <p style="font-size:calc(11px * var(--text-scale,1));color:var(--ink-dim);margin:6px 0 0;">${esc(zoneLabel)}</p>
        <p class="subspace-desc" style="margin-top:4px;">${esc(r.firstImpression)}</p>
        <div style="margin-top:4px;font-size:calc(10px * var(--text-scale,1));color:var(--ink-faint);">
          🎒 资源: ${r.resources
            .slice(0, 4)
            .map((s: string) => esc(s))
            .join('、')}
        </div>
      </div>
    </details>`;
  }).join('');
}

function setupNewPanelActions() {
  // 种菜：触发 Chat → AI 根据上下文判断种什么
  document
    .getElementById('farmPlantBtn')
    ?.addEventListener('click', () => dispatchAndNarrate({ type: 'CHAT', text: '我想在后院种点东西。' }, '🌱 种菜'));
  // 酿酒：触发 Chat
  document
    .getElementById('brewStartBtn')
    ?.addEventListener('click', () => dispatchAndNarrate({ type: 'CHAT', text: '我准备封一桶新酒。' }, '🍺 酿酒'));
  // 建造：触发 Chat
  document
    .getElementById('buildAddBtn')
    ?.addEventListener('click', () => dispatchAndNarrate({ type: 'CHAT', text: '我想扩建/改造一下酒馆。' }, '🔨 建造'));
  // 冒险：触发 Chat（具体目的地由 AI 和玩家对话决定；层域卡片在冒险面板展示）
  document
    .getElementById('adventureGoBtn')
    ?.addEventListener('click', () => dispatchAndNarrate({ type: 'CHAT', text: '我打算出发去冒险。' }, '⚔️ 冒险'));
}

// ---- 调试面板 ----
function renderDebug() {
  const jsonEl = document.getElementById('debugSaveJson') as HTMLTextAreaElement | null;
  if (jsonEl) {
    jsonEl.value = currentSave ? JSON.stringify(currentSave, null, 2) : '（存档未加载）';
  }
  const logEl = document.getElementById('debugActionLog');
  if (logEl) {
    if (actionLog.length === 0) {
      logEl.innerHTML = '<span style="opacity:.45;">暂无日志……</span>';
    } else {
      logEl.innerHTML = actionLog
        .map(
          l =>
            `<div style="margin-bottom:2px;"><span style="opacity:.5;">${l.time}</span> <span style="${l.ok ? 'color:#8abd87' : 'color:#d46c5c'}">${esc(l.action)}</span> ${esc(l.msg).slice(0, 80)}</div>`,
        )
        .join('');
    }
  }
  const sitEl = document.getElementById('debugSituation') as HTMLTextAreaElement | null;
  if (sitEl && currentSave) {
    try {
      sitEl.value = buildSituationSummary(currentSave) || '（无法生成摘要）';
    } catch {
      sitEl.value = '（摘要生成异常）';
    }
  } else if (sitEl) {
    sitEl.value = '（存档未加载）';
  }
}

function setupDebugPanel() {
  // 刷新存档 JSON
  document.getElementById('debugRefreshSave')?.addEventListener('click', () => {
    loadCurrentSave();
    renderDebug();
  });
  // 复制存档 JSON
  document.getElementById('debugCopySave')?.addEventListener('click', async () => {
    const jsonEl = document.getElementById('debugSaveJson') as HTMLTextAreaElement | null;
    const t = jsonEl?.value || '';
    if (!t) return;
    try {
      await navigator.clipboard.writeText(t);
      const btn = document.getElementById('debugCopySave');
      const orig = btn?.textContent;
      if (btn) {
        btn.textContent = '✓ 已复制';
        setTimeout(() => {
          btn.textContent = orig;
        }, 1500);
      }
    } catch {
      jsonEl?.select();
    }
  });
  // 导出存档
  document.getElementById('debugExportSave')?.addEventListener('click', () => {
    if (!currentSave) return;
    const blob = new Blob([JSON.stringify(currentSave, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `primordia-save-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });
  // 导入存档
  const importInput = document.getElementById('debugImportInput') as HTMLInputElement | null;
  importInput?.addEventListener('change', () => {
    const file = importInput.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const json = JSON.parse(reader.result as string);
        currentSave = json;
        writeSave(currentSave);
        renderDebug();
        setOutput('调试 · 导入存档', '存档已导入并写入 chat 变量。');
      } catch (e) {
        setOutput('调试 · 导入存档', `导入失败：${e}`);
      }
      importInput.value = '';
    };
    reader.readAsText(file);
  });
  // 刷新局势摘要
  document.getElementById('debugRefreshSituation')?.addEventListener('click', () => {
    loadCurrentSave();
    renderDebug();
  });
  // 健康检查
  document.getElementById('debugRunHealth')?.addEventListener('click', () => {
    loadCurrentSave();
    const el = document.getElementById('debugHealthResult');
    if (!el) return;
    if (!currentSave) {
      el.innerHTML = '<span style="color:#d46c5c;">存档未加载，无法执行检查。</span>';
      return;
    }
    const report = runHealthCheck(currentSave);
    const lines = [
      `<div style="font-weight:700;margin-bottom:4px;color:${report.ok ? '#8abd87' : '#d46c5c'}">${report.summary}</div>`,
    ];
    for (const c of report.checks) {
      if (c.pass) continue;
      const icon = c.severity === 'error' ? '❌' : '⚠️';
      const color = c.severity === 'error' ? '#d46c5c' : '#d9b15b';
      lines.push(`<div style="color:${color};margin-bottom:1px;">${icon} [${c.category}] ${c.message}</div>`);
    }
    if (report.ok && !report.checks.some(c => !c.pass)) {
      lines.push('<div style="color:#8abd87;">所有检查项均通过 ✨</div>');
    }
    el.innerHTML = lines.join('');
  });
}

// ---- 扩展的 renderAll ----
async function renderAllExtended() {
  loadCurrentSave();
  await refreshData();
  renderStoryHud();
  renderTavern();
  renderInventory();
  renderLedger();
  renderProfile();
  renderRoles();
  renderFarming();
  renderBrewing();
  renderConstruction();
  renderEmployees();
  renderBusiness();
  renderRelationships();
  renderAdventure();
  renderDebug();
}

// ---- 更新 init ----
$(() => {
  setupNavigation();
  setupCopyButton();
  setupRoleClickDelegation();
  setupTavernActions();
  setupSettingsPanel();
  setupRoleBackButton();
  setupStoryMaintext();
  setupNewPanelActions();
  setupDebugPanel();
  renderAllExtended();
  setTimeout(() => {
    setupShopping();
    setupMap();
  }, 0);
  if (typeof Mvu !== 'undefined' && Mvu?.events?.VARIABLE_UPDATE_ENDED) {
    eventOn(Mvu.events.VARIABLE_UPDATE_ENDED, () => {
      renderAllExtended();
    });
  }
});
