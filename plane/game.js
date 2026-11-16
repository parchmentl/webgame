'use strict';
/* 飞机大战 · NEON RAID —— 纵版霓虹射击 */

const W = 420, H = 740;
const DPR = Math.min(window.devicePixelRatio || 1, 2);
const VERSION = '1.0.0';

const DIFFS = {
  casual: { label: '休闲', spawn: 0.8, bspd: 0.75, espd: 0.85, bombs: 3 },
  normal: { label: '标准', spawn: 1.0, bspd: 1.0, espd: 1.0, bombs: 2 },
  hard:   { label: '噩梦', spawn: 1.3, bspd: 1.25, espd: 1.15, bombs: 1 }
};

const $ = id => document.getElementById(id);
const canvas = $('game'), ctx = canvas.getContext('2d');
const stage = $('stage');
const el = {
  score: $('score'), best: $('best'), wave: $('hudWave'),
  lives: $('lives'), weapon: $('weapon'), bombCnt: $('bombCnt'), bombBtn: $('bombBtn'),
  pauseBtn: $('pauseBtn'), muteBtn: $('muteBtn'), banner: $('banner'),
  menu: $('menu'), pauseOv: $('pauseOv'), overOv: $('overOv'),
  menuBest: $('menuBest'), overScore: $('overScore'), overWave: $('overWave'),
  overKills: $('overKills'), overBest: $('overBest'), newRecord: $('newRecord')
};

const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;

/* ================= 音效（WebAudio 合成，无外部资源） ================= */
const Snd = {
  ctx: null, master: null, noise: null,
  muted: localStorage.getItem('planeMuted') === '1',
  ensure() {
    if (!this.ctx) {
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) return false;
      this.ctx = new C();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.5;
      this.master.connect(this.ctx.destination);
      const len = Math.floor(this.ctx.sampleRate * 0.6);
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.noise = buf;
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return true;
  },
  setMuted(m) {
    this.muted = m;
    localStorage.setItem('planeMuted', m ? '1' : '0');
    if (this.master) this.master.gain.value = m ? 0 : 0.5;
  },
  tone(type, f0, f1, dur, vol, delay = 0) {
    if (this.muted || !this.ensure()) return;
    const t = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + dur + 0.03);
  },
  burst(dur, vol, freq, delay = 0) {
    if (this.muted || !this.ensure()) return;
    const t = this.ctx.currentTime + delay;
    const s = this.ctx.createBufferSource(), g = this.ctx.createGain(), f = this.ctx.createBiquadFilter();
    s.buffer = this.noise;
    f.type = 'lowpass'; f.frequency.setValueAtTime(freq, t);
    f.frequency.exponentialRampToValueAtTime(80, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(this.master);
    s.start(t); s.stop(t + dur + 0.03);
  },
  shoot() { this.tone('square', 900, 500, 0.06, 0.04); },
  hit() { this.tone('triangle', 320, 180, 0.05, 0.1); },
  boom() { this.burst(0.3, 0.32, 900); this.tone('sine', 160, 40, 0.3, 0.28); },
  bigBoom() { this.burst(0.7, 0.5, 500); this.tone('sine', 120, 30, 0.7, 0.45); },
  power() { [523, 659, 784, 1046].forEach((f, i) => this.tone('triangle', f, f, 0.09, 0.15, i * 0.07)); },
  hurt() { this.tone('sawtooth', 220, 60, 0.35, 0.28); this.burst(0.25, 0.28, 700); },
  bomb() { this.burst(0.8, 0.5, 300); this.tone('sine', 90, 25, 0.8, 0.45); },
  wave() { this.tone('triangle', 660, 660, 0.1, 0.14); this.tone('triangle', 880, 880, 0.14, 0.14, 0.11); },
  boss() { this.tone('square', 440, 440, 0.18, 0.18); this.tone('square', 330, 330, 0.18, 0.18, 0.22); this.tone('square', 440, 440, 0.22, 0.18, 0.44); },
  over() { [440, 349, 262, 196].forEach((f, i) => this.tone('triangle', f, f * 0.97, 0.22, 0.18, i * 0.18)); }
};

/* ================= 全局状态 ================= */
const G = {
  state: 'menu',
  diff: DIFFS[localStorage.getItem('planeDiff')] ? localStorage.getItem('planeDiff') : 'normal',
  score: 0, best: Number(localStorage.getItem('planeHigh')) || 0, kills: 0,
  wave: 0, waveTime: 0, queue: [], transition: 0,
  lives: 3, bombs: 2, weapon: 1, shield: 0, inv: 0, fireCd: 0,
  shake: 0, flash: 0, flashColor: '255,255,255', time: 0,
  overT: 0, overShown: false,
  player: { x: W / 2, y: H - 90 },
  bullets: [], ebullets: [], enemies: [], powers: [], parts: [], floats: [],
  keys: {}, pointer: { active: false, x: W / 2, y: H - 160 }
};

