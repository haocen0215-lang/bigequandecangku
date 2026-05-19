/* ============================================================
   泥金羊皮卷 UI — 主脚本
   ============================================================ */

/* ===== 1. 页面导航与全局输出 ===== */
(function () {
  const menu = document.getElementById('menu');
  const buttons = [...menu.querySelectorAll('.nav-btn')];
  const pages = [...document.querySelectorAll('.page')];

  window.setGlobalOutput = function (title, text) {
    const label = document.getElementById('globalOutputLabel');
    const output = document.getElementById('globalOutput');
    if (label && title != null && String(title).length > 0) {
      label.textContent = title;
    }
    if (output) {
      output.value = text;
      output.scrollTop = 0;
      try {
        output.focus({ preventScroll: true });
      } catch (_) {}
      const dock = document.getElementById('outputDock');
      if (dock && dock.scrollIntoView) {
        requestAnimationFrame(() => {
          dock.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        });
      }
    }
  };
})();

(function () {
  const menu = document.getElementById('menu');
  const buttons = [...menu.querySelectorAll('.nav-btn')];
  const pages = [...document.querySelectorAll('.page')];
  const globalOutputCopy = document.getElementById('globalOutputCopy');
  const globalOutput = document.getElementById('globalOutput');

  if (globalOutputCopy && globalOutput) {
    globalOutputCopy.addEventListener('click', async () => {
      const t = globalOutput.value || '';
      if (!t) return;
      try {
        await navigator.clipboard.writeText(t);
        const o = globalOutputCopy.textContent;
        globalOutputCopy.textContent = '✓ 已复制';
        setTimeout(() => {
          globalOutputCopy.textContent = o;
        }, 1500);
      } catch (_) {
        globalOutput.focus();
        globalOutput.select();
      }
    });
  }

  function setActivePage(pageId) {
    buttons.forEach(b => {
      const isActive = b.dataset.page === pageId;
      b.classList.toggle('active', isActive);
      b.setAttribute('aria-current', isActive ? 'page' : 'false');
    });
    pages.forEach(p => {
      const isActive = p.id === pageId;
      p.classList.toggle('active', isActive);
      p.hidden = !isActive;
      p.setAttribute('aria-hidden', String(!isActive));
    });
  }

  const defaultBtn = menu.querySelector('.nav-btn.active') || buttons[0];
  if (defaultBtn) setActivePage(defaultBtn.dataset.page);

  menu.addEventListener('click', e => {
    const btn = e.target.closest('.nav-btn');
    if (!btn) return;
    setActivePage(btn.dataset.page);
  });
})();

/* ===== 2. 库存系统 ===== */
(function () {
  const invFilter = document.getElementById('invFilter');
  const invPage = document.getElementById('inventory');
  const invMatBlock = document.getElementById('invMatBlock');
  const invTableWrap = document.getElementById('invTableWrap');

  function getInvItems() {
    return invPage ? [...invPage.querySelectorAll('.inv-item')] : [];
  }

  function applyInvTab(cat) {
    const showMat = cat === '全部' || cat === '食材' || cat === '调料';
    const showTable = cat === '全部' || cat === '成品' || cat === '其他';
    if (invMatBlock) invMatBlock.hidden = !showMat;
    if (invTableWrap) invTableWrap.hidden = !showTable;

    document.querySelectorAll('#invMatGrid .inv-item').forEach(el => {
      if (!showMat) return;
      el.hidden = !(cat === '全部' || el.dataset.cat === cat);
    });
    document.querySelectorAll('#invRows tr.inv-item').forEach(row => {
      if (!showTable) return;
      row.hidden = !(cat === '全部' || row.dataset.cat === cat);
    });
  }

  if (invFilter) {
    invFilter.addEventListener('click', e => {
      const tab = e.target.closest('.inv-tab');
      if (!tab) return;
      const cat = tab.dataset.cat;
      [...invFilter.querySelectorAll('.inv-tab')].forEach(b => {
        b.classList.toggle('active', b === tab);
      });
      applyInvTab(cat);
    });
    const active = invFilter.querySelector('.inv-tab.active');
    applyInvTab(active ? active.dataset.cat : '全部');
  }

  const invClearSel = document.getElementById('invClearSel');

  function parseQty(str) {
    const m = String(str || '').match(/^(\d+)(.*)$/);
    return { max: m ? parseInt(m[1], 10) : 0, unit: m ? m[2].trim() : '' };
  }

  function updateRowDisplay(row) {
    const sel = parseInt(row.dataset.selected || '0', 10);
    const { max } = parseQty(row.dataset.qty);
    const nameBtn = row.querySelector('.inv-name-btn');
    const decBtn = row.querySelector('.inv-name-dec');
    const badge = row.querySelector('[data-sel-badge]');
    if (nameBtn) {
      nameBtn.classList.toggle('is-selected', sel > 0);
      nameBtn.classList.toggle('is-max', sel >= max && sel > 0);
    }
    if (badge) badge.textContent = `\u00d7${sel}`;
    if (decBtn) decBtn.hidden = sel <= 0;
    row.classList.toggle('is-selected', sel > 0);
  }

  getInvItems().forEach(row => {
    if (!row.dataset.selected) row.dataset.selected = '0';
    updateRowDisplay(row);
  });

  if (invPage) {
    invPage.addEventListener('click', e => {
      const incBtn = e.target.closest('.inv-name-btn');
      const decBtn = e.target.closest('.inv-name-dec');
      if (!incBtn && !decBtn) return;
      const row = e.target.closest('.inv-item');
      if (!row) return;
      const { max } = parseQty(row.dataset.qty);
      let cur = parseInt(row.dataset.selected || '0', 10);
      if (incBtn) {
        if (cur < max) cur++;
      } else if (decBtn) {
        if (cur > 0) cur--;
      }
      row.dataset.selected = String(cur);
      updateRowDisplay(row);
    });
  }

  function parseTags(raw) {
    if (!raw) return [];
    return String(raw)
      .split(/[,，、]/)
      .map(s => s.trim())
      .filter(Boolean);
  }

  window.getSelectedInventoryItems = function () {
    return getInvItems()
      .map(row => {
        const sel = parseInt(row.dataset.selected || '0', 10);
        if (sel <= 0) return null;
        const { unit } = parseQty(row.dataset.qty);
        const priceCopperRaw = row.dataset.priceCopper;
        const priceCopper = priceCopperRaw == null || priceCopperRaw === '' ? null : parseInt(priceCopperRaw, 10);
        return {
          name: row.dataset.name || '',
          cat: row.dataset.cat || '',
          sel,
          unit: unit || '份',
          priceCopper: Number.isFinite(priceCopper) ? priceCopper : null,
          flavorTags: parseTags(row.dataset.flavorTags),
          cookMethod: row.dataset.cookMethod || '',
          cookCat: row.dataset.cookCat || '',
        };
      })
      .filter(Boolean);
  };

  // 静态风味标签渲染
  getInvItems().forEach(row => {
    const tags = parseTags(row.dataset.flavorTags);
    const method = row.dataset.cookMethod || '';
    if (!tags.length && !method) return;
    const cell = row.querySelector('.inv-name-cell');
    if (!cell || cell.parentElement.querySelector('.inv-flavor-tags')) return;
    const wrap = document.createElement('div');
    wrap.className = 'inv-flavor-tags';
    wrap.innerHTML = [
      ...(method ? [`<span class="inv-cook-method-tag" title="\u5236\u4f5c\u624b\u6cd5">\u2692 ${method}</span>`] : []),
      ...tags.map(t => `<span class="inv-flavor-tag">${t}</span>`),
    ].join('');
    cell.parentElement.appendChild(wrap);
  });

  function formatItemLine(it) {
    return `${it.name}\uff08${it.sel}${it.unit}\u00b7${it.cat}\uff09`;
  }

  function formatCopper(total) {
    const TIERS = [
      { name: '秘银', value: 250000000 },
      { name: '铂', value: 500000 },
      { name: '金', value: 1000 },
      { name: '银', value: 100 },
      { name: '铜', value: 1 },
    ];
    if (!total || total <= 0) return '0铜';
    let rem = total;
    const parts = [];
    for (const tier of TIERS) {
      const c = Math.floor(rem / tier.value);
      if (c > 0) {
        parts.push(`${c}${tier.name}`);
        rem -= c * tier.value;
      }
    }
    return parts.join(' ');
  }
  window.formatCopper = formatCopper;

  function buildServeReport(items) {
    const priced = items.filter(it => it.priceCopper != null);
    const unpriced = items.filter(it => it.priceCopper == null);
    if (priced.length === 0) {
      return unpriced.length
        ? `当前所选都是无定价物品（${unpriced.map(it => `${it.name}·${it.cat}`).join('、')}），请勾选「成品」类目下的菜品/酒水再上菜。`
        : '请先点击「成品」分类下物品的名字累加份数，再点上菜结账。';
    }
    const lines = priced.map(it => {
      const subtotal = it.sel * it.priceCopper;
      return `  · ${it.name} ×${it.sel} × ${it.priceCopper}铜 = ${subtotal}铜（${formatCopper(subtotal)}）`;
    });
    const totalCopper = priced.reduce((sum, it) => sum + it.sel * it.priceCopper, 0);
    let report = `【🍽️ 上菜结账】本单上桌：\n${lines.join('\n')}\n──────────\n合计：${totalCopper}铜（${formatCopper(totalCopper)}）`;

    const flavorLines = priced
      .filter(it => it.flavorTags.length || it.cookMethod)
      .map(it => {
        const parts = [];
        if (it.cookMethod) parts.push(`手法「${it.cookMethod}」`);
        if (it.flavorTags.length) parts.push(it.flavorTags.join('、'));
        return `  · ${it.name}：${parts.join(' ｜ ')}`;
      });
    if (flavorLines.length) {
      report += `\n\n风味标签（供 AI 描写时优先匹配 <食味体验> 词条，避免每次随机改写）：\n${flavorLines.join('\n')}`;
    }
    if (unpriced.length) {
      report += `\n\n（以下未计价，仅作记录：${unpriced.map(it => `${it.name} ×${it.sel}${it.unit}`).join('、')}）`;
    }
    return report;
  }

  if (invClearSel) {
    invClearSel.addEventListener('click', () => {
      getInvItems().forEach(row => {
        row.dataset.selected = '0';
        updateRowDisplay(row);
      });
    });
  }

  /* 做菜、做酱、做喝的、上菜结账按钮绑定 */
  document.querySelectorAll('#inventory .inv-act-btn, #inventory .inv-act-split-main').forEach(btn => {
    btn.addEventListener('click', () => {
      const items = getInvItems()
        .map(row => {
          const sel = parseInt(row.dataset.selected || '0', 10);
          if (sel <= 0) return null;
          const { unit } = parseQty(row.dataset.qty);
          const priceCopperRaw = row.dataset.priceCopper;
          return {
            name: row.dataset.name || '',
            cat: row.dataset.cat || '',
            sel,
            unit: unit || '份',
            priceCopper: priceCopperRaw == null || priceCopperRaw === '' ? null : parseInt(priceCopperRaw, 10),
            flavorTags: parseTags(row.dataset.flavorTags),
            cookMethod: row.dataset.cookMethod || '',
          };
        })
        .filter(Boolean);

      if (items.length === 0) {
        window.setGlobalOutput('库存 · 操作提示', '请先点击物品名按钮添加要使用的份数。');
        return;
      }

      const action = btn.dataset.action;
      let body = '';
      let title = '库存 · 输出';

      if (action === 'serve') {
        title = '库存 · 上菜结账';
        body = buildServeReport(items);
      } else {
        const list = items.map(formatItemLine).join('、');
        if (action === 'cook') {
          title = '库存 · 做菜';
          body = `【🥘 做菜】从仓库取出：${list}。准备在灶台前处理这些原料，烹成可供上桌的菜肴……`;
        } else if (action === 'sauce') {
          title = '库存 · 做酱';
          body = `【🫙 做酱】从仓库取出：${list}。打算用盐渍或文火熬炼，做成可佐餐或耐放的酱料……`;
        } else if (action === 'drink') {
          title = '库存 · 做喝的';
          body = `【🍷 做喝的】从仓库取出：${list}。准备在吧台或厨房调和、冲泡或发酵，制成可供饮用的饮品……`;
        } else {
          body = list;
        }
      }
      window.setGlobalOutput(title, body);
    });
  });
})();

/* ===== 3. 经营快进 ===== */
(function () {
  const ffBtn = document.getElementById('ffRunBtn');
  if (!ffBtn) return;
  ffBtn.addEventListener('click', () => {
    const raw = parseInt(document.getElementById('ffHours')?.value || '3', 10);
    const hours = Number.isFinite(raw) ? Math.max(1, Math.min(48, raw)) : 3;
    const body = [
      '═══ 经营快进（叙事用） ═══',
      '',
      `请把「世界状态」中的时间一次性推进约 ${hours} 小时。`,
      '',
      '这段时间铁壶酒馆在正常开门待客。请你自由描写这几小时里发生的事（忙闲、桌边闲话、炉火与杯盏、小插曲或平淡收尾均可），篇幅不必长，不必像账本一样逐项列数字。',
      '若剧情里需要顺带交代收入、库存或声望变化，用一两笔带过即可，具体数字由你与既有变量自洽。',
      '',
      '（作者笔记：本段为快进跳过，非实时经营模拟。）',
    ].join('\n');
    window.setGlobalOutput('酒馆 · 经营快进', body);
  });
})();

/* ===== 4. 访客骰 ===== */
(function () {
  const rollBtn = document.getElementById('visitorRollBtn');
  if (!rollBtn) return;
  rollBtn.addEventListener('click', () => {
    const raw = Math.floor(Math.random() * 10000);
    const abcd = String(raw).padStart(4, '0');
    const A = parseInt(abcd[0], 10);
    const B = parseInt(abcd[1], 10);
    const C = parseInt(abcd[2], 10);
    const D = parseInt(abcd[3], 10);

    let headCount, headLabel;
    if (A <= 4) {
      headCount = 1;
      headLabel = '1人（单人，A=0–4）';
    } else if (A <= 7) {
      headCount = 2;
      headLabel = '2人（A=5–7）';
    } else if (A === 8) {
      headCount = 3;
      headLabel = '3人（A=8）';
    } else {
      headCount = 4;
      headLabel = '4人（A=9）';
    }
    const solo = headCount === 1;

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

    let fourth, tagLine;
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
      fourth = moodByD[D] || moodByD[0];
      tagLine = `【单人·${level}·${demand}·${fourth}】`;
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
      fourth = groupByD[D] || groupByD[0];
      tagLine = `【${headCount}人·${level}·${demand}·${fourth}】`;
    }

    const body = [
      '═══ 酒馆访客生成 · 1d10000（村庄版） ═══',
      '',
      '（掷骰：均匀整数 0–9999，共一万种读数；前补零为四位 ABCD，与规则一致。）',
      '',
      `骰点：${raw} → 四位读数 ${abcd}（A千位 / B百位 / C十位 / D个位）`,
      `A=${A} → ${headLabel}`,
      `B=${B} → ${level}`,
      `C=${C} → ${demand}`,
      solo ? `D=${D} → 氛围修饰（单人，A=0–4）：${fourth}` : `D=${D} → 团体关系（多人，A=5–9）：${fourth}`,
      '',
      '【标签包】',
      tagLine,
      '',
      '【解读指引】种族不在骰子内，由 AI 按酒馆所在地人口构成决定；多人时等级标签可视为团队核心或整体基调。标签若看似矛盾，请创造性解读而非丢弃。可将当前天气、时段融入进门表现。',
    ].join('\n');
    window.setGlobalOutput('酒馆 · 访客骰 1d10000', body);
  });
})();

