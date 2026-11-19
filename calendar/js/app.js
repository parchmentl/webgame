'use strict';
/* 万年历 · 渲染 / 交互 */

const VERSION = '2.0.0';
const SEEN_KEY = 'calendarSeenVersion';
const CHANGELOG = [
  {
    v: '2.0.0', date: '2026-11-19', title: '重构 · 真实万年历',
    items: [
      '农历 1900–2100 完整换算：闰月、月名、日名、干支、生肖',
      '二十四节气改用天文算法（VSOP87），交节时刻精确到分',
      '干支三柱：年柱以立春为界，月柱随节，日柱逐日推演',
      '建除十二神与民俗宜忌，替代旧版固定示例',
      '节日全集：公历 / 农历 / 节气 / 第 N 个星期 X 规则',
      '新增年视图、年月快速跳转、键盘导航与黄历侧栏',
      '接入站点霓虹视觉与版本记录'
    ]
  },
  {
    v: '1.0.0', date: '2026-03-04', title: '初版',
    items: ['月视图日历与简易黄历抽屉', '节气与节日为近似示例数据']
  }
];

const $ = id => document.getElementById(id);
const el = {
  ymLabel: $('ymLabel'), ymBtn: $('ymBtn'), grid: $('grid'), yearGrid: $('yearGrid'),
  monthView: $('monthView'), yearView: $('yearView'),
  prevYear: $('prevYear'), prevMonth: $('prevMonth'), nextMonth: $('nextMonth'), nextYear: $('nextYear'),
  todayBtn: $('todayBtn'), viewMonth: $('viewMonth'), viewYear: $('viewYear'),
  detail: $('detail'), dClose: $('dClose'), scrim: $('scrim'),
  dYm: $('dYm'), dDay: $('dDay'), dWeek: $('dWeek'), dLunar: $('dLunar'), dChips: $('dChips'),
  dTerm: $('dTerm'), dFestBlock: $('dFestBlock'), dFests: $('dFests'),
  dOffBlock: $('dOffBlock'), dOff: $('dOff'), dYi: $('dYi'), dJi: $('dJi'),
  dStats: $('dStats'), backToday: $('backToday'),
  jumpOv: $('jumpOv'), jumpYear: $('jumpYear'), jumpPrev: $('jumpPrev'), jumpNext: $('jumpNext'),
  jumpMonths: $('jumpMonths'), jumpCancel: $('jumpCancel'), jumpToday: $('jumpToday'),
  verChip: $('verChip'), verNum: $('verNum'), verNew: $('verNew'),
  verOv: $('verOv'), verCur: $('verCur'), verList: $('verList'), verCloseBtn: $('verCloseBtn')
};

const NOW = new Date();
const TODAY = { y: NOW.getFullYear(), m: NOW.getMonth() + 1, d: NOW.getDate() };
const G = { y: TODAY.y, m: TODAY.m, sel: Object.assign({}, TODAY), view: 'month' };
const isMobile = () => window.matchMedia('(max-width:999px)').matches;
const clampY = y => Math.min(Cal.MAX_YEAR, Math.max(Cal.MIN_YEAR, y));
const dim = (y, m) => new Date(y, m, 0).getDate();
const sameDay = (a, b) => a.y === b.y && a.m === b.m && a.d === b.d;
const keyOf = (y, m, d) => Cal.utcDays(y, m, d);

/* ================= 版本管理 ================= */
function refreshVersionUi() {
  el.verNum.textContent = 'v' + VERSION;
  el.verNew.classList.toggle('hidden', localStorage.getItem(SEEN_KEY) === VERSION);
  el.verCur.textContent = 'v' + VERSION;
}
function renderChangelog() {
  el.verList.innerHTML = '';
  CHANGELOG.forEach((c, i) => {
    const card = document.createElement('div');
    card.className = 'ver-card' + (i === 0 ? ' current' : '');
    const head = document.createElement('div'); head.className = 'vh';
    const vn = document.createElement('span'); vn.className = 'vn'; vn.textContent = 'v' + c.v;
    const vd = document.createElement('span'); vd.className = 'vd'; vd.textContent = c.date;
    const vt = document.createElement('span'); vt.className = 'vt'; vt.textContent = i === 0 ? '当前' : '历史';
    head.append(vn, vd, vt);
    const vt2 = document.createElement('div'); vt2.className = 'vt2'; vt2.textContent = c.title;
    const ul = document.createElement('ul');
    c.items.forEach(t => { const li = document.createElement('li'); li.textContent = t; ul.append(li); });
    card.append(head, vt2, ul);
    el.verList.append(card);
  });
  el.verList.scrollTop = 0;
}
function openVer() {
  renderChangelog();
  localStorage.setItem(SEEN_KEY, VERSION);
  refreshVersionUi();
  el.verOv.classList.remove('hidden');
}
function closeVer() { el.verOv.classList.add('hidden'); }
function verOpen() { return !el.verOv.classList.contains('hidden'); }
function jumpOpen() { return !el.jumpOv.classList.contains('hidden'); }