/* 星空（三层视差） */
const stars = [];
for (let i = 0; i < 90; i++) {
  const layer = i % 3;
  stars.push({ x: rand(0, W), y: rand(0, H), layer, r: [0.8, 1.3, 2][layer], sp: [22, 48, 95][layer] });
}

/* 背景星云渐变（固定坐标，缓存复用） */
canvas.width = W * DPR; canvas.height = H * DPR;
ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
const neb1 = ctx.createRadialGradient(W * 0.2, H * 0.15, 10, W * 0.2, H * 0.15, 320);
neb1.addColorStop(0, 'rgba(34,211,238,0.10)'); neb1.addColorStop(1, 'rgba(34,211,238,0)');
const neb2 = ctx.createRadialGradient(W * 0.85, H * 0.75, 10, W * 0.85, H * 0.75, 340);
neb2.addColorStop(0, 'rgba(255,45,120,0.09)'); neb2.addColorStop(1, 'rgba(255,45,120,0)');

/* ================= 波次与敌机 ================= */
function buildWave(n) {
  const d = DIFFS[G.diff];
  const q = [];
  if (n % 5 === 0) {
    q.push({ t: 1.0, type: 'boss' });
    for (let i = 0; i < 3; i++) q.push({ t: 4 + i * 2.5, type: 'small' });
    return q;
  }
  const count = Math.round(Math.min(8 + n * 2, 30) * d.spawn);
  const gap = Math.max(0.35, 1.1 - n * 0.05);
  let t = 0.8;
  for (let i = 0; i < count; i++) {
    t += gap * rand(0.7, 1.3);
    const r = Math.random();
    const tankP = n >= 3 ? Math.min(0.12 + n * 0.01, 0.25) : 0;
    const midP = n >= 2 ? Math.min(0.25 + n * 0.02, 0.4) : 0;
    q.push({ t, type: r < tankP ? 'tank' : r < tankP + midP ? 'mid' : 'small' });
  }
  return q;
}

function spawnEnemy(type) {
  const d = DIFFS[G.diff];
  const n = G.wave;
  const base = { type, flash: 0, dead: false };
  if (type === 'small') {
    G.enemies.push(Object.assign(base, {
      x: rand(30, W - 30), y: -30, r: 12, hp: 1, maxHp: 1,
      vy: (110 + Math.min(n * 7, 140)) * d.espd,
      sway: rand(0, 6.28), swayAmp: rand(20, 60), score: 100, fireCd: 1e9
    }));
  } else if (type === 'mid') {
    G.enemies.push(Object.assign(base, {
      x: rand(40, W - 40), y: -36, r: 16, hp: 3 + Math.floor(n / 4), maxHp: 3 + Math.floor(n / 4),
      vy: (70 + Math.min(n * 4, 70)) * d.espd,
      sway: rand(0, 6.28), swayAmp: rand(10, 30), score: 300, fireCd: rand(1, 2)
    }));
  } else if (type === 'tank') {
    G.enemies.push(Object.assign(base, {
      x: rand(50, W - 50), y: -44, r: 22, hp: 8 + Math.floor(n / 2), maxHp: 8 + Math.floor(n / 2),
      vy: (42 + Math.min(n * 2, 40)) * d.espd,
      sway: rand(0, 6.28), swayAmp: rand(5, 15), score: 600, fireCd: rand(1.5, 2.5)
    }));
  } else {
    const hp = 60 + n * 12;
    G.enemies.push(Object.assign(base, {
      x: W / 2, y: -70, r: 46, hp, maxHp: hp, vy: 60,
      t: 0, fireT: 1.4, ringT: 3.5, score: 5000
    }));
  }
}

function nextWave() {
  G.wave++;
  G.waveTime = 0;
  G.queue = buildWave(G.wave);
  G.transition = 0;
  const isBoss = G.wave % 5 === 0;
  showBanner(isBoss ? '⚠ BOSS 来袭 ⚠' : `第 ${G.wave} 波`, isBoss);
  if (isBoss) Snd.boss(); else Snd.wave();
  syncHud(true);
}

function showBanner(text, boss) {
  el.banner.textContent = text;
  el.banner.className = boss ? 'boss' : '';
  void el.banner.offsetWidth;
  el.banner.classList.add('show');
}