/* ===== 5. 烹饪等级与解锁手法 ===== */
(function () {
  const COOK_LEVELS = [
    {
      level: 1,
      title: '烧火工',
      desc: '能生火，能把东西煮熟烤熟，不会饿死。',
      fire: '只会让火烧起来，常常太旺或太弱',
      season: '只会放盐，多少全凭感觉',
      stability: '低，容易做得粗糙',
      crafts: [
        {
          cat: '煮·汆·烫',
          methods: ['煮', '水煮', '清煮', '汆', '焯', '烫', '涮', '滚', '浸煮', '沸煮', '白灼', '汤煮'],
        },
        { cat: '烤', methods: ['烤', '明火烤', '炭烤', '串烤', '火塘烤', '烧烤'] },
        { cat: '凉拌', methods: ['凉拌', '冷拌', '生拌'] },
        { cat: '腌·泡·渍', methods: ['盐腌', '糖腌', '醋腌'] },
      ],
    },
    {
      level: 2,
      title: '守灶童',
      desc: '学会了慢火和等待，能炖能焖能煎。',
      fire: '分得清大火小火，但转换不够稳',
      season: '两三种调味能配合，咸淡开始稳定',
      stability: '较低，偶尔做得不错，偶尔失手',
      crafts: [
        { cat: '炖·焖·煲', methods: ['炖', '清炖', '焖', '煨', '煲', '熬'] },
        { cat: '煎·烙', methods: ['煎', '干煎', '平底锅煎', '烙'] },
        { cat: '风味煮', methods: ['盐水煮', '糖水煮'] },
        { cat: '腌·泡·渍', methods: ['干腌', '湿腌', '泡', '酱腌', '香料腌'] },
      ],
    },
    {
      level: 3,
      title: '灶台学徒',
      desc: '开始会用油，锅铲翻得动了。',
      fire: '能判断油热和锅热，但还不够老练',
      season: '开始理解先后顺序，知道什么时候下盐、下酱、下香料',
      stability: '中等，忙起来容易乱',
      crafts: [
        { cat: '炒·爆', methods: ['炒', '清炒', '小炒', '快炒', '生炒', '熟炒'] },
        { cat: '炸', methods: ['炸', '深炸', '浅炸', '清炸', '干炸'] },
        { cat: '煸·干炒', methods: ['煸', '干煸', '干炒'] },
        { cat: '烤', methods: ['架烤', '坑烤', '旋转烤'] },
        { cat: '炖·焖·煲', methods: ['红炖', '黄焖', '红焖'] },
      ],
    },
    {
      level: 4,
      title: '行炉工',
      desc: '蒸烤炖煎样样能上手，能同时照看几口灶。',
      fire: '能同时照看多种火力，不容易顾此失彼',
      season: '复合调味开始成形，酱汁和汤底更稳定',
      stability: '较高，已经能独立撑起普通酒馆厨房',
      crafts: [
        { cat: '蒸', methods: ['蒸', '清蒸', '笼蒸', '隔水蒸', '汽蒸'] },
        { cat: '烘·焙·焗', methods: ['烘烤', '焙', '炉烤'] },
        { cat: '烧·烩', methods: ['烧', '红烧', '白烧', '烩', '烹'] },
        { cat: '熏', methods: ['熏', '烟熏', '热熏', '木熏'] },
        { cat: '过油·油封', methods: ['过油', '滑油', '油泼'] },
        { cat: '风味煮', methods: ['奶煮', '酒煮', '咖喱煮', '辣酱炖'] },
      ],
    },
    {
      level: 5,
      title: '持勺匠',
      desc: '手法快准，能把两种以上工序顺畅接起来。',
      fire: '手感明显成熟，能让焦香、油香、酱香互相配合',
      season: '能让不同调味互相托住，不再只是堆味道',
      stability: '高，出菜速度快，失手少',
      crafts: [
        {
          cat: '炒·爆',
          methods: ['滑炒', '软炒', '爆', '油爆', '酱爆', '葱爆', '火爆', '炝炒', '回锅', '铁锅炒', '镬气炒'],
        },
        { cat: '煎·烙', methods: ['香煎', '煎封', '半煎炸', '煎烤', '铁板煎', '煎焗', '塌', '贴', '锅贴', '石板煎'] },
        { cat: '炸', methods: ['酥炸', '脆炸', '软炸', '挂糊炸', '裹粉炸'] },
        { cat: '烧·烩', methods: ['干烧', '葱烧', '酱烧', '照烧', '蒲烧', '扒', '油焖'] },
        { cat: '包裹烤', methods: ['纸包烤', '叶包烤', '竹筒烤', '盐焗', '沙焗'] },
        { cat: '粉蒸', methods: ['粉蒸'] },
        { cat: '组合工序', methods: ['先煎后焖', '先炸后烧', '先烤后炖', '先蒸后煎', '先腌后烤', '先汆后炒'] },
      ],
    },
    {
      level: 6,
      title: '灶台师傅',
      desc: '熟悉各类酒馆大菜，懂卤、熏、冷制、油封和复杂蒸烤。',
      fire: '能处理慢火、蒸汽、热油、炭火和炉温，不容易互相冲突',
      season: '能让酸、咸、香、甜、油脂和酒气形成完整风味',
      stability: '很高，适合担任一间成熟酒馆的主厨',
      crafts: [
        { cat: '卤·酱', methods: ['卤', '红卤', '白卤', '糟卤', '酱', '酱卤', '卤水浸'] },
        { cat: '蒸', methods: ['旱蒸', '酒蒸', '盐蒸', '蒸烤', '盏蒸', '蛋羹蒸'] },
        { cat: '风干·腊制', methods: ['风干', '晒干', '阴干', '烘干', '盐干', '烟干', '干制', '熏腊', '腊制'] },
        { cat: '发酵·糟', methods: ['糟', '酒糟腌', '泡菜发酵', '乳酸发酵', '酒精发酵'] },
        { cat: '熏', methods: ['冷熏', '茶熏', '稻草熏', '熏烤'] },
        {
          cat: '凉拌·生食',
          methods: ['生食', '生切', '刺身', '冷泡', '冷浸', '酸腌', '酸汁腌', '冷熏生食', '冷盘拼制', '冰镇'],
        },
        { cat: '过油·油封', methods: ['油浸', '油封', '油泡', '油焖'] },
        { cat: '低温慢煮', methods: ['温火慢煮', '水浴', '隔水慢炖'] },
      ],
    },
    {
      level: 7,
      title: '首席灶师',
      desc: '糖、酱、香料、酒糟、冷冻、凝冻都能掌握，是一城之内有名的厨师。',
      fire: '对炉火、糖浆、油温和蒸汽都有老练直觉',
      season: '能把复杂味道做得不乱，能设计招牌菜和宴席菜',
      stability: '极高，普通菜稳定，难菜也有把握',
      crafts: [
        { cat: '挂糖·拔丝', methods: ['挂霜', '拔丝', '琉璃', '糖衣', '糖霜', '糖封', '凝糖', '糖炒'] },
        {
          cat: '熬糖·蜜制',
          methods: ['熬糖', '糖煮', '糖熬', '蜜煮', '蜜汁', '焦糖化', '熬浆', '挂浆', '冰糖炖', '果酱熬制', '果脯制作'],
        },
        { cat: '酱渍·发酵', methods: ['豆豉发酵', '腐乳发酵', '酱渍', '酒渍', '蜜渍', '油渍'] },
        { cat: '冷冻·凝制', methods: ['凝冻', '胶冻', '冷制甜品', '冻制'] },
        { cat: '包裹烤', methods: ['泥烤', '盐壳烤', '灰烤'] },
        { cat: '烘·焙·焗', methods: ['焗', '芝士焗', '烤焗', '蒸烤'] },
        { cat: '腌藏', methods: ['生腌', '熟腌', '盐藏', '糖藏', '油藏'] },
        { cat: '调和·打发', methods: ['奶油打发', '蛋奶融合', '油醋调和', '酱汁融合'] },
      ],
    },
    {
      level: 8,
      title: '灶火宗师',
      desc: '一地行会承认的顶尖厨师，能把普通食材做出传奇味道。',
      fire: '看到食材和炉灶就知道该用什么火、什么锅、什么顺序',
      season: '能做出别人想不到但入口合理的搭配',
      stability: '几乎不会在常规菜上失手，独创菜仍可能失败',
      special: [
        '全工艺贯通：前 7 级所有手法的宗师级版本，皆可任意调用。',
        '宴席统御：能安排多道菜的先后、轻重、冷热、荤素、酒食搭配。',
        '种族适配：能根据不同种族的口味偏好调整同一道菜。',
        '独门手法：可创造个人招牌工序，但必须建立在已存在的火/水/油/蒸/烤/熏/腌/糖/冷制等传统工艺上。',
        '魔法灶火：可使用稳定火焰、恒温炉石、保温符文、洁净水阵等魔法辅助，但不凭空跳过烹饪过程。',
      ],
      crafts: [{ cat: '宗师专属', methods: ['宴席统御', '种族适配', '独门手法', '魔法灶火'] }],
    },
  ];

  const COOK_METHOD_INDEX = (() => {
    const map = new Map();
    for (const L of COOK_LEVELS) {
      for (const c of L.crafts) {
        for (const m of c.methods) {
          if (!map.has(m)) {
            map.set(m, { method: m, cat: c.cat, level: L.level, levelTitle: L.title });
          }
        }
      }
    }
    return map;
  })();

  const panel = document.getElementById('cookPanel');
  const levelsEl = document.getElementById('cookLevels');
  if (!panel || !levelsEl) return;

  const summaryEl = document.getElementById('cookSummaryText');
  const playerBadge = document.getElementById('cookPlayerBadge');
  const expandAllBtn = document.getElementById('cookExpandAll');
  const collapseAllBtn = document.getElementById('cookCollapseAll');
  const recentRow = document.getElementById('cookRecentRow');
  const recentList = document.getElementById('cookRecentMethods');
  const recentClear = document.getElementById('cookRecentClear');
  const search = document.getElementById('cookSearch');
  const searchWrap = document.getElementById('cookSearchWrap');
  const searchClear = document.getElementById('cookSearchClear');
  const cookToggleBtn = document.getElementById('cookToggleBtn');
  const cookSplit = document.getElementById('cookSplit');
  const toggle = document.getElementById('cookPanelToggle');

  const RECENT_KEY = 'cookRecentMethods';
  const RECENT_MAX = 8;

  function getPlayerCookLevel() {
    const card = document.querySelector('.cook-card[data-cook-level]');
    return Math.max(1, Math.min(8, parseInt(card?.dataset.cookLevel || '1', 10)));
  }

  const playerLevel = getPlayerCookLevel();
  const playerInfo = COOK_LEVELS.find(L => L.level === playerLevel);
  const openLevels = new Set();
  const openCrafts = new Set();
  let searchMode = false;
  const craftKey = (lv, c) => `${lv}::${c.cat}`;

  let recent = [];
  try {
    const saved = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
    if (Array.isArray(saved)) recent = saved.slice(0, RECENT_MAX).filter(m => COOK_METHOD_INDEX.has(m));
  } catch (_) {}

  function renderHeader() {
    if (playerBadge) {
      playerBadge.textContent = `LV.${playerLevel} ${playerInfo?.title || ''}`;
    }
    if (summaryEl) {
      const unlocked = COOK_LEVELS.filter(L => L.level <= playerLevel).reduce(
        (s, L) => s + L.crafts.reduce((ss, c) => ss + c.methods.length, 0),
        0,
      );
      const total = [...COOK_LEVELS].reduce((s, L) => s + L.crafts.reduce((ss, c) => ss + c.methods.length, 0), 0);
      summaryEl.textContent = `已解锁 ${unlocked} / ${total} 种手法 · 当前 LV.${playerLevel}「${playerInfo?.title || ''}」`;
    }
  }

  function methodBtn(method, locked, level) {
    if (locked) {
      return `<button type="button" class="cook-method is-locked" disabled title="LV.${level} 解锁"><span class="cook-method-lock">🔒</span>${method}</button>`;
    }
    return `<button type="button" class="cook-method" data-method="${method}">${method}</button>`;
  }

  function renderLevels() {
    const unlocked = COOK_LEVELS.filter(L => L.level <= playerLevel);
    const locked = COOK_LEVELS.filter(L => L.level > playerLevel);

    const unlockedHtml = unlocked
      .map(L => {
        const isPlayer = L.level === playerLevel;
        const open = openLevels.has(L.level);
        const methodCount = L.crafts.reduce((s, c) => s + c.methods.length, 0);
        const lvCls = ['cook-lvl', 'is-unlocked', isPlayer ? 'is-player' : '', open ? 'is-open' : '']
          .filter(Boolean)
          .join(' ');
        const headIcon = isPlayer ? '★' : '✓';
        const playerTag = isPlayer ? `<span class="cook-lvl-pill cook-lvl-pill--player">当前等级</span>` : '';
        const crafts = L.crafts
          .map(c => {
            const key = craftKey(L.level, c);
            const cOpen = openCrafts.has(key);
            return `<div class="cook-craft${cOpen ? ' is-open' : ''}">
          <button type="button" class="cook-craft-title" data-craft-toggle="${key}" aria-expanded="${cOpen}">
            <span class="cook-craft-arrow">${cOpen ? '▾' : '▸'}</span>
            <span class="cook-craft-cat">${c.cat}</span>
            <span class="cook-craft-count">${c.methods.length} 种</span>
          </button>
          ${cOpen ? `<div class="cook-craft-methods"><div class="cook-method-row">${c.methods.map(m => methodBtn(m, false, L.level)).join('')}</div></div>` : ''}
        </div>`;
          })
          .join('');
        const specialLines = L.special ? (Array.isArray(L.special) ? L.special : [L.special]) : [];
        const specialBlock = specialLines.length
          ? `<div class="cook-lvl-special">${specialLines.map(s => `<div class="cook-lvl-special-line">✦ ${s}</div>`).join('')}</div>`
          : '';
        const modBlock = `<div class="cook-lvl-mods">
        <span><b>火候</b>：${L.fire}</span>
        <span><b>调味</b>：${L.season}</span>
        <span><b>稳定性</b>：${L.stability || ''}</span>
      </div>`;
        return `<section class="${lvCls}" data-lv="${L.level}">
        <button type="button" class="cook-lvl-head" data-lv-toggle="${L.level}" aria-expanded="${open}">
          <span class="cook-lvl-arrow">${open ? '▾' : '▸'}</span>
          <span class="cook-lvl-icon">${headIcon}</span>
          <span class="cook-lvl-title">LV.${L.level} ${L.title}</span>
          ${playerTag}
          <span class="cook-lvl-meta">${L.crafts.length} 类 · ${methodCount} 种</span>
        </button>
        <div class="cook-lvl-body" ${open ? '' : 'hidden'}>
          <div class="cook-lvl-desc">${L.desc}</div>
          ${modBlock}
          ${crafts}
          ${specialBlock}
        </div>
      </section>`;
      })
      .join('');

    let lockedHtml = '';
    if (locked.length) {
      const lockedOpen = openLevels.has('locked');
      const totalLocked = locked.reduce((s, L) => s + L.crafts.reduce((ss, c) => ss + c.methods.length, 0), 0);
      const lockedBody = locked
        .map(L => {
          const methodCount = L.crafts.reduce((s, c) => s + c.methods.length, 0);
          const open = openLevels.has(L.level);
          const crafts = L.crafts
            .map(c => {
              const key = craftKey(L.level, c);
              const cOpen = openCrafts.has(key);
              return `<div class="cook-craft${cOpen ? ' is-open' : ''}">
            <button type="button" class="cook-craft-title" data-craft-toggle="${key}" aria-expanded="${cOpen}">
              <span class="cook-craft-arrow">${cOpen ? '▾' : '▸'}</span>
              <span class="cook-craft-cat">${c.cat}</span>
              <span class="cook-craft-count">${c.methods.length} 种</span>
            </button>
            ${cOpen ? `<div class="cook-craft-methods"><div class="cook-method-row">${c.methods.map(m => methodBtn(m, true, L.level)).join('')}</div></div>` : ''}
          </div>`;
            })
            .join('');
          return `<div class="cook-lvl-locked-item" ${open ? '' : 'hidden'} data-lv="${L.level}">
          <div style="font-weight:700;color:var(--ink-dim);margin-bottom:4px;">🔒 LV.${L.level} ${L.title} — ${methodCount} 种手法</div>
          <div class="cook-lvl-desc" style="opacity:.7">${L.desc}</div>
          ${crafts}
        </div>`;
        })
        .join('');
      lockedHtml = `<section class="cook-lvl is-locked${lockedOpen ? ' is-open' : ''}" data-lv="locked">
        <button type="button" class="cook-lvl-head" data-lv-toggle="locked" aria-expanded="${lockedOpen}">
          <span class="cook-lvl-arrow">${lockedOpen ? '▾' : '▸'}</span>
          <span class="cook-lvl-icon">🔒</span>
          <span class="cook-lvl-title">未解锁手法（LV.${locked[0].level}~${locked[locked.length - 1].level}）</span>
          <span class="cook-lvl-pill cook-lvl-pill--lock">${totalLocked} 种手法待解锁</span>
        </button>
        <div class="cook-lvl-body" ${lockedOpen ? '' : 'hidden'}>
          ${lockedBody}
        </div>
      </section>`;
    }
    levelsEl.innerHTML = unlockedHtml + lockedHtml;
  }

  function renderRecent() {
    if (!recentRow || !recentList) return;
    if (!recent.length) {
      recentRow.hidden = true;
      return;
    }
    recentRow.hidden = false;
    recentList.innerHTML = recent
      .map(m => {
        const info = COOK_METHOD_INDEX.get(m);
        return `<button type="button" class="cook-method recent" data-method="${m}" title="${info ? `${info.cat}（LV.${info.level}）` : '最近使用'}">${m}</button>`;
      })
      .join('');
  }

  function pushRecent(method) {
    if (!method) return;
    recent = [method, ...recent.filter(m => m !== method)].slice(0, RECENT_MAX);
    try {
      localStorage.setItem(RECENT_KEY, JSON.stringify(recent));
    } catch (_) {}
    renderRecent();
  }

  function applySearch(q) {
    const query = (q || '').trim();
    if (searchWrap) searchWrap.classList.toggle('has-text', query.length > 0);
    if (!query) {
      searchMode = false;
      renderLevels();
      return;
    }
    searchMode = true;
    const unlockedMatches = [];
    const lockedMatches = [];
    for (const [m, info] of COOK_METHOD_INDEX) {
      if (!m.includes(query)) continue;
      if (info.level > playerLevel) lockedMatches.push(info);
      else unlockedMatches.push(info);
    }
    const total = unlockedMatches.length + lockedMatches.length;
    if (total === 0) {
      levelsEl.innerHTML = `<div class="cook-empty-tip">没找到匹配的手法。试试更短的关键字，如「红」「蒸」「炸」。</div>`;
      return;
    }
    const renderRow = (arr, locked) =>
      arr
        .map(info =>
          locked
            ? `<button type="button" class="cook-method is-locked is-match-locked" disabled title="LV.${info.level}「${info.levelTitle}」解锁"><span class="cook-method-lock">🔒</span>${info.method}<span class="cook-method-cat-tag">${info.cat}</span></button>`
            : `<button type="button" class="cook-method is-match" data-method="${info.method}" title="${info.cat}（LV.${info.level}）">${info.method}<span class="cook-method-cat-tag">${info.cat}</span></button>`,
        )
        .join('');
    levelsEl.innerHTML = `
      <div class="cook-search-block">
        <div class="cook-search-head">已解锁匹配 <span class="cook-search-num">${unlockedMatches.length}</span></div>
        <div class="cook-method-row">${unlockedMatches.length ? renderRow(unlockedMatches, false) : `<span class="cook-empty-tip">无</span>`}</div>
      </div>
      ${
        lockedMatches.length
          ? `
        <div class="cook-search-block">
          <div class="cook-search-head">未解锁匹配 <span class="cook-search-num">${lockedMatches.length}</span></div>
          <div class="cook-method-row">${renderRow(lockedMatches, true)}</div>
        </div>
      `
          : ''
      }`;
  }

  function pickMethod(method) {
    const items = (window.getSelectedInventoryItems || (() => []))();
    if (items.length === 0) {
      window.setGlobalOutput('库存 · 做菜', '请先点击物品名按钮添加要使用的份数，再选择手法。');
      return;
    }
    const info = COOK_METHOD_INDEX.get(method);
    if (info && info.level > playerLevel) {
      window.setGlobalOutput(
        '库存 · 做菜（手法未解锁）',
        `「${method}」属于 LV.${info.level}「${info.levelTitle}」级解锁手法，当前 LV.${playerLevel}「${playerInfo?.title || ''}」尚未掌握。`,
      );
      return;
    }
    const list = items.map(it => `${it.name}（${it.sel}${it.unit}·${it.cat}）`).join('、');
    const head = `【🥘 做菜｜${method}${info ? ` · ${info.cat}` : ''}】`;
    const verb = `准备在灶台前以「${method}」之法处理这些原料，烹成可供上桌的菜肴`;
    const hint = info
      ? `\n\n（手法分类：${info.cat}（LV.${info.level}「${info.levelTitle}」解锁）；AI 请按 <食味体验> 中相应「工艺食味」与「工艺联动规则」展开描写。完成后请记得为本菜补一行「风味标签：xx,xx,xx」以便后续叙述一致。）`
      : '';
    window.setGlobalOutput('库存 · 做菜叙事', `${head}从仓库取出：${list}。${verb}……${hint}`);
    pushRecent(method);
    if (search && search.value) {
      search.value = '';
      applySearch('');
    }
  }

  function setPanelOpen(open) {
    panel.hidden = !open;
    if (cookToggleBtn) cookToggleBtn.setAttribute('aria-expanded', String(open));
    if (cookSplit) cookSplit.classList.toggle('is-panel-open', open);
  }

  panel.addEventListener('click', e => {
    const craftHead = e.target.closest('[data-craft-toggle]');
    if (craftHead && !searchMode) {
      const key = craftHead.dataset.craftToggle;
      if (openCrafts.has(key)) openCrafts.delete(key);
      else openCrafts.add(key);
      renderLevels();
      return;
    }
    const lvHead = e.target.closest('[data-lv-toggle]');
    if (lvHead && !searchMode) {
      const raw = lvHead.dataset.lvToggle;
      const lv = raw === 'locked' ? 'locked' : parseInt(raw, 10);
      if (openLevels.has(lv)) openLevels.delete(lv);
      else openLevels.add(lv);
      renderLevels();
      return;
    }
    const method = e.target.closest('.cook-method[data-method]');
    if (method) pickMethod(method.dataset.method);
  });

  if (expandAllBtn) {
    expandAllBtn.addEventListener('click', () => {
      if (searchMode) return;
      openLevels.add('locked');
      for (const L of COOK_LEVELS) {
        openLevels.add(L.level);
        for (const c of L.crafts) openCrafts.add(craftKey(L.level, c));
      }
      renderLevels();
    });
  }
  if (collapseAllBtn) {
    collapseAllBtn.addEventListener('click', () => {
      if (searchMode) return;
      openLevels.clear();
      openCrafts.clear();
      renderLevels();
    });
  }

  if (cookToggleBtn) {
    cookToggleBtn.addEventListener('click', () => {
      setPanelOpen(panel.hidden);
      if (!panel.hidden) setTimeout(() => search?.focus(), 0);
    });
  }
  if (search) {
    search.addEventListener('input', () => applySearch(search.value));
    search.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        search.value = '';
        applySearch('');
      } else if (e.key === 'Enter') {
        const first = levelsEl.querySelector('.cook-method[data-method]');
        if (first) pickMethod(first.dataset.method);
      }
    });
  }
  if (searchClear) {
    searchClear.addEventListener('click', () => {
      if (!search) return;
      search.value = '';
      applySearch('');
      search.focus();
    });
  }
  if (recentClear) {
    recentClear.addEventListener('click', () => {
      recent = [];
      try {
        localStorage.removeItem(RECENT_KEY);
      } catch (_) {}
      renderRecent();
    });
  }
  if (toggle) {
    toggle.addEventListener('click', () => setPanelOpen(false));
  }

  renderHeader();
  renderLevels();
  renderRecent();
})();