/* ================= 抽屉 / 弹层 ================= */
function openDrawer() {
  el.detail.classList.add('open');
  el.scrim.classList.remove('hidden');
  requestAnimationFrame(() => el.scrim.classList.add('show'));
}
function closeDrawer() {
  el.detail.classList.remove('open');
  el.scrim.classList.remove('show');
  setTimeout(() => { if (!el.detail.classList.contains('open')) el.scrim.classList.add('hidden'); }, 260);
}
function drawerOpen() { return el.detail.classList.contains('open'); }

function openJump() {
  el.jumpYear.value = G.y;
  renderJumpMonths();
  el.jumpOv.classList.remove('hidden');
}
function closeJump() { el.jumpOv.classList.add('hidden'); }
function renderJumpMonths() {
  const jy = clampY(parseInt(el.jumpYear.value, 10) || G.y);
  el.jumpMonths.innerHTML = '';
  for (let m = 1; m <= 12; m++) {
    const b = document.createElement('button');
    b.textContent = m + '月';
    if (jy === G.y && m === G.m) b.className = 'cur';
    b.addEventListener('click', () => {
      const d = Math.min(G.sel.d, dim(jy, m));
      closeJump();
      go(jy, m, { y: jy, m, d });
    });
    el.jumpMonths.append(b);
  }
}

/* ================= 渲染 ================= */
function cellHtml(y, m, d, other, i) {
  const info = Cal.dayInfo(y, m, d);
  const cls = ['cell'];
  if (other) cls.push('other');
  if (info.weekday === 0 || info.weekday === 6) cls.push('wkend');
  if (sameDay(info, TODAY)) cls.push('today');
  if (sameDay(info, G.sel)) cls.push('sel');
  let sub, subCls = 'sub';
  if (info.festivals.length) { sub = info.festivals[0].name; subCls += ' fest'; }
  else if (info.term) { sub = info.term.name; subCls += ' term'; }
  else if (info.lunar) {
    if (info.lunar.day === 1) { sub = info.lunar.monthText; subCls += ' lm'; }
    else sub = info.lunar.dayText;
  } else sub = '';
  const title = `${m}月${d}日 ` + (info.lunar ? '农历' + info.lunar.monthText + info.lunar.dayText : '') +
    (info.festivals.length ? ' · ' + info.festivals.map(f => f.name).join(' / ') : '') +
    (info.term ? ' · ' + info.term.name : '');
  return `<div class="${cls.join(' ')}" style="--i:${i}" data-y="${y}" data-m="${m}" data-d="${d}" title="${title}">` +
    `<span class="num">${d}</span><span class="${subCls}">${sub}</span></div>`;
}

function renderMonth() {
  const first = new Date(G.y, G.m - 1, 1).getDay();
  const days = dim(G.y, G.m);
  const prev = G.m === 1 ? { y: G.y - 1, m: 12 } : { y: G.y, m: G.m - 1 };
  const next = G.m === 12 ? { y: G.y + 1, m: 1 } : { y: G.y, m: G.m + 1 };
  const prevDays = dim(prev.y, prev.m);
  let html = '', i = 0;
  for (let k = first - 1; k >= 0; k--) html += cellHtml(prev.y, prev.m, prevDays - k, true, i++);
  for (let d = 1; d <= days; d++) html += cellHtml(G.y, G.m, d, false, i++);
  for (let d = 1; i < 42; d++) html += cellHtml(next.y, next.m, d, true, i++);
  el.grid.innerHTML = html;
}

function renderYear() {
  let html = '';
  for (let m = 1; m <= 12; m++) {
    const first = new Date(G.y, m - 1, 1).getDay();
    const days = dim(G.y, m);
    let cells = '';
    for (let k = 0; k < first; k++) cells += '<div class="mcell blank"></div>';
    for (let d = 1; d <= days; d++) {
      const info = Cal.dayInfo(G.y, m, d);
      const cls = ['mcell'];
      if (info.weekday === 0 || info.weekday === 6) cls.push('wkend');
      if (info.festivals.length) cls.push('fest');
      else if (info.term) cls.push('term');
      if (sameDay(info, TODAY)) cls.push('today');
      if (sameDay(info, G.sel)) cls.push('sel');
      cells += `<div class="${cls.join(' ')}" data-y="${G.y}" data-m="${m}" data-d="${d}">${d}</div>`;
    }
    html += `<div class="mini" style="--i:${m - 1}"><h3>${m}月</h3><div class="mgrid">${cells}</div></div>`;
  }
  el.yearGrid.innerHTML = html;
}

