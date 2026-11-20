(function () {
  const VERSION = '2.0.0';
  const SEEN_KEY = 'whackmoleSeenVersion';
  const CHANGELOG = [
    { v: '2.0.0', d: '2026-11-20', t: '重构 · 霓虹敲击', items: [
      '真实引擎重构：单 rAF 时钟驱动，重开 / 暂停不再泄漏定时器',
      '三档难度：休闲 / 标准 / 大师，各自独立最佳分',
      '新增金鼠与炸弹鼠，连击倍率最高 x5',
      '生命系统：敲中炸弹扣 1 命，归零提前结束',
      '粒子 / 分数飘字 / 震屏 / WebAudio 合成音效全反馈',
      '暂停 / 结算 / 主菜单面板，键盘 1-9 与触控支持',
      '霓虹街机视觉与版本面板，迁移旧版最高分'
    ] },
    { v: '1.0.0', d: '2026-02-28', t: '初版', items: [
      '九洞打地鼠与 30 秒倒计时',
      '三种地鼠类型与本地最高分'
    ] }
  ];
  const DIFFS = {
    casual:   { label: '休闲', dur: 60, spawn: [850, 1250], up: [1100, 1600], max: 2, bomb: 0,    gold: .08, lives: 5 },
    standard: { label: '标准', dur: 60, spawn: [620, 920],  up: [750, 1150],  max: 3, bomb: .12,  gold: .08, lives: 3 },
    master:   { label: '大师', dur: 60, spawn: [400, 650],  up: [520, 820],   max: 4, bomb: .18,  gold: .10, lives: 3 }
  };
  const $ = id => document.getElementById(id);
  const el = {
    score: $('score'), best: $('best'), comboMult: $('comboMult'), comboCount: $('comboCount'),
    comboStat: $('comboStat'), lives: $('lives'), timeFill: $('timeFill'), timeBar: $('timeBar'),
    timeText: $('timeText'), board: $('board'), hammer: $('hammer'), flash: $('flash'), app: $('app'),
    menuOv: $('menuOv'), pauseOv: $('pauseOv'), overOv: $('overOv'), verOv: $('verOv'),
    overTitle: $('overTitle'), overScore: $('overScore'), newRecord: $('newRecord'),
    stHits: $('stHits'), stMiss: $('stMiss'), stCombo: $('stCombo'), stAcc: $('stAcc'),
    verChip: $('verChip'), verNum: $('verNum'), verNew: $('verNew'), verCur: $('verCur'), verList: $('verList'),
    muteBtn: $('muteBtn'), pauseBtn: $('pauseBtn')
  };
  const rand = (a, b) => a + Math.random() * (b - a);
  const finePointer = matchMedia('(hover:hover) and (pointer:fine)');

  const bests = {
    casual: +localStorage.getItem('moleBest_casual') || 0,
    standard: +localStorage.getItem('moleBest_standard') || 0,
    master: +localStorage.getItem('moleBest_master') || 0
  };
  const oldBest = +localStorage.getItem('moleHigh') || 0;
  if (oldBest > 0) {
    if (oldBest > bests.standard) { bests.standard = oldBest; localStorage.setItem('moleBest_standard', oldBest); }
    localStorage.removeItem('moleHigh');
  }

  const G = {
    state: 'menu', diff: 'standard', score: 0, combo: 0, maxCombo: 0, mult: 1,
    hits: 0, misses: 0, escapes: 0, lives: 3, playMs: 0, nextSpawn: 0, lastTick: null,
    holes: Array(9).fill(null)
  };
  const busy = Array(9).fill(0);
  const holeEls = [], moleEls = [];
  for (let i = 0; i < 9; i++) {
    const h = document.createElement('div');
    h.className = 'hole'; h.dataset.i = i;
    h.innerHTML = '<span class="key">' + (i + 1) + '</span><div class="mole"></div>';
    el.board.appendChild(h);
    holeEls.push(h); moleEls.push(h.querySelector('.mole'));
  }

  function moleSVG(type, uid) {
    const g = 'mg' + uid;
    if (type === 'bomb') return '<svg viewBox="0 0 100 100" aria-hidden="true">' +
      '<defs><radialGradient id="' + g + '" cx="35%" cy="30%" r="85%"><stop offset="0%" stop-color="#3b4a63"/><stop offset="55%" stop-color="#141c2e"/><stop offset="100%" stop-color="#05070f"/></radialGradient></defs>' +
      '<path d="M50 22 C50 12 62 10 66 5" fill="none" stroke="#fbbf24" stroke-width="4" stroke-linecap="round"/>' +
      '<g class="spark"><path d="M66 5 l4 -4 M66 5 l6 1 M66 5 l1 6 M66 5 l-5 -3" stroke="#fde047" stroke-width="2.5" stroke-linecap="round" fill="none"/></g>' +
      '<rect x="42" y="18" width="16" height="10" rx="3" fill="#2a3650"/>' +
      '<circle cx="50" cy="60" r="34" fill="url(#' + g + ')" stroke="#ff2d78" stroke-width="2"/>' +
      '<path d="M30 44 a26 26 0 0 1 14 -10" stroke="#8b93a8" stroke-width="4" fill="none" stroke-linecap="round" opacity=".7"/>' +
      '<path d="M50 45 l15 26 h-30 z" fill="#ff2d78"/>' +
      '<rect x="48.4" y="53" width="3.2" height="10" rx="1.6" fill="#05070f"/><circle cx="50" cy="67" r="1.9" fill="#05070f"/></svg>';
    const c = type === 'gold' ? ['#fef9c3', '#fde047', '#f59e0b'] : ['#f59e0b', '#b45309', '#78350f'];
    const belly = type === 'gold' ? '#fffbeb' : '#fde68a';
    return '<svg viewBox="0 0 100 100" aria-hidden="true">' +
      '<defs><radialGradient id="' + g + '" cx="42%" cy="30%" r="85%"><stop offset="0%" stop-color="' + c[0] + '"/><stop offset="60%" stop-color="' + c[1] + '"/><stop offset="100%" stop-color="' + c[2] + '"/></radialGradient></defs>' +
      (type === 'gold' ? '<path d="M32 22 l6 8 6 -11 6 11 6 -8 -2 13 h-20 z" fill="#fde047" stroke="#fff7ed" stroke-width="1.5"/>' : '') +
      '<circle cx="25" cy="38" r="7" fill="' + c[1] + '"/><circle cx="75" cy="38" r="7" fill="' + c[1] + '"/>' +
      '<ellipse cx="50" cy="62" rx="33" ry="30" fill="url(#' + g + ')" stroke="rgba(34,211,238,.35)" stroke-width="1.5"/>' +
      '<ellipse cx="50" cy="76" rx="18" ry="12" fill="' + belly + '" opacity=".92"/>' +
      '<circle cx="38" cy="52" r="6" fill="#fff"/><circle cx="62" cy="52" r="6" fill="#fff"/>' +
      '<circle cx="39" cy="53" r="3" fill="#0b1220"/><circle cx="63" cy="53" r="3" fill="#0b1220"/>' +
      '<circle cx="40" cy="51.4" r="1.2" fill="#22d3ee"/><circle cx="64" cy="51.4" r="1.2" fill="#22d3ee"/>' +
      '<ellipse cx="50" cy="62" rx="5" ry="4" fill="#ff2d78"/>' +
      '<rect x="45" y="67" width="4.5" height="6" rx="1.5" fill="#fff"/><rect x="50.5" y="67" width="4.5" height="6" rx="1.5" fill="#fff"/>' +
      '<path d="M18 60 h10 M18 66 h10 M72 60 h10 M72 66 h10" stroke="#e8ecf6" stroke-width="1.4" opacity=".45" stroke-linecap="round"/>' +
      (type === 'gold' ? '<g class="shine"><path d="M20 28 v8 M16 32 h8 M80 40 v8 M76 44 h8" stroke="#fff7ed" stroke-width="2" stroke-linecap="round"/></g>' : '') +
      '</svg>';
  }

  const cfg = () => DIFFS[G.diff];
  const activeCount = () => G.holes.reduce((n, h) => n + (h ? 1 : 0), 0);

  function retract(i) {
    moleEls[i].className = 'mole';
    G.holes[i] = null;
    busy[i] = G.playMs + 280;
  }
  function clearBoard() {
    for (let i = 0; i < 9; i++) { moleEls[i].className = 'mole'; moleEls[i].innerHTML = ''; G.holes[i] = null; busy[i] = 0; }
  }
  function spawnOne(forceType, forceIdx) {
    if (G.state !== 'playing') return false;
    let idx = forceIdx;
    if (idx == null) {
      const free = [];
      for (let i = 0; i < 9; i++) if (!G.holes[i] && busy[i] <= G.playMs) free.push(i);
      if (!free.length || activeCount() >= cfg().max) return false;
      idx = free[Math.floor(Math.random() * free.length)];
    } else if (G.holes[idx]) return false;
    const c = cfg(), r = Math.random();
    const type = forceType || (r < c.bomb ? 'bomb' : r < c.bomb + c.gold ? 'gold' : 'normal');
    const upMs = rand(c.up[0], c.up[1]) * (type === 'gold' ? .62 : 1);
    moleEls[idx].innerHTML = moleSVG(type, idx);
    moleEls[idx].className = 'mole up';
    G.holes[idx] = { type, downAt: G.playMs + upMs, hit: false };
    Sfx.pop();
    return true;
  }

  function popup(i, text, cls) {
    const p = document.createElement('span');
    p.className = 'pop' + (cls ? ' ' + cls : '');
    p.textContent = text;
    holeEls[i].appendChild(p);
  }
  function burst(i, color) {
    for (let k = 0; k < 7; k++) {
      const s = document.createElement('i');
      s.className = 'star';
      const a = Math.random() * Math.PI * 2, d = 34 + Math.random() * 40;
      s.style.setProperty('--dx', Math.cos(a) * d + 'px');
      s.style.setProperty('--dy', Math.sin(a) * d - 20 + 'px');
      s.style.setProperty('--c', color);
      holeEls[i].appendChild(s);
    }
  }
  function shake() {
    el.app.classList.remove('shake'); void el.app.offsetWidth; el.app.classList.add('shake');
    el.flash.classList.remove('go'); void el.flash.offsetWidth; el.flash.classList.add('go');
  }

  function renderLives() {
    let s = '';
    for (let i = 0; i < cfg().lives; i++) s += '<span class="heart' + (i < G.lives ? '' : ' off') + '">♥</span>';
    el.lives.innerHTML = s;
  }
  function updateHUD() {
    el.score.textContent = G.score;
    el.best.textContent = bests[G.diff];
    el.comboMult.textContent = 'x' + G.mult;
    el.comboCount.textContent = G.combo + ' 连击';
    el.comboStat.classList.toggle('hot', G.combo >= 5);
  }
  function updateTime() {
    const total = cfg().dur * 1000, rem = Math.max(0, total - G.playMs);
    const sec = Math.ceil(rem / 1000);
    el.timeFill.style.width = (rem / total * 100) + '%';
    el.timeText.textContent = sec + 's';
    el.timeBar.classList.toggle('low', sec <= 10);
    if (sec !== G.lastTick) {
      G.lastTick = sec;
      if (sec <= 5 && sec >= 1) Sfx.tick();
    }
  }

  function whack(i) {
    if (G.state !== 'playing') return;
    const h = G.holes[i];
    if (h && !h.hit) {
      h.hit = true; h.downAt = G.playMs + 200;
      moleEls[i].classList.add('bonk');
      if (h.type === 'bomb') {
        G.lives--; G.combo = 0; G.mult = 1;
        renderLives(); updateHUD();
        Sfx.bomb(); shake();
        popup(i, '−1 命', 'bad'); burst(i, '#f43f5e');
        if (G.lives <= 0) { endRound('lives'); return; }
      } else {
        const pts = (h.type === 'gold' ? 50 : 10) * G.mult;
        G.score += pts; G.hits++; G.combo++;
        G.maxCombo = Math.max(G.maxCombo, G.combo);
        G.mult = 1 + Math.min(4, Math.floor(G.combo / 5));
        if (h.type === 'gold') { Sfx.gold(); popup(i, '+' + pts, 'gold'); burst(i, '#fde047'); }
        else { Sfx.hit(G.mult); popup(i, '+' + pts); burst(i, '#a3e635'); }
        updateHUD();
      }
    } else {
      G.misses++; G.combo = 0; G.mult = 1;
      Sfx.miss();
      holeEls[i].classList.add('thump');
      popup(i, '空敲', 'miss');
      updateHUD();
    }
  }

  function step() {
    const total = cfg().dur * 1000;
    if (G.playMs >= total) { endRound('time'); return; }
    updateTime();
    if (G.playMs >= G.nextSpawn) {
      G.nextSpawn = G.playMs + (spawnOne() ? rand(cfg().spawn[0], cfg().spawn[1]) : 120);
    }
    for (let i = 0; i < 9; i++) {
      const h = G.holes[i];
      if (h && G.playMs >= h.downAt) {
        if (!h.hit && h.type !== 'bomb') {
          G.escapes++;
          if (G.combo > 0) { G.combo = 0; G.mult = 1; updateHUD(); }
        }
        retract(i);
      }
    }
  }

  function show(ov, on) { ov.classList.toggle('hidden', !on); }
  function setState(s) { G.state = s; document.body.dataset.state = s; }

  function start() {
    clearBoard();
    G.score = 0; G.combo = 0; G.maxCombo = 0; G.mult = 1;
    G.hits = 0; G.misses = 0; G.escapes = 0;
    G.lives = cfg().lives; G.playMs = 0; G.nextSpawn = 500; G.lastTick = null;
    renderLives(); updateHUD(); updateTime();
    show(el.menuOv, false); show(el.pauseOv, false); show(el.overOv, false);
    setState('playing');
    Sfx.unlock(); Sfx.start();
  }
  function pause() { if (G.state !== 'playing') return; setState('paused'); show(el.pauseOv, true); Sfx.ui(); }
  function resume() { if (G.state !== 'paused') return; show(el.pauseOv, false); setState('playing'); Sfx.ui(); }
  function toMenu() {
    clearBoard(); setState('menu');
    show(el.pauseOv, false); show(el.overOv, false); show(el.menuOv, true);
    refreshMenuBests(); Sfx.ui();
  }
  function endRound(reason) {
    setState('over');
    for (let i = 0; i < 9; i++) if (G.holes[i]) retract(i);
    el.overTitle.textContent = reason === 'lives' ? '生命耗尽' : '时间到';
    el.overScore.textContent = G.score;
    el.stHits.textContent = G.hits;
    el.stMiss.textContent = G.misses;
    el.stCombo.textContent = G.maxCombo;
    const swings = G.hits + G.misses;
    el.stAcc.textContent = (swings ? Math.round(G.hits / swings * 100) : 0) + '%';
    const rec = G.score > bests[G.diff] && G.score > 0;
    if (rec) { bests[G.diff] = G.score; localStorage.setItem('moleBest_' + G.diff, G.score); }
    el.newRecord.classList.toggle('hidden', !rec);
    updateHUD(); refreshMenuBests();
    show(el.overOv, true);
    if (rec) Sfx.record(); else Sfx.over();
  }

  function refreshMenuBests() {
    $('bestCasual').textContent = '最佳 ' + bests.casual;
    $('bestStandard').textContent = '最佳 ' + bests.standard;
    $('bestMaster').textContent = '最佳 ' + bests.master;
  }
  function setDiff(d) {
    G.diff = d;
    document.querySelectorAll('.diff').forEach(b => b.classList.toggle('cur', b.dataset.diff === d));
    updateHUD(); Sfx.ui();
  }
  function toggleMute() {
    Sfx.setMuted(!Sfx.muted);
    el.muteBtn.classList.toggle('muted', Sfx.muted);
    el.muteBtn.setAttribute('aria-pressed', String(Sfx.muted));
    if (!Sfx.muted) Sfx.ui();
  }

  let verOpen = false;
  function refreshVersionUi() {
    el.verNum.textContent = VERSION;
    el.verCur.textContent = VERSION;
    el.verNew.classList.toggle('hidden', localStorage.getItem(SEEN_KEY) === VERSION);
  }
  function renderChangelog() {
    el.verList.innerHTML = CHANGELOG.map((c, i) =>
      '<div class="ver-card' + (i === 0 ? ' current' : '') + '"><div class="vh"><span class="vn">v' + c.v + '</span><span class="vd">' + c.d + '</span></div>' +
      '<div class="vt">' + c.t + '</div><ul class="vt2">' + c.items.map(x => '<li>' + x + '</li>').join('') + '</ul></div>'
    ).join('');
  }
  function openVer() { renderChangelog(); show(el.verOv, true); verOpen = true; localStorage.setItem(SEEN_KEY, VERSION); el.verNew.classList.add('hidden'); Sfx.ui(); }
  function closeVer() { show(el.verOv, false); verOpen = false; Sfx.ui(); }

  el.board.addEventListener('pointerdown', e => {
    const hole = e.target.closest('.hole');
    if (!hole) return;
    whack(+hole.dataset.i);
    if (finePointer.matches) {
      el.hammer.classList.add('swing');
      setTimeout(() => el.hammer.classList.remove('swing'), 110);
    }
  });
  el.board.addEventListener('animationend', e => {
    const t = e.target;
    if (t.classList.contains('pop') || t.classList.contains('star')) t.remove();
    if (t.classList.contains('thump')) t.classList.remove('thump');
  });
  const boardWrap = $('boardWrap');
  boardWrap.addEventListener('mousemove', e => {
    const on = G.state === 'playing' && finePointer.matches;
    el.hammer.classList.toggle('hidden', !on);
    if (on) { el.hammer.style.left = e.clientX + 'px'; el.hammer.style.top = e.clientY + 'px'; }
  });
  boardWrap.addEventListener('mouseleave', () => el.hammer.classList.add('hidden'));

  $('startBtn').addEventListener('click', start);
  $('againBtn').addEventListener('click', start);
  $('pauseRestart').addEventListener('click', start);
  $('resumeBtn').addEventListener('click', resume);
  $('pauseMenu').addEventListener('click', toMenu);
  $('menuBtn').addEventListener('click', toMenu);
  el.pauseBtn.addEventListener('click', () => { if (G.state === 'playing') pause(); else if (G.state === 'paused') resume(); });
  el.muteBtn.addEventListener('click', toggleMute);
  document.querySelectorAll('.diff').forEach(b => b.addEventListener('click', () => setDiff(b.dataset.diff)));
  el.verChip.addEventListener('click', openVer);
  $('verCloseBtn').addEventListener('click', closeVer);
  el.verOv.addEventListener('click', e => { if (e.target === el.verOv) closeVer(); });
  el.pauseOv.addEventListener('click', e => { if (e.target === el.pauseOv) resume(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && G.state === 'playing') pause(); });

  document.addEventListener('keydown', e => {
    if (verOpen) { if (e.key === 'Escape' || e.key === 'Enter') closeVer(); return; }
    if (e.key >= '1' && e.key <= '9') { if (!e.repeat) whack(+e.key - 1); return; }
    if (e.key === ' ' || e.code === 'Space') {
      e.preventDefault();
      if (G.state === 'playing') pause(); else if (G.state === 'paused') resume(); else if (G.state === 'menu') start();
      return;
    }
    if (e.key === 'Enter') {
      if (G.state === 'menu' || G.state === 'over') start(); else if (G.state === 'paused') resume();
      return;
    }
    if (e.key === 'm' || e.key === 'M') { toggleMute(); return; }
    if (e.key === 'Escape') { if (G.state === 'playing') pause(); else if (G.state === 'paused') resume(); }
  });

  let last = performance.now();
  function frame(t) {
    const dt = Math.min(50, t - last);
    last = t;
    if (G.state === 'playing') { G.playMs += dt; step(); }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  el.muteBtn.classList.toggle('muted', Sfx.muted);
  el.muteBtn.setAttribute('aria-pressed', String(Sfx.muted));
  refreshVersionUi(); refreshMenuBests(); updateHUD(); renderLives(); updateTime();

  window.MoleGame = {
    G, DIFFS, VERSION, bests, start, pause, resume, toMenu, setDiff, whack,
    spawn: spawnOne, endRound, toggleMute, activeCount, clearBoard,
    setPlayMs: v => { G.playMs = v; }
  };
})();