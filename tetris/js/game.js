'use strict';
/* 俄罗斯方块 · 渲染 / 交互 / 界面 */

const VERSION = '2.0.0';
const SEEN_KEY = 'tetrisSeenVersion';
const BEST_KEY = 'tetrisBest';
const CHANGELOG = [
  {
    v: '2.0.0', date: '2026-11-16', title: '重构 · 现代规则',
    items: [
      '代码重构：规则引擎 / 合成音效 / 渲染交互三层分离，样式独立成文件',
      '七袋随机发牌与五连预告，SRS 旋转踢墙（含 I 型独立踢墙表）',
      '暂存 Hold（每块一次）、幽灵落点、锁定延迟与移动重置上限',
      '键盘 DAS/ARR 连发、软降 / 硬降计分，触屏七键键盘长按连发',
      'T-Spin / Mini、B2B ×1.5、COMBO、全消奖励与每 10 行提速的重力曲线',
      '消行闪白、粒子、震屏、横幅与合成音效，最高分本地持久化',
      '菜单 / 暂停 / 结算覆盖层与版本记录面板、更新徽标'
    ]
  },
  {
    v: '1.1.0', date: null, title: '经典基础版',
    items: [
      '10×20 棋盘与七种方块、纯随机发牌',
      '键盘方向键 + 触屏十字键、暂停与简单计分'
    ]
  }
];

const $ = id => document.getElementById(id);
const el = {
  score: $('score'), best: $('best'), hudLevel: $('hudLevel'), hudLines: $('hudLines'),
  pauseBtn: $('pauseBtn'), muteBtn: $('muteBtn'),
  hold: $('hold'), next: $('next'), board: $('board'), boardWrap: $('boardWrap'),
  b2b: $('b2bChip'), combo: $('comboChip'), banner: $('banner'),
  menu: $('menu'), pauseOv: $('pauseOv'), overOv: $('overOv'), verOv: $('verOv'),
  menuBest: $('menuBest'), overScore: $('overScore'), overLines: $('overLines'),
  overLevel: $('overLevel'), overBest: $('overBest'), newRecord: $('newRecord'),
  verChip: $('verChip'), verNum: $('verNum'), verNew: $('verNew'),
  pauseVer: $('pauseVer'), overVer: $('overVer'), verList: $('verList'),
  verCur: $('verCur'), verCloseBtn: $('verCloseBtn'),
  startBtn: $('startBtn'), resumeBtn: $('resumeBtn'), retryBtn: $('retryBtn'),
  menuBtn: $('menuBtn'), pauseRestartBtn: $('pauseRestartBtn'), pauseMenuBtn: $('pauseMenuBtn')
};

const G = {
  mode: 'menu', best: Number(localStorage.getItem(BEST_KEY) || 0),
  shake: 0, flash: 0, flashColor: '255,255,255',
  parts: [], floats: [], time: 0, overT: 0, overShown: false,
  held: { dir: 0, das: 0, arr: 0, soft: false, softAcc: 0 }
};
const core = new TetrisCore();
const bctx = el.board.getContext('2d');
const hctx = el.hold.getContext('2d');
const nctx = el.next.getContext('2d');
const DPR = Math.min(window.devicePixelRatio || 1, 2);
let CELL = 24, vertical = true;
const hudCache = {};

/* ================= 版本管理 ================= */
function refreshVersionUi() {
  el.verNum.textContent = 'v' + VERSION;
  el.verNew.classList.toggle('hidden', localStorage.getItem(SEEN_KEY) === VERSION);
  const line = 'v' + VERSION + ' · 版本记录';
  el.pauseVer.textContent = line; el.overVer.textContent = line;
  el.verCur.textContent = 'v' + VERSION;
}
function renderChangelog() {
  el.verList.innerHTML = '';
  CHANGELOG.forEach((c, i) => {
    const card = document.createElement('div');
    card.className = 'ver-card' + (i === 0 ? ' current' : '');
    const head = document.createElement('div'); head.className = 'vh';
    const vn = document.createElement('span'); vn.className = 'vn'; vn.textContent = 'v' + c.v;
    const vd = document.createElement('span'); vd.className = 'vd'; vd.textContent = c.date || '首发版本';
    const vt = document.createElement('span'); vt.className = 'vt'; vt.textContent = i === 0 ? '当前' : '历史';
    head.append(vn, vd, vt);
    const t2 = document.createElement('div'); t2.className = 'vt2'; t2.textContent = c.title;
    const ul = document.createElement('ul');
    c.items.forEach(it => { const li = document.createElement('li'); li.textContent = it; ul.append(li); });
    card.append(head, t2, ul);
    el.verList.append(card);
  });
  el.verList.scrollTop = 0;
}
function openVer() {
  renderChangelog();
  localStorage.setItem(SEEN_KEY, VERSION);
  refreshVersionUi();
  el.verOv.classList.remove('hidden');
  Snd.ensure(); Snd.ui();
}
function closeVer() { el.verOv.classList.add('hidden'); Snd.ui(); }
function verOpen() { return !el.verOv.classList.contains('hidden'); }

