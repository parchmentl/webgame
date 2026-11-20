(function () {
  const E = window.XiangqiEngine, AI = window.XiangqiAI;
  const VERSION = '2.0.0';
  const SEEN_KEY = 'xiangqiSeenVersion';
  const CHANGELOG = [
    { v: '2.0.0', t: '合并重构 · 霓虹棋局', items: ['双人 / 人机双模式合一，菜单与顶栏随时切换', 'AI 五档棋力：菜鸟 / 入门 / 进阶 / 高手 / 大师', '执红执黑可选，悔棋 / 提示 / 战绩 / 键盘操控', '中文着法谱、吃子 tray、将军与绝杀判定', '霓虹视觉重制：落子滑动、吃子粒子、胜局脉冲'] },
    { v: '1.0.2', t: '双人对弈版', items: ['同屏轮流执子， canvas 棋盘渲染', '悔棋与重新开局', '规则完整：马腿 / 象眼 / 炮架 / 将帅对面'] },
    { v: '1.0.0', t: '初版', items: ['中国象棋双人基础对局'] }
  ];
  const $ = id => document.getElementById(id);
  const el = {
    canvas: $('board'), wrap: $('boardWrap'), turnStone: $('turnStone'), turnName: $('turnName'),
    turnTag: $('turnTag'), think: $('think'), checkBadge: $('checkBadge'), moveCount: $('moveCount'),
    trayRed: $('trayRed'), trayBlack: $('trayBlack'), logList: $('logList'), turnChip: $('turnChip'),
    undoBtn: $('undoBtn'), hintBtn: $('hintBtn'), restartBtn: $('restartBtn'), menuBtn: $('menuBtn'),
    menuOv: $('menuOv'), overOv: $('overOv'), verOv: $('verOv'), overTitle: $('overTitle'), overSub: $('overSub'),
    verChip: $('verChip'), verNew: $('verNew'), verCur: $('verCur'), verList: $('verList'), muteBtn: $('muteBtn'),
    resumeBtn: $('resumeBtn'), startBtn: $('startBtn'), againBtn: $('againBtn'), overMenuBtn: $('overMenuBtn'),
    verCloseBtn: $('verCloseBtn')
  };
  const ctx = el.canvas.getContext('2d');
  const finePointer = matchMedia('(pointer:fine)');
  const stats = Object.assign({ pb: 0, pw: 0, aw: 0, al: 0, ad: 0 }, JSON.parse(localStorage.getItem('xiangqiStats') || '{}'));
  const saveStats = () => localStorage.setItem('xiangqiStats', JSON.stringify(stats));

  const S = {
    mode: 'ai', level: 3, human: 1,
    bd: E.initial(), hist: [], cur: 1, over: false, result: null, reason: '',
    sel: null, targets: [], hint: null, last: null, hover: null,
    cursor: { r: 9, c: 4 }, kb: false, thinking: false, token: 0,
    checkSide: 0, noCap: 0, rep: new Map()
  };
  let cell = 0, off = 0, side = 0, sprites = {};
  const anims = new Map();
  const particles = [];
  const posKey = () => S.bd.join(',') + ':' + S.cur;
  S.rep.set(posKey(), 1);

  function makeSprite(sd, t) {
    const s = cell * .92, dpr = Math.min(2, window.devicePixelRatio || 1);
    const oc = document.createElement('canvas');
    oc.width = oc.height = Math.max(4, Math.ceil(s * dpr));
    const g = oc.getContext('2d');
    g.scale(dpr, dpr);
    const r = s / 2;
    const grad = g.createRadialGradient(r - r * .35, r - r * .4, r * .15, r, r, r);
    if (sd === 1) { grad.addColorStop(0, '#5a1c30'); grad.addColorStop(.6, '#2b0f1c'); grad.addColorStop(1, '#160810'); }
    else { grad.addColorStop(0, '#1d3450'); grad.addColorStop(.6, '#101d31'); grad.addColorStop(1, '#080f1c'); }
    g.beginPath(); g.arc(r, r, r - 1, 0, Math.PI * 2);
    g.fillStyle = grad; g.fill();
    g.lineWidth = 1.6;
    g.strokeStyle = sd === 1 ? 'rgba(255,45,120,.9)' : 'rgba(34,211,238,.9)';
    g.stroke();
    g.beginPath(); g.arc(r, r, r - 3.5, 0, Math.PI * 2);
    g.lineWidth = 1;
    g.strokeStyle = sd === 1 ? 'rgba(255,45,120,.35)' : 'rgba(34,211,238,.35)';
    g.stroke();
    g.fillStyle = sd === 1 ? '#ffd9e6' : '#d9f6ff';
    g.font = 'bold ' + Math.round(s * .5) + 'px KaiTi, STKaiti, "Microsoft YaHei", serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(E.NAMES[sd][t], r, r + s * .03);
    g.beginPath(); g.arc(r - r * .4, r - r * .45, r * .14, 0, Math.PI * 2);
    g.fillStyle = 'rgba(255,255,255,.28)';
    g.fill();
    return oc;
  }

  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    side = el.canvas.getBoundingClientRect().width;
    el.canvas.width = Math.round(side * dpr);
    el.canvas.height = Math.round(side * 1.1 * dpr);
    el.canvas.style.height = (side * 1.1) + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cell = side / 10; off = cell;
    sprites = {};
    for (const sd of [1, -1]) for (let t = 1; t <= 7; t++) sprites[sd + ':' + t] = makeSprite(sd, t);
  }
  const px = c => off + c * cell, py = r => off + r * cell;

  function star(g, r, c) {
    const x = px(c), y = py(r), d = cell * .12, l = cell * .22;
    g.beginPath();
    for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      if (c === 0 && sx === -1) continue;
      if (c === 8 && sx === 1) continue;
      g.moveTo(x + sx * d, y + sy * d - sy * l); g.lineTo(x + sx * d, y + sy * d); g.lineTo(x + sx * d - sx * l, y + sy * d);
    }
    g.stroke();
  }

  function draw(now) {
    const H = side * 1.1;
    ctx.clearRect(0, 0, side, H);
    const vg = ctx.createRadialGradient(side / 2, H / 2, side * .2, side / 2, H / 2, side * .85);
    vg.addColorStop(0, 'rgba(18,27,49,.55)'); vg.addColorStop(1, 'rgba(5,7,15,.9)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, side, H);
    ctx.strokeStyle = 'rgba(34,211,238,.2)'; ctx.lineWidth = 1;
    for (let r = 0; r < 10; r++) { ctx.beginPath(); ctx.moveTo(px(0), py(r)); ctx.lineTo(px(8), py(r)); ctx.stroke(); }
    for (let c = 0; c < 9; c++) {
      ctx.beginPath();
      if (c === 0 || c === 8) { ctx.moveTo(px(c), py(0)); ctx.lineTo(px(c), py(9)); }
      else { ctx.moveTo(px(c), py(0)); ctx.lineTo(px(c), py(4)); ctx.moveTo(px(c), py(5)); ctx.lineTo(px(c), py(9)); }
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(255,45,120,.4)'; ctx.lineWidth = 1.4;
    ctx.strokeRect(px(0) - cell * .3, py(0) - cell * .3, 8 * cell + cell * .6, 9 * cell + cell * .6);
    ctx.strokeStyle = 'rgba(34,211,238,.3)'; ctx.lineWidth = 1;
    for (const [r0, r1] of [[0, 2], [7, 9]]) {
      ctx.beginPath(); ctx.moveTo(px(3), py(r0)); ctx.lineTo(px(5), py(r1)); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(px(5), py(r0)); ctx.lineTo(px(3), py(r1)); ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(34,211,238,.35)';
    for (const [r, c] of [[2, 1], [2, 7], [7, 1], [7, 7], [3, 0], [3, 2], [3, 4], [3, 6], [3, 8], [6, 0], [6, 2], [6, 4], [6, 6], [6, 8]]) star(ctx, r, c);
    ctx.fillStyle = 'rgba(139,147,168,.5)';
    ctx.font = Math.round(cell * .62) + 'px KaiTi, STKaiti, serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('楚 河', px(2), py(4.5));
    ctx.fillText('漢 界', px(6), py(4.5));

    if (S.last) {
      ctx.strokeStyle = 'rgba(251,191,36,.8)'; ctx.lineWidth = 1.6;
      for (const [r, c] of [[S.last.fr, S.last.fc], [S.last.tr, S.last.tc]]) {
        const x = px(c), y = py(r), d = cell * .46, l = cell * .16;
        ctx.beginPath();
        for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
          ctx.moveTo(x + sx * d, y + sy * d - sy * l); ctx.lineTo(x + sx * d, y + sy * d); ctx.lineTo(x + sx * d - sx * l, y + sy * d);
        }
        ctx.stroke();
      }
    }
    if (S.sel) {
      for (const m of S.targets) {
        const x = px(m.tc), y = py(m.tr);
        if (S.bd[E.idx(m.tr, m.tc)]) {
          ctx.strokeStyle = 'rgba(255,45,120,.85)'; ctx.lineWidth = 2;
          ctx.setLineDash([4, 3]);
          ctx.beginPath(); ctx.arc(x, y, cell * .48, 0, Math.PI * 2); ctx.stroke();
          ctx.setLineDash([]);
        } else {
          ctx.fillStyle = 'rgba(163,230,53,.75)';
          ctx.beginPath(); ctx.arc(x, y, cell * .12, 0, Math.PI * 2); ctx.fill();
        }
      }
    }
    if (S.hint) {
      const pulse = .55 + .35 * Math.sin(now / 220);
      ctx.strokeStyle = 'rgba(255,45,120,' + pulse + ')'; ctx.lineWidth = 2;
      ctx.setLineDash([5, 4]);
      for (const [r, c] of [[S.hint.fr, S.hint.fc], [S.hint.tr, S.hint.tc]]) {
        ctx.beginPath(); ctx.arc(px(c), py(r), cell * .46, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.setLineDash([]);
    }
    const s = cell * .92;
    for (let i = 0; i < 90; i++) {
      const p = S.bd[i];
      if (!p) continue;
      const r = Math.floor(i / 9), c = i % 9;
      const an = anims.get(i);
      let x = px(c), y = py(r), sc = 1;
      if (an) {
        const t = Math.min(1, (now - an.start) / 160);
        if (t >= 1) anims.delete(i);
        else {
          const e = 1 - Math.pow(1 - t, 3);
          x = px(an.fc) + (px(c) - px(an.fc)) * e;
          y = py(an.fr) + (py(r) - py(an.fr)) * e;
          sc = 1.12 - .12 * e;
        }
      }
      if (S.sel && S.sel.r === r && S.sel.c === c) {
        ctx.strokeStyle = 'rgba(163,230,53,.95)'; ctx.lineWidth = 2.4;
        ctx.beginPath(); ctx.arc(x, y, cell * .5, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.drawImage(sprites[E.sideOf(p) + ':' + Math.abs(p)], x - s * sc / 2, y - s * sc / 2, s * sc, s * sc);
    }
    if (S.checkSide && !S.over) {
      const g = E.findGeneral(S.bd, S.checkSide);
      if (g >= 0) {
        const pulse = .5 + .4 * Math.sin(now / 160);
        ctx.strokeStyle = 'rgba(244,63,94,' + pulse + ')'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(px(g % 9), py(Math.floor(g / 9)), cell * .52, 0, Math.PI * 2); ctx.stroke();
      }
    }
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= 1 / 60;
      if (p.life <= 0) { particles.splice(i, 1); continue; }
      p.x += p.vx; p.y += p.vy; p.vy += .12;
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - 1.5, p.y - 1.5, 3, 3);
      ctx.globalAlpha = 1;
    }
    if (S.kb) {
      const x = px(S.cursor.c), y = py(S.cursor.r), d = cell * .44, l = cell * .16;
      ctx.strokeStyle = 'rgba(232,236,246,.8)'; ctx.lineWidth = 1.6;
      ctx.beginPath();
      for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        ctx.moveTo(x + sx * d, y + sy * d - sy * l); ctx.lineTo(x + sx * d, y + sy * d); ctx.lineTo(x + sx * d - sx * l, y + sy * d);
      }
      ctx.stroke();
    }
    if (S.hover && canPlace() && finePointer.matches) {
      const p = S.bd[E.idx(S.hover.r, S.hover.c)];
      if (p && E.sideOf(p) === S.cur && !(S.sel && S.sel.r === S.hover.r && S.sel.c === S.hover.c)) {
        ctx.strokeStyle = 'rgba(232,236,246,.35)'; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.arc(px(S.hover.c), py(S.hover.r), cell * .48, 0, Math.PI * 2); ctx.stroke();
      }
    }
  }
  function loop(now) { draw(now); requestAnimationFrame(loop); }

  const canPlace = () => !S.over && !S.thinking && (S.mode === 'pvp' || S.cur === S.human);
  const levelName = () => AI.LEVELS[S.level - 1].name;

  function burst(r, c, color) {
    for (let i = 0; i < 14; i++) {
      const a = Math.random() * Math.PI * 2, v = 1 + Math.random() * 2.4;
      particles.push({ x: px(c), y: py(r), vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1, life: .5 + Math.random() * .3, max: .8, color });
    }
  }

  function renderTrays() {
    const byRed = [], byBlack = [];
    for (const h of S.hist) if (h.cap) (h.cap < 0 ? byRed : byBlack).push(h.cap);
    const html = list => list.length ? list.map(p => '<i class="cap ' + (p > 0 ? 'red' : 'black') + '">' + E.NAMES[E.sideOf(p)][Math.abs(p)] + '</i>').join('') : '<span class="none">—</span>';
    el.trayRed.innerHTML = html(byRed);
    el.trayBlack.innerHTML = html(byBlack);
  }
  function renderLog() {
    el.logList.innerHTML = S.hist.map((h, i) => '<li class="' + (h.who === 1 ? 'red' : 'black') + '"><b>' + (i + 1) + '</b>' + h.text + '</li>').join('');
    el.logList.scrollTop = el.logList.scrollHeight;
  }
  function renderStats() {
    $('stPb').textContent = stats.pb; $('stPw').textContent = stats.pw;
    $('stAw').textContent = stats.aw; $('stAl').textContent = stats.al; $('stAd').textContent = stats.ad;
    $('mStPb').textContent = stats.pb; $('mStPw').textContent = stats.pw;
    $('mStAw').textContent = stats.aw; $('mStAl').textContent = stats.al; $('mStAd').textContent = stats.ad;
  }
  function updateHud() {
    el.turnStone.className = 'stone ' + (S.cur === 1 ? 'red' : 'black');
    const name = S.over ? '对局结束' : S.thinking ? 'AI 思考中' : S.mode === 'ai' ? (S.cur === S.human ? '你的回合' : 'AI 回合') : (S.cur === 1 ? '红方回合' : '黑方回合');
    el.turnName.textContent = name;
    el.turnTag.textContent = S.mode === 'ai' ? (S.human === 1 ? '执红' : '执黑') + ' · ' + levelName() : '双人对战';
    el.think.classList.toggle('hidden', !S.thinking);
    el.checkBadge.classList.toggle('hidden', !S.checkSide || S.over);
    el.moveCount.textContent = S.hist.length;
    el.turnChip.textContent = name + (S.checkSide && !S.over ? ' · 将军!' : '');
    el.turnChip.classList.toggle('danger', !!S.checkSide && !S.over);
    el.undoBtn.classList.toggle('dim', S.over || S.thinking || !S.hist.length);
    el.hintBtn.classList.toggle('dim', S.over || S.thinking);
    $('levelRow').classList.toggle('dim', S.mode !== 'ai');
    $('sideRow').classList.toggle('dim', S.mode !== 'ai');
    syncSeg($('modeRow'), 'mode', S.mode); syncSeg($('levelRow'), 'level', S.level); syncSeg($('sideRow'), 'side', S.human);
  }
  function syncSeg(row, key, val) {
    row.querySelectorAll('button').forEach(b => b.classList.toggle('cur', String(b.dataset[key]) === String(val)));
  }

  function scheduleAi() {
    S.thinking = true;
    const token = S.token;
    updateHud();
    setTimeout(() => {
      if (token !== S.token) return;
      const mv = AI.bestMove(S.bd, S.cur, S.level);
      S.thinking = false;
      if (token !== S.token) return;
      if (mv) commit(mv);
      else finish(-S.cur, E.inCheck(S.bd, S.cur) ? '绝杀' : '困毙');
    }, 420);
  }

  function finish(winner, reason) {
    S.over = true; S.result = winner; S.reason = reason;
    S.thinking = false; S.sel = null; S.targets = []; S.hint = null;
    S.token++;
    if (S.mode === 'pvp') { if (winner === 1) stats.pb++; else if (winner === -1) stats.pw++; else stats.ad++; }
    else { if (winner === S.human) stats.aw++; else if (winner === -S.human) stats.al++; else stats.ad++; }
    saveStats(); renderStats();
    if (winner === 0) Sfx.draw();
    else if (S.mode === 'pvp' || winner === S.human) Sfx.win();
    else Sfx.lose();
    updateHud();
    const token = S.token;
    setTimeout(() => {
      if (token !== S.token) return;
      el.overTitle.textContent = winner === 1 ? '红方获胜' : winner === -1 ? '黑方获胜' : '和棋';
      el.overTitle.className = 'ov-title ' + (winner === 1 ? 'red' : winner === -1 ? 'black' : '');
      el.overSub.textContent = reason + ' · 共 ' + S.hist.length + ' 手 · ' + (S.mode === 'ai' ? '人机 · ' + levelName() : '双人');
      el.overOv.classList.remove('hidden');
    }, 1100);
  }

  function commit(m) {
    const p = S.bd[E.idx(m.fr, m.fc)];
    const cap = S.bd[E.idx(m.tr, m.tc)];
    const text = E.moveText(S.bd, m);
    E.make(S.bd, m);
    S.hist.push({ m, cap, who: E.sideOf(p), text });
    S.last = m; S.sel = null; S.targets = []; S.hint = null;
    S.noCap = cap ? 0 : S.noCap + 1;
    const key = posKey();
    S.rep.set(key, (S.rep.get(key) || 0) + 1);
    anims.set(E.idx(m.tr, m.tc), { fr: m.fr, fc: m.fc, start: performance.now() });
    if (cap) burst(m.tr, m.tc, cap > 0 ? '#ff2d78' : '#22d3ee');
    cap ? Sfx.capture() : Sfx.place();
    const opp = -S.cur;
    S.checkSide = E.inCheck(S.bd, opp) ? opp : 0;
    if (S.checkSide) setTimeout(() => Sfx.check(), 120);
    renderTrays(); renderLog();
    if (!E.legalMoves(S.bd, opp).length) { finish(S.cur, S.checkSide ? '绝杀' : '困毙'); return; }
    if (S.noCap >= 120) { finish(0, '自然限着'); return; }
    if (S.rep.get(key) >= 3) { finish(0, '重复局面'); return; }
    S.cur = opp;
    updateHud();
    if (S.mode === 'ai' && S.cur !== S.human) scheduleAi();
  }

  function undo() {
    if (!S.hist.length) return;
    S.token++;
    S.thinking = false;
    const n = S.mode === 'pvp' ? 1 : (S.hist[S.hist.length - 1].who === S.human ? 1 : 2);
    for (let i = 0; i < n && S.hist.length; i++) {
      const h = S.hist.pop();
      E.unmake(S.bd, h.m, h.cap);
      const key = S.bd.join(',') + ':' + (E.sideOf(S.bd[E.idx(h.m.fr, h.m.fc)]));
      S.rep.set(key, Math.max(0, (S.rep.get(key) || 1) - 1));
    }
    S.noCap = 0;
    for (let i = S.hist.length - 1; i >= 0; i--) { if (S.hist[i].cap) break; S.noCap++; }
    S.cur = S.hist.length % 2 === 0 ? 1 : -1;
    S.over = false; S.result = null;
    S.checkSide = E.inCheck(S.bd, S.cur) ? S.cur : 0;
    S.sel = null; S.targets = []; S.hint = null;
    S.last = S.hist.length ? S.hist[S.hist.length - 1].m : null;
    anims.clear(); particles.length = 0;
    el.overOv.classList.add('hidden');
    Sfx.undo(); renderTrays(); renderLog(); updateHud();
    if (S.mode === 'ai' && S.cur !== S.human) scheduleAi();
  }

  function hint() {
    if (S.over || S.thinking || !canPlace()) return;
    const mv = AI.bestMove(S.bd, S.cur, Math.max(3, S.level));
    if (mv) { S.hint = mv; Sfx.hint(); }
  }

  function restart(silent) {
    S.token++;
    S.bd = E.initial(); S.hist = []; S.cur = 1;
    S.over = false; S.result = null; S.reason = '';
    S.sel = null; S.targets = []; S.hint = null; S.last = null;
    S.thinking = false; S.checkSide = 0; S.noCap = 0;
    S.rep = new Map([[posKey(), 1]]);
    anims.clear(); particles.length = 0;
    el.overOv.classList.add('hidden');
    renderTrays(); renderLog(); updateHud();
    if (!silent) Sfx.start();
    if (S.mode === 'ai' && S.human === -1) scheduleAi();
  }
  function setMode(m) { if (S.mode === m) return; S.mode = m; restart(); }
  function setLevel(l) { if (S.level === l) return; S.level = l; restart(); }
  function setSide(sd) { if (S.human === sd) return; S.human = sd; restart(); }

  function openMenu(silent) {
    syncSeg($('mModeRow'), 'mode', S.mode); syncSeg($('mLevelRow'), 'level', S.level); syncSeg($('mSideRow'), 'side', S.human);
    el.resumeBtn.classList.toggle('hidden', !S.hist.length || S.over);
    el.menuOv.classList.remove('hidden');
    if (!silent) Sfx.ui();
  }
  function startFromMenu() {
    S.mode = $('mModeRow').querySelector('.cur').dataset.mode;
    S.level = Number($('mLevelRow').querySelector('.cur').dataset.level);
    S.human = Number($('mSideRow').querySelector('.cur').dataset.side);
    el.menuOv.classList.add('hidden');
    restart();
  }
  function openVer() {
    el.verCur.textContent = VERSION;
    el.verList.innerHTML = CHANGELOG.map((c, i) =>
      '<div class="ver-card' + (i === 0 ? ' current' : '') + '"><div class="vh"><span class="vn">v' + c.v + '</span><span class="vt">' + c.t + '</span></div>' +
      c.items.map(x => '<div class="vd">' + x + '</div>').join('') + '</div>').join('');
    el.verOv.classList.remove('hidden');
    localStorage.setItem(SEEN_KEY, VERSION);
    el.verNew.classList.add('hidden');
    Sfx.ui();
  }
  function toggleMute() {
    Sfx.setMuted(!Sfx.muted);
    el.muteBtn.classList.toggle('muted', Sfx.muted);
    el.muteBtn.setAttribute('aria-pressed', String(Sfx.muted));
    if (!Sfx.muted) Sfx.ui();
  }

  function rcAt(x, y) {
    const b = el.canvas.getBoundingClientRect();
    const c = Math.round((x - b.x - off) / cell);
    const r = Math.round((y - b.y - off) / cell);
    if (!E.inBoard(r, c)) return null;
    if (Math.hypot(x - b.x - px(c), y - b.y - py(r)) > cell * .48) return null;
    return { r, c };
  }
  el.canvas.addEventListener('pointerdown', e => {
    Sfx.unlock();
    S.kb = false;
    if (!canPlace()) return;
    const rc = rcAt(e.clientX, e.clientY);
    if (!rc) { S.sel = null; S.targets = []; return; }
    if (S.sel && S.targets.some(m => m.tr === rc.r && m.tc === rc.c)) {
      commit({ fr: S.sel.r, fc: S.sel.c, tr: rc.r, tc: rc.c });
      return;
    }
    const p = S.bd[E.idx(rc.r, rc.c)];
    if (p && E.sideOf(p) === S.cur) {
      S.sel = rc;
      S.targets = E.legalMoves(S.bd, S.cur).filter(m => m.fr === rc.r && m.fc === rc.c);
      Sfx.select();
    } else { S.sel = null; S.targets = []; }
  });
  el.canvas.addEventListener('pointermove', e => { S.hover = rcAt(e.clientX, e.clientY); });
  el.canvas.addEventListener('pointerleave', () => { S.hover = null; });

  document.addEventListener('keydown', e => {
    if (!el.verOv.classList.contains('hidden')) { if (e.key === 'Enter' || e.key === 'Escape') { el.verOv.classList.add('hidden'); e.preventDefault(); } return; }
    if (!el.menuOv.classList.contains('hidden')) {
      if (e.key === 'Enter') { startFromMenu(); e.preventDefault(); }
      else if (e.key === 'Escape' && S.hist.length && !S.over) { el.menuOv.classList.add('hidden'); e.preventDefault(); }
      return;
    }
    if (!el.overOv.classList.contains('hidden')) { if (e.key === 'Enter') { restart(); e.preventDefault(); } return; }
    const k = e.key;
    if (k === 'ArrowUp' || k === 'ArrowDown' || k === 'ArrowLeft' || k === 'ArrowRight') {
      S.kb = true;
      if (k === 'ArrowUp') S.cursor.r = Math.max(0, S.cursor.r - 1);
      if (k === 'ArrowDown') S.cursor.r = Math.min(9, S.cursor.r + 1);
      if (k === 'ArrowLeft') S.cursor.c = Math.max(0, S.cursor.c - 1);
      if (k === 'ArrowRight') S.cursor.c = Math.min(8, S.cursor.c + 1);
      e.preventDefault(); return;
    }
    if (k === 'Enter' || k === ' ') {
      S.kb = true;
      if (!canPlace()) return;
      const rc = S.cursor;
      if (S.sel && S.targets.some(m => m.tr === rc.r && m.tc === rc.c)) commit({ fr: S.sel.r, fc: S.sel.c, tr: rc.r, tc: rc.c });
      else {
        const p = S.bd[E.idx(rc.r, rc.c)];
        if (p && E.sideOf(p) === S.cur) { S.sel = { r: rc.r, c: rc.c }; S.targets = E.legalMoves(S.bd, S.cur).filter(m => m.fr === rc.r && m.fc === rc.c); Sfx.select(); }
      }
      e.preventDefault(); return;
    }
    if (k === 'u' || k === 'U') undo();
    else if (k === 'h' || k === 'H') hint();
    else if (k === 'r' || k === 'R') restart();
    else if (k === 'm' || k === 'M') toggleMute();
    else if (k === 'Escape') openMenu();
  });

  for (const row of [$('modeRow'), $('mModeRow')]) row.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (row.id === 'modeRow') setMode(b.dataset.mode);
    else { syncSeg(row, 'mode', b.dataset.mode); Sfx.ui(); }
  });
  for (const row of [$('levelRow'), $('mLevelRow')]) row.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (row.id === 'levelRow') setLevel(Number(b.dataset.level));
    else { syncSeg(row, 'level', Number(b.dataset.level)); Sfx.ui(); }
  });
  for (const row of [$('sideRow'), $('mSideRow')]) row.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (row.id === 'sideRow') setSide(Number(b.dataset.side));
    else { syncSeg(row, 'side', Number(b.dataset.side)); Sfx.ui(); }
  });
  el.undoBtn.addEventListener('click', undo);
  el.hintBtn.addEventListener('click', hint);
  el.restartBtn.addEventListener('click', () => restart());
  el.menuBtn.addEventListener('click', () => openMenu());
  el.startBtn.addEventListener('click', startFromMenu);
  el.resumeBtn.addEventListener('click', () => { el.menuOv.classList.add('hidden'); Sfx.ui(); });
  el.againBtn.addEventListener('click', () => restart());
  el.overMenuBtn.addEventListener('click', () => { el.overOv.classList.add('hidden'); openMenu(); });
  el.verChip.addEventListener('click', openVer);
  el.verCloseBtn.addEventListener('click', () => el.verOv.classList.add('hidden'));
  el.muteBtn.addEventListener('click', toggleMute);
  window.addEventListener('resize', resize);

  el.muteBtn.classList.toggle('muted', Sfx.muted);
  el.muteBtn.setAttribute('aria-pressed', String(Sfx.muted));
  $('verNum').textContent = VERSION;
  if (localStorage.getItem(SEEN_KEY) !== VERSION) el.verNew.classList.remove('hidden');
  renderStats(); renderTrays(); renderLog(); updateHud();
  resize();
  requestAnimationFrame(loop);
  openMenu(true);

  window.Xiangqi = {
    S, VERSION, stats,
    commit: (fr, fc, tr, tc) => commit({ fr, fc, tr, tc }),
    undo, hint, restart, setMode, setLevel, setSide,
    requestAi: () => { const mv = AI.bestMove(S.bd, S.cur, S.level); if (mv) commit(mv); return mv; },
    setBoard: (bd, cur) => {
      S.token++; S.thinking = false;
      S.bd = bd.slice(); S.cur = cur; S.hist = [];
      S.over = false; S.result = null;
      S.checkSide = E.inCheck(bd, cur) ? cur : 0;
      S.rep = new Map([[posKey(), 1]]); S.noCap = 0;
      S.sel = null; S.targets = []; S.hint = null; S.last = null;
      anims.clear(); particles.length = 0;
      el.overOv.classList.add('hidden');
      renderTrays(); renderLog(); updateHud();
    },
    resize
  };
})();