/* ===== 6. 账本 ===== */
(function () {
  function formatCopper(total) {
    const TIERS = [
      { name: '秘银', value: 250000000 },
      { name: '铂', value: 500000 },
      { name: '金', value: 1000 },
      { name: '银', value: 100 },
      { name: '铜', value: 1 },
    ];
    if (!total || total <= 0) return '0铜';
    let rem = total;
    const parts = [];
    for (const tier of TIERS) {
      const c = Math.floor(rem / tier.value);
      if (c > 0) {
        parts.push(`${c}${tier.name}`);
        rem -= c * tier.value;
      }
    }
    return parts.join(' ');
  }

  document.querySelectorAll('[data-copper]').forEach(el => {
    const c = parseInt(el.dataset.copper, 10);
    if (!Number.isFinite(c)) return;
    el.textContent = formatCopper(c);
  });

  document.querySelectorAll('[data-copper-raw]').forEach(el => {
    const c = parseInt(el.dataset.copperRaw, 10);
    if (!Number.isFinite(c)) return;
    el.textContent = `${c.toLocaleString('zh-CN')} 铜`;
  });

  document.querySelectorAll('[data-copper-from-coins]').forEach(el => {
    const COIN_TIER_VALUE = {
      myth: 250000000,
      plat: 500000,
      gold: 1000,
      silv: 100,
      copp: 1,
    };
    let total = 0;
    document.querySelectorAll('[data-coin-tier]').forEach(c => {
      const cnt = parseInt(c.dataset.coinCount, 10) || 0;
      const v = COIN_TIER_VALUE[c.dataset.coinTier] || 0;
      total += cnt * v;
    });
    el.textContent = formatCopper(total);
  });
})();

/* ===== 7. 玩家档案 ===== */
(function () {
  document.querySelectorAll('.status-card[data-bar-now][data-bar-max]').forEach(card => {
    const now = parseFloat(card.dataset.barNow) || 0;
    const max = parseFloat(card.dataset.barMax) || 1;
    const ratio = Math.max(0, Math.min(1, now / max));
    const nowEl = card.querySelector('.status-now');
    const maxEl = card.querySelector('.status-max');
    if (nowEl) nowEl.textContent = String(now);
    if (maxEl) maxEl.textContent = String(max);
    const fill = card.querySelector('.status-bar > i');
    if (fill) fill.style.width = `${ratio * 100}%`;
    card.classList.toggle('is-low', ratio < 0.3);
  });

  document.querySelectorAll('.cook-card[data-cook-cur][data-cook-next]').forEach(card => {
    const lv = parseInt(card.dataset.cookLevel, 10) || 1;
    const rank = card.dataset.cookRank || '';
    const nextRank = card.dataset.cookNextRank || '';
    const cur = parseFloat(card.dataset.cookCur) || 0;
    const next = parseFloat(card.dataset.cookNext) || 1;
    const ratio = Math.max(0, Math.min(1, cur / next));
    const remaining = Math.max(0, next - cur);

    const setText = (sel, value) => {
      const el = card.querySelector(sel);
      if (el) el.textContent = String(value);
    };
    setText('[data-cook-lv-display]', lv);
    setText('[data-cook-rank-display]', rank);
    setText('[data-cook-next-lv-display]', lv + 1);
    setText('[data-cook-next-rank-display]', nextRank);
    setText('[data-cook-cur-display]', cur);
    setText('[data-cook-rem-display]', remaining);

    const fill = card.querySelector('.cook-bar > i');
    if (fill) fill.style.width = `${ratio * 100}%`;
  });
})();

