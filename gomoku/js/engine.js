(function () {
  const SIZE = 15;
  const DIRS = [[1, 0], [0, 1], [1, 1], [1, -1]];
  const LEVELS = [
    { id: 1, name: '菜鸟', desc: '随性落子 · 常露破绽' },
    { id: 2, name: '入门', desc: '顾及防守 · 偶有疏漏' },
    { id: 3, name: '进阶', desc: '攻防兼备 · 识别双威胁' },
    { id: 4, name: '高手', desc: '两步推算 · 稳扎稳打' },
    { id: 5, name: '大师', desc: '四层深算 · 连续威胁杀' }
  ];
  const createBoard = () => Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
  const inside = (r, c) => r >= 0 && r < SIZE && c >= 0 && c < SIZE;

  function run(bd, r, c, dr, dc, who) {
    let n = 0, rr = r + dr, cc = c + dc;
    while (inside(rr, cc) && bd[rr][cc] === who) { n++; rr += dr; cc += dc; }
    return { n, endR: rr, endC: cc };
  }
  function winLine(bd, r, c, who) {
    for (const [dr, dc] of DIRS) {
      const a = run(bd, r, c, dr, dc, who), b = run(bd, r, c, -dr, -dc, who);
      if (a.n + b.n + 1 >= 5) {
        const cells = [[r, c]];
        for (let i = 1; i <= a.n; i++) cells.push([r + dr * i, c + dc * i]);
        for (let i = 1; i <= b.n; i++) cells.push([r - dr * i, c - dc * i]);
        return cells;
      }
    }
    return null;
  }
  function pointScore(bd, r, c, who) {
    let total = 0, fours = 0, threes = 0;
    for (const [dr, dc] of DIRS) {
      const a = run(bd, r, c, dr, dc, who), b = run(bd, r, c, -dr, -dc, who);
      const n = a.n + b.n + 1;
      if (n >= 5) { total += 1e7; fours++; continue; }
      const open = (inside(a.endR, a.endC) && bd[a.endR][a.endC] === 0 ? 1 : 0) +
                   (inside(b.endR, b.endC) && bd[b.endR][b.endC] === 0 ? 1 : 0);
      if (n === 4) { if (open === 2) { total += 1e6; fours++; } else if (open === 1) { total += 1e5; fours++; } }
      else if (n === 3) { if (open === 2) { total += 5e4; threes++; } else if (open === 1) total += 5e3; }
      else if (n === 2) { if (open === 2) total += 2e3; else if (open === 1) total += 300; }
      else { if (open === 2) total += 100; else if (open === 1) total += 20; }
    }
    if (fours >= 2 || (fours >= 1 && threes >= 1)) total += 8e5;
    else if (threes >= 2) total += 1.2e5;
    return total;
  }
  const RUN_W = { 1: [0, 20, 100], 2: [0, 300, 2e3], 3: [0, 5e3, 5e4], 4: [0, 1e5, 1e6] };
  function evaluateBoard(bd, persp) {
    const score = [0, 0, 0];
    const lines = [];
    for (let i = 0; i < SIZE; i++) {
      lines.push([i, 0, 0, 1], [0, i, 1, 0]);
    }
    for (let s = 0; s < SIZE * 2 - 1; s++) {
      lines.push([Math.max(0, s - SIZE + 1), Math.max(0, SIZE - 1 - s), 1, 1]);
      lines.push([Math.max(0, s - SIZE + 1), Math.min(SIZE - 1, s), 1, -1]);
    }
    for (const [r0, c0, dr, dc] of lines) {
      let r = r0, c = c0;
      while (inside(r, c)) {
        const who = bd[r][c];
        if (!who) { r += dr; c += dc; continue; }
        const beforeR = r - dr, beforeC = c - dc;
        const openBefore = inside(beforeR, beforeC) && bd[beforeR][beforeC] === 0 ? 1 : 0;
        let n = 0;
        while (inside(r, c) && bd[r][c] === who) { n++; r += dr; c += dc; }
        const openAfter = inside(r, c) && bd[r][c] === 0 ? 1 : 0;
        const open = openBefore + openAfter;
        score[who] += n >= 5 ? 1e7 : (RUN_W[Math.min(4, n)][open]);
      }
    }
    const opp = 3 - persp;
    return score[persp] - score[opp] * 1.05;
  }
  function candidates(bd, cap, side) {
    const opp = 3 - side, out = [];
    let any = false;
    for (let r = 0; r < SIZE && !any; r++) for (let c = 0; c < SIZE; c++) if (bd[r][c]) { any = true; break; }
    if (!any) return [{ r: 7, c: 7, score: 0 }];
    for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
      if (bd[r][c]) continue;
      let near = false;
      for (let dr = -2; dr <= 2 && !near; dr++) for (let dc = -2; dc <= 2 && !near; dc++) {
        if (!dr && !dc) continue;
        const rr = r + dr, cc = c + dc;
        if (inside(rr, cc) && bd[rr][cc]) near = true;
      }
      if (!near) continue;
      out.push({ r, c, score: pointScore(bd, r, c, side) + pointScore(bd, r, c, opp) * .9 });
    }
    out.sort((a, b) => b.score - a.score);
    return out.slice(0, cap);
  }

  let seed = 88675123;
  const rnd = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return seed >>> 0; };
  const Z = Array.from({ length: SIZE }, () => Array.from({ length: SIZE }, () => [[0, 0], [rnd(), rnd()], [rnd(), rnd()]]));
  let hLo = 0, hHi = 0, tt = new Map(), nodes = 0, deadline = 0, aborted = false;
  const hash = (r, c, who) => { hLo = (hLo ^ Z[r][c][who][0]) >>> 0; hHi = (hHi ^ Z[r][c][who][1]) >>> 0; };
  const key = () => hHi * 4294967296 + hLo;

  function negamax(bd, depth, alpha, beta, side, ply) {
    if (aborted) return 0;
    if (++nodes > 60000 || Date.now() > deadline) { aborted = true; return 0; }
    const k = key(), ent = tt.get(k);
    if (ent && ent.d >= depth) {
      if (ent.f === 0) return ent.v;
      if (ent.f === 1 && ent.v >= beta) return ent.v;
      if (ent.f === 2 && ent.v <= alpha) return ent.v;
    }
    if (depth === 0) return evaluateBoard(bd, side);
    const opp = 3 - side;
    const moves = candidates(bd, 8, side);
    if (!moves.length) return 0;
    const a0 = alpha;
    let best = -Infinity, bestM = null;
    for (const m of moves) {
      bd[m.r][m.c] = side; hash(m.r, m.c, side);
      const w = winLine(bd, m.r, m.c, side);
      const v = w ? 1e9 - ply : -negamax(bd, depth - 1, -beta, -alpha, opp, ply + 1);
      hash(m.r, m.c, side); bd[m.r][m.c] = 0;
      if (aborted) return 0;
      if (v > best) { best = v; bestM = m; }
      if (best > alpha) alpha = best;
      if (alpha >= beta) break;
    }
    tt.set(k, { d: depth, v: best, f: best <= a0 ? 2 : best >= beta ? 1 : 0, m: bestM });
    return best;
  }

  function searchRoot(bd, side, maxDepth, ms) {
    const opp = 3 - side;
    const root = candidates(bd, 12, side);
    tt = new Map(); hLo = 0; hHi = 0;
    for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) if (bd[r][c]) hash(r, c, bd[r][c]);
    nodes = 0; aborted = false; deadline = Date.now() + ms;
    let best = root[0];
    for (let depth = 2; depth <= maxDepth; depth++) {
      let alpha = -Infinity, local = null;
      for (const m of root) {
        bd[m.r][m.c] = side; hash(m.r, m.c, side);
        const w = winLine(bd, m.r, m.c, side);
        const v = w ? 1e9 : -negamax(bd, depth - 1, -Infinity, -alpha, opp, 1);
        hash(m.r, m.c, side); bd[m.r][m.c] = 0;
        if (aborted) break;
        if (v > alpha) { alpha = v; local = m; }
      }
      if (aborted) break;
      if (local) best = local;
      if (alpha >= 1e8) break;
    }
    return best;
  }

  function bestMove(bd, side, level) {
    const opp = 3 - side;
    const cands = candidates(bd, 24, side);
    if (!cands.length) return null;
    for (const m of cands) {
      bd[m.r][m.c] = side;
      const w = winLine(bd, m.r, m.c, side);
      bd[m.r][m.c] = 0;
      if (w) return { r: m.r, c: m.c };
    }
    if (level >= 3) {
      for (const m of cands) {
        bd[m.r][m.c] = opp;
        const w = winLine(bd, m.r, m.c, opp);
        bd[m.r][m.c] = 0;
        if (w) return { r: m.r, c: m.c };
      }
    }
    if (level <= 3) {
      const defW = level === 1 ? .15 : level === 2 ? .55 : 1;
      let best = null, bs = -Infinity;
      const pool = level === 1 ? cands.slice(0, 8) : cands;
      for (const m of pool) {
        const s = pointScore(bd, m.r, m.c, side) + pointScore(bd, m.r, m.c, opp) * defW + Math.random() * (level === 1 ? 4000 : 1);
        if (s > bs) { bs = s; best = m; }
      }
      if (level === 1 && Math.random() < .25) best = pool[Math.floor(Math.random() * pool.length)];
      return { r: best.r, c: best.c };
    }
    const m = searchRoot(bd, side, level === 4 ? 2 : 4, level === 4 ? 350 : 900);
    return { r: m.r, c: m.c };
  }

  const api = { SIZE, LEVELS, createBoard, winLine, pointScore, candidates, evaluateBoard, bestMove };
  if (typeof window !== 'undefined') window.GomokuEngine = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();