/* ================= 特效 ================= */
function sparks(x, y, color, n, spd = 160) {
  for (let i = 0; i < n && G.parts.length < 320; i++) {
    const a = Math.random() * Math.PI * 2, v = spd * (0.3 + Math.random() * 0.7);
    G.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40, life: 0.5 + Math.random() * 0.4, t: 0, color, size: 1.5 + Math.random() * 2.5 });
  }
}
function floatText(x, y, text, color) {
  G.floats.push({ x, y, text, color, t: 0, life: 1.1 });
}
function banner(text, cls) {
  el.banner.textContent = text;
  el.banner.className = cls || '';
  void el.banner.offsetWidth;
  el.banner.classList.add('show');
}
const px = cx => (cx + 0.5) * CELL;
const py = cy => (cy - HIDDEN + 0.5) * CELL;

/* ================= 事件 → 反馈 ================= */
core.onEvent = (type, d) => {
  if (type === 'move') Snd.move();
  else if (type === 'rotate') Snd.rotate();
  else if (type === 'hold') Snd.hold();
  else if (type === 'lock') Snd.lock();
  else if (type === 'hard') {
    Snd.hard();
    G.shake = Math.min(10, 3 + d.dist * 0.5);
    for (const [cx, cy] of core.cells()) sparks(px(core.cur.x + cx), py(core.cur.y + cy + 1), PIECES[core.cur.type].color, 3, 120);
  } else if (type === 'clear') {
    if (d.n === 4) { Snd.tetris(); banner('TETRIS!', 'amber'); G.flash = 0.22; G.shake = 14; }
    else { Snd.clear(d.n); G.shake = 4 + d.n * 2; }
    if (d.spin) { Snd.spin(); banner(d.spin === 'mini' ? 'T-SPIN MINI' : 'T-SPIN ' + d.n, 'mag'); }
    else if (d.leveled) banner('LEVEL ' + core.level, 'acid');
    if (d.leveled) Snd.level();
    for (const y of d.rows) {
      for (let x = 0; x < COLS; x++) {
        const t = core.grid[y][x];
        sparks(px(x), py(y), t ? PIECES[t].color : '#e8ecf6', 4, 200);
      }
      floatText(px(COLS / 2 - 0.5), py(y), '+' + d.gain, d.n === 4 ? '#fbbf24' : '#22d3ee');
    }
    if (d.combo > 0) floatText(px(COLS / 2 - 0.5), py(d.rows[0]) - 24, 'COMBO ×' + d.combo, '#a3e635');
    if (d.b2bApplied) floatText(px(COLS / 2 - 0.5), py(d.rows[0]) - 44, 'B2B ×1.5', '#fbbf24');
  } else if (type === 'spin') {
    Snd.spin(); banner(d.spin === 'mini' ? 'T-SPIN MINI' : 'T-SPIN', 'mag');
    floatText(px(core.cur.x + 1), py(core.cur.y + 1), '+' + d.gain, '#ff2d78');
  } else if (type === 'pc') {
    Snd.pc(); banner('全消!', ''); G.flash = 0.3; G.shake = 16;
    floatText(px(COLS / 2 - 0.5), py(ROWS / 2), '+' + d.gain, '#22d3ee');
  } else if (type === 'over') {
    Snd.over();
    G.mode = 'over'; G.overT = 0.9; G.overShown = false;
    G.shake = 16; G.flash = 0.3; G.flashColor = '244,63,94';
    const rec = core.score > G.best;
    if (rec) { G.best = core.score; localStorage.setItem(BEST_KEY, String(G.best)); }
    el.overScore.textContent = core.score;
    el.overLines.textContent = core.lines;
    el.overLevel.textContent = core.level;
    el.overBest.textContent = G.best;
    el.newRecord.classList.toggle('hidden', !rec);
    el.menuBest.textContent = G.best;
    releaseHeld();
  }
  syncHud(true);
};