/* ================= 粒子与浮字 ================= */
function sparks(x, y, n, colors, speed = 160) {
  if (G.parts.length > 420) return;
  for (let i = 0; i < n; i++) {
    const a = rand(0, Math.PI * 2), v = rand(speed * 0.3, speed);
    G.parts.push({
      x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v,
      life: rand(0.3, 0.7), max: 0.7, r: rand(1.5, 3.5),
      color: colors[Math.floor(Math.random() * colors.length)]
    });
  }
}
function explode(x, y, big) {
  sparks(x, y, big ? 46 : 18, ['#fbbf24', '#f43f5e', '#ff2d78', '#ffe4e6'], big ? 300 : 190);
  sparks(x, y, big ? 20 : 8, ['#22d3ee', '#e8ecf6'], big ? 220 : 140);
}
function floatText(x, y, txt, color) {
  G.floats.push({ x, y, txt, color, life: 1.1 });
}

/* ================= 玩家动作 ================= */
function fire() {
  const p = G.player;
  const mk = (x, y, vx, vy) => G.bullets.push({ x, y, vx, vy, r: 3, dmg: 1, dead: false });
  if (G.weapon === 1) mk(p.x, p.y - 18, 0, -640);
  else if (G.weapon === 2) { mk(p.x - 7, p.y - 14, 0, -640); mk(p.x + 7, p.y - 14, 0, -640); }
  else {
    mk(p.x - 7, p.y - 14, 0, -640); mk(p.x + 7, p.y - 14, 0, -640);
    mk(p.x - 14, p.y - 6, -130, -560); mk(p.x + 14, p.y - 6, 130, -560);
  }
  sparks(p.x, p.y - 20, 2, ['#a3e635', '#e8ecf6'], 60);
  Snd.shoot();
}

function useBomb() {
  if (G.state !== 'play' || G.bombs <= 0) return;
  G.bombs--;
  G.flash = 0.5; G.flashColor = '255,255,255'; G.shake = 18;
  Snd.bomb();
  for (const b of G.ebullets) sparks(b.x, b.y, 3, ['#ff2d78', '#fbbf24'], 120);
  G.ebullets.length = 0;
  for (const e of [...G.enemies]) {
    e.hp -= e.type === 'boss' ? 12 : 8;
    e.flash = 0.15;
    if (e.hp <= 0) killEnemy(e);
  }
  G.enemies = G.enemies.filter(e => !e.dead);
  floatText(G.player.x, G.player.y - 50, '💥 炸弹！', '#fbbf24');
  syncHud(true);
}

function hitPlayer() {
  const p = G.player;
  if (G.shield > 0) {
    G.shield = Math.max(0, G.shield - 1.5);
    G.inv = 0.4;
    sparks(p.x, p.y, 12, ['#22d3ee', '#e8ecf6'], 180);
    Snd.hit();
    return;
  }
  G.lives--;
  G.inv = 2;
  G.shake = 12;
  G.flash = 0.3; G.flashColor = '244,63,94';
  explode(p.x, p.y, false);
  Snd.hurt();
  if (G.lives <= 0) gameOver();
  syncHud(true);
}

function applyPower(kind) {
  const p = G.player;
  Snd.power();
  if (kind === 'weapon') {
    if (G.weapon < 3) { G.weapon++; floatText(p.x, p.y - 40, '火力提升！', '#a3e635'); }
    else { G.score += 500; floatText(p.x, p.y - 40, '+500', '#a3e635'); }
  } else if (kind === 'shield') {
    G.shield = 6; floatText(p.x, p.y - 40, '护盾 6s', '#22d3ee');
  } else if (kind === 'bomb') {
    G.bombs = Math.min(G.bombs + 1, 4); floatText(p.x, p.y - 40, '炸弹 +1', '#fbbf24');
  } else {
    G.lives = Math.min(G.lives + 1, 4); floatText(p.x, p.y - 40, '机体 +1', '#f43f5e');
  }
  syncHud(true);
}

function dropPower(x, y) {
  const r = Math.random();
  const kind = r < 0.4 ? 'weapon' : r < 0.65 ? 'shield' : r < 0.85 ? 'bomb' : 'life';
  G.powers.push({ x, y, vy: 95, kind, sway: rand(0, 6.28), dead: false });
}

function killEnemy(e) {
  if (e.dead) return;
  e.dead = true;
  G.kills++;
  G.score += e.score;
  const big = e.type === 'boss';
  explode(e.x, e.y, big || e.type === 'tank');
  floatText(e.x, e.y, '+' + e.score, big ? '#fbbf24' : '#e8ecf6');
  G.shake = Math.max(G.shake, big ? 16 : e.r > 18 ? 7 : 3);
  if (big) {
    Snd.bigBoom();
    G.flash = 0.5; G.flashColor = '255,255,255';
    dropPower(e.x - 30, e.y);
    dropPower(e.x + 30, e.y);
  } else {
    Snd.boom();
    const p = e.type === 'small' ? 0.06 : e.type === 'mid' ? 0.18 : 0.4;
    if (Math.random() < p) dropPower(e.x, e.y);
  }
}