function chip(text, cls) { return `<span class="chip ${cls}">${text}</span>`; }

function renderDetail() {
  const info = Cal.dayInfo(G.sel.y, G.sel.m, G.sel.d);
  el.dYm.textContent = `${info.y}年${info.m}月`;
  el.dDay.textContent = info.d;
  el.dWeek.textContent = info.weekdayText;
  el.dLunar.textContent = info.lunar
    ? `农历${info.lunar.yearGZ}年 ${info.lunar.monthText}${info.lunar.dayText}`
    : '农历超出范围（1900-01-31 起）';
  el.dChips.innerHTML =
    chip(info.gz.year + '年', 'gz') + chip(info.gz.month + '月', 'gz') + chip(info.gz.day + '日', 'gz') +
    chip('属' + info.zodiac, 'zodiac') + chip(info.constellation, 'const');
  if (info.term) {
    el.dTerm.innerHTML = `今日节气 · <b>${info.term.name}</b> <span class="tt">${info.term.time}</span> 交节`;
  } else if (info.nextTerm) {
    const t = info.nextTerm;
    el.dTerm.innerHTML = `下一节气 · <b>${t.name}</b> ${t.m}月${t.d}日 <span class="tt">${t.time}</span> · ${t.away} 天后`;
  } else el.dTerm.innerHTML = '节气超出范围';
  if (info.festivals.length) {
    el.dFestBlock.classList.remove('hidden');
    el.dFests.innerHTML = info.festivals.map(f => chip(f.name, 'fest')).join('');
  } else el.dFestBlock.classList.add('hidden');
  if (info.officer) {
    el.dOffBlock.classList.remove('hidden');
    el.dOff.textContent = info.officer.name;
    el.dYi.innerHTML = info.officer.yi.map(t => chip(t, 'yi')).join('');
    el.dJi.innerHTML = info.officer.ji.map(t => chip(t, 'ji')).join('');
  } else el.dOffBlock.classList.add('hidden');
  const diff = keyOf(info.y, info.m, info.d) - keyOf(TODAY.y, TODAY.m, TODAY.d);
  const rel = diff === 0 ? '今天' : diff === 1 ? '明天' : diff === -1 ? '昨天' : diff > 0 ? `${diff} 天后` : `${-diff} 天前`;
  el.dStats.innerHTML = `${info.y}年第 <b>${info.dayOfYear}</b> 天 · 第 <b>${info.isoWeek}</b> 周 · <b>${rel}</b>`;
  el.backToday.classList.toggle('hidden', sameDay(G.sel, TODAY));
}

function renderToolbar() {
  const yearMode = G.view === 'year';
  el.ymLabel.textContent = yearMode ? `${G.y}年` : `${G.y}年${G.m}月`;
  el.prevMonth.classList.toggle('hidden', yearMode);
  el.nextMonth.classList.toggle('hidden', yearMode);
  el.viewMonth.classList.toggle('active', !yearMode);
  el.viewYear.classList.toggle('active', yearMode);
}

function render() {
  renderToolbar();
  el.monthView.classList.toggle('hidden', G.view !== 'month');
  el.yearView.classList.toggle('hidden', G.view !== 'year');
  if (G.view === 'month') renderMonth(); else renderYear();
  renderDetail();
}

/* ================= 导航 ================= */
function go(y, m, sel) {
  G.y = clampY(y);
  G.m = Math.min(12, Math.max(1, m));
  if (sel) G.sel = { y: sel.y, m: sel.m, d: Math.min(sel.d, dim(sel.y, sel.m)) };
  render();
}
function selectDay(y, m, d, open) {
  G.sel = { y, m, d };
  if (y !== G.y || m !== G.m) { G.y = y; G.m = m; }
  render();
  if (open && isMobile()) openDrawer();
}
function shiftDays(n) {
  const t = new Date(G.sel.y, G.sel.m - 1, G.sel.d + n);
  const y = t.getFullYear();
  if (y < Cal.MIN_YEAR || y > Cal.MAX_YEAR) return;
  selectDay(y, t.getMonth() + 1, t.getDate(), false);
}
function shiftMonth(n) {
  const t = new Date(G.y, G.m - 1 + n, 1);
  const y = t.getFullYear();
  if (y < Cal.MIN_YEAR || y > Cal.MAX_YEAR) return;
  const m = t.getMonth() + 1;
  go(y, m, { y, m, d: Math.min(G.sel.d, dim(y, m)) });
}
function shiftYear(n) {
  const y = clampY(G.y + n);
  if (G.view === 'year') go(y, G.m, G.sel);
  else go(y, G.m, { y, m: G.m, d: Math.min(G.sel.d, dim(y, G.m)) });
}
function goToday() {
  G.view = 'month';
  go(TODAY.y, TODAY.m, Object.assign({}, TODAY));
  if (isMobile() && drawerOpen()) renderDetail();
}
function setView(v) {
  G.view = v;
  render();
}