/* ================= HUD ================= */
function setText(node, key, val) {
  if (hudCache[key] !== val) { hudCache[key] = val; node.textContent = val; }
}
function syncHud(force) {
  setText(el.score, 'score', String(core.score));
  setText(el.best, 'best', String(G.best));
  setText(el.hudLevel, 'lv', 'Lv.' + core.level);
  setText(el.hudLines, 'ln', '行 ' + core.lines);
  setText(el.menuBest, 'mb', String(G.best));
  const b2bOn = core.b2b, comboOn = core.combo > 0;
  if (force || hudCache.b2b !== b2bOn) { hudCache.b2b = b2bOn; el.b2b.classList.toggle('hidden', !b2bOn); }
  if (force || hudCache.combo !== core.combo) {
    hudCache.combo = core.combo;
    el.combo.classList.toggle('hidden', !comboOn);
    el.combo.textContent = 'COMBO ×' + core.combo;
  }
}

/* ================= 绘制 ================= */
function roundRect(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}
function block(c, x, y, s, color, ghost) {
  const pad = Math.max(1, s * 0.06);
  if (ghost) {
    c.globalAlpha = 0.32;
    c.strokeStyle = color; c.lineWidth = 1.5;
    roundRect(c, x + pad, y + pad, s - pad * 2, s - pad * 2, s * 0.18);
    c.stroke();
    c.globalAlpha = 0.07; c.fillStyle = color; c.fill();
    c.globalAlpha = 1;
    return;
  }
  c.save();
  c.shadowColor = color; c.shadowBlur = s * 0.32;
  const g = c.createLinearGradient(x, y, x, y + s);
  g.addColorStop(0, color);
  g.addColorStop(1, shade(color, -0.45));
  c.fillStyle = g;
  roundRect(c, x + pad, y + pad, s - pad * 2, s - pad * 2, s * 0.18);
  c.fill();
  c.shadowBlur = 0;
  c.globalAlpha = 0.35; c.fillStyle = '#ffffff';
  roundRect(c, x + pad + s * 0.12, y + pad + s * 0.08, s - pad * 2 - s * 0.24, s * 0.18, s * 0.09);
  c.fill();
  c.restore();
  c.globalAlpha = 1;
}
function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  if (k < 0) { r *= 1 + k; g *= 1 + k; b *= 1 + k; }
  else { r += (255 - r) * k; g += (255 - g) * k; b += (255 - b) * k; }
  return `rgb(${r | 0},${g | 0},${b | 0})`;
}
function drawMini(c, type, ox, oy, s, alpha) {
  const cells = ROT[type][0];
  let minX = 9, maxX = -9, minY = 9, maxY = -9;
  for (const [x, y] of cells) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
  const w = (maxX - minX + 1) * s, h = (maxY - minY + 1) * s;
  c.globalAlpha = alpha;
  for (const [x, y] of cells) block(c, ox - w / 2 + (x - minX) * s, oy - h / 2 + (y - minY) * s, s, PIECES[type].color, false);
  c.globalAlpha = 1;
}
function drawSide() {
  const hs = vertical ? 19 : 13;
  hctx.clearRect(0, 0, el.hold.width / DPR, el.hold.height / DPR);
  if (core.hold) drawMini(hctx, core.hold, el.hold.width / DPR / 2, el.hold.height / DPR / 2, hs, core.holdUsed ? 0.35 : 1);
  const nw = el.next.width / DPR, nh = el.next.height / DPR;
  nctx.clearRect(0, 0, nw, nh);
  const ns = vertical ? 17 : 12;
  for (let i = 0; i < 5; i++) {
    const t = core.queue[i];
    if (vertical) drawMini(nctx, t, nw / 2, (i + 0.5) * nh / 5, ns, i === 0 ? 1 : 0.75 - i * 0.08);
    else drawMini(nctx, t, (i + 0.5) * nw / 5, nh / 2, ns, i === 0 ? 1 : 0.75 - i * 0.08);
  }
}
function drawBoard(dt) {
  const w = COLS * CELL, h = (ROWS - HIDDEN) * CELL;
  bctx.clearRect(0, 0, w, h);
  bctx.save();
  if (G.shake > 0) bctx.translate((Math.random() - 0.5) * G.shake, (Math.random() - 0.5) * G.shake);
  bctx.strokeStyle = 'rgba(28,39,64,.5)'; bctx.lineWidth = 1;
  bctx.beginPath();
  for (let x = 1; x < COLS; x++) { bctx.moveTo(x * CELL + 0.5, 0); bctx.lineTo(x * CELL + 0.5, h); }
  for (let y = 1; y < ROWS - HIDDEN; y++) { bctx.moveTo(0, y * CELL + 0.5); bctx.lineTo(w, y * CELL + 0.5); }
  bctx.stroke();
  if (G.mode === 'menu') {
    const sy = (G.time * 40) % (h + 80) - 40;
    const g = bctx.createLinearGradient(0, sy - 30, 0, sy + 30);
    g.addColorStop(0, 'rgba(34,211,238,0)');
    g.addColorStop(0.5, 'rgba(34,211,238,.07)');
    g.addColorStop(1, 'rgba(34,211,238,0)');
    bctx.fillStyle = g; bctx.fillRect(0, sy - 30, w, 60);
  }
  for (let y = HIDDEN; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const t = core.grid[y][x];
      if (t) block(bctx, x * CELL, (y - HIDDEN) * CELL, CELL, PIECES[t].color, false);
    }
  }
  if (core.state === 'clearing') {
    const k = core.clearT / CLEAR_TIME;
    bctx.fillStyle = `rgba(255,255,255,${0.65 * k})`;
    for (const y of core.clearRows) bctx.fillRect(0, (y - HIDDEN) * CELL, w, CELL);
  } else if (G.mode === 'play' || G.mode === 'pause') {
    const gy = core.ghostY();
    if (gy !== core.cur.y) {
      for (const [cx, cy] of core.cells()) {
        if (gy + cy >= HIDDEN) block(bctx, (core.cur.x + cx) * CELL, (gy + cy - HIDDEN) * CELL, CELL, PIECES[core.cur.type].color, true);
      }
    }
    for (const [cx, cy] of core.cells()) {
      if (core.cur.y + cy >= HIDDEN) block(bctx, (core.cur.x + cx) * CELL, (core.cur.y + cy - HIDDEN) * CELL, CELL, PIECES[core.cur.type].color, false);
    }
  }
  for (let i = G.parts.length - 1; i >= 0; i--) {
    const p = G.parts[i];
    p.t += dt;
    if (p.t >= p.life) { G.parts.splice(i, 1); continue; }
    p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 320 * dt;
    bctx.globalAlpha = 1 - p.t / p.life;
    bctx.fillStyle = p.color;
    bctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
  }
  bctx.globalAlpha = 1;
  bctx.textAlign = 'center'; bctx.textBaseline = 'middle';
  for (let i = G.floats.length - 1; i >= 0; i--) {
    const f = G.floats[i];
    f.t += dt;
    if (f.t >= f.life) { G.floats.splice(i, 1); continue; }
    const k = f.t / f.life;
    bctx.globalAlpha = k < 0.15 ? k / 0.15 : 1 - (k - 0.15) / 0.85;
    bctx.font = `800 ${Math.max(13, CELL * 0.62)}px sans-serif`;
    bctx.fillStyle = f.color;
    bctx.shadowColor = f.color; bctx.shadowBlur = 10;
    bctx.fillText(f.text, f.x, f.y - k * 34);
    bctx.shadowBlur = 0;
  }
  bctx.globalAlpha = 1;
  if (G.flash > 0) {
    bctx.fillStyle = `rgba(${G.flashColor},${G.flash})`;
    bctx.fillRect(-20, -20, w + 40, h + 40);
  }
  bctx.restore();
}