/* ================= 流程控制 ================= */
function startGame() {
  const d = DIFFS[G.diff];
  G.state = 'play';
  G.score = 0; G.kills = 0;
  G.wave = 0; G.waveTime = 0; G.queue = []; G.transition = 0;
  G.lives = 3; G.bombs = d.bombs; G.weapon = 1;
  G.shield = 0; G.inv = 1.5; G.fireCd = 0.3;
  G.shake = 0; G.flash = 0;
  G.overT = 0; G.overShown = false;
  G.player.x = W / 2; G.player.y = H - 90;
  G.bullets.length = 0; G.ebullets.length = 0; G.enemies.length = 0;
  G.powers.length = 0; G.parts.length = 0; G.floats.length = 0;
  G.pointer.active = false;
  el.menu.classList.add('hidden');
  el.pauseOv.classList.add('hidden');
  el.overOv.classList.add('hidden');
  el.pauseBtn.textContent = '⏸';
  Snd.ensure();
  nextWave();
  syncHud(true);
}

function gameOver() {
  G.state = 'over';
  G.overT = 0.9; G.overShown = false;
  explode(G.player.x, G.player.y, true);
  G.shake = 20;
  Snd.over();
  const isRecord = G.score > G.best;
  if (isRecord) {
    G.best = G.score;
    localStorage.setItem('planeHigh', String(G.best));
  }
  el.overScore.textContent = G.score;
  el.overWave.textContent = G.wave;
  el.overKills.textContent = G.kills;
  el.overBest.textContent = G.best;
  el.newRecord.classList.toggle('hidden', !isRecord);
  el.menuBest.textContent = G.best;
  syncHud(true);
}

function togglePause() {
  if (G.state === 'play') {
    G.state = 'pause';
    el.pauseOv.classList.remove('hidden');
    el.pauseBtn.textContent = '▶';
  } else if (G.state === 'pause') {
    G.state = 'play';
    el.pauseOv.classList.add('hidden');
    el.pauseBtn.textContent = '⏸';
  }
}

function toggleMute() {
  Snd.setMuted(!Snd.muted);
  el.muteBtn.textContent = Snd.muted ? '🔇' : '🔊';
  el.muteBtn.classList.toggle('off', Snd.muted);
}

