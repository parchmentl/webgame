'use strict';
/* 俄罗斯方块 · 规则引擎（无 DOM 依赖） */

const COLS = 10, ROWS = 22, HIDDEN = 2;

const PIECES = {
  I: { color: '#22d3ee', box: 4, cells: [[0, 1], [1, 1], [2, 1], [3, 1]] },
  J: { color: '#3b82f6', box: 3, cells: [[0, 0], [0, 1], [1, 1], [2, 1]] },
  L: { color: '#fb923c', box: 3, cells: [[2, 0], [0, 1], [1, 1], [2, 1]] },
  O: { color: '#fbbf24', box: 2, cells: [[0, 0], [1, 0], [0, 1], [1, 1]] },
  S: { color: '#a3e635', box: 3, cells: [[1, 0], [2, 0], [0, 1], [1, 1]] },
  T: { color: '#ff2d78', box: 3, cells: [[1, 0], [0, 1], [1, 1], [2, 1]] },
  Z: { color: '#f43f5e', box: 3, cells: [[0, 0], [1, 0], [1, 1], [2, 1]] }
};
const TYPES = Object.keys(PIECES);

/* 预计算四向旋转坐标 */
const ROT = {};
for (const t of TYPES) {
  const n = PIECES[t].box;
  let cur = PIECES[t].cells.map(([x, y]) => [x, y]);
  ROT[t] = [cur];
  for (let r = 1; r < 4; r++) {
    cur = cur.map(([x, y]) => [n - 1 - y, x]);
    ROT[t].push(cur);
  }
}

/* SRS 踢墙表（y 向下为正） */
const KICKS_JLSTZ = {
  '0>1': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  '1>0': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
  '1>2': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
  '2>1': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  '2>3': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  '3>2': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  '3>0': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  '0>3': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]]
};
const KICKS_I = {
  '0>1': [[0, 0], [-2, 0], [1, 0], [-2, 1], [1, -2]],
  '1>0': [[0, 0], [2, 0], [-1, 0], [2, -1], [-1, 2]],
  '1>2': [[0, 0], [-1, 0], [2, 0], [-1, -2], [2, 1]],
  '2>1': [[0, 0], [1, 0], [-2, 0], [1, 2], [-2, -1]],
  '2>3': [[0, 0], [2, 0], [-1, 0], [2, -1], [-1, 2]],
  '3>2': [[0, 0], [-2, 0], [1, 0], [-2, 1], [1, -2]],
  '3>0': [[0, 0], [1, 0], [-2, 0], [1, 2], [-2, -1]],
  '0>3': [[0, 0], [-1, 0], [2, 0], [-1, -2], [2, 1]]
};

const LINE_SCORE = [0, 100, 300, 500, 800];
const TSPIN_SCORE = [400, 800, 1200, 1600];
const MINI_SCORE = [100, 200, 400, 400];
const LOCK_DELAY = 0.5, LOCK_RESET_MAX = 15, CLEAR_TIME = 0.24;

function gravitySec(level) {
  return Math.max(0.02, Math.pow(0.8 - (level - 1) * 0.007, level - 1));
}

class TetrisCore {
  constructor() { this.onEvent = () => {}; this.reset(); }

  reset() {
    this.grid = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    this.bag = [];
    this.queue = [];
    while (this.queue.length < 5) this.queue.push(this.draw());
    this.hold = null; this.holdUsed = false;
    this.score = 0; this.lines = 0; this.level = 1;
    this.combo = -1; this.b2b = false;
    this.state = 'play';
    this.gravAcc = 0; this.lockT = 0; this.lockResets = 0;
    this.clearRows = []; this.clearT = 0;
    this.lastRotate = false; this.lastKick = 0;
    this.cur = null;
    this.spawn();
  }

  draw() {
    if (!this.bag.length) {
      this.bag = TYPES.slice();
      for (let i = this.bag.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [this.bag[i], this.bag[j]] = [this.bag[j], this.bag[i]];
      }
    }
    return this.bag.pop();
  }

  spawn() {
    const type = this.queue.shift();
    this.queue.push(this.draw());
    this.cur = { type, rot: 0, x: type === 'O' ? 4 : 3, y: 1 };
    this.gravAcc = 0; this.lockT = 0; this.lockResets = 0;
    this.lastRotate = false; this.lastKick = 0;
    if (!this.fits(this.cur.x, this.cur.y, this.cur.rot)) {
      this.state = 'over';
      this.onEvent('over', {});
    }
  }

  cells(p = this.cur) { return ROT[p.type][p.rot]; }

  fits(x, y, rot) {
    for (const [cx, cy] of ROT[this.cur.type][rot]) {
      const gx = x + cx, gy = y + cy;
      if (gx < 0 || gx >= COLS || gy >= ROWS) return false;
      if (gy >= 0 && this.grid[gy][gx]) return false;
    }
    return true;
  }

  grounded() { return !this.fits(this.cur.x, this.cur.y + 1, this.cur.rot); }

  ghostY() {
    let y = this.cur.y;
    while (this.fits(this.cur.x, y + 1, this.cur.rot)) y++;
    return y;
  }

  touchLock() {
    if (this.grounded() && this.lockResets < LOCK_RESET_MAX) {
      this.lockT = 0; this.lockResets++;
    }
  }

  move(dx) {
    if (this.state !== 'play') return false;
    if (!this.fits(this.cur.x + dx, this.cur.y, this.cur.rot)) return false;
    this.cur.x += dx;
    this.lastRotate = false;
    this.touchLock();
    this.onEvent('move', {});
    return true;
  }