/* ================= 尺寸 ================= */
function resize() {
  vertical = !window.matchMedia('(max-width:700px)').matches;
  // 先定侧栏画布尺寸再量棋盘区：默认 300×150 画布会在窄屏撑高横排，污染首次测量
  const hs = vertical ? 76 : 52;
  el.hold.style.width = hs + 'px'; el.hold.style.height = hs + 'px';
  el.hold.width = hs * DPR; el.hold.height = hs * DPR;
  hctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  const nw = vertical ? 76 : 250;
  const nh = vertical ? Math.max(120, Math.min(316, el.boardWrap.clientHeight - 8)) : 52;
  el.next.style.width = nw + 'px'; el.next.style.height = nh + 'px';
  el.next.width = nw * DPR; el.next.height = nh * DPR;
  nctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  const aw = el.boardWrap.clientWidth, ah = el.boardWrap.clientHeight;
  CELL = Math.max(8, Math.floor(Math.min(aw / COLS, ah / (ROWS - HIDDEN))));
  el.board.style.width = COLS * CELL + 'px';
  el.board.style.height = (ROWS - HIDDEN) * CELL + 'px';
  el.board.width = COLS * CELL * DPR;
  el.board.height = (ROWS - HIDDEN) * CELL * DPR;
  bctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}