/* ================= 更新 ================= */
function update(dt) {
  G.time += dt;
  const starSp = G.state === 'play' ? 1 : 0.4;
  for (const s of stars) {
    s.y += s.sp * starSp * dt;
    if (s.y > H + 2) { s.y = -2; s.x = rand(0, W); }
  }
  G.shake = Math.max(0, G.shake - dt * 40);
  G.flash = Math.max(0, G.flash - dt * 1.8);

  for (const p of G.parts) {
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.vx *= 1 - 2.5 * dt; p.vy *= 1 - 2.5 * dt;
    p.life -= dt;
  }
  G.parts = G.parts.filter(p => p.life > 0);
  for (const f of G.floats) { f.y -= 40 * dt; f.life -= dt; }
  G.floats = G.floats.filter(f => f.life > 0);

  if (G.state === 'over' && !G.overShown) {
    G.overT -= dt;
    if (G.overT <= 0) { G.overShown = true; el.overOv.classList.remove('hidden'); }
  }
  if (G.state !== 'play') return;

  const d = DIFFS[G.diff];
  const p = G.player;
  G.inv = Math.max(0, G.inv - dt);
  G.shield = Math.max(0, G.shield - dt);

  /* 移动：键盘 + 指针 */
  let kx = 0, ky = 0;
  const k = G.keys;
  if (k['arrowleft'] || k['a']) kx -= 1;
  if (k['arrowright'] || k['d']) kx += 1;
  if (k['arrowup'] || k['w']) ky -= 1;
  if (k['arrowdown'] || k['s']) ky += 1;
  if (kx || ky) {
    const len = Math.hypot(kx, ky);
    p.x += kx / len * 340 * dt;
    p.y += ky / len * 340 * dt;
  }
  if (G.pointer.active) {
    const tx = G.pointer.x, ty = G.pointer.y - 70;
    const f = Math.min(1, dt * 14);
    p.x += (tx - p.x) * f;
    p.y += (ty - p.y) * f;
  }
  p.x = clamp(p.x, 16, W - 16);
  p.y = clamp(p.y, 60, H - 24);

  /* 自动开火 */
  G.fireCd -= dt;
  if (G.fireCd <= 0) { G.fireCd = 0.16; fire(); }

  /* 波次推进 */
  if (G.transition > 0) {
    G.transition -= dt;
    if (G.transition <= 0) nextWave();
  } else {
    G.waveTime += dt;
    while (G.queue.length && G.queue[0].t <= G.waveTime) spawnEnemy(G.queue.shift().type);
  }

  /* 玩家子弹 */
  for (const b of G.bullets) { b.x += b.vx * dt; b.y += b.vy * dt; }
  G.bullets = G.bullets.filter(b => b.y > -20 && b.x > -20 && b.x < W + 20 && !b.dead);

  /* 敌机 */
  for (const e of G.enemies) {
    e.flash = Math.max(0, e.flash - dt);
    if (e.type === 'boss') {
      e.t += dt;
      if (e.y < 110) e.y += e.vy * dt;
      else e.x = W / 2 + Math.sin(e.t * 0.7) * (W / 2 - 70);
      e.fireT -= dt;
      if (e.y >= 100 && e.fireT <= 0) {
        e.fireT = 1.4;
        const base = Math.atan2(p.y - e.y, p.x - e.x);
        for (let i = -2; i <= 2; i++) {
          const a = base + i * 0.22, sp = 210 * d.bspd;
          G.ebullets.push({ x: e.x, y: e.y + 30, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: 5 });
        }
        Snd.hit();
      }
      if (e.hp < e.maxHp * 0.5) {
        e.ringT -= dt;
        if (e.ringT <= 0) {
          e.ringT = 3.5;
          for (let i = 0; i < 16; i++) {
            const a = i / 16 * Math.PI * 2 + e.t, sp = 150 * d.bspd;
            G.ebullets.push({ x: e.x, y: e.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: 4 });
          }
        }
      }
    } else {
      e.y += e.vy * dt;
      e.x += Math.sin(G.time * 2 + e.sway) * e.swayAmp * dt;
      e.x = clamp(e.x, e.r, W - e.r);
      if (e.type !== 'small' && e.y > 20 && e.y < H * 0.7) {
        e.fireCd -= dt;
        if (e.fireCd <= 0) {
          e.fireCd = e.type === 'mid' ? rand(1.6, 2.4) : rand(2, 2.8);
          const a = Math.atan2(p.y - e.y, p.x - e.x);
          const sp = (e.type === 'mid' ? 190 : 160) * d.bspd;
          const shots = e.type === 'tank' ? [-0.3, 0, 0.3] : [0];
          for (const off of shots) {
            G.ebullets.push({ x: e.x, y: e.y + e.r * 0.6, vx: Math.cos(a + off) * sp, vy: Math.sin(a + off) * sp, r: 4 });
          }
        }
      }
    }
  }
  G.enemies = G.enemies.filter(e => !e.dead && e.y < H + 60);

  /* 敌弹 */
  for (const b of G.ebullets) { b.x += b.vx * dt; b.y += b.vy * dt; }
  G.ebullets = G.ebullets.filter(b => b.x > -20 && b.x < W + 20 && b.y > -20 && b.y < H + 20);

  /* 道具 */
  for (const pw of G.powers) { pw.y += pw.vy * dt; pw.x += Math.sin(G.time * 3 + pw.sway) * 30 * dt; }
  G.powers = G.powers.filter(pw => !pw.dead && pw.y < H + 30);

  /* 碰撞：玩家子弹 × 敌机 */
  for (const b of G.bullets) {
    for (const e of G.enemies) {
      if (e.dead) continue;
      const dx = b.x - e.x, dy = b.y - e.y;
      if (dx * dx + dy * dy < (e.r + b.r) * (e.r + b.r)) {
        b.dead = true;
        e.hp -= b.dmg;
        e.flash = 0.08;
        sparks(b.x, b.y, 3, ['#a3e635', '#e8ecf6'], 100);
        Snd.hit();
        if (e.hp <= 0) killEnemy(e);
        break;
      }
    }
  }
  G.bullets = G.bullets.filter(b => !b.dead);
  G.enemies = G.enemies.filter(e => !e.dead);

  /* 碰撞：敌弹 / 敌机 × 玩家 */
  if (G.inv <= 0) {
    for (const b of G.ebullets) {
      const dx = b.x - p.x, dy = b.y - p.y;
      if (dx * dx + dy * dy < (12 + b.r) * (12 + b.r)) {
        b.y = H + 999;
        hitPlayer();
        break;
      }
    }
  }
  if (G.inv <= 0 && G.state === 'play') {
    for (const e of G.enemies) {
      const dx = e.x - p.x, dy = e.y - p.y;
      if (dx * dx + dy * dy < (e.r + 12) * (e.r + 12)) {
        e.hp -= 3; e.flash = 0.1;
        if (e.hp <= 0) killEnemy(e);
        hitPlayer();
        break;
      }
    }
    G.enemies = G.enemies.filter(e => !e.dead);
  }
  G.ebullets = G.ebullets.filter(b => b.y < H + 50);

  /* 碰撞：道具 × 玩家 */
  for (const pw of G.powers) {
    const dx = pw.x - p.x, dy = pw.y - p.y;
    if (dx * dx + dy * dy < 28 * 28) { pw.dead = true; applyPower(pw.kind); }
  }
  G.powers = G.powers.filter(pw => !pw.dead);

  /* 波次清空判定 */
  if (G.state === 'play' && G.transition <= 0 && !G.queue.length && !G.enemies.length) {
    const bonus = 200 + G.wave * 100;
    G.score += bonus;
    floatText(W / 2, H * 0.4, `波次奖励 +${bonus}`, '#fbbf24');
    G.transition = 2.0;
    Snd.wave();
  }

  syncHud(false);
}