/* ===== 8. 购物页 ===== */
(function () {
  const tabsEl = document.getElementById('shopTabs');
  const productsEl = document.getElementById('shopProducts');
  if (!tabsEl || !productsEl) return;

  const SHOPS = [
    {
      id: 'veggie',
      icon: '🥬',
      name: '蔬菜摊',
      loc: '安培瑟尔王城 · 集市',
      desc: '守着一架满是泥土的木摊，菜叶上还带着清晨的露水。',
      items: [
        { name: '大白菜', cat: '食材', unit: '份', price: 3, note: '≈一颗' },
        { name: '萝卜', cat: '食材', unit: '份', price: 2 },
        { name: '土豆', cat: '食材', unit: '份', price: 3 },
        { name: '胡萝卜', cat: '食材', unit: '份', price: 2 },
        { name: '菠菜', cat: '食材', unit: '份', price: 4 },
        { name: '深界翠菌', cat: '食材', unit: '份', price: 12, note: '稀有，今早刚到货' },
        { name: '洋葱', cat: '食材', unit: '份', price: 3 },
        { name: '蒜', cat: '调料', unit: '份', price: 3 },
      ],
    },
    {
      id: 'butcher',
      icon: '🍖',
      name: '肉铺',
      loc: '安培瑟尔王城 · 集市',
      desc: '案板上挂着新鲜的猪肉与风干腌肉，刀斧落下时碎屑横飞。',
      items: [
        { name: '猪五花', cat: '食材', unit: '份', price: 8, note: '≈半斤/份' },
        { name: '鸡腿', cat: '食材', unit: '份', price: 6 },
        { name: '牛腱子', cat: '食材', unit: '份', price: 15 },
        { name: '羊排', cat: '食材', unit: '份', price: 18 },
        { name: '鲜鱼', cat: '食材', unit: '份', price: 10, note: '今晨港边到货' },
        { name: '培根', cat: '食材', unit: '份', price: 12 },
        { name: '猪骨', cat: '食材', unit: '份', price: 4, note: '适合熬汤' },
      ],
    },
    {
      id: 'drygoods',
      icon: '🌾',
      name: '干货 / 杂货铺',
      loc: '安培瑟尔王城 · 集市',
      desc: '麻袋与陶罐排成一墙，谷物与香料的气味混在一起。',
      items: [
        { name: '面粉', cat: '食材', unit: '份', price: 5 },
        { name: '大米', cat: '食材', unit: '份', price: 4 },
        { name: '干香菇', cat: '食材', unit: '份', price: 9 },
        { name: '盐', cat: '调料', unit: '份', price: 2 },
        { name: '糖', cat: '调料', unit: '份', price: 8 },
        { name: '黑胡椒', cat: '调料', unit: '份', price: 15, note: '南方海路转运' },
        { name: '酱油', cat: '调料', unit: '瓶', price: 12 },
        { name: '醋', cat: '调料', unit: '瓶', price: 10 },
      ],
    },
    {
      id: 'brewery',
      icon: '🍺',
      name: '酒坊',
      loc: '安培瑟尔王城 · 工坊街',
      desc: '酒桶滚动声不绝于耳，麦芽与酒花的香气浓得化不开。',
      items: [
        { name: '麦芽', cat: '食材', unit: '份', price: 10 },
        { name: '啤酒花', cat: '食材', unit: '份', price: 12 },
        { name: '黑麦淡啤', cat: '成品', unit: '桶', price: 60, note: '整桶酿好的，可直接上架' },
        { name: '葡萄酒', cat: '成品', unit: '瓶', price: 40 },
        { name: '蜂蜜酒', cat: '成品', unit: '瓶', price: 55 },
        { name: '空酒桶', cat: '其他', unit: '只', price: 30 },
      ],
    },
    {
      id: 'herbalist',
      icon: '🪴',
      name: '草药铺',
      loc: '安培瑟尔王城 · 鸢尾巷',
      desc: '天花板挂满倒吊的草束，研钵里还残着昨夜未磨完的药粉。',
      items: [
        { name: '小瓶治疗药水', cat: '其他', unit: '瓶', price: 50 },
        { name: '解毒草药', cat: '其他', unit: '份', price: 30 },
        { name: '止血粉', cat: '其他', unit: '包', price: 25 },
        { name: '蜂蜡', cat: '其他', unit: '块', price: 20 },
        { name: '绷带', cat: '其他', unit: '卷', price: 8 },
        { name: '薄荷叶', cat: '调料', unit: '份', price: 6 },
      ],
    },
    {
      id: 'tailor',
      icon: '👕',
      name: '成衣店',
      loc: '安培瑟尔王城 · 织匠街',
      desc: '卷起的麻布与皮革堆在墙角，裁缝在一旁缝着新做的围裙。',
      items: [
        { name: '麻布上衣', cat: '其他', unit: '件', price: 80 },
        { name: '棉布下装', cat: '其他', unit: '件', price: 60 },
        { name: '亚麻内衣', cat: '其他', unit: '件', price: 40 },
        { name: '皮革围裙', cat: '其他', unit: '件', price: 150, note: '厨房常备' },
        { name: '厚靴', cat: '其他', unit: '双', price: 200 },
        { name: '羊毛披风', cat: '其他', unit: '件', price: 220, note: '冬季御寒' },
      ],
    },
    {
      id: 'general',
      icon: '🧰',
      name: '杂货摊',
      loc: '安培瑟尔王城 · 旅店外街',
      desc: '什么都卖一点：火绒、木柴、油脂、蜡烛，还有几把不知用处的小工具。',
      items: [
        { name: '干木柴', cat: '其他', unit: '束', price: 3 },
        { name: '火绒', cat: '其他', unit: '盒', price: 5 },
        { name: '油脂', cat: '其他', unit: '罐', price: 10 },
        { name: '蜡烛', cat: '其他', unit: '支', price: 4 },
        { name: '麻绳', cat: '其他', unit: '卷', price: 8 },
        { name: '陶罐', cat: '其他', unit: '只', price: 15 },
      ],
    },
  ];

  function formatCopper(total) {
    const TIERS = [
      { name: '秘银', value: 250000000 },
      { name: '铂', value: 500000 },
      { name: '金', value: 1000 },
      { name: '银', value: 100 },
      { name: '铜', value: 1 },
    ];
    if (!total || total <= 0) return '0铜';
    let rem = total;
    const parts = [];
    for (const tier of TIERS) {
      const c = Math.floor(rem / tier.value);
      if (c > 0) {
        parts.push(`${c}${tier.name}`);
        rem -= c * tier.value;
      }
    }
    return parts.join(' ');
  }

  let currentShopId = SHOPS[0].id;
  const cart = new Map();

  function currentShop() {
    return SHOPS.find(s => s.id === currentShopId) || SHOPS[0];
  }

  function renderTabs() {
    tabsEl.innerHTML = SHOPS.map(
      s =>
        `<button type="button" class="shop-tab${s.id === currentShopId ? ' active' : ''}" data-shop="${s.id}" role="tab" aria-selected="${s.id === currentShopId}"><span class="shop-tab-icon">${s.icon}</span>${s.name}</button>`,
    ).join('');
  }

  function renderBanner() {
    const s = currentShop();
    const nameEl = document.getElementById('shopBannerName');
    const locEl = document.getElementById('shopBannerLoc');
    if (nameEl) nameEl.textContent = s.name;
    if (locEl) locEl.textContent = `📍 ${s.loc}`;
  }

  function renderProducts() {
    const s = currentShop();
    const countEl = document.getElementById('shopProductCount');
    if (countEl) countEl.textContent = `${s.items.length} 种`;
    productsEl.innerHTML = s.items
      .map(it => {
        const key = `${s.id}::${it.name}`;
        const inCart = cart.has(key) ? '1' : '0';
        const qty = cart.get(key)?.qty ?? 0;
        return `<button type="button" class="shop-product" data-name="${it.name}" data-in-cart="${inCart}" title="点一下加入购物篮">
        <span class="shop-product-badge">×${qty}</span>
        <div class="shop-product-name">${it.name}</div>
        <div class="shop-product-meta">
          <span class="shop-product-cat">${it.cat}</span>
          <span class="shop-product-price">${formatCopper(it.price)} / ${it.unit}</span>
        </div>
        ${it.note ? `<div class="shop-product-note">${it.note}</div>` : ''}
      </button>`;
      })
      .join('');
  }

  function renderCart() {
    const cartEl = document.getElementById('shopCart');
    const cartCountEl = document.getElementById('shopCartCount');
    const cartTotalEl = document.getElementById('shopCartTotal');
    if (!cartEl) return;
    const lines = [...cart.values()];
    const totalQty = lines.reduce((a, l) => a + l.qty, 0);
    if (cartCountEl) cartCountEl.textContent = `${totalQty} 件`;
    if (lines.length === 0) {
      cartEl.innerHTML = `<p class="shop-cart-empty">点商品名加入篮子，可在不同店铺之间累积。</p>`;
      if (cartTotalEl) cartTotalEl.textContent = '0铜';
      return;
    }
    let total = 0;
    cartEl.innerHTML = lines
      .map(l => {
        const sub = l.qty * l.item.price;
        total += sub;
        return `<div class="cart-line" data-key="${l.key}">
        <div>
          <div class="cart-line-name">${l.item.name} <small style="font-weight:400;color:var(--ink-mid);">· ${l.item.cat}</small></div>
          <div class="cart-line-shop">${l.shop.icon} ${l.shop.name}</div>
        </div>
        <div class="cart-line-price">${formatCopper(l.item.price)} × ${l.qty}<br><b>= ${formatCopper(sub)}</b></div>
        <div class="cart-line-ctrl">
          <button type="button" class="cart-step" data-act="dec" aria-label="减少 1 ${l.item.unit}">−</button>
          <span class="cart-qty">${l.qty} ${l.item.unit}</span>
          <button type="button" class="cart-step" data-act="inc" aria-label="增加 1 ${l.item.unit}">+</button>
          <button type="button" class="cart-line-rm" data-act="rm">移除</button>
        </div>
      </div>`;
      })
      .join('');
    if (cartTotalEl) cartTotalEl.textContent = formatCopper(total);
  }

  function refreshAll() {
    renderProducts();
    renderCart();
  }

  tabsEl.addEventListener('click', e => {
    const btn = e.target.closest('.shop-tab');
    if (!btn) return;
    currentShopId = btn.dataset.shop;
    renderTabs();
    renderBanner();
    renderProducts();
  });

  productsEl.addEventListener('click', e => {
    const btn = e.target.closest('.shop-product');
    if (!btn) return;
    const s = currentShop();
    const item = s.items.find(it => it.name === btn.dataset.name);
    if (!item) return;
    const key = `${s.id}::${btn.dataset.name}`;
    const existing = cart.get(key);
    if (existing) existing.qty += 1;
    else cart.set(key, { key, shop: s, item, qty: 1 });
    refreshAll();
  });

  document.getElementById('shopCart')?.addEventListener('click', e => {
    const actBtn = e.target.closest('[data-act]');
    const line = e.target.closest('.cart-line');
    if (!actBtn || !line) return;
    const key = line.dataset.key;
    const entry = cart.get(key);
    if (!entry) return;
    const act = actBtn.dataset.act;
    if (act === 'inc') {
      entry.qty += 1;
      refreshAll();
    } else if (act === 'dec') {
      entry.qty -= 1;
      if (entry.qty <= 0) cart.delete(key);
      refreshAll();
    } else if (act === 'rm') {
      cart.delete(key);
      refreshAll();
    }
  });

  document.getElementById('shopClearCart')?.addEventListener('click', () => {
    if (cart.size === 0) return;
    cart.clear();
    refreshAll();
    window.setGlobalOutput('购物 · 输出区', '');
  });

  document.getElementById('shopGenerate')?.addEventListener('click', () => {
    const lines = [...cart.values()];
    if (lines.length === 0) {
      window.setGlobalOutput('购物 · 结账并入库', '购物篮是空的。先点商品名加入篮子，再来结账。');
      return;
    }
    const byShop = new Map();
    for (const l of lines) {
      const arr = byShop.get(l.shop.id) || { shop: l.shop, lines: [] };
      arr.lines.push(l);
      byShop.set(l.shop.id, arr);
    }
    let total = 0;
    const blocks = [];
    for (const { shop, lines: shopLines } of byShop.values()) {
      let sub = 0;
      const rows = shopLines.map(l => {
        const itemSub = l.qty * l.item.price;
        sub += itemSub;
        return `- ${l.item.name} ×${l.qty}${l.item.unit} @ ${formatCopper(l.item.price)}/${l.item.unit} = ${formatCopper(itemSub)}`;
      });
      total += sub;
      blocks.push(`【${shop.icon} ${shop.name} · ${shop.loc}】\n${rows.join('\n')}\n小计：${formatCopper(sub)}`);
    }
    window.setGlobalOutput(
      '购物 · 结账并入库',
      `[购物清单]\n${blocks.join('\n\n')}\n\n━━━━━━━━━━━━━━━━━━━━\n合计支出：${formatCopper(total)}\n（请将以上物品按数量计入「库存」，并从持有金币中扣减相应费用。）`,
    );
  });

  renderTabs();
  renderBanner();
  refreshAll();
})();

