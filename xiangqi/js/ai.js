(function () {
  const E = typeof window !== 'undefined' ? window.XiangqiEngine : require('./engine.js');
  const { idx, sideOf, typeOf, make, unmake, legalMoves, inCheck, findGeneral } = E;
  const BASE = [0, 10000, 120, 120, 270, 600, 285, 30];
  const PST = {
    7: [
      0, 0, 0, 2, 4, 2, 0, 0, 0,
      18, 36, 56, 80, 120, 80, 56, 36, 18,
      14, 26, 42, 60, 80, 60, 42, 26, 14,
      10, 20, 30, 34, 40, 34, 30, 20, 10,
      6, 12, 18, 18, 20, 18, 18, 12, 6,
      2, 0, 8, 0, 8, 0, 8, 0, 2,
      0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0],
    4: [
      4, 8, 16, 12, 4, 12, 16, 8, 4,
      4, 10, 28, 16, 8, 16, 28, 10, 4,
      12, 14, 16, 20, 18, 20, 16, 14, 12,
      8, 24, 18, 24, 20, 24, 18, 24, 8,
      6, 16, 14, 18, 16, 18, 14, 16, 6,
      4, 12, 16, 14, 12, 14, 16, 12, 4,
      2, 6, 8, 6, 10, 6, 8, 6, 2,
      4, 2, 8, 8, 4, 8, 8, 2, 4,
      0, 2, 4, 4, -10, 4, 4, 2, 0,
      0, -4, 0, 0, 0, 0, 0, -4, 0],
    5: [
      14, 14, 12, 18, 16, 18, 12, 14, 14,
      16, 20, 18, 24, 26, 24, 18, 20, 16,
      12, 12, 12, 18, 18, 18, 12, 12, 12,
      12, 18, 16, 22, 22, 22, 16, 18, 12,
      12, 14, 12, 18, 18, 18, 12, 14, 12,
      12, 16, 14, 20, 20, 20, 14, 16, 12,
      6, 10, 8, 14, 14, 14, 8, 10, 6,
      4, 8, 6, 14, 12, 14, 6, 8, 4,
      8, 4, 8, 16, 8, 16, 8, 4, 8,
      -2, 10, 6, 14, 12, 14, 6, 10, -2],
    6: [
      6, 4, 0, -10, -12, -10, 0, 4, 6,
      2, 2, 0, -4, -14, -4, 0, 2, 2,
      2, 2, 0, -10, -8, -10, 0, 2, 2,
      0, 0, -2, 4, 10, 4, -2, 0, 0,
      0, 0, 0, 2, 8, 2, 0, 0, 0,
      -2, 0, 4, 2, 6, 2, 4, 0, -2,
      0, 0, 0, 2, 4, 2, 0, 0, 0,
      4, 0, 8, 6, 10, 6, 8, 0, 4,
      0, 2, 4, 6, 6, 6, 4, 2, 0,
      0, 0, 2, 6, 6, 6, 2, 0, 0],
    2: [
      0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 3, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0],
    3: [
      0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 2, 0, 0, 0, 2, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 3, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0],
    1: [
      0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, -8, -8, -8, 0, 0, 0,
      0, 0, 0, -4, -4, -4, 0, 0, 0,
      0, 0, 0, 2, 2, 2, 0, 0, 0]
  };
  const pstAt = (t, side, i) => (side === 1 ? PST[t][i] : PST[t][(9 - Math.floor(i / 9)) * 9 + (i % 9)]);

  function evaluate(bd, side) {
    let s = 0;
    for (let i = 0; i < 90; i++) {
      const p = bd[i];
      if (!p) continue;
      const sd = sideOf(p), t = typeOf(p);
      const v = BASE[t] + pstAt(t, sd, i);
      s += sd === side ? v : -v;
    }
    return s;
  }

  let seed = 20261120;
  const rnd = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return seed >>> 0; };
  const Z = Array.from({ length: 90 }, () => Array.from({ length: 15 }, () => [rnd(), rnd()]));
  const ZSIDE = [rnd(), rnd()];
  let lo = 0, hi = 0;
  function hashInit(bd, side) {
    lo = 0; hi = 0;
    for (let i = 0; i < 90; i++) if (bd[i]) { const z = Z[i][bd[i] + 7]; lo = (lo ^ z[0]) >>> 0; hi = (hi ^ z[1]) >>> 0; }
    if (side === -1) { lo = (lo ^ ZSIDE[0]) >>> 0; hi = (hi ^ ZSIDE[1]) >>> 0; }
  }
  function hashMove(m, p, cap) {
    let z = Z[idx(m.fr, m.fc)][p + 7];
    lo = (lo ^ z[0]) >>> 0; hi = (hi ^ z[1]) >>> 0;
    z = Z[idx(m.tr, m.tc)][p + 7];
    lo = (lo ^ z[0]) >>> 0; hi = (hi ^ z[1]) >>> 0;
    if (cap) { z = Z[idx(m.tr, m.tc)][cap + 7]; lo = (lo ^ z[0]) >>> 0; hi = (hi ^ z[1]) >>> 0; }
    lo = (lo ^ ZSIDE[0]) >>> 0; hi = (hi ^ ZSIDE[1]) >>> 0;
  }
  const key48 = () => hi * 65536 + (lo >>> 16);

  const LEVELS = [
    { id: 1, name: '菜鸟', desc: '随性落子 · 常露破绽' },
    { id: 2, name: '入门', desc: '顾及得失 · 偶有疏漏' },
    { id: 3, name: '进阶', desc: '三层推算 · 攻防兼备' },
    { id: 4, name: '高手', desc: '四层深算 · 稳扎稳打' },
    { id: 5, name: '大师', desc: '迭代加深 · 连续杀着' }
  ];

  const MATE = 1000000;
  let tt, killers, nodes, deadline, nodeCap, aborted;

  function orderMoves(bd, moves, side, ply, ttBest) {
    for (const m of moves) {
      const victim = bd[idx(m.tr, m.tc)];
      let s = 0;
      if (ttBest && m.fr === ttBest.fr && m.fc === ttBest.fc && m.tr === ttBest.tr && m.tc === ttBest.tc) s = 1e9;
      else if (victim) s = 1e6 + BASE[typeOf(victim)] * 10 - BASE[typeOf(bd[idx(m.fr, m.fc)])];
      else if (killers[ply] && killers[ply].some(k => k && k.fr === m.fr && k.fc === m.fc && k.tr === m.tr && k.tc === m.tc)) s = 5e5;
      m.s = s;
    }
    moves.sort((a, b) => b.s - a.s);
    return moves;
  }

  function qsearch(bd, alpha, beta, side, ply, qdepth) {
    nodes++;
    if (aborted || (nodes & 1023) === 0 && (nodes > nodeCap || Date.now() > deadline)) { aborted = true; return alpha; }
    const stand = evaluate(bd, side);
    const checked = inCheck(bd, side);
    let best;
    if (!checked) {
      best = stand;
      if (best >= beta) return best;
      if (best > alpha) alpha = best;
    } else best = -Infinity;
    if (qdepth <= 0) {
      if (!checked) return best;
      if (ply >= 16) return stand;
      qdepth = 1;
    }
    const all = legalMoves(bd, side);
    const caps = checked ? all : all.filter(m => bd[idx(m.tr, m.tc)]);
    if (!caps.length) return checked ? -MATE + ply : best;
    orderMoves(bd, caps, side, ply, null);
    for (const m of caps) {
      const p = bd[idx(m.fr, m.fc)], cap = make(bd, m);
      hashMove(m, p, cap);
      const v = -qsearch(bd, -beta, -alpha, -side, ply + 1, qdepth - 1);
      hashMove(m, p, cap);
      unmake(bd, m, cap);
      if (aborted) return best === -Infinity ? alpha : best;
      if (v > best) best = v;
      if (v > alpha) alpha = v;
      if (alpha >= beta) break;
    }
    return best;
  }

  function negamax(bd, depth, alpha, beta, side, ply) {
    nodes++;
    if (aborted || (nodes & 1023) === 0 && (nodes > nodeCap || Date.now() > deadline)) { aborted = true; return alpha; }
    const checked = inCheck(bd, side);
    if (checked && depth > 0 && ply < 12) depth++;
    if (depth <= 0) return qsearch(bd, alpha, beta, side, ply, 6);
    const k = key48();
    const entry = tt.get(k);
    let ttBest = null;
    if (entry && entry.lo === lo && entry.side === side) {
      ttBest = entry.best;
      if (entry.depth >= depth) {
        if (entry.flag === 0) return entry.value;
        if (entry.flag === 1 && entry.value >= beta) return entry.value;
        if (entry.flag === 2 && entry.value <= alpha) return entry.value;
      }
    }
    const moves = orderMoves(bd, legalMoves(bd, side), side, ply, ttBest);
    if (!moves.length) return -MATE + ply;
    const alphaOrig = alpha;
    let best = -Infinity, bestMove = null;
    for (const m of moves) {
      const p = bd[idx(m.fr, m.fc)], cap = make(bd, m);
      hashMove(m, p, cap);
      const v = -negamax(bd, depth - 1, -beta, -alpha, -side, ply + 1);
      hashMove(m, p, cap);
      unmake(bd, m, cap);
      if (aborted) return alphaOrig;
      if (v > best) { best = v; bestMove = m; }
      if (v > alpha) alpha = v;
      if (alpha >= beta) {
        if (!cap) {
          const slot = killers[ply] || (killers[ply] = [null, null]);
          slot[1] = slot[0]; slot[0] = m;
        }
        break;
      }
    }
    const flag = best <= alphaOrig ? 2 : (best >= beta ? 1 : 0);
    tt.set(k, { lo, side, depth, value: best, flag, best: bestMove });
    return best;
  }

  function searchRoot(bd, side, maxDepth, budget, cap, noise) {
    hashInit(bd, side);
    tt = new Map(); killers = []; nodes = 0; aborted = false;
    deadline = Date.now() + budget; nodeCap = cap;
    let moves = legalMoves(bd, side);
    if (!moves.length) return null;
    let best = moves[0];
    for (let depth = 1; depth <= maxDepth; depth++) {
      const entry = tt.get(key48());
      moves = orderMoves(bd, moves, side, 0, entry && entry.lo === lo ? entry.best : null);
      let alpha = -Infinity, local = null, localBest = -Infinity;
      for (const m of moves) {
        const p = bd[idx(m.fr, m.fc)], cap = make(bd, m);
        hashMove(m, p, cap);
        let v = -negamax(bd, depth - 1, -Infinity, -alpha, -side, 1);
        hashMove(m, p, cap);
        unmake(bd, m, cap);
        if (aborted) break;
        if (noise) v += (Math.random() * 2 - 1) * noise;
        if (v > localBest) { localBest = v; local = m; }
        if (v > alpha) alpha = v;
      }
      if (aborted) break;
      if (local) {
        best = local;
        tt.set(key48(), { lo, side, depth, value: localBest, flag: 0, best: local });
      }
      if (localBest >= MATE - 64) break;
    }
    return best;
  }

  function bestMove(bd, side, level) {
    const moves = legalMoves(bd, side);
    if (!moves.length) return null;
    for (const m of moves) if (bd[idx(m.tr, m.tc)] === -side) return m;
    if (level === 1 && Math.random() < 0.3) return moves[Math.floor(Math.random() * moves.length)];
    const noise = level === 1 ? 60 : level === 2 ? 12 : 0;
    const maxDepth = level === 1 ? 1 : level === 2 ? 2 : level === 3 ? 3 : level === 4 ? 4 : 6;
    const budget = level <= 3 ? 250 : level === 4 ? 350 : 900;
    const cap = level <= 3 ? 40000 : level === 4 ? 80000 : 160000;
    const mv = searchRoot(bd, side, maxDepth, budget, cap, noise);
    return mv || moves[0];
  }

  const api = { LEVELS, evaluate, bestMove };
  if (typeof window !== 'undefined') window.XiangqiAI = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();