/* ================= 流程 ================= */
function releaseHeld() { G.held.dir = 0; G.held.das = 0; G.held.arr = 0; G.held.soft = false; G.held.softAcc = 0; }
function startGame() {
  core.reset();
  G.mode = 'play'; G.parts.length = 0; G.floats.length = 0;
  G.shake = 0; G.flash = 0; G.overShown = false;
  releaseHeld();
  el.menu.classList.add('hidden'); el.pauseOv.classList.add('hidden');
  el.overOv.classList.add('hidden'); el.verOv.classList.add('hidden');
  Snd.ensure(); Snd.ui();
  syncHud(true);
}
function showMenu() {
  G.mode = 'menu';
  core.reset();
  G.parts.length = 0; G.floats.length = 0; G.shake = 0; G.flash = 0;
  releaseHeld();
  el.menu.classList.remove('hidden');
  el.pauseOv.classList.add('hidden'); el.overOv.classList.add('hidden'); el.verOv.classList.add('hidden');
  syncHud(true);
}
function togglePause() {
  if (G.mode === 'play') {
    G.mode = 'pause'; releaseHeld();
    el.pauseOv.classList.remove('hidden');
    Snd.ensure(); Snd.pause();
  } else if (G.mode === 'pause') {
    G.mode = 'play';
    el.pauseOv.classList.add('hidden');
    Snd.ensure(); Snd.ui();
  }
}
function toggleMute() {
  Snd.ensure();
  Snd.setMuted(!Snd.muted);
  el.muteBtn.textContent = Snd.muted ? '🔇' : '🔊';
  el.muteBtn.classList.toggle('off', Snd.muted);
  if (!Snd.muted) Snd.ui();
}

/* ================= 输入 ================= */
function pressDir(dir) {
  if (G.mode !== 'play') return;
  core.move(dir);
  G.held.dir = dir; G.held.das = 0; G.held.arr = 0;
}
function pressSoft() {
  if (G.mode !== 'play') return;
  core.softDrop();
  G.held.soft = true; G.held.softAcc = 0;
}
document.addEventListener('keydown', e => {
  const key = e.key.toLowerCase();
  if (['arrowleft', 'arrowright', 'arrowdown', 'arrowup', ' '].includes(key)) e.preventDefault();
  Snd.ensure();
  if (e.repeat) return;
  if (verOpen()) {
    if (key === 'escape' || key === 'enter' || key === ' ') closeVer();
    return;
  }
  if (key === 'm') { toggleMute(); return; }
  if (G.mode === 'menu' || G.mode === 'over') {
    if (key === 'enter' || key === ' ') startGame();
    return;
  }
  if (key === 'p' || key === 'escape') { togglePause(); return; }
  if (key === 'r') { startGame(); return; }
  if (G.mode !== 'play') {
    if (key === 'enter' || key === ' ') togglePause();
    return;
  }
  if (key === 'arrowleft') pressDir(-1);
  else if (key === 'arrowright') pressDir(1);
  else if (key === 'arrowdown') pressSoft();
  else if (key === 'arrowup' || key === 'x') core.rotate(1);
  else if (key === 'z') core.rotate(-1);
  else if (key === ' ') core.hardDrop();
  else if (key === 'c' || key === 'shift') core.holdSwap();
});
document.addEventListener('keyup', e => {
  const key = e.key.toLowerCase();
  if (key === 'arrowleft' && G.held.dir === -1) releaseHeld();
  if (key === 'arrowright' && G.held.dir === 1) releaseHeld();
  if (key === 'arrowdown') G.held.soft = false;
});
window.addEventListener('blur', () => { if (G.mode === 'play') togglePause(); });