/* ===== 9. 地图页 ===== */
(function () {
  const MAP_NODES = `
naveris|纳维里斯|0|0|city|neutral|中立|冒险者工会|内陆盆地|冒险者工会直辖中立城市，深界探险队浮出地表的唯一出口
kronhaven|克朗港|-650|150|city|vestoria|韦斯托利亚|商贸|沿海·港口|银冠河入海口天然避风港，韦斯托利亚首都
weissklippe|白崖城|-720|-80|city|vestoria|韦斯托利亚|学术·教育|沿海·港口|南部海岸白色悬崖顶端，城市沿崖壁层叠而建
eisenofen|铁炉镇|-550|80|town|vestoria|韦斯托利亚|工业·制造|丘陵·缓坡|中部丘陵煤矿和铁矿区，烟囱林立
gruntal|绿谷|-450|50|town|vestoria|韦斯托利亚|农业·牧业|内陆平原|银冠河中游西岸肥沃平原，克朗港粮仓
salzrucken|盐脊堡|-780|200|town|vestoria|韦斯托利亚|资源|沿海·港口|北部海岸盐田和岩盐矿区
windmuhlenhugel|风磨丘|-500|-30|village|vestoria|韦斯托利亚|农业·牧业|丘陵·缓坡|南部连绵丘陵，风车遍布山脊
nebelhafen|雾港|-600|-150|town|vestoria|韦斯托利亚|军事·要塞|沿海·港口|最南端深水港，韦斯托利亚海军母港
tannenschatten|杉影镇|-480|180|village|vestoria|韦斯托利亚|资源|森林·密林|北部密林中的伐木和狩猎营地
bramwick|布拉姆维克|-520|-80|village|vestoria|韦斯托利亚|农业·牧业|丘陵·缓坡|南部偏远丘陵地带，荆棘篱笆围着菜园和羊圈
fairmark|费尔马克|-480|-60|town|vestoria|韦斯托利亚|商贸|沿河·沿湖|发石河畔丘陵集市城镇，冒险者工会裂隙入口岗哨
kronburg|王冠堡|0|350|city|calderia|卡尔德里亚|行政·首都|沿河·沿湖|银冠河与东支流交汇处，白色城墙沿河岸延伸
ambossfahre|铁砧渡|-100|250|city|calderia|卡尔德里亚|商贸|沿河·沿湖|银冠河中游最重要渡口，矮人货物转水运
ahrenfeld|麦穗原|80|280|town|calderia|卡尔德里亚|农业·牧业|内陆平原|腹地最肥沃麦田区，全大陆最大农产品集市
weissstein|白石修道院|-50|450|town|calderia|卡尔德里亚|宗教·朝圣|丘陵·缓坡|北部丘陵古老修道院群，维拉恩信仰学术中心
hirschwald|鹿角林|120|200|village|calderia|卡尔德里亚|资源|森林·密林|东部边境皇家猎场边缘
rotburg|红土堡|-150|180|town|calderia|卡尔德里亚|军事·要塞|丘陵·缓坡|西南边境红色砂岩山丘要塞
furtdorf|浅滩村|30|150|village|calderia|卡尔德里亚|农业·牧业|沿河·沿湖|银冠河东支流浅滩旁宁静村庄
eisenwall|铁壁城|350|150|city|ardenmark|阿尔登马克|军事·要塞|丘陵·缓坡|中部战略高地，黑色玄武岩城墙沿山脊蜿蜒
ostpass|东关镇|500|100|city|ardenmark|阿尔登马克|商贸|山地·高原|与兽族联邦犬邦边境山间隘口，绢稻之路入口
grauwolfsgrat|灰狼岭|400|250|town|ardenmark|阿尔登马克|军事·要塞|山地·高原|北部边境山脊哨所群
erzader|矿脉镇|300|300|town|ardenmark|阿尔登马克|资源|山地·高原|北部山区铁矿和铜矿开采中心
grunweizen|青麦原|250|80|village|ardenmark|阿尔登马克|农业·牧业|内陆平原|西部边境狭长平原，供应边境驻军
veteranensiedlung|老兵屯|380|50|village|ardenmark|阿尔登马克|农业·牧业|丘陵·缓坡|退役边境军人屯垦定居点
echotal|回声谷|280|200|town|ardenmark|阿尔登马克|宗教·朝圣|森林·密林|中部密林深处山谷，维拉恩军事修会大本营
ambossburg|铁砧堡|0|600|city|dwarf|矮人|工业·制造|山地·高原|铁砧山脉中段山腹巨城，氏族议会所在
tiefofen|深炉城|-200|550|city|dwarf|矮人|资源|地下|铁砧山脉西段深层矿区，出产秘银和星铁
kupferbart|铜须关|250|650|town|dwarf|矮人|军事·要塞|山地·高原|东段通往约顿冻原的唯一隘口要塞
heisstal|地热谷|-100|700|town|dwarf|矮人|农业·牧业|山地·高原|北坡地热活跃谷地，地热温室种植
eisenfinger|铁指工坊|100|550|town|dwarf|矮人|工业·制造|地下|中段精密机械制造中心，蒸汽技术发源地
steinherz|石心陵|-300|500|village|dwarf|矮人|资源|山地·高原|西段边缘小型矿村，出产花岗岩和铜矿
frostbart|霜须哨|350|720|village|dwarf|矮人|军事·要塞|山地·高原|东北端靠近雪女族边境哨所
magmapforte|熔岩门|-150|480|town|dwarf|矮人|宗教·朝圣|地下|南麓地下熔岩神殿，炉母图尔加圣所
pilzkrone|菌冠城|-50|350|city|darkelf|暗精灵|商贸|森林·密林|铁砧山脉南麓幽暗谷地核心城市
schattenquell|影泉城|100|300|city|darkelf|暗精灵|学术·教育|地下|大型地下溶洞群，草药学和菌菇培育学术中心
mooshohle|苔穴镇|-150|380|town|darkelf|暗精灵|资源|森林·密林|西部菌菇和草药采集中心
dammerfahre|幽光渡|50|420|town|darkelf|暗精灵|商贸|沿河·沿湖|北部边境渡口，暗精灵与矮人贸易主要口岸
dunkelwurzel|暗根村|-80|280|village|darkelf|暗精灵|农业·牧业|森林·密林|南部小型农耕村落
silbermoos|银苔堡|180|350|town|darkelf|暗精灵|军事·要塞|丘陵·缓坡|东部边境要塞
pilzring|菌环殿|20|310|village|darkelf|暗精灵|宗教·朝圣|森林·密林|席尔瓦·播种者露天圣殿
zhongfeng|忠风城|450|200|city|beast|兽族·犬邦|行政·首都|内陆平原|鸣原草原核心，犬邦王庭所在
xintian|信田镇|400|160|town|beast|兽族·犬邦|农业·牧业|内陆平原|鸣原西南农业集镇
zhaomu|朝牧村|500|240|village|beast|兽族·犬邦|农业·牧业|内陆平原|鸣原东部牧羊村落
canghao|苍嗥城|550|250|city|beast|兽族·狼邦|军事·要塞|丘陵·缓坡|嗥原北部狼邦首府
shuangyuan|霜原镇|600|300|town|beast|兽族·狼邦|资源|山地·高原|东北部靠近矮人山脉边境城镇
yexin|夜信村|520|200|village|beast|兽族·狼邦|农业·牧业|内陆平原|嗥原中部畜牧村落
qiuling|萩铃城|580|120|city|beast|兽族·狐邦|商贸|丘陵·缓坡|萩岭丘陵核心商镇
fenglu|枫露镇|550|100|town|beast|兽族·狐邦|农业·牧业|森林·密林|西部密林山货采集中心
hupo|琥珀村|610|140|village|beast|兽族·狐邦|资源|丘陵·缓坡|东部丘陵琥珀色山茶油产地
yueying|月影城|680|150|city|beast|兽族·猫邦|商贸|丘陵·缓坡|霞丘猫邦首府，以夜间经济闻名
xiwu|夕雾镇|650|130|town|beast|兽族·猫邦|农业·牧业|丘陵·缓坡|西部霞丘绿茶种植区
menglong|朦胧村|710|170|village|beast|兽族·猫邦|农业·牧业|丘陵·缓坡|东部小型农耕村落
yingze|影泽城|720|100|city|beast|兽族·薮猫邦|行政·首都|森林·密林|影丘密林深处薮猫邦首府
anyue|暗月镇|750|80|town|beast|兽族·薮猫邦|资源|森林·密林|东南部木材和树脂采集中心
shenqiu|深丘村|690|80|village|beast|兽族·薮猫邦|农业·牧业|丘陵·缓坡|西部丘陵小村落
yeji|野吉城|780|130|city|beast|兽族·狸猫邦|商贸|内陆平原|迷原湿地边缘狸猫邦首府
luping|路平镇|810|150|town|beast|兽族·狸猫邦|农业·牧业|内陆平原|迷原湿地腹地渔业中心
puhua|朴化村|750|110|village|beast|兽族·狸猫邦|农业·牧业|内陆平原|迷原西部湿地边缘
xiangyun|翔云城|650|280|city|beast|兽族·鸟邦|行政·首都|山地·高原|翠峰崖壁群鸟邦首府
cuifengzhen|翠峰镇|680|310|town|beast|兽族·鸟邦|资源|山地·高原|北部崖壁哨所和崖蜜采集中心
xiaofeng|霄风村|620|260|village|beast|兽族·鸟邦|农业·牧业|山地·高原|西南部崖壁小村落
zhuan|竹安城|750|220|city|beast|兽族·熊猫邦|行政·首都|山地·高原|翠屏竹林深处熊猫邦首府
yuanmo|圆墨镇|780|240|town|beast|兽族·熊猫邦|工业·制造|山地·高原|东部竹器加工中心
youxian|悠闲村|720|200|village|beast|兽族·熊猫邦|农业·牧业|山地·高原|西部竹林小村落
lianlu|莲露城|700|50|city|beast|兽族·兔邦|行政·首都|内陆平原|露泽水乡核心，翠江中游北岸
qingze|清泽镇|650|30|town|beast|兽族·兔邦|商贸|沿河·沿湖|翠江西岸水运码头
lingyue|菱月村|730|70|village|beast|兽族·兔邦|农业·牧业|内陆平原|露泽东部水田
chunchang|春菖镇|680|10|town|beast|兽族·兔邦|工业·制造|沿河·沿湖|翠江南岸竹编和草席加工
youlan|幽兰城|800|20|city|beast|兽族·鹿邦|行政·首都|森林·密林|幽泽林间湿地鹿邦首府
cuixuan|翠萱镇|770|0|town|beast|兽族·鹿邦|商贸|森林·密林|南部草药贸易集镇
changpu|菖蒲村|830|40|village|beast|兽族·鹿邦|农业·牧业|森林·密林|北部湿地小村落
nuansui|暖穗城|850|-80|city|beast|兽族·羊邦|行政·首都|丘陵·缓坡|牧坡缓坡丘陵羊邦首府
roumu|柔牧镇|820|-100|town|beast|兽族·羊邦|工业·制造|丘陵·缓坡|西部羊毛纺织和奶酪加工
mianyuan|绵原村|880|-60|village|beast|兽族·羊邦|农业·牧业|丘陵·缓坡|东部牧羊村落
fengyuan|丰原城|900|-50|city|beast|兽族·牛邦|行政·首都|内陆平原|原泽广阔平原牛邦首府
houshi|厚实镇|950|-30|town|beast|兽族·牛邦|商贸|沿河·沿湖|翠江下游河港城镇
wentian|稳田村|870|-70|village|beast|兽族·牛邦|农业·牧业|内陆平原|西部平原农耕村落
zhuangtu|壮土镇|930|-80|town|beast|兽族·牛邦|工业·制造|内陆平原|南部皮革加工和铁器制造
liejin|烈金城|1000|-120|city|beast|兽族·狮邦|行政·首都|内陆平原|烈原稀树草原狮邦首府
leiyuan|雷原镇|1050|-100|town|beast|兽族·狮邦|农业·牧业|内陆平原|东部畜牧和狩猎集镇
haofeng|豪风村|970|-140|village|beast|兽族·狮邦|农业·牧业|内陆平原|南部草原养马村落
shenzhao|深沼城|1100|-200|city|beast|兽族·鳄邦|行政·首都|内陆平原|沼泽三角洲腹地鳄邦首府
qianyuan|潜渊镇|1150|-180|town|beast|兽族·鳄邦|资源|内陆平原|东部渔猎和木材中心
guze|古泽村|1070|-220|village|beast|兽族·鳄邦|农业·牧业|内陆平原|西部水生作物种植
shiyin|石隐城|1150|-280|city|beast|兽族·蜥蜴邦|行政·首都|山地·高原|石鳞地干燥岩漠蜥蜴邦首府
yanwen|岩纹镇|1200|-260|town|beast|兽族·蜥蜴邦|资源|山地·高原|东部石材开采中心
fusha|伏沙村|1120|-300|village|beast|兽族·蜥蜴邦|农业·牧业|山地·高原|南部岩漠边缘小村落
feiye|翡叶城|200|-600|city|elf|精灵|行政·首都|森林·密林|翡叶永森最古老巨树树冠层，长老议会所在
yuequan|月泉城|350|-550|city|elf|精灵|宗教·朝圣|森林·密林|东部林间湖泊旁，精灵魔法学院分院
xiangjing|香径镇|100|-650|town|elf|精灵|商贸|森林·密林|翡叶香路起点，精灵香料贸易核心
cuiguan|翠冠镇|250|-700|town|elf|精灵|农业·牧业|森林·密林|南部林冠水果和香料种植中心
xiyu|溪语村|300|-620|village|elf|精灵|农业·牧业|沿河·沿湖|翡河上游溪谷小村落
yinggu|萤谷村|150|-580|village|elf|精灵|宗教·朝圣|森林·密林|西部萤火虫幽谷，席尔瓦圣所
jinxi|金曦城|-400|-300|city|dragonborn|龙裔|行政·首都|山地·高原|阿什卡纳尔高原绿洲城市，血脉王庭所在
chisha|赤砂城|-550|-400|city|dragonborn|龙裔|商贸|沿海·港口|西海岸港口，蔗糖和藏红花主要出口港
mitang|蜜糖镇|-350|-350|town|dragonborn|龙裔|农业·牧业|沿河·沿湖|东部绿洲甘蔗种植和蔗糖精炼中心
canghong|藏红镇|-300|-280|town|dragonborn|龙裔|农业·牧业|山地·高原|东部高原藏红花种植核心区
tuoling|驼铃村|-450|-250|village|dragonborn|龙裔|资源|山地·高原|沙金之路骆驼驿站
yanyan|炎岩村|-500|-320|village|dragonborn|龙裔|资源|山地·高原|西南部高原砂岩矿村
huanshi|环石城|100|-200|city|lamia|拉弥亚|行政·首都|地下|奥菲迪亚最大地下溶洞城市
shisun|石笋镇|50|-250|town|lamia|拉弥亚|资源|地下|西部溶洞草药和矿物采集中心
baixue|白穴村|150|-180|village|lamia|拉弥亚|农业·牧业|地下|东部小型溶洞村落
shenji|深寂村|80|-220|village|lamia|拉弥亚|宗教·朝圣|地下|最深处蜕祖圣所
chaoxi|潮汐城|500|-500|city|naga|那伽|行政·首都|沿海·港口|翡河入海口北岸，那伽神庙祭司权力中心
yanhua|盐花镇|550|-480|town|naga|那伽|资源|沿海·港口|东部珊瑚礁盐花采集中心
yulu|鱼露镇|450|-520|town|naga|那伽|工业·制造|沿河·沿湖|翡河下游鱼露酿造中心
hongshu|红树村|600|-460|village|naga|那伽|农业·牧业|沿海·港口|东部红树林湿地村落
xingben|星奔城|400|-100|city|centaur|半人马|行政·首都|内陆平原|阿斯特拉原野季节性营地核心
fengxi|风息镇|350|-150|town|centaur|半人马|商贸|内陆平原|西部边缘半固定贸易营地
zhuixing|追星村|450|-50|village|centaur|半人马|农业·牧业|内陆平原|北部季节性营地
zaoan|灶安城|250|50|city|long|珑族|行政·首都|沿河·沿湖|灶丘温暖河谷珑族祖籍核心城市
yuquanzhen|玉泉镇|200|30|town|long|珑族|工业·制造|沿河·沿湖|西部精密机关制造中心
daoxiang|稻香村|300|70|village|long|珑族|农业·牧业|内陆平原|东部河谷水稻种植村落
zhuyun|竹韵村|230|10|village|long|珑族|农业·牧业|森林·密林|南部竹林小村落
shanhuting|珊瑚庭|-700|0|city|merfolk|人鱼|行政·首都|沿海·港口|韦斯托利亚外海珊瑚礁，蔚澜诸域核心
biboting|碧波庭|900|-100|city|merfolk|人鱼|商贸|沿海·港口|兽族联邦东海岸外海珊瑚礁城市
yinbo|银波镇|-600|-350|town|merfolk|人鱼|资源|沿海·港口|龙裔半岛西南端外海浮台港口
nuanliu|暖流村|400|-600|village|merfolk|人鱼|农业·牧业|沿海·港口|精灵领地南端外海温暖浅海村落
shuanggu|霜骨城|0|1200|city|jotun|约顿|行政·首都|山地·高原|极北冻原与火山脉交界处巨型石城
bingya|冰牙村|-100|1300|village|jotun|约顿|资源|山地·高原|极北冻原冰霜巨人狩猎营地
bingge|冰歌城|300|1100|city|yukionna|雪女族|行政·首都|沿海·港口|极北东段冰封海岸冰川城市
bingjing|冰晶村|400|1200|village|yukionna|雪女族|资源|沿海·港口|冰封海岸渔猎村落
wuxia|雾峡城|-500|900|city|fomor|佛摩尔族|行政·首都|沿海·港口|西北峡湾最深处暗礁环绕城市
anjiao|暗礁村|-550|950|village|fomor|佛摩尔族|资源|沿海·港口|峡湾深处小型渔村`.trim();

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

  const coords = {
    naveris: [0, 0],
    kronhaven: [-4125, 1050],
    weissklippe: [-4625, -650],
    eisenofen: [-3375, 650],
    gruntal: [-2800, 400],
    salzrucken: [-5125, 1950],
    windmuhlenhugel: [-3200, -650],
    nebelhafen: [-3950, -1600],
    tannenschatten: [-3050, 1550],
    bramwick: [-3350, -1075],
    fairmark: [-3050, -900],
    kronburg: [-400, 2325],
    ambossfahre: [-1300, 1625],
    ahrenfeld: [300, 1900],
    weissstein: [-825, 3200],
    hirschwald: [650, 1350],
    rotburg: [-1900, 1000],
    furtdorf: [-300, 1050],
    eisenwall: [1900, 1050],
    ostpass: [2950, 900],
    grauwolfsgrat: [2050, 2125],
    erzader: [1350, 2575],
    grunweizen: [1175, 450],
    veteranensiedlung: [2200, 300],
    echotal: [1400, 1550],
    ambossburg: [-300, 5500],
    tiefofen: [-1550, 5125],
    kupferbart: [1550, 5900],
    heisstal: [-800, 6450],
    eisenfinger: [650, 5100],
    steinherz: [-2300, 4700],
    frostbart: [2350, 6700],
    magmapforte: [-1150, 4400],
    pilzkrone: [-1800, 3700],
    schattenquell: [-800, 3425],
    mooshohle: [-2575, 3900],
    dammerfahre: [-450, 4225],
    dunkelwurzel: [-1700, 2950],
    silbermoos: [400, 3700],
    pilzring: [-1200, 3250],
    zhongfeng: [3950, 2450],
    xintian: [3450, 2100],
    zhaomu: [4450, 2800],
    canghao: [5125, 3200],
    shuangyuan: [5700, 3850],
    yexin: [4750, 2575],
    qiuling: [4250, 1050],
    fenglu: [3850, 750],
    hupo: [4600, 1350],
    yueying: [5375, 1150],
    xiwu: [4950, 850],
    menglong: [5800, 1400],
    yingze: [6300, 600],
    anyue: [6800, 300],
    shenqiu: [5900, 250],
    yeji: [7150, 1050],
    luping: [7625, 1300],
    puhua: [6750, 750],
    xiangyun: [5450, 4350],
    cuifengzhen: [5950, 4850],
    xiaofeng: [5000, 3950],
    zhuan: [6250, 2450],
    yuanmo: [6700, 2800],
    youxian: [5800, 2050],
    lianlu: [5350, -900],
    qingze: [4850, -1250],
    lingyue: [5800, -650],
    chunchang: [5200, -1625],
    youlan: [6500, -1400],
    cuixuan: [6050, -1900],
    changpu: [7000, -1075],
    nuansui: [5550, -2700],
    roumu: [5050, -3050],
    mianyuan: [6000, -2350],
    fengyuan: [6550, -2600],
    houshi: [7200, -2250],
    wentian: [6150, -3000],
    zhuangtu: [6950, -3200],
    liejin: [7550, -3900],
    leiyuan: [8075, -3550],
    haofeng: [7150, -4350],
    shenzhao: [7150, -5400],
    qianyuan: [7750, -5100],
    guze: [6700, -5800],
    shiyin: [6950, -7100],
    yanwen: [7550, -6800],
    fusha: [6450, -7550],
    feiye: [-300, -6200],
    yuequan: [1050, -5800],
    xiangjing: [-1300, -6700],
    cuiguan: [450, -7550],
    xiyu: [900, -6550],
    yinggu: [-700, -5650],
    jinxi: [-4200, -2950],
    chisha: [-5500, -3900],
    mitang: [-3550, -3750],
    canghong: [-3200, -2600],
    tuoling: [-4600, -2200],
    yanyan: [-4900, -3150],
    huanshi: [400, -1900],
    shisun: [-200, -2450],
    baixue: [850, -1550],
    shenji: [200, -2300],
    chaoxi: [3750, -7550],
    yanhua: [4350, -7150],
    yulu: [3200, -7950],
    hongshu: [4750, -6750],
    xingben: [2450, -1350],
    fengxi: [1900, -1900],
    zhuixing: [2900, -800],
    zaoan: [1550, -450],
    yuquanzhen: [1050, -750],
    daoxiang: [2050, -200],
    zhuyun: [1400, -1100],
    shanhuting: [-6200, 300],
    biboting: [8450, -1900],
    yinbo: [-5750, -4200],
    nuanliu: [1300, -8800],
    shuanggu: [-200, 8350],
    bingya: [-950, 8950],
    bingge: [2300, 7950],
    bingjing: [3100, 8550],
    wuxia: [-4550, 7150],
    anjiao: [-5050, 7700],
  };
  nodes.forEach(n => {
    const c = coords[n.id];
    if (c) {
      n.x = c[0];
      n.y = c[1];
    }
  });

  function guessTransport(a, b) {
    const g = a.geo + b.geo;
    if (g.includes('海') || g.includes('港')) return '海路';
    if (g.includes('河') || g.includes('湖') || g.includes('水')) return '水路';
    if (g.includes('山') || g.includes('地下') || g.includes('高原')) return '山路';
    if (g.includes('森林') || g.includes('密林')) return '林径';
    if (a.type === 'city' || b.type === 'city') return '官道';
    return '乡道';
  }

  function buildEdges(nodes) {
    const edges = [],
      set = new Set(),
      byId = new Map(nodes.map(n => [n.id, n]));
    const add = (a, b, t) => {
      const k = [a.id, b.id].sort().join('|');
      if (set.has(k)) return;
      set.add(k);
      const straight = Math.hypot(a.x - b.x, a.y - b.y) * 0.2;
      const roadMult = { 官道: 1.25, 乡道: 1.35, 水路: 1.0, 山路: 1.65, 林径: 1.5, 海路: 1.0 }[t] || 1.3;
      const km = Math.round(straight * roadMult);
      const spd = { 官道: 50, 乡道: 38, 水路: 90, 山路: 28, 林径: 32, 海路: 140 }[t] || 40;
      const d = km / spd;
      const time = d < 1 ? '约' + Math.max(1, Math.round(d * 24)) + '时' : '约' + d.toFixed(1) + '日';
      edges.push({ from: a.id, to: b.id, distance: km, time, transport: t });
    };
    const groups = {};
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
      ['gruntal', 'rotburg', '官道'],
      ['kronhaven', 'ambossfahre', '水路'],
      ['ambossfahre', 'magmapforte', '山路'],
      ['weissstein', 'magmapforte', '山路'],
      ['dammerfahre', 'ambossburg', '山路'],
      ['dammerfahre', 'eisenfinger', '山路'],
      ['dunkelwurzel', 'kronburg', '官道'],
      ['pilzkrone', 'kronburg', '官道'],
      ['hirschwald', 'grunweizen', '官道'],
      ['ahrenfeld', 'echotal', '官道'],
      ['grauwolfsgrat', 'silbermoos', '林径'],
      ['ostpass', 'zhongfeng', '官道'],
      ['ostpass', 'xintian', '官道'],
      ['grunweizen', 'zaoan', '乡道'],
      ['kronburg', 'naveris', '官道'],
      ['furtdorf', 'naveris', '官道'],
      ['fairmark', 'naveris', '官道'],
      ['naveris', 'huanshi', '乡道'],
      ['naveris', 'zaoan', '官道'],
      ['naveris', 'canghong', '官道'],
      ['daoxiang', 'qiuling', '乡道'],
      ['jinxi', 'nebelhafen', '官道'],
      ['huanshi', 'fengxi', '乡道'],
      ['xingben', 'veteranensiedlung', '乡道'],
      ['xingben', 'nuansui', '乡道'],
      ['feiye', 'shisun', '林径'],
      ['yuequan', 'chaoxi', '林径'],
      ['feiye', 'yulu', '林径'],
      ['zhongfeng', 'canghao', '官道'],
      ['xintian', 'fenglu', '乡道'],
      ['canghao', 'xiangyun', '山路'],
      ['canghao', 'zhuan', '乡道'],
      ['yueying', 'qiuling', '官道'],
      ['yueying', 'yingze', '乡道'],
      ['yingze', 'yeji', '乡道'],
      ['lianlu', 'youlan', '官道'],
      ['qingze', 'fenglu', '乡道'],
      ['nuansui', 'fengyuan', '官道'],
      ['fengyuan', 'liejin', '官道'],
      ['liejin', 'shenzhao', '官道'],
      ['shenzhao', 'shiyin', '乡道'],
      ['shanhuting', 'kronhaven', '海路'],
      ['shanhuting', 'weissklippe', '海路'],
      ['biboting', 'fengyuan', '海路'],
      ['yinbo', 'chisha', '海路'],
      ['nuanliu', 'chaoxi', '海路'],
      ['kupferbart', 'shuanggu', '山路'],
      ['frostbart', 'bingge', '山路'],
      ['steinherz', 'wuxia', '山路'],
      ['kupferbart', 'shuangyuan', '山路'],
      ['kupferbart', 'cuifengzhen', '山路'],
      ['shuanggu', 'bingge', '山路'],
      ['wuxia', 'anjiao', '海路'],
      ['zhuixing', 'zaoan', '乡道'],
      ['nebelhafen', 'jinxi', '海路'],
    ].forEach(([fid, tid, t]) => {
      const f = byId.get(fid),
        o = byId.get(tid);
      if (f && o) add(f, o, t);
    });
    return edges;
  }

  const MAP_DATA = { regionName: '卡瑞西亚大陆', playerNode: 'bramwick', nodes, edges: buildEdges(nodes) };
  const TYPE_LABEL = { city: '城市', town: '城镇', village: '村庄' };
  const TRANSPORT_CLASS = {
    官道: 't-road',
    乡道: 't-trail',
    水路: 't-water',
    山路: 't-mountain',
    林径: 't-forest',
    海路: 't-sea',
  };

  const svg = document.getElementById('worldMap');
  const gridG = document.getElementById('mapGrid');
  const edgesG = document.getElementById('mapEdges');
  const nodesG = document.getElementById('mapNodes');
  const detailEl = document.getElementById('mapDetail');
  const copyBtn = document.getElementById('mapCopyBtn');
  const backBtn = document.getElementById('mapBackToPlayer');
  if (!svg || !edgesG || !nodesG || !gridG) return;

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const nodeById = new Map(MAP_DATA.nodes.map(n => [n.id, n]));
  let selectedId = MAP_DATA.playerNode;

  function getEdgesOf(nodeId) {
    return MAP_DATA.edges
      .filter(e => e.from === nodeId || e.to === nodeId)
      .map(e => ({ ...e, neighborId: e.from === nodeId ? e.to : e.from }));
  }

  function getSecondHop(nodeId) {
    const direct = new Set(getEdgesOf(nodeId).map(n => n.neighborId));
    direct.add(nodeId);
    const result = new Map();
    for (const n1 of getEdgesOf(nodeId)) {
      for (const n2 of getEdgesOf(n1.neighborId)) {
        if (direct.has(n2.neighborId)) continue;
        const total = n1.distance + n2.distance;
        const existing = result.get(n2.neighborId);
        if (!existing || total < existing.distance) {
          result.set(n2.neighborId, {
            neighborId: n2.neighborId,
            via: n1.neighborId,
            viaDistance: n1.distance,
            edgeDistance: n2.distance,
            distance: total,
            transport: n2.transport,
            time: n2.time,
          });
        }
      }
    }
    return [...result.values()].sort((a, b) => a.distance - b.distance);
  }

  function esc(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  const NODE_RADIUS = { city: 45, town: 30, village: 20 };

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
      l.setAttribute('x1', sx);
      l.setAttribute('x2', sx);
      l.setAttribute('y1', -yMax * SCALE);
      l.setAttribute('y2', -yMin * SCALE);
      if (ox === 0) l.setAttribute('class', 'axis-origin');
      gridG.appendChild(l);
      const t = document.createElementNS(SVG_NS, 'text');
      t.setAttribute('x', sx + 12);
      t.setAttribute('y', -yMin * SCALE - 30);
      t.setAttribute('text-anchor', 'start');
      if (ox === 0) t.setAttribute('class', 'axis-origin');
      t.textContent = `x=${ox}`;
      gridG.appendChild(t);
    }
    for (let oy = yMin; oy <= yMax; oy += STEP) {
      const sy = -oy * SCALE;
      const l = document.createElementNS(SVG_NS, 'line');
      l.setAttribute('x1', xMin * SCALE);
      l.setAttribute('x2', xMax * SCALE);
      l.setAttribute('y1', sy);
      l.setAttribute('y2', sy);
      if (oy === 0) l.setAttribute('class', 'axis-origin');
      gridG.appendChild(l);
      const t = document.createElementNS(SVG_NS, 'text');
      t.setAttribute('x', xMin * SCALE + 30);
      t.setAttribute('y', sy - 12);
      t.setAttribute('text-anchor', 'start');
      if (oy === 0) t.setAttribute('class', 'axis-origin');
      t.textContent = `y=${oy}`;
      gridG.appendChild(t);
    }
  }

  function renderMap() {
    renderGrid();
    edgesG.innerHTML = '';
    nodesG.innerHTML = '';

    for (const e of MAP_DATA.edges) {
      const a = nodeById.get(e.from);
      const b = nodeById.get(e.to);
      if (!a || !b) continue;
      const line = document.createElementNS(SVG_NS, 'line');
      line.setAttribute('class', `map-edge ${TRANSPORT_CLASS[e.transport] || ''}`);
      line.setAttribute('x1', a.x);
      line.setAttribute('y1', -a.y);
      line.setAttribute('x2', b.x);
      line.setAttribute('y2', -b.y);
      line.dataset.from = e.from;
      line.dataset.to = e.to;
      line.dataset.distance = e.distance;
      edgesG.appendChild(line);
    }

    for (const n of MAP_DATA.nodes) {
      const g = document.createElementNS(SVG_NS, 'g');
      g.setAttribute('class', `map-node type-${n.type}`);
      g.setAttribute('transform', `translate(${n.x} ${-n.y})`);
      g.dataset.nodeId = n.id;

      if (n.id === MAP_DATA.playerNode) {
        const ring = document.createElementNS(SVG_NS, 'circle');
        ring.setAttribute('class', 'map-player-ring');
        ring.setAttribute('r', 100);
        g.appendChild(ring);
      }

      const r = NODE_RADIUS[n.type] || 10;
      if (n.type !== 'city') {
        const hit = document.createElementNS(SVG_NS, 'circle');
        hit.setAttribute('class', 'map-node-hitarea');
        hit.setAttribute('r', 60);
        g.appendChild(hit);
      }
      const c = document.createElementNS(SVG_NS, 'circle');
      c.setAttribute('class', `map-node-circle faction-${n.faction}`);
      c.setAttribute('r', r);
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
      label.setAttribute('y', r + 40);
      label.textContent = n.name;
      g.appendChild(label);

      nodesG.appendChild(g);
    }
  }

  function renderEdgeLabels(forNodeId) {
    edgesG.querySelectorAll('.map-edge-label').forEach(el => el.remove());
    if (!forNodeId) return;
    for (const e of MAP_DATA.edges) {
      if (e.from !== forNodeId && e.to !== forNodeId) continue;
      const a = nodeById.get(e.from);
      const b = nodeById.get(e.to);
      if (!a || !b) continue;
      const label = document.createElementNS(SVG_NS, 'text');
      label.setAttribute('class', 'map-edge-label');
      label.setAttribute('x', (a.x + b.x) / 2);
      label.setAttribute('y', (-a.y + -b.y) / 2 - 15);
      label.setAttribute('text-anchor', 'middle');
      label.textContent = `${e.distance}km`;
      edgesG.appendChild(label);
    }
  }

  function highlightSelection(nodeId) {
    const adj = new Set(getEdgesOf(nodeId).map(n => n.neighborId));
    adj.add(nodeId);
    nodesG.querySelectorAll('.map-node').forEach(g => {
      const id = g.dataset.nodeId;
      g.classList.toggle('selected', id === nodeId);
      g.classList.toggle('dim', !adj.has(id));
    });
    edgesG.querySelectorAll('.map-edge').forEach(line => {
      const isHit = line.dataset.from === nodeId || line.dataset.to === nodeId;
      line.classList.toggle('highlight', isHit);
      line.classList.toggle('dim', !isHit);
    });
  }

  function renderDetail(node) {
    const adj = getEdgesOf(node.id).sort((a, b) => a.distance - b.distance);
    const second = getSecondHop(node.id);
    const isPlayer = node.id === MAP_DATA.playerNode;

    const adjList = adj
      .map(n => {
        const nb = nodeById.get(n.neighborId);
        return `<li data-jump="${esc(n.neighborId)}"><b>${esc(nb.name)}</b> <span style="opacity:.6">${esc(nb.factionLabel)}</span> ｜${n.distance}km｜${esc(n.time)}｜${esc(n.transport)}</li>`;
      })
      .join('');

    const secondList = second.length
      ? second
          .map(n => {
            const nb = nodeById.get(n.neighborId);
            return `<li data-jump="${esc(n.neighborId)}"><b>${esc(nb.name)}</b> <span style="opacity:.6">${esc(nb.factionLabel)}</span> ｜${n.distance}km｜${esc(n.transport)} <span class="nb-via">（经 ${esc(nodeById.get(n.via).name)}｜${n.viaDistance}km）</span></li>`;
          })
          .join('')
      : `<li style="cursor:default">（无次邻节点）</li>`;

    detailEl.innerHTML = `
      <div class="map-detail-head">
        <h4 class="map-detail-name">${esc(node.name)}</h4>
        <span class="map-detail-pill">${esc(TYPE_LABEL[node.type] || node.type)}</span>
        <span class="map-detail-pill">${esc(node.factionLabel)}</span>
        ${isPlayer ? `<span class="map-detail-pill is-player">📍 玩家所在</span>` : ''}
        <span class="map-detail-pill">${esc(node.func)}</span>
        <span class="map-detail-pill">${esc(node.geo)}</span>
        <span class="map-detail-pill" style="font-family:monospace">x:${Math.round(node.x / 2.5)} y:${Math.round(node.y / 2.5)}</span>
      </div>
      <p class="map-detail-desc">${esc(node.desc)}</p>
      <div class="map-detail-section"><h5>相邻节点（${adj.length}）</h5><ul class="map-neighbor-list">${adjList}</ul></div>
      <div class="map-detail-section"><h5>次邻节点（${second.length}）</h5><ul class="map-neighbor-list">${secondList}</ul></div>`;
  }

  function buildMapInfoText(nodeId) {
    const node = nodeById.get(nodeId);
    if (!node) return '';
    const subLocation = document.querySelector('.story-hud .hud-item.long .v')?.textContent?.trim() || node.name;
    const adj = getEdgesOf(nodeId).sort((a, b) => a.distance - b.distance);
    const second = getSecondHop(nodeId);
    const lines = [];
    lines.push('<map_info>');
    lines.push('<map_loader>');
    lines.push(`位置：${subLocation}`);
    lines.push(`节点：${node.name}（${TYPE_LABEL[node.type] || node.type}·${node.factionLabel}）`);
    lines.push(`坐标：x=${Math.round(node.x / 2.5)}, y=${Math.round(node.y / 2.5)}`);
    lines.push(`功能：${node.func}｜地理：${node.geo}`);
    lines.push(`相邻（${adj.length}）：`);
    for (const n of adj) {
      const nb = nodeById.get(n.neighborId);
      lines.push(
        `- ${nb.name}（${nb.factionLabel}·${TYPE_LABEL[nb.type] || nb.type}）｜${n.distance}km｜${n.time}｜${n.transport}`,
      );
    }
    lines.push('');
    lines.push('周边概览：');
    lines.push('相邻简述：');
    for (const n of adj) {
      const nb = nodeById.get(n.neighborId);
      lines.push(`- ${nb.name}（${nb.factionLabel}）— ${nb.desc}`);
    }
    if (second.length) {
      lines.push('次邻简述：');
      for (const n of second) {
        const nb = nodeById.get(n.neighborId);
        const via = nodeById.get(n.via);
        lines.push(`- ${nb.name}（${nb.factionLabel}）— ${nb.desc}（经 ${via.name}｜${n.distance}km）`);
      }
    }
    lines.push('</map_loader>');
    lines.push('</map_info>');
    return lines.join('\n');
  }

  function selectNode(nodeId) {
    const node = nodeById.get(nodeId);
    if (!node) return;
    selectedId = nodeId;
    highlightSelection(nodeId);
    renderEdgeLabels(nodeId);
    renderDetail(node);
  }

  svg.addEventListener('click', e => {
    const g = e.target.closest('.map-node');
    if (!g) return;
    selectNode(g.dataset.nodeId);
  });

  detailEl.addEventListener('click', e => {
    const li = e.target.closest('li[data-jump]');
    if (!li) return;
    selectNode(li.dataset.jump);
  });

  if (backBtn) backBtn.addEventListener('click', () => selectNode(MAP_DATA.playerNode));

  if (copyBtn) {
    copyBtn.addEventListener('click', async () => {
      const text = buildMapInfoText(selectedId);
      window.setGlobalOutput('地图 · map_info 位置摘要', text);
      try {
        await navigator.clipboard.writeText(text);
        const original = copyBtn.textContent;
        copyBtn.textContent = '✓ 已复制';
        setTimeout(() => {
          copyBtn.textContent = original;
        }, 1500);
      } catch (_) {
        const output = document.getElementById('globalOutput');
        if (output) {
          output.focus();
          output.select();
        }
      }
    });
  }

  renderMap();
  selectNode(MAP_DATA.playerNode);

  // Pan & Zoom
  const vb = { x: -7000, y: -9750, w: 16250, h: 19250 };
  function applyVB() {
    svg.setAttribute('viewBox', `${vb.x} ${vb.y} ${vb.w} ${vb.h}`);
  }
  let isPanning = false,
    panStart = { x: 0, y: 0 },
    vbStart = { x: 0, y: 0 };
  function svgPt(e) {
    const r = svg.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * vb.w + vb.x, y: ((e.clientY - r.top) / r.height) * vb.h + vb.y };
  }
  svg.addEventListener('pointerdown', e => {
    if (e.target.closest('.map-node')) return;
    isPanning = true;
    panStart = { x: e.clientX, y: e.clientY };
    vbStart = { x: vb.x, y: vb.y };
    svg.setPointerCapture(e.pointerId);
  });
  svg.addEventListener('pointermove', e => {
    if (!isPanning) return;
    const r = svg.getBoundingClientRect();
    vb.x = vbStart.x - ((e.clientX - panStart.x) / r.width) * vb.w;
    vb.y = vbStart.y - ((e.clientY - panStart.y) / r.height) * vb.h;
    applyVB();
  });
  svg.addEventListener('pointerup', () => {
    isPanning = false;
  });
  svg.addEventListener('pointercancel', () => {
    isPanning = false;
  });
  svg.addEventListener(
    'wheel',
    e => {
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
})();