  rotate(dir) {
    if (this.state !== 'play') return false;
    const from = this.cur.rot, to = (from + dir + 4) % 4;
    const table = this.cur.type === 'I' ? KICKS_I : this.cur.type === 'O' ? { [from + '>' + to]: [[0, 0]] } : KICKS_JLSTZ;
    const kicks = table[from + '>' + to] || [[0, 0]];
    for (let i = 0; i < kicks.length; i++) {
      const [kx, ky] = kicks[i];
      if (this.fits(this.cur.x + kx, this.cur.y + ky, to)) {
        this.cur.x += kx; this.cur.y += ky; this.cur.rot = to;
        this.lastRotate = true; this.lastKick = i;
        this.touchLock();
        this.onEvent('rotate', {});
        return true;
      }
    }
    return false;
  }

  softDrop() {
    if (this.state !== 'play') return false;
    if (!this.fits(this.cur.x, this.cur.y + 1, this.cur.rot)) return false;
    this.cur.y++;
    this.score += 1;
    this.gravAcc = 0;
    return true;
  }

  hardDrop() {
    if (this.state !== 'play') return;
    const gy = this.ghostY();
    const dist = gy - this.cur.y;
    this.cur.y = gy;
    this.score += dist * 2;
    this.onEvent('hard', { dist });
    this.lock();
  }

  holdSwap() {
    if (this.state !== 'play' || this.holdUsed) return;
    const t = this.cur.type;
    if (this.hold) {
      this.cur = { type: this.hold, rot: 0, x: this.hold === 'O' ? 4 : 3, y: 1 };
      this.gravAcc = 0; this.lockT = 0; this.lockResets = 0;
      this.lastRotate = false;
      if (!this.fits(this.cur.x, this.cur.y, this.cur.rot)) {
        this.state = 'over'; this.onEvent('over', {});
      }
    } else {
      this.spawn();
    }
    this.hold = t;
    this.holdUsed = true;
    this.onEvent('hold', {});
  }

  tick(dt) {
    if (this.state === 'clearing') {
      this.clearT -= dt;
      if (this.clearT <= 0) this.collapse();
      return;
    }
    if (this.state !== 'play') return;
    const interval = gravitySec(this.level);
    this.gravAcc += dt;
    while (this.gravAcc >= interval) {
      this.gravAcc -= interval;
      if (this.fits(this.cur.x, this.cur.y + 1, this.cur.rot)) {
        this.cur.y++;
      } else break;
    }
    if (this.grounded()) {
      this.lockT += dt;
      if (this.lockT >= LOCK_DELAY) this.lock();
    } else this.lockT = 0;
  }

  tspin() {
    if (this.cur.type !== 'T' || !this.lastRotate) return null;
    const x = this.cur.x, y = this.cur.y;
    const filled = (gx, gy) => gx < 0 || gx >= COLS || gy >= ROWS || (gy >= 0 && !!this.grid[gy][gx]);
    const c = [filled(x, y), filled(x + 2, y), filled(x, y + 2), filled(x + 2, y + 2)];
    if (c.filter(Boolean).length < 3) return null;
    const front = [[0, 1], [1, 3], [2, 3], [0, 2]][this.cur.rot];
    return (c[front[0]] && c[front[1]]) ? 'full' : 'mini';
  }

  lock() {
    const spin = this.tspin();
    let lockOut = true;
    for (const [cx, cy] of this.cells()) {
      const gy = this.cur.y + cy;
      if (gy >= HIDDEN) lockOut = false;
      if (gy >= 0) this.grid[gy][this.cur.x + cx] = this.cur.type;
    }
    const rows = [];
    for (let y = 0; y < ROWS; y++) if (this.grid[y].every(c => c)) rows.push(y);
    const n = rows.length;
    this.holdUsed = false;

    if (lockOut) {
      this.state = 'over'; this.onEvent('over', {}); return;
    }

    if (n) {
      const difficult = n === 4 || !!spin;
      let base = spin === 'full' ? TSPIN_SCORE[n] : spin === 'mini' ? MINI_SCORE[n] : LINE_SCORE[n];
      let b2bApplied = false;
      if (difficult && this.b2b) { base = Math.floor(base * 1.5); b2bApplied = true; }
      if (n > 0) this.b2b = difficult;
      this.combo++;
      let gain = base * this.level;
      if (this.combo > 0) gain += 50 * this.combo * this.level;
      this.score += gain;
      this.lines += n;
      const newLevel = 1 + Math.floor(this.lines / 10);
      const leveled = newLevel > this.level;
      this.level = newLevel;
      this.clearRows = rows; this.clearT = CLEAR_TIME;
      this.state = 'clearing';
      this.onEvent('clear', { rows, n, spin, b2bApplied, combo: this.combo, gain, leveled });
    } else {
      this.combo = -1;
      if (spin) {
        const gain = (spin === 'full' ? TSPIN_SCORE[0] : MINI_SCORE[0]) * this.level;
        this.score += gain;
        this.onEvent('spin', { spin, gain });
      }
      this.onEvent('lock', {});
      this.spawn();
    }
  }

  collapse() {
    for (const y of this.clearRows) {
      this.grid.splice(y, 1);
      this.grid.unshift(Array(COLS).fill(null));
    }
    const pc = this.grid.every(row => row.every(c => !c));
    if (pc) {
      const gain = 1000 * this.level;
      this.score += gain;
      this.onEvent('pc', { gain });
    }
    this.clearRows = [];
    this.state = 'play';
    this.spawn();
  }
}