/* ================= 事件 ================= */
el.prevYear.addEventListener('click', () => shiftYear(-1));
el.nextYear.addEventListener('click', () => shiftYear(1));
el.prevMonth.addEventListener('click', () => shiftMonth(-1));
el.nextMonth.addEventListener('click', () => shiftMonth(1));
el.todayBtn.addEventListener('click', goToday);
el.ymBtn.addEventListener('click', openJump);
el.viewMonth.addEventListener('click', () => setView('month'));
el.viewYear.addEventListener('click', () => setView('year'));
el.backToday.addEventListener('click', () => { selectDay(TODAY.y, TODAY.m, TODAY.d, false); });

el.grid.addEventListener('click', e => {
  const c = e.target.closest('.cell');
  if (!c) return;
  selectDay(+c.dataset.y, +c.dataset.m, +c.dataset.d, true);
});
el.yearGrid.addEventListener('click', e => {
  const c = e.target.closest('.mcell');
  if (!c || c.classList.contains('blank')) return;
  G.view = 'month';
  selectDay(+c.dataset.y, +c.dataset.m, +c.dataset.d, true);
});

el.dClose.addEventListener('click', closeDrawer);
el.scrim.addEventListener('click', closeDrawer);

el.jumpPrev.addEventListener('click', () => { el.jumpYear.value = clampY((parseInt(el.jumpYear.value, 10) || G.y) - 1); renderJumpMonths(); });
el.jumpNext.addEventListener('click', () => { el.jumpYear.value = clampY((parseInt(el.jumpYear.value, 10) || G.y) + 1); renderJumpMonths(); });
el.jumpYear.addEventListener('change', () => { el.jumpYear.value = clampY(parseInt(el.jumpYear.value, 10) || G.y); renderJumpMonths(); });
el.jumpCancel.addEventListener('click', closeJump);
el.jumpToday.addEventListener('click', () => { closeJump(); goToday(); });
el.jumpOv.addEventListener('click', e => { if (e.target === el.jumpOv) closeJump(); });

el.verChip.addEventListener('click', openVer);
el.verCloseBtn.addEventListener('click', closeVer);
el.verOv.addEventListener('click', e => { if (e.target === el.verOv) closeVer(); });

document.addEventListener('keydown', e => {
  if (e.target === el.jumpYear) {
    if (e.key === 'Escape') closeJump();
    if (e.key === 'Enter') { el.jumpYear.value = clampY(parseInt(el.jumpYear.value, 10) || G.y); renderJumpMonths(); }
    return;
  }
  const key = e.key.toLowerCase();
  if (verOpen()) {
    if (key === 'escape' || key === 'enter') closeVer();
    return;
  }
  if (jumpOpen()) {
    if (key === 'escape') closeJump();
    return;
  }
  if (['arrowleft', 'arrowright', 'arrowdown', 'arrowup', 'pageup', 'pagedown', ' '].includes(key)) e.preventDefault();
  if (key === 'escape') { if (drawerOpen()) closeDrawer(); return; }
  if (e.repeat && !['arrowleft', 'arrowright', 'arrowdown', 'arrowup'].includes(key)) return;
  if (key === 'arrowleft') shiftDays(-1);
  else if (key === 'arrowright') shiftDays(1);
  else if (key === 'arrowup') shiftDays(-7);
  else if (key === 'arrowdown') shiftDays(7);
  else if (key === 'pageup') shiftMonth(e.shiftKey ? -12 : -1);
  else if (key === 'pagedown') shiftMonth(e.shiftKey ? 12 : 1);
  else if (key === 'home' || key === 't') goToday();
  else if (key === 'y') setView(G.view === 'year' ? 'month' : 'year');
});

window.addEventListener('resize', () => {
  if (!isMobile() && drawerOpen()) closeDrawer();
});

/* ================= 启动 ================= */
refreshVersionUi();
render();

window.CalApp = { G, TODAY, VERSION, selectDay, go, goToday, setView, shiftDays, shiftMonth, shiftYear, openJump, closeJump, openDrawer, closeDrawer, openVer, closeVer, render };