/* ===== 10. 角色页 ===== */
(function () {
  const ROLES_DATA = [
    {
      id: 'alana',
      name: '艾兰娜·布伦特',
      race: '半精灵',
      age: 31,
      location: '酒馆 · 主厅',
      avatar: '🧝‍♀️',
      tagline: '布伦特酒商之女，常驻吧台抄账。',
      outfitLine: '穿着奶油色长裙，外披褐色羊毛披肩，鬓角别着一支白花。',
      stamina: '精力充沛',
      bladder: 32,
      intimacyStage: 5,
      intimacyDesc: '已成为可深谈彼此心事的朋友，眼神里多了几分坦白。',
      favor: 35,
      favorMax: 100,
    },
    {
      id: 'grif',
      name: '葛瑞夫·铁腕',
      race: '矮人',
      age: 47,
      location: '酒馆 · 后院',
      avatar: '🧔',
      tagline: '酒馆每周必到的老主顾，喜欢在角落独酌。',
      outfitLine: '粗呢短斗篷盖在皮甲上，腰间挂着饰有家纹的酒壶。',
      stamina: '疲惫',
      bladder: 71,
      intimacyStage: 3,
      intimacyDesc: '见面会点头招呼，但还没真正坐下来聊过几句。',
      favor: 72,
      favorMax: 100,
    },
    {
      id: 'miya',
      name: '米娅',
      race: '人类',
      age: 14,
      location: '酒馆 · 厨房门口',
      avatar: '👧',
      tagline: '邻街面包铺的学徒，每天早上送来现烤面包。',
      outfitLine: '套着略大的面粉色围裙，麻花辫上沾了点白色面粉。',
      stamina: '精力充沛',
      bladder: 18,
      intimacyStage: 7,
      intimacyDesc: '她把你当作可依赖的长辈，会偷偷把心事讲给你听。',
      favor: 88,
      favorMax: 100,
    },
  ];

  const INTIMACY_STAGES = {
    1: '初识',
    2: '面熟',
    3: '点头之交',
    4: '熟人',
    5: '朋友',
    6: '知交',
    7: '挚友',
    8: '至亲',
  };
  const STAMINA_MAP = {
    精力充沛: { cls: 'st-energetic', icon: '⚡' },
    状态良好: { cls: 'st-good', icon: '🟢' },
    一般: { cls: 'st-normal', icon: '🟡' },
    疲惫: { cls: 'st-tired', icon: '🟠' },
    筋疲力竭: { cls: 'st-exhausted', icon: '🔴' },
  };

  function esc(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function staminaState(label) {
    return STAMINA_MAP[label] || { cls: 'st-normal', icon: '🟡' };
  }
  function bladderState(value) {
    const v = Math.max(0, Math.min(100, value));
    if (v < 50) return { label: '舒适', cls: 'low' };
    if (v < 80) return { label: '微胀', cls: 'mid' };
    if (v < 95) return { label: '急迫', cls: 'high' };
    return { label: '紧绷', cls: 'critical' };
  }
  function intimacyDots(stage) {
    const s = Math.max(0, Math.min(8, stage));
    let html = '';
    for (let i = 1; i <= 8; i++) html += `<span class="intimacy-dot${i <= s ? ' filled' : ''}"></span>`;
    return html;
  }

  const grid = document.getElementById('roleCardGrid');
  const detailContent = document.getElementById('roleDetailContent');
  const listView = document.getElementById('rolesListView');
  const detailView = document.getElementById('rolesDetailView');
  const backBtn = document.getElementById('roleBackBtn');
  const roleAvatarFileInput = document.getElementById('roleAvatarFileInput');
  if (!grid || !detailContent) return;

  let pendingRoleAvatarId = null;

  function roleAvatarKey(id) {
    return `roleAvatar:${id}`;
  }

  function applyListAvatars() {
    grid.querySelectorAll('[data-role-avatar-slot]').forEach(slot => {
      const id = slot.dataset.roleAvatarSlot;
      let url = null;
      try {
        url = localStorage.getItem(roleAvatarKey(id));
      } catch (_) {}
      const glyph = slot.querySelector('.role-avatar-glyph');
      if (url) {
        slot.classList.add('has-image');
        slot.style.backgroundImage = `url(${JSON.stringify(url)})`;
        if (glyph) glyph.style.display = 'none';
      } else {
        slot.classList.remove('has-image');
        slot.style.backgroundImage = '';
        if (glyph) glyph.style.display = '';
      }
    });
  }

  function applyDetailAvatar(role) {
    const btn = detailContent.querySelector(`[data-role-avatar-for="${role.id}"]`);
    const reset = detailContent.querySelector(`[data-role-avatar-reset="${role.id}"]`);
    const glyph = btn?.querySelector('.role-avatar-glyph');
    if (!btn) return;
    let url = null;
    try {
      url = localStorage.getItem(roleAvatarKey(role.id));
    } catch (_) {}
    if (url) {
      btn.style.backgroundImage = `url(${JSON.stringify(url)})`;
      btn.classList.add('has-image');
      if (glyph) glyph.style.display = 'none';
      if (reset) reset.hidden = false;
    } else {
      btn.style.backgroundImage = '';
      btn.classList.remove('has-image');
      if (glyph) {
        glyph.style.display = '';
        glyph.textContent = role.avatar || '👤';
      }
      if (reset) reset.hidden = true;
    }
  }

  function renderList() {
    grid.innerHTML = ROLES_DATA.map(r => {
      const stageName = INTIMACY_STAGES[r.intimacyStage] || '';
      const fPct = Math.min(100, Math.round((r.favor / r.favorMax) * 100));
      return `<div class="role-card" role="button" tabindex="0" data-role-id="${esc(r.id)}">
        <div class="role-card-top">
          <div class="role-card-avatar" data-role-avatar-slot="${esc(r.id)}">
            <span class="role-avatar-glyph" aria-hidden="true">${r.avatar || '👤'}</span>
          </div>
          <div class="role-card-id">
            <h4 class="role-card-name">${esc(r.name)}</h4>
            <div class="role-card-meta">${esc(r.race)}</div>
            <div class="role-card-loc"><span aria-hidden="true">📍</span>${esc(r.location)}</div>
            <span class="stamina-state-tag ${staminaState(r.stamina).cls}" style="margin-top:4px;display:inline-block">${staminaState(r.stamina).icon} ${esc(r.stamina)}</span>
          </div>
        </div>
        <div class="role-card-divider"></div>
        <div class="intimacy-row">
          <span class="intimacy-stage-badge">LV.${r.intimacyStage} · ${esc(stageName)}</span>
          <span class="intimacy-dots" aria-hidden="true">${intimacyDots(r.intimacyStage)}</span>
        </div>
        <div class="status-card" style="margin-top:6px;">
          <div class="status-row">
            <span class="status-icon" aria-hidden="true">💛</span>
            <span class="status-name">好感度</span>
            <span class="status-num">${r.favor} / ${r.favorMax}</span>
          </div>
          <div class="status-bar"><i style="width:${fPct}%; background:linear-gradient(90deg,#e8c36a,#d4944a);"></i></div>
        </div>
        <p class="intimacy-quote">「${esc(r.intimacyDesc)}」</p>
      </div>`;
    }).join('');
    applyListAvatars();
  }

  function renderDetail(role) {
    const stageName = INTIMACY_STAGES[role.intimacyStage] || '';
    const bladder = bladderState(role.bladder);
    const ratio = Math.max(0, Math.min(100, role.bladder));
    const fPct = Math.min(100, Math.round((role.favor / role.favorMax) * 100));
    const nextStageName = INTIMACY_STAGES[role.intimacyStage + 1] || '已满';

    detailContent.innerHTML = `
      <section class="role-detail-hero">
        <div class="role-avatar-wrap">
          <button type="button" class="role-detail-avatar-btn" data-role-avatar-for="${esc(role.id)}" aria-label="点击上传或更换头像">
            <span class="role-avatar-glyph" aria-hidden="true">${role.avatar || '👤'}</span>
            <span class="role-avatar-overlay" aria-hidden="true"><span class="role-avatar-overlay-icon">📷</span><span class="role-avatar-overlay-text">更换</span></span>
          </button>
          <button type="button" class="role-avatar-reset" data-role-avatar-reset="${esc(role.id)}" aria-label="移除头像" hidden>×</button>
        </div>
        <div class="role-detail-id">
          <h3 class="role-detail-name">${esc(role.name)}</h3>
          <div class="role-detail-meta">
            <span class="profile-meta-pill">${esc(role.race)}</span>
            <span class="profile-meta-pill">${role.age} 岁</span>
            <span class="profile-meta-pill profile-title">📍 ${esc(role.location)}</span>
          </div>
          <p class="role-detail-tagline">${esc(role.tagline)}</p>
        </div>
      </section>
      <h3 class="profile-h3">关系状态</h3>
      <div class="role-section-card">
        <div class="intimacy-row">
          <span class="intimacy-stage-badge">亲密度 LV.${role.intimacyStage} / 8 · ${esc(stageName)}</span>
          <span class="intimacy-dots" aria-hidden="true">${intimacyDots(role.intimacyStage)}</span>
        </div>
        <div class="status-card" style="margin-top:8px;">
          <div class="status-row">
            <span class="status-icon" aria-hidden="true">💛</span>
            <span class="status-name">好感度</span>
            <span class="status-num">${role.favor} / ${role.favorMax}</span>
          </div>
          <div class="status-bar"><i style="width:${fPct}%; background:linear-gradient(90deg,#e8c36a,#d4944a);"></i></div>
        </div>
        <p style="margin:6px 0 0;font-size:calc(12px * var(--text-scale,1));color:var(--ink-dim);">好感度达到 ${role.favorMax} 后可提升至下一阶段「${esc(nextStageName)}」</p>
        <p class="intimacy-quote">「${esc(role.intimacyDesc)}」</p>
      </div>
      <h3 class="profile-h3">当前穿着</h3>
      <div class="role-section-card"><p class="role-outfit-line">${esc(role.outfitLine)}</p></div>
      <h3 class="profile-h3">状态</h3>
      <div class="profile-stats-grid">
        <div class="status-card">
          <div class="status-row">
            <span class="status-icon" aria-hidden="true">${staminaState(role.stamina).icon}</span>
            <span class="status-name">精力</span>
            <span class="stamina-state-tag ${staminaState(role.stamina).cls}">${esc(role.stamina)}</span>
          </div>
        </div>
        <div class="status-card">
          <div class="status-row">
            <span class="status-icon" aria-hidden="true">💧</span>
            <span class="status-name">膀胱</span>
            <span class="status-num">${ratio} / 100</span>
            <span class="bladder-state-tag ${bladder.cls}">${bladder.label}</span>
          </div>
          <div class="status-bar"><i class="bladder-${bladder.cls}" style="width:${ratio}%"></i></div>
        </div>
      </div>
      <h3 class="profile-h3">当前位置</h3>
      <div class="role-section-card">
        <div class="role-loc-line"><span class="role-loc-pin" aria-hidden="true">📍</span>${esc(role.location)}</div>
      </div>`;
    applyDetailAvatar(role);
  }

  function showDetail(roleId) {
    pendingRoleAvatarId = null;
    const role = ROLES_DATA.find(r => r.id === roleId);
    if (!role) return;
    renderDetail(role);
    listView.hidden = true;
    detailView.hidden = false;
    if (detailView) detailView.scrollTop = 0;
  }

  function showList() {
    listView.hidden = false;
    detailView.hidden = true;
  }

  grid.addEventListener('click', e => {
    const card = e.target.closest('.role-card');
    if (!card) return;
    showDetail(card.dataset.roleId);
  });

  grid.addEventListener('keydown', e => {
    const card = e.target.closest('.role-card');
    if (!card) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      showDetail(card.dataset.roleId);
    }
  });

  if (detailView && roleAvatarFileInput) {
    detailView.addEventListener('click', e => {
      const avatarBtn = e.target.closest('[data-role-avatar-for]');
      if (avatarBtn) {
        e.preventDefault();
        e.stopPropagation();
        pendingRoleAvatarId = avatarBtn.getAttribute('data-role-avatar-for');
        roleAvatarFileInput.click();
        return;
      }
      const rst = e.target.closest('[data-role-avatar-reset]');
      if (rst) {
        e.preventDefault();
        e.stopPropagation();
        const rid = rst.getAttribute('data-role-avatar-reset');
        try {
          localStorage.removeItem(roleAvatarKey(rid));
        } catch (_) {}
        const r = ROLES_DATA.find(x => x.id === rid);
        if (r) {
          renderDetail(r);
          renderList();
        }
      }
    });

    roleAvatarFileInput.addEventListener('change', () => {
      const rid = pendingRoleAvatarId;
      pendingRoleAvatarId = null;
      const file = roleAvatarFileInput.files && roleAvatarFileInput.files[0];
      roleAvatarFileInput.value = '';
      if (!file || !rid) return;
      if (!file.type.startsWith('image/')) {
        alert('请选择图片文件（支持 jpg / png / webp / gif 等）。');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = String(reader.result || '');
        if (!dataUrl) return;
        try {
          localStorage.setItem(roleAvatarKey(rid), dataUrl);
        } catch (err) {
          console.warn('头像保存失败', err);
          alert('头像保存到本地失败：图片可能太大。请换一张更小的图。');
          return;
        }
        const r = ROLES_DATA.find(x => x.id === rid);
        if (r) {
          renderDetail(r);
          renderList();
        }
      };
      reader.onerror = () => {
        alert('读取图片失败，请换一张试试。');
      };
      reader.readAsDataURL(file);
    });
  }

  if (backBtn) backBtn.addEventListener('click', showList);
  renderList();
})();