/* ================= HUD 同步（带缓存） ================= */
const hudCache = {};
function setText(node, key, val) {
  if (hudCache[key] !== val) { hudCache[key] = val; node.textContent = val; }
}
function syncHud(force) {
  setText(el.score, 'score', String(G.score));
  setText(el.best, 'best', String(Math.max(G.best, G.score)));
  const bossWave = G.wave > 0 && G.wave % 5 === 0 && G.enemies.some(e => e.type === 'boss');
  setText(el.wave, 'wave', G.wave === 0 ? '准备' : bossWave ? 'BOSS 战' : `第 ${G.wave} 波`);
  const hearts = '❤️'.repeat(Math.max(0, G.lives));
  if (force || hudCache.lives !== hearts) { hudCache.lives = hearts; el.lives.textContent = hearts || '💀'; }
  const pips = el.weapon.children;
  for (let i = 0; i < 3; i++) pips[i].classList.toggle('on', i < G.weapon);
  setText(el.bombCnt, 'bombs', '×' + G.bombs);
  el.bombBtn.disabled = G.bombs <= 0 || G.state !== 'play';
}

/* ================= 绘制 ================= */
function drawPlayer() {
  const p = G.player;
  if (G.inv > 0 && Math.floor(G.time * 12) % 2 === 0 && G.state === 'play') return;
  ctx.save();
  ctx.translate(p.x, p.y);
  /* 尾焰 */
  const fl = 14 + Math.sin(G.time * 40) * 4;
  const fg = ctx.createLinearGradient(0, 14, 0, 14 + fl);
  fg.addColorStop(0, 'rgba(34,211,238,0.9)');
  fg.addColorStop(1, 'rgba(34,211,238,0)');
  ctx.fillStyle = fg;
  ctx.beginPath();
  ctx.moveTo(-5, 14); ctx.lineTo(5, 14); ctx.lineTo(0, 14 + fl);
  ctx.closePath(); ctx.fill();
  /* 机身 */
  ctx.shadowColor = 'rgba(34,211,238,0.8)'; ctx.shadowBlur = 14;
  ctx.fillStyle = '#67e8f9';
  ctx.beginPath();
  ctx.moveTo(0, -20);
  ctx.lineTo(6, -4); ctx.lineTo(18, 10); ctx.lineTo(18, 15); ctx.lineTo(7, 11);
  ctx.lineTo(5, 16); ctx.lineTo(-5, 16); ctx.lineTo(-7, 11); ctx.lineTo(-18, 15);
  ctx.lineTo(-18, 10); ctx.lineTo(-6, -4);
  ctx.closePath(); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#0e7490';
  ctx.beginPath();
  ctx.moveTo(0, -14); ctx.lineTo(3, -2); ctx.lineTo(0, 6); ctx.lineTo(-3, -2);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#e8ecf6';
  ctx.beginPath(); ctx.arc(0, -6, 2.4, 0, Math.PI * 2); ctx.fill();
  /* 护盾 */
  if (G.shield > 0) {
    ctx.strokeStyle = `rgba(34,211,238,${0.5 + 0.3 * Math.sin(G.time * 8)})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 26, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (G.shield / 6));
    ctx.stroke();
  }
  ctx.restore();
}

function drawEnemy(e) {
  ctx.save();
  ctx.translate(e.x, e.y);
  const flash = e.flash > 0;
  if (e.type === 'small') {
    ctx.shadowColor = 'rgba(255,45,120,0.7)'; ctx.shadowBlur = 10;
    ctx.fillStyle = flash ? '#ffffff' : '#ff2d78';
    ctx.beginPath();
    ctx.moveTo(0, 13); ctx.lineTo(11, -8); ctx.lineTo(4, -4); ctx.lineTo(0, -11);
    ctx.lineTo(-4, -4); ctx.lineTo(-11, -8);
    ctx.closePath(); ctx.fill();
  } else if (e.type === 'mid') {
    ctx.shadowColor = 'rgba(244,63,94,0.7)'; ctx.shadowBlur = 12;
    ctx.fillStyle = flash ? '#ffffff' : '#f43f5e';
    ctx.beginPath();
    ctx.moveTo(0, 17); ctx.lineTo(16, 2); ctx.lineTo(16, -8); ctx.lineTo(6, -6);
    ctx.lineTo(0, -15); ctx.lineTo(-6, -6); ctx.lineTo(-16, -8); ctx.lineTo(-16, 2);
    ctx.closePath(); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath(); ctx.arc(0, 0, 3.5, 0, Math.PI * 2); ctx.fill();
  } else if (e.type === 'tank') {
    ctx.shadowColor = 'rgba(251,191,36,0.7)'; ctx.shadowBlur = 14;
    ctx.fillStyle = flash ? '#ffffff' : '#fb923c';
    ctx.beginPath();
    ctx.moveTo(0, 22); ctx.lineTo(20, 10); ctx.lineTo(24, -6); ctx.lineTo(12, -16);
    ctx.lineTo(-12, -16); ctx.lineTo(-24, -6); ctx.lineTo(-20, 10);
    ctx.closePath(); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#7c2d12';
    ctx.fillRect(-8, -8, 16, 14);
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath(); ctx.arc(0, 4, 4.5, 0, Math.PI * 2); ctx.fill();
  } else {
    /* BOSS */
    ctx.shadowColor = 'rgba(244,63,94,0.9)'; ctx.shadowBlur = 22;
    ctx.fillStyle = flash ? '#ffffff' : '#be123c';
    ctx.beginPath();
    ctx.moveTo(0, 46); ctx.lineTo(20, 24); ctx.lineTo(46, 16); ctx.lineTo(46, -6);
    ctx.lineTo(24, -14); ctx.lineTo(12, -38); ctx.lineTo(-12, -38); ctx.lineTo(-24, -14);
    ctx.lineTo(-46, -6); ctx.lineTo(-46, 16); ctx.lineTo(-20, 24);
    ctx.closePath(); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = flash ? '#ffffff' : '#f43f5e';
    ctx.fillRect(-30, -4, 60, 10);
    const core = 6 + Math.sin(G.time * 6) * 2;
    ctx.fillStyle = '#fbbf24';
    ctx.shadowColor = 'rgba(251,191,36,1)'; ctx.shadowBlur = 16;
    ctx.beginPath(); ctx.arc(0, 8, core, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    /* 血条 */
    ctx.fillStyle = 'rgba(5,7,15,0.8)';
    ctx.fillRect(-46, -54, 92, 7);
    ctx.fillStyle = '#f43f5e';
    ctx.fillRect(-45, -53, 90 * Math.max(0, e.hp / e.maxHp), 5);
    ctx.strokeStyle = 'rgba(244,63,94,0.6)'; ctx.lineWidth = 1;
    ctx.strokeRect(-46, -54, 92, 7);
  }
  ctx.restore();
}

const POWER_STYLE = {
  weapon: { c: '#a3e635', g: '▲' },
  shield: { c: '#22d3ee', g: '◆' },
  bomb:   { c: '#fbbf24', g: '●' },
  life:   { c: '#f43f5e', g: '♥' }
};

function rrect(c, x, y, w, h, r) {
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

function draw() {
  ctx.save();
  if (G.shake > 0) ctx.translate(rand(-G.shake, G.shake) * 0.5, rand(-G.shake, G.shake) * 0.5);

  /* 背景 */
  ctx.fillStyle = '#04060d';
  ctx.fillRect(-20, -20, W + 40, H + 40);
  ctx.fillStyle = neb1; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = neb2; ctx.fillRect(0, 0, W, H);
  for (const s of stars) {
    ctx.globalAlpha = [0.35, 0.55, 0.9][s.layer];
    ctx.fillStyle = s.layer === 2 ? '#a5f3fc' : '#e8ecf6';
    ctx.fillRect(s.x, s.y, s.r, s.r * (s.layer === 2 ? 2.2 : 1));
  }
  ctx.globalAlpha = 1;

  /* 道具 */
  for (const pw of G.powers) {
    const st = POWER_STYLE[pw.kind];
    ctx.save();
    ctx.translate(pw.x, pw.y);
    ctx.rotate(Math.sin(G.time * 3 + pw.sway) * 0.2);
    ctx.shadowColor = st.c; ctx.shadowBlur = 14;
    ctx.fillStyle = 'rgba(5,7,15,0.85)';
    ctx.strokeStyle = st.c; ctx.lineWidth = 2;
    ctx.beginPath();
    rrect(ctx, -12, -12, 24, 24, 7);
    ctx.fill(); ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = st.c;
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(st.g, 0, 1);
    ctx.restore();
  }

  /* 敌弹 */
  for (const b of G.ebullets) {
    ctx.shadowColor = 'rgba(255,45,120,0.9)'; ctx.shadowBlur = 10;
    ctx.fillStyle = '#ff2d78';
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffe4e6';
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r * 0.45, 0, Math.PI * 2); ctx.fill();
  }

  /* 敌机 */
  for (const e of G.enemies) drawEnemy(e);

  /* 玩家子弹 */
  for (const b of G.bullets) {
    ctx.shadowColor = 'rgba(163,230,53,0.9)'; ctx.shadowBlur = 8;
    ctx.fillStyle = '#a3e635';
    ctx.fillRect(b.x - 1.5, b.y - 7, 3, 12);
    ctx.shadowBlur = 0;
  }

  /* 玩家 */
  if (G.state !== 'over' || G.overT > 0.6) drawPlayer();

  /* 粒子（叠加发光） */
  ctx.globalCompositeOperation = 'lighter';
  for (const p of G.parts) {
    ctx.globalAlpha = Math.max(0, p.life / p.max);
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';

  /* 浮字 */
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = 'bold 15px "Segoe UI","PingFang SC","Microsoft YaHei",sans-serif';
  for (const f of G.floats) {
    ctx.globalAlpha = Math.min(1, f.life);
    ctx.fillStyle = f.color;
    ctx.fillText(f.txt, f.x, f.y);
  }
  ctx.globalAlpha = 1;

  /* 全屏闪光 */
  if (G.flash > 0) {
    ctx.fillStyle = `rgba(${G.flashColor},${G.flash * 0.6})`;
    ctx.fillRect(-20, -20, W + 40, H + 40);
  }
  ctx.restore();
}

/* ================= 输入 ================= */
const MOVE_KEYS = ['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '];
document.addEventListener('keydown', e => {
  const key = e.key.toLowerCase();
  if (MOVE_KEYS.includes(key) || key === 'enter') e.preventDefault();
  Snd.ensure();
  G.keys[key] = true;
  if (e.repeat) return;
  if (key === 'p') togglePause();
  else if (key === 'm') toggleMute();
  else if (key === 'b' || key === 'x') useBomb();
  else if (key === 'enter' || key === ' ') {
    if (G.state === 'menu' || G.state === 'over') startGame();
    else if (G.state === 'pause') togglePause();
  }
});
document.addEventListener('keyup', e => { G.keys[e.key.toLowerCase()] = false; });

function pointerPos(e) {
  const r = canvas.getBoundingClientRect();
  return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H };
}
canvas.addEventListener('pointerdown', e => {
  Snd.ensure();
  if (G.state !== 'play') return;
  G.pointer.active = true;
  const pos = pointerPos(e);
  G.pointer.x = pos.x; G.pointer.y = pos.y;
  try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* 合成指针无活跃 id */ }
  e.preventDefault();
});
canvas.addEventListener('pointermove', e => {
  if (!G.pointer.active) return;
  const pos = pointerPos(e);
  G.pointer.x = pos.x; G.pointer.y = pos.y;
});
const endPointer = () => { G.pointer.active = false; };
canvas.addEventListener('pointerup', endPointer);
canvas.addEventListener('pointercancel', endPointer);

/* ================= 按钮 ================= */
$('startBtn').addEventListener('click', startGame);
$('retryBtn').addEventListener('click', startGame);
$('pauseRestartBtn').addEventListener('click', startGame);
$('resumeBtn').addEventListener('click', togglePause);
el.pauseBtn.addEventListener('click', () => { if (G.state === 'play' || G.state === 'pause') togglePause(); });
el.muteBtn.addEventListener('click', toggleMute);
el.bombBtn.addEventListener('click', useBomb);
document.querySelectorAll('.diff-btn').forEach(btn => {
  if (btn.dataset.diff === G.diff) {
    document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('sel'));
    btn.classList.add('sel');
  }
  btn.addEventListener('click', () => {
    G.diff = btn.dataset.diff;
    localStorage.setItem('planeDiff', G.diff);
    document.querySelectorAll('.diff-btn').forEach(b => b.classList.toggle('sel', b === btn));
    Snd.ensure(); Snd.hit();
  });
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden && G.state === 'play') togglePause();
});
window.addEventListener('blur', () => { if (G.state === 'play') togglePause(); });

/* ================= 尺寸适配 ================= */
function resize() {
  const r = stage.getBoundingClientRect();
  const scale = Math.min(r.width / W, r.height / H);
  canvas.style.width = Math.floor(W * scale) + 'px';
  canvas.style.height = Math.floor(H * scale) + 'px';
}
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', resize);

/* ================= 主循环（单实例） ================= */
let last = performance.now();
function frame(now) {
  const dt = Math.min((now - last) / 1000, 0.033);
  last = now;
  update(dt);
  draw();
  requestAnimationFrame(frame);
}

/* ================= 启动 ================= */
el.muteBtn.textContent = Snd.muted ? '🔇' : '🔊';
el.muteBtn.classList.toggle('off', Snd.muted);
el.menuBest.textContent = G.best;
el.best.textContent = G.best;
syncHud(true);
resize();
requestAnimationFrame(frame);