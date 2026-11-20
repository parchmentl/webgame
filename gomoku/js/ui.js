(function () {
  const E = window.GomokuEngine;
  const VERSION = '2.0.0';
  const SEEN_KEY = 'gomokuSeenVersion';
  const CHANGELOG = [
    { v: '2.0.0', d: '2026-11-20', t: '合并重构 · 霓虹棋局', items: [
      '双人对战与人机对弈合并为单一游戏，门户单入口',
      'AI 五档棋力：菜鸟 / 入门 / 进阶 / 高手 / 大师',
      '人机可选执黑执白，大师档四层深算 + 威胁搜索',
      '悔棋 / 提示 / 战绩统计 / 键盘全导航',
      'Canvas 霓虹渲染：落子动画、涟漪、胜线脉冲、悬停虚子',
      'WebAudio 合成音效与静音开关，版本面板与更新日志'
    ] },
    { v: '1.6.5', d: '2026-03-04', t: 'AI 对弈版', items: [
      'Zobrist 置换表 + 迭代加深搜索',
      'VCT 连续威胁识别与开局优化'
    ] },
    { v: '1.0.0', d: '2026-02-28', t: '双人初版', items: [
      '15×15 棋盘轮流落子与五连判定'
    ] }
  ];
  const $ = id => document.getElementById(id);
  const el = {
    canvas: $('board'), wrap: $('boardWrap'),
    turnStone: $('turnStone'), turnName: $('turnName'), turnTag: $('turnTag'), think: $('think'),
    moveCount: $('moveCount'), turnChip: $('turnChip'),
    undo: $('undoBtn'), hint: $('hintBtn'), restart: $('restartBtn'), menu: $('menuBtn'),
    menuOv: $('menuOv'), overOv: $('overOv'), verOv: $('verOv'),
    overTitle: $('overTitle'), overSub: $('overSub'),
    verChip: $('verChip'), verNum: $('verNum'), verNew: $('verNew'), verCur: $('verCur'), verList: $('verList'),
    muteBtn: $('muteBtn'), resume: $('resumeBtn')
  };
  const ctx = el.canvas.getContext('2d');
  const finePointer = matchMedia('(hover:hover) and (pointer:fine)');
  const stats = Object.assign({ pb: 0, pw: 0, aw: 0, al: 0, ad: 0 }, JSON.parse(localStorage.getItem('gomokuStats') || '{}'));
  const saveStats = () => localStorage.setItem('gomokuStats', JSON.stringify(stats));

  const S = {
    mode: 'ai', level: 3, human: 1,
    bd: E.createBoard(), hist: [], cur: 1, over: false, win: null,
    hint: null, hover: null, cursor: { r: 7, c: 7 }, kb: false,
    thinking: false, token: 0
  };
  let cell = 0, off = 0, side = 0, sprites = {};
  const anims = new Map();

  function makeSprite(who) {
    const s = cell * .92, dpr = Math.min(2, window.devicePixelRatio || 1);
    const oc = document.createElement('canvas');
    oc.width = oc.height = Math.max(4, Math.ceil(s * dpr));
    const g = oc.getContext('2d');
    g.scale(dpr, dpr);
    const r = s / 2;
    const grad = g.createRadialGradient(r - r * .35, r - r * .4, r * .15, r, r, r);
    if (who === 1) { grad.addColorStop(0, '#5f7396'); grad.addColorStop(.55, '#243950'); grad.addColorStop(1, '#0b1220'); }
    else { grad.addColorStop(0, '#ffffff'); grad.addColorStop(.6, '#e6ebf6'); grad.addColorStop(1, '#aeb8cf'); }
    g.beginPath(); g.arc(r, r, r - 1, 0, Math.PI * 2);
    g.fillStyle = grad; g.fill();
    g.lineWidth = 1.6;
    g.strokeStyle = who === 1 ? 'rgba(34,211,238,.85)' : 'rgba(255,45,120,.45)';
    g.stroke();
    g.beginPath(); g.arc(r - r * .35, r - r * .42, r * .18, 0, Math.PI * 2);
    g.fillStyle = who === 1 ? 'rgba(232,236,246,.6)' : 'rgba(255,255,255,.9)';
    g.fill();
    return oc;
  }
  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    side = el.canvas.getBoundingClientRect().width;
    el.canvas.width = el.canvas.height = Math.round(side * dpr);
    el.canvas.style.height = side + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cell = side / (E.SIZE + 1); off = cell;
    sprites = { 1: makeSprite(1), 2: makeSprite(2) };
  }
  const px = c => off + c * cell, py = r => off + r * cell;

  function draw(now) {
    ctx.clearRect(0, 0, side, side);
    const vg = ctx.createRadialGradient(side / 2, side / 2, side * .2, side / 2, side / 2, side * .75);
    vg.addColorStop(0, 'rgba(18,27,49,.55)'); vg.addColorStop(1, 'rgba(5,7,15,.9)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, side, side);
    ctx.strokeStyle = 'rgba(34,211,238,.17)'; ctx.lineWidth = 1;
    for (let i = 0; i < E.SIZE; i++) {
      ctx.beginPath(); ctx.moveTo(off, py(i)); ctx.lineTo(off + 14 * cell, py(i)); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(px(i), off); ctx.lineTo(px(i), off + 14 * cell); ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(34,211,238,.4)'; ctx.lineWidth = 1.5;
    ctx.strokeRect(off, off, 14 * cell, 14 * cell);
    ctx.fillStyle = 'rgba(139,147,168,.55)';
    ctx.font = Math.max(8, cell * .3) + 'px "Segoe UI",sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (let i = 0; i < E.SIZE; i++) {
      ctx.fillText(String.fromCharCode(65 + i), px(i), off * .45);
      ctx.fillText(String(i + 1), off * .45, py(i));
    }
    ctx.fillStyle = 'rgba(34,211,238,.4)';
    for (const [r, c] of [[3, 3], [3, 11], [7, 7], [11, 3], [11, 11]]) {
      ctx.beginPath(); ctx.arc(px(c), py(r), Math.max(2, cell * .08), 0, Math.PI * 2); ctx.fill();
    }
    const s = cell * .92;
    for (let r = 0; r < E.SIZE; r++) for (let c = 0; c < E.SIZE; c++) {
      const who = S.bd[r][c];
      if (!who) continue;
      const a = anims.get(r * 15 + c);
      let sc = 1;
      if (a != null) {
        const t = (now - a) / 220;
        if (t >= 1) anims.delete(r * 15 + c);
        else {
          sc = 1.3 - .3 * (1 - Math.pow(1 - t, 3));
          ctx.beginPath(); ctx.arc(px(c), py(r), cell * (.3 + .55 * t), 0, Math.PI * 2);
          ctx.strokeStyle = who === 1 ? 'rgba(34,211,238,' + (.5 * (1 - t)) + ')' : 'rgba(255,45,120,' + (.5 * (1 - t)) + ')';
          ctx.lineWidth = 2; ctx.stroke();
        }
      }
      ctx.drawImage(sprites[who], px(c) - s * sc / 2, py(r) - s * sc / 2, s * sc, s * sc);
    }
    if (S.hist.length && !S.over) {
      const m = S.hist[S.hist.length - 1];
      ctx.beginPath(); ctx.arc(px(m.c), py(m.r), cell * .14, 0, Math.PI * 2);
      ctx.fillStyle = '#a3e635'; ctx.fill();
    }
    if (S.win) {
      const pulse = (Math.sin(now / 170) + 1) / 2;
      let a = S.win[0], b = S.win[0], bd = -1;
      for (const p of S.win) for (const q of S.win) {
        const d = (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2;
        if (d > bd) { bd = d; a = p; b = q; }
      }
      ctx.save();
      ctx.strokeStyle = 'rgba(163,230,53,' + (.45 + .45 * pulse) + ')';
      ctx.lineWidth = 3; ctx.shadowColor = '#a3e635'; ctx.shadowBlur = 14;
      ctx.beginPath(); ctx.moveTo(px(a[1]), py(a[0])); ctx.lineTo(px(b[1]), py(b[0])); ctx.stroke();
      for (const [r, c] of S.win) {
        ctx.beginPath(); ctx.arc(px(c), py(r), cell * .46, 0, Math.PI * 2);
        ctx.lineWidth = 2; ctx.stroke();
      }
      ctx.restore();
    }
    if (S.hint && !S.over) {
      const pulse = (Math.sin(now / 200) + 1) / 2;
      ctx.beginPath(); ctx.arc(px(S.hint.c), py(S.hint.r), cell * (.34 + .1 * pulse), 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,45,120,' + (.4 + .5 * pulse) + ')';
      ctx.lineWidth = 2.5; ctx.setLineDash([5, 4]); ctx.stroke(); ctx.setLineDash([]);
    }
    if (S.kb && !S.over) {
      const x = px(S.cursor.c), y = py(S.cursor.r), d = cell * .44, l = cell * .16;
      ctx.strokeStyle = 'rgba(34,211,238,.9)'; ctx.lineWidth = 2;
      for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        ctx.beginPath();
        ctx.moveTo(x + sx * d, y + sy * d - sy * l); ctx.lineTo(x + sx * d, y + sy * d); ctx.lineTo(x + sx * d - sx * l, y + sy * d);
        ctx.stroke();
      }
    }
    if (S.hover && canPlace() && finePointer.matches && !S.bd[S.hover.r][S.hover.c]) {
      ctx.globalAlpha = .32;
      ctx.drawImage(sprites[S.cur], px(S.hover.c) - s / 2, py(S.hover.r) - s / 2, s, s);
      ctx.globalAlpha = 1;
    }
  }
  function loop(now) { draw(now); requestAnimationFrame(loop); }

  const canPlace = () => !S.over && !S.thinking && (S.mode === 'pvp' || S.cur === S.human);
  function rcAt(x, y) {
    const rect = el.canvas.getBoundingClientRect();
    const cx = x - rect.left, cy = y - rect.top;
    const c = Math.round((cx - off) / cell), r = Math.round((cy - off) / cell);
    if (r < 0 || r >= E.SIZE || c < 0 || c >= E.SIZE) return null;
    if (Math.hypot(cx - px(c), cy - py(r)) > cell * .45) return null;
    return { r, c };
  }
  function commit(r, c) {
    if (S.over || S.bd[r][c]) return false;
    S.bd[r][c] = S.cur;
    S.hist.push({ r, c, who: S.cur });
    anims.set(r * 15 + c, performance.now());
    S.hint = null;
    Sfx.place(S.cur);
    const w = E.winLine(S.bd, r, c, S.cur);
    if (w) { finish(S.cur, w); return true; }
    if (S.hist.length === E.SIZE * E.SIZE) { finish(0, null); return true; }
    S.cur = 3 - S.cur;
    updateHud();
    if (S.mode === 'ai' && S.cur !== S.human) scheduleAi();
    return true;
  }
  function scheduleAi() {
    S.thinking = true;
    const token = ++S.token;
    updateHud();
    setTimeout(() => {
      if (token !== S.token || S.over) { S.thinking = false; updateHud(); return; }
      const mv = E.bestMove(S.bd, S.cur, S.level);
      S.thinking = false;
      if (mv) commit(mv.r, mv.c); else updateHud();
    }, 420);
  }
  function finish(who, cells) {
    S.over = true; S.win = cells; S.thinking = false; S.token++;
    if (S.mode === 'pvp') { if (who === 1) stats.pb++; else if (who === 2) stats.pw++; else stats.ad++; }
    else { if (who === 0) stats.ad++; else if (who === S.human) stats.aw++; else stats.al++; }
    saveStats(); updateHud();
    const token = S.token;
    setTimeout(() => {
      if (token !== S.token) return;
      el.overTitle.textContent = who === 0 ? '平局' : S.mode === 'pvp' ? (who === 1 ? '黑方获胜' : '白方获胜') : (who === S.human ? '你赢了！' : 'AI 获胜');
      el.overSub.textContent = '共 ' + S.hist.length + ' 手 · ' + (S.mode === 'pvp' ? '双人对战' : '人机 · ' + E.LEVELS[S.level - 1].name);
      renderStats();
      el.overOv.classList.remove('hidden');
      if (who === 0) Sfx.draw(); else if (S.mode === 'ai' && who !== S.human) Sfx.lose(); else Sfx.win();
    }, 1100);
  }
  function undo() {
    if (!S.hist.length || S.over) return;
    S.token++; S.thinking = false;
    const last = S.hist[S.hist.length - 1];
    const n = S.mode === 'pvp' ? 1 : (last.who === S.human ? 1 : 2);
    for (let k = 0; k < n && S.hist.length; k++) {
      const m = S.hist.pop();
      S.bd[m.r][m.c] = 0;
      anims.delete(m.r * 15 + m.c);
    }
    S.cur = S.hist.length % 2 === 0 ? 1 : 2;
    S.win = null; S.hint = null;
    Sfx.undo(); updateHud();
    if (S.mode === 'ai' && S.cur !== S.human) scheduleAi();
  }
  function hint() {
    if (!canPlace()) return;
    const token = S.token, cur = S.cur, n = S.hist.length;
    setTimeout(() => {
      if (token !== S.token || S.over || S.cur !== cur || S.hist.length !== n) return;
      S.hint = E.bestMove(S.bd, S.cur, 5);
      Sfx.hint(); updateHud();
    }, 30);
  }
  function restart() {
    S.token++; S.thinking = false;
    S.bd = E.createBoard(); S.hist = []; S.cur = 1;
    S.over = false; S.win = null; S.hint = null; S.hover = null;
    anims.clear();
    el.overOv.classList.add('hidden');
    updateHud();
    if (S.mode === 'ai' && S.human === 2) scheduleAi();
  }
  function setMode(m) { S.mode = m; syncBar(); restart(); }
  function setLevel(l) { S.level = l; syncBar(); updateHud(); }
  function setSide(s) { S.human = s; syncBar(); restart(); }
  function syncBar() {
    document.querySelectorAll('#modeRow button').forEach(b => b.classList.toggle('cur', b.dataset.mode === S.mode));
    document.querySelectorAll('#levelRow button').forEach(b => b.classList.toggle('cur', +b.dataset.level === S.level));
    document.querySelectorAll('#sideRow button').forEach(b => b.classList.toggle('cur', +b.dataset.side === S.human));
    $('levelRow').classList.toggle('dim', S.mode !== 'ai');
    $('sideRow').classList.toggle('dim', S.mode !== 'ai');
  }
  function renderStats() {
    $('stPb').textContent = stats.pb; $('stPw').textContent = stats.pw;
    $('stAw').textContent = stats.aw; $('stAl').textContent = stats.al; $('stAd').textContent = stats.ad;
    $('mStPb').textContent = stats.pb; $('mStPw').textContent = stats.pw;
    $('mStAw').textContent = stats.aw; $('mStAl').textContent = stats.al; $('mStAd').textContent = stats.ad;
  }
  function updateHud() {
    el.turnStone.className = 'stone ' + (S.cur === 1 ? 'black' : 'white');
    const name = S.over ? '对局结束' : S.mode === 'pvp' ? (S.cur === 1 ? '黑方回合' : '白方回合') : (S.cur === S.human ? '你的回合' : 'AI 回合');
    el.turnName.textContent = name;
    el.turnChip.textContent = name;
    el.turnTag.textContent = S.mode === 'pvp' ? '玩家 ' + S.cur : (S.cur === S.human ? '执' + (S.human === 1 ? '黑' : '白') : E.LEVELS[S.level - 1].name + ' AI');
    el.think.classList.toggle('hidden', !S.thinking);
    el.moveCount.textContent = S.hist.length;
    el.undo.disabled = !S.hist.length || S.over;
    el.hint.disabled = !canPlace();
    renderStats();
  }

  let verOpen = false;
  function refreshVersionUi() {
    el.verNum.textContent = VERSION; el.verCur.textContent = VERSION;
    el.verNew.classList.toggle('hidden', localStorage.getItem(SEEN_KEY) === VERSION);
  }
  function openVer() {
    el.verList.innerHTML = CHANGELOG.map((c, i) =>
      '<div class="ver-card' + (i === 0 ? ' current' : '') + '"><div class="vh"><span class="vn">v' + c.v + '</span><span class="vd">' + c.d + '</span></div>' +
      '<div class="vt">' + c.t + '</div><ul class="vt2">' + c.items.map(x => '<li>' + x + '</li>').join('') + '</ul></div>').join('');
    el.verOv.classList.remove('hidden'); verOpen = true;
    localStorage.setItem(SEEN_KEY, VERSION); el.verNew.classList.add('hidden'); Sfx.ui();
  }
  function closeVer() { el.verOv.classList.add('hidden'); verOpen = false; Sfx.ui(); }
  function openMenu(silent) {
    document.querySelectorAll('#mModeRow button').forEach(b => b.classList.toggle('cur', b.dataset.mode === S.mode));
    document.querySelectorAll('#mLevelRow button').forEach(b => b.classList.toggle('cur', +b.dataset.level === S.level));
    document.querySelectorAll('#mSideRow button').forEach(b => b.classList.toggle('cur', +b.dataset.side === S.human));
    el.resume.classList.toggle('hidden', !S.hist.length || S.over);
    renderStats();
    el.menuOv.classList.remove('hidden'); if (!silent) Sfx.ui();
  }
  function startFromMenu() {
    S.mode = document.querySelector('#mModeRow button.cur').dataset.mode;
    S.level = +document.querySelector('#mLevelRow button.cur').dataset.level;
    S.human = +document.querySelector('#mSideRow button.cur').dataset.side;
    syncBar();
    el.menuOv.classList.add('hidden');
    restart(); Sfx.start();
  }
  function toggleMute() {
    Sfx.setMuted(!Sfx.muted);
    el.muteBtn.classList.toggle('muted', Sfx.muted);
    el.muteBtn.setAttribute('aria-pressed', String(Sfx.muted));
    if (!Sfx.muted) Sfx.ui();
  }

  el.canvas.addEventListener('pointermove', e => { S.hover = rcAt(e.clientX, e.clientY); });
  el.canvas.addEventListener('pointerleave', () => { S.hover = null; });
  el.canvas.addEventListener('pointerdown', e => {
    const rc = rcAt(e.clientX, e.clientY);
    if (!rc) return;
    S.cursor = rc; S.kb = false;
    if (canPlace()) commit(rc.r, rc.c);
  });
  el.undo.addEventListener('click', undo);
  el.hint.addEventListener('click', hint);
  el.restart.addEventListener('click', () => { restart(); Sfx.ui(); });
  el.menu.addEventListener('click', openMenu);
  el.resume.addEventListener('click', () => { el.menuOv.classList.add('hidden'); Sfx.ui(); });
  $('startBtn').addEventListener('click', startFromMenu);
  $('againBtn').addEventListener('click', () => { restart(); Sfx.start(); });
  $('overMenuBtn').addEventListener('click', () => { el.overOv.classList.add('hidden'); openMenu(); });
  document.querySelectorAll('#modeRow button').forEach(b => b.addEventListener('click', () => { setMode(b.dataset.mode); Sfx.ui(); }));
  document.querySelectorAll('#levelRow button').forEach(b => b.addEventListener('click', () => { setLevel(+b.dataset.level); Sfx.ui(); }));
  document.querySelectorAll('#sideRow button').forEach(b => b.addEventListener('click', () => { setSide(+b.dataset.side); Sfx.ui(); }));
  document.querySelectorAll('#mModeRow button').forEach(b => b.addEventListener('click', () => {
    document.querySelectorAll('#mModeRow button').forEach(x => x.classList.toggle('cur', x === b));
    $('mLevelRow').classList.toggle('dim', b.dataset.mode !== 'ai');
    $('mSideRow').classList.toggle('dim', b.dataset.mode !== 'ai');
    Sfx.ui();
  }));
  document.querySelectorAll('#mLevelRow button').forEach(b => b.addEventListener('click', () => {
    document.querySelectorAll('#mLevelRow button').forEach(x => x.classList.toggle('cur', x === b)); Sfx.ui();
  }));
  document.querySelectorAll('#mSideRow button').forEach(b => b.addEventListener('click', () => {
    document.querySelectorAll('#mSideRow button').forEach(x => x.classList.toggle('cur', x === b)); Sfx.ui();
  }));
  el.muteBtn.addEventListener('click', toggleMute);
  el.verChip.addEventListener('click', openVer);
  $('verCloseBtn').addEventListener('click', closeVer);
  el.verOv.addEventListener('click', e => { if (e.target === el.verOv) closeVer(); });
  window.addEventListener('resize', resize);
  document.addEventListener('keydown', e => {
    if (verOpen) { if (e.key === 'Escape' || e.key === 'Enter') closeVer(); return; }
    if (!el.menuOv.classList.contains('hidden') || !el.overOv.classList.contains('hidden')) {
      if (e.key === 'Enter' && !el.overOv.classList.contains('hidden')) { restart(); Sfx.start(); }
      if (e.key === 'Enter' && !el.menuOv.classList.contains('hidden')) startFromMenu();
      if (e.key === 'Escape' && !el.menuOv.classList.contains('hidden') && S.hist.length && !S.over) el.menuOv.classList.add('hidden');
      return;
    }
    const k = e.key;
    if (k === 'ArrowUp' || k === 'ArrowDown' || k === 'ArrowLeft' || k === 'ArrowRight') {
      e.preventDefault(); S.kb = true;
      if (k === 'ArrowUp') S.cursor.r = Math.max(0, S.cursor.r - 1);
      if (k === 'ArrowDown') S.cursor.r = Math.min(14, S.cursor.r + 1);
      if (k === 'ArrowLeft') S.cursor.c = Math.max(0, S.cursor.c - 1);
      if (k === 'ArrowRight') S.cursor.c = Math.min(14, S.cursor.c + 1);
      return;
    }
    if (k === 'Enter' || k === ' ') { e.preventDefault(); if (canPlace()) commit(S.cursor.r, S.cursor.c); return; }
    if (k === 'u' || k === 'U') { undo(); return; }
    if (k === 'h' || k === 'H') { hint(); return; }
    if (k === 'r' || k === 'R') { restart(); Sfx.ui(); return; }
    if (k === 'm' || k === 'M') { toggleMute(); return; }
    if (k === 'Escape') openMenu();
  });

  el.muteBtn.classList.toggle('muted', Sfx.muted);
  el.muteBtn.setAttribute('aria-pressed', String(Sfx.muted));
  refreshVersionUi(); syncBar(); resize(); updateHud();
  requestAnimationFrame(loop);
  openMenu(true);

  window.Gomoku = {
    S, VERSION, stats, commit, undo, hint, restart, setMode, setLevel, setSide,
    requestAi: () => { const mv = E.bestMove(S.bd, S.cur, S.level); if (mv) commit(mv.r, mv.c); return mv; },
    setBoard: (bd, cur) => {
      S.token++; S.thinking = false;
      S.bd = bd.map(row => row.slice()); S.cur = cur; S.hist = [];
      S.over = false; S.win = null; S.hint = null; anims.clear(); updateHud();
    },
    resize
  };
})();