/* ===== 11. 玩家头像上传 ===== */
(function () {
  const AVATAR_KEY = 'profileAvatar';
  const avatarBtn = document.getElementById('profileAvatarBtn');
  const avatarInput = document.getElementById('profileAvatarInput');
  const avatarReset = document.getElementById('profileAvatarReset');
  if (!avatarBtn || !avatarInput) return;

  function applyAvatar(dataUrl) {
    if (dataUrl) {
      avatarBtn.style.backgroundImage = `url("${dataUrl}")`;
      avatarBtn.classList.add('has-image');
      if (avatarReset) avatarReset.hidden = false;
    } else {
      avatarBtn.style.backgroundImage = '';
      avatarBtn.classList.remove('has-image');
      if (avatarReset) avatarReset.hidden = true;
    }
  }

  try {
    const saved = localStorage.getItem(AVATAR_KEY);
    if (saved) applyAvatar(saved);
  } catch (_) {}

  avatarBtn.addEventListener('click', () => avatarInput.click());

  avatarInput.addEventListener('change', () => {
    const file = avatarInput.files && avatarInput.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('请选择图片文件（支持 jpg / png / webp / gif 等）。');
      avatarInput.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      if (!dataUrl) return;
      try {
        localStorage.setItem(AVATAR_KEY, dataUrl);
      } catch (_) {}
      applyAvatar(dataUrl);
      avatarInput.value = '';
    };
    reader.onerror = () => {
      alert('读取图片失败，请换一张试试。');
      avatarInput.value = '';
    };
    reader.readAsDataURL(file);
  });

  if (avatarReset) {
    avatarReset.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      try {
        localStorage.removeItem(AVATAR_KEY);
      } catch (_) {}
      applyAvatar(null);
    });
  }
})();