function bindHoldBtn(id, down, up) {
  const b = $(id);
  b.addEventListener('pointerdown', e => { e.preventDefault(); Snd.ensure(); down(); });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(ev => b.addEventListener(ev, e => { e.preventDefault(); up(); }));
  b.addEventListener('contextmenu', e => e.preventDefault());
}
bindHoldBtn('tLeft', () => pressDir(-1), () => { if (G.held.dir === -1) releaseHeld(); });
bindHoldBtn('tRight', () => pressDir(1), () => { if (G.held.dir === 1) releaseHeld(); });
bindHoldBtn('tDown', pressSoft, () => { G.held.soft = false; });
function bindTap(id, fn) {
  const b = $(id);
  b.addEventListener('pointerdown', e => { e.preventDefault(); Snd.ensure(); if (G.mode === 'play') fn(); });
  b.addEventListener('contextmenu', e => e.preventDefault());
}
bindTap('tCW', () => core.rotate(1));
bindTap('tCCW', () => core.rotate(-1));
bindTap('tHard', () => core.hardDrop());
bindTap('tHold', () => core.holdSwap());

el.startBtn.addEventListener('click', startGame);
el.retryBtn.addEventListener('click', startGame);
el.pauseRestartBtn.addEventListener('click', startGame);
el.resumeBtn.addEventListener('click', togglePause);
el.pauseBtn.addEventListener('click', () => { if (G.mode === 'play' || G.mode === 'pause') togglePause(); });
el.menuBtn.addEventListener('click', showMenu);
el.pauseMenuBtn.addEventListener('click', showMenu);
el.muteBtn.addEventListener('click', toggleMute);
el.verChip.addEventListener('click', openVer);
el.pauseVer.addEventListener('click', openVer);
el.overVer.addEventListener('click', openVer);
el.verCloseBtn.addEventListener('click', closeVer);

/* ================= 主循环 ================= */
let lastTs = 0;
function loop(ts) {
  const dt = Math.min(0.033, (ts - lastTs) / 1000 || 0.016);
  lastTs = ts;
  G.time += dt;
  if (G.mode === 'play') {
    const h = G.held;
    if (h.dir) {
      h.das += dt;
      if (h.das >= 0.15) {
        h.arr += dt;
        while (h.arr >= 0.04) { h.arr -= 0.04; core.move(h.dir); }
      }
    }
    if (h.soft) {
      h.softAcc += dt;
      while (h.softAcc >= 0.03) { h.softAcc -= 0.03; core.softDrop(); }
    }
    core.tick(dt);
  } else if (G.mode === 'over' && !G.overShown) {
    G.overT -= dt;
    if (G.overT <= 0) { G.overShown = true; el.overOv.classList.remove('hidden'); }
  }
  G.shake = Math.max(0, G.shake - dt * 34);
  G.flash = Math.max(0, G.flash - dt * 1.6);
  drawBoard(dt);
  drawSide();
  syncHud(false);
  requestAnimationFrame(loop);
}

/* ================= 启动 ================= */
el.muteBtn.textContent = Snd.muted ? '🔇' : '🔊';
el.muteBtn.classList.toggle('off', Snd.muted);
refreshVersionUi();
resize();
window.addEventListener('resize', resize);
window.matchMedia('(max-width:700px)').addEventListener('change', resize);
syncHud(true);
requestAnimationFrame(loop);

window.T = { core, G, Snd, startGame, showMenu, togglePause, resize, get cell() { return CELL; } };