/* ===== 12. 设置面板 ===== */
(function () {
  const KEY = 'uiSettings';
  const DEFAULTS = { font: 'default', size: '100', theme: 'parchment' };
  const FONT_LINKS = {
    lxgw: 'https://fontsapi.zeoseven.com/292/main/result.css',
    noto: 'https://fontsapi.zeoseven.com/285/main/result.css',
  };
  const loadedFonts = new Set();

  function loadFontCss(key) {
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
    } catch (_) {
      return { ...DEFAULTS };
    }
  }
  function saveSettings(s) {
    try {
      localStorage.setItem(KEY, JSON.stringify(s));
    } catch (_) {}
  }
  function applySettings(s) {
    const b = document.body;
    b.dataset.font = s.font;
    b.dataset.size = s.size;
    b.dataset.theme = s.theme;
    if (s.font !== 'default') loadFontCss(s.font);
  }

  let state = loadSettings();
  applySettings(state);

  function buildPanel() {
    const overlay = document.createElement('div');
    overlay.className = 'settings-overlay';
    overlay.id = 'settingsOverlay';
    const panel = document.createElement('aside');
    panel.className = 'settings-panel';
    panel.id = 'settingsPanel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', '界面设置');
    panel.innerHTML = `
      <header class="settings-head">
        <h3>设置 <span class="star">✦</span></h3>
        <button type="button" class="settings-close" id="settingsClose" aria-label="关闭">×</button>
      </header>
      <div class="settings-body">
        <section class="settings-section">
          <h4>字体</h4>
          <p class="settings-hint">选择非默认字体时会按需联网加载（约 1~3MB）。</p>
          <div class="settings-options" data-setting="font">
            <button type="button" class="settings-option settings-option--font" data-value="default">系统默认</button>
            <button type="button" class="settings-option settings-option--font" data-value="lxgw">霞鹜文楷</button>
            <button type="button" class="settings-option settings-option--font" data-value="noto">思源宋体</button>
          </div>
        </section>
        <section class="settings-section">
          <h4>字体大小</h4>
          <p class="settings-hint">整体缩放（包含图形与排版）。</p>
          <div class="settings-options" data-setting="size">
            <button type="button" class="settings-option" data-value="90">小 90%</button>
            <button type="button" class="settings-option" data-value="100">默认 100%</button>
            <button type="button" class="settings-option" data-value="110">中 110%</button>
            <button type="button" class="settings-option" data-value="120">大 120%</button>
            <button type="button" class="settings-option" data-value="135">特大 135%</button>
          </div>
        </section>
        <section class="settings-section">
          <h4>窗口主题</h4>
          <p class="settings-hint">改变羊皮纸内容色 + 外壳氛围，共 16 套。</p>
          <div class="settings-subhead">明亮</div>
          <div class="settings-options" data-setting="theme">
            <button type="button" class="settings-option theme-swatch" data-value="parchment" style="--swatch:linear-gradient(135deg,#dbc9a3,#9a742f);">羊皮卷</button>
            <button type="button" class="settings-option theme-swatch" data-value="dawn" style="--swatch:linear-gradient(135deg,#f8ecd2,#e89540);">朝晖</button>
            <button type="button" class="settings-option theme-swatch" data-value="sakura" style="--swatch:linear-gradient(135deg,#f8dde2,#e07090);">晚樱</button>
            <button type="button" class="settings-option theme-swatch" data-value="snow" style="--swatch:linear-gradient(135deg,#ecf2f8,#5090d0);">雪原</button>
            <button type="button" class="settings-option theme-swatch" data-value="eyecare" style="--swatch:linear-gradient(135deg,#c7edcc,#4a8858);">护眼</button>
            <button type="button" class="settings-option theme-swatch" data-value="mist" style="--swatch:linear-gradient(135deg,#c8d4ca,#5e8862);">森雾</button>
          </div>
          <div class="settings-subhead">深色 · 冷调</div>
          <div class="settings-options" data-setting="theme">
            <button type="button" class="settings-option theme-swatch" data-value="midnight" style="--swatch:linear-gradient(135deg,#10182a,#5878b0);">黯月</button>
            <button type="button" class="settings-option theme-swatch" data-value="obsidian" style="--swatch:linear-gradient(135deg,#04060c,#5878a8);">墨夜</button>
            <button type="button" class="settings-option theme-swatch" data-value="stardust" style="--swatch:linear-gradient(135deg,#08081e,#ffd870);">星辉</button>
            <button type="button" class="settings-option theme-swatch" data-value="forest" style="--swatch:linear-gradient(135deg,#10201a,#5e8048);">幽林</button>
            <button type="button" class="settings-option theme-swatch" data-value="azure" style="--swatch:linear-gradient(135deg,#0f1a2c,#3070a0);">远海</button>
            <button type="button" class="settings-option theme-swatch" data-value="amethyst" style="--swatch:linear-gradient(135deg,#160a28,#7848c0);">紫晶</button>
          </div>
          <div class="settings-subhead">深色 · 暖调</div>
          <div class="settings-options" data-setting="theme">
            <button type="button" class="settings-option theme-swatch" data-value="claret" style="--swatch:linear-gradient(135deg,#240e10,#a04060);">绛酒</button>
            <button type="button" class="settings-option theme-swatch" data-value="ember" style="--swatch:linear-gradient(135deg,#1e0e0a,#d8703c);">焰心</button>
            <button type="button" class="settings-option theme-swatch" data-value="coffee" style="--swatch:linear-gradient(135deg,#150e08,#a86028);">咖琥</button>
            <button type="button" class="settings-option theme-swatch" data-value="ink" style="--swatch:linear-gradient(135deg,#161616,#7a7a7a);">水墨</button>
          </div>
        </section>
        <div class="settings-actions">
          <button type="button" class="settings-reset" id="settingsReset">恢复默认</button>
          <span class="settings-version">设置自动保存</span>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    document.body.appendChild(panel);

    function syncActive() {
      panel.querySelectorAll('.settings-options').forEach(group => {
        const setting = group.dataset.setting;
        const cur = state[setting];
        group.querySelectorAll('.settings-option').forEach(btn => {
          btn.classList.toggle('active', btn.dataset.value === cur);
        });
      });
    }
    syncActive();

    panel.addEventListener('click', e => {
      const opt = e.target.closest('.settings-option');
      if (opt) {
        const group = opt.closest('.settings-options');
        const setting = group?.dataset.setting;
        if (!setting) return;
        state = { ...state, [setting]: opt.dataset.value };
        applySettings(state);
        saveSettings(state);
        syncActive();
        return;
      }
      if (e.target.closest('#settingsReset')) {
        state = { ...DEFAULTS };
        applySettings(state);
        saveSettings(state);
        syncActive();
      }
      if (e.target.closest('#settingsClose')) closePanel();
    });
    overlay.addEventListener('click', closePanel);

    function escClose(e) {
      if (e.key === 'Escape') closePanel();
    }
    document.addEventListener('keydown', escClose);

    function closePanel() {
      overlay.remove();
      panel.remove();
      document.removeEventListener('keydown', escClose);
    }
  }

  const gear = document.getElementById('settingsBtn');
  if (gear) {
    gear.addEventListener('click', () => {
      if (document.getElementById('settingsPanel')) return;
      buildPanel();
    });
  }
})();

/* ===== 13. 酒馆 iframe 适配（剧情 maintext 提取） ===== */
(function () {
  const bodyEl = document.getElementById('storyPaperBody');
  if (!bodyEl || typeof getChatMessages !== 'function') return;

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function extractMaintext(raw) {
    const m = String(raw || '').match(/<maintext>([\s\S]*?)<\/maintext>/i);
    return m ? m[1].trim() : '';
  }

  function latestAssistantMessage() {
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
      .map(s => s.trim())
      .filter(Boolean);
    bodyEl.innerHTML = parts
      .map((para, i) => {
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
})();
/* ===== 14. 7个新增面板的渲染函数 ===== */
(function () {
  function getMap() {
    return window.__primordiaSave || {};
  }
  function esc(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
  window.renderFarming = function () {
    const s = getMap();
    const el = document.getElementById('farmList');
    if (!el) return;
    const entries = Object.entries(s.farms || {});
    if (!entries.length) {
      el.innerHTML = '<p style="color:var(--ink-faint);font-style:italic;padding:8px 0;">后院还空着。</p>';
      return;
    }
    el.innerHTML = entries
      .map(
        ([key, c]) =>
          `<div class="brew-item"><div class="brew-head"><strong>${esc(key.split(':')[1] || key)}</strong><span class="countdown">生长中</span></div><div class="brew-meta"><span>${esc(c.status || '')}</span></div></div>`,
      )
      .join('');
  };
  window.renderBrewing = function () {
    const s = getMap();
    const el = document.getElementById('brewList');
    if (!el) return;
    const entries = Object.entries(s.brews || {});
    if (!entries.length) {
      el.innerHTML = '<p style="color:var(--ink-faint);font-style:italic;padding:8px 0;">没有在酿的东西。</p>';
      return;
    }
    el.innerHTML = entries
      .map(
        ([name, b]) =>
          `<div class="brew-item"><div class="brew-head"><strong>${esc(name)}</strong><span class="countdown">${esc(b.aging || '')}</span></div><div class="brew-meta"><span>容器：${esc(b.container || '')}</span></div></div>`,
      )
      .join('');
  };
  window.renderConstruction = function () {
    const s = getMap();
    const el = document.getElementById('constructionRegions');
    if (!el) return;
    const entries = Object.entries(s.tavern?.regions || {});
    if (!entries.length) {
      el.innerHTML = '<p style="color:var(--ink-faint);font-style:italic;padding:8px 0;">暂无区域数据。</p>';
      return;
    }
    el.innerHTML = entries
      .map(
        ([name, r]) =>
          `<details class="region-card" open>
        <summary class="region-summary"><div class="region-head"><h4>${esc(name)}</h4><span class="state good">${esc(r.status || '')}</span></div></summary>
        <div class="region-content">
          ${r.facilities?.length ? `<div class="region-tools">${r.facilities.map(f => `<span class="tag">${esc(f)}</span>`).join('')}</div>` : ''}
          ${r.decorations?.length ? `<div class="region-tools" style="margin-top:4px;opacity:.7;">装饰: ${r.decorations.map(d => `<span class="tag">${esc(d)}</span>`).join('')}</div>` : ''}
          ${r.vibe ? `<p class="region-desc" style="margin-top:4px;">${esc(r.vibe)}</p>` : ''}
        </div>
      </details>`,
      )
      .join('');
  };
  window.renderEmployees = function () {
    const s = getMap();
    const el = document.getElementById('employeeList');
    if (!el) return;
    const entries = Object.entries(s.employees || {});
    if (!entries.length) {
      el.innerHTML = '<p style="color:var(--ink-faint);font-style:italic;padding:8px 0;">还没有员工。</p>';
      return;
    }
    el.innerHTML = entries
      .map(
        ([, e]) =>
          `<div class="brew-item"><div class="brew-head"><strong>${esc(e.role || '员工')}</strong><span class="state good">${esc(e.race || '')}</span></div><div class="brew-meta">${esc((e.personality || '').slice(0, 40))}</div></div>`,
      )
      .join('');
  };
  window.renderBusiness = function () {
    const s = getMap();
    const el = document.getElementById('businessList');
    if (!el) return;
    const entries = Object.entries(s.businesses || {});
    if (!entries.length) {
      el.innerHTML = '<p style="color:var(--ink-faint);font-style:italic;padding:8px 0;">暂无产业。</p>';
      return;
    }
    el.innerHTML = entries
      .map(
        ([name, b]) =>
          `<div class="brew-item"><div class="brew-head"><strong>${esc(name)}</strong><span class="state good">${esc(b.type || '')}</span></div><div class="brew-meta">${esc(b.incomeNote || b.status || '')}</div></div>`,
      )
      .join('');
  };
  window.renderRelationships = function () {
    const s = getMap();
    const el = document.getElementById('relationList');
    if (!el) return;
    const entries = Object.entries(s.relationships || {});
    if (!entries.length) {
      el.innerHTML = '<p style="color:var(--ink-faint);font-style:italic;padding:8px 0;">暂无关系记录。</p>';
      return;
    }
    el.innerHTML = entries
      .map(
        ([id, r]) =>
          `<div class="role-card" style="cursor:default;">
        <div class="role-card-top">
          <div class="role-card-avatar" style="font-size:22px;">👤</div>
          <div class="role-card-id"><h4 class="role-card-name">${esc(r.displayName || id)}</h4><div class="role-card-meta">${esc(r.race || '')}${r.city ? ' · ' + esc(r.city) : ''}</div></div>
        </div>
        <div class="role-card-divider"></div>
        <p class="intimacy-quote">「${esc(r.affinityLabel || '')}」</p>
      </div>`,
      )
      .join('');
  };
  const B = id => document.getElementById(id);
  B('farmPlantBtn')?.addEventListener('click', () => window.setGlobalOutput('农田 · 种菜', '告诉 AI 你想种什么。'));
  B('brewStartBtn')?.addEventListener('click', () => window.setGlobalOutput('酿酒 · 新桶', '告诉 AI 你想酿什么。'));
  B('buildAddBtn')?.addEventListener('click', () => window.setGlobalOutput('建造 · 扩建', '告诉 AI 你想怎么改造。'));
  B('adventureGoBtn')?.addEventListener('click', () => window.setGlobalOutput('冒险 · 出发', '告诉 AI 你想去哪冒险。'));
  const menu = document.getElementById('menu');
  if (menu) {
    menu.addEventListener('click', () =>
      setTimeout(() => {
        window.renderFarming && window.renderFarming();
        window.renderBrewing && window.renderBrewing();
        window.renderConstruction && window.renderConstruction();
        window.renderEmployees && window.renderEmployees();
        window.renderBusiness && window.renderBusiness();
        window.renderRelationships && window.renderRelationships();
      }, 50),
    );
  }
})();
