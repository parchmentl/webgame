(function () {
  const ROWS = 10, COLS = 9;
  const NAMES = {
    1: ['', '帅', '仕', '相', '傌', '俥', '炮', '兵'],
    '-1': ['', '将', '士', '象', '馬', '車', '砲', '卒']
  };
  const idx = (r, c) => r * COLS + c;
  const sideOf = p => (p > 0 ? 1 : -1);
  const typeOf = p => Math.abs(p);
  const inBoard = (r, c) => r >= 0 && r < ROWS && c >= 0 && c < COLS;
  const inPalace = (side, r, c) => c >= 3 && c <= 5 && (side === 1 ? r >= 7 && r <= 9 : r >= 0 && r <= 2);
  const ownSide = (side, r) => (side === 1 ? r >= 5 : r <= 4);

  function initial() {
    const bd = new Array(90).fill(0);
    const back = [5, 4, 3, 2, 1, 2, 3, 4, 5];
    for (let c = 0; c < 9; c++) {
      bd[idx(0, c)] = -back[c];
      bd[idx(9, c)] = back[c];
    }
    bd[idx(2, 1)] = -6; bd[idx(2, 7)] = -6;
    bd[idx(7, 1)] = 6; bd[idx(7, 7)] = 6;
    for (let c = 0; c < 9; c += 2) {
      bd[idx(3, c)] = -7;
      bd[idx(6, c)] = 7;
    }
    return bd;
  }

  function findGeneral(bd, side) {
    for (let i = 0; i < 90; i++) if (bd[i] === side) return i;
    return -1;
  }

  function pseudoMoves(bd, side) {
    const out = [];
    const push = (fr, fc, tr, tc) => out.push({ fr, fc, tr, tc });
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const p = bd[idx(r, c)];
      if (!p || sideOf(p) !== side) continue;
      const t = typeOf(p);
      if (t === 1) {
        for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nr = r + dr, nc = c + dc;
          if (inPalace(side, nr, nc) && (!bd[idx(nr, nc)] || sideOf(bd[idx(nr, nc)]) !== side)) push(r, c, nr, nc);
        }
        const dir = side === 1 ? -1 : 1;
        let nr = r + dir;
        while (inBoard(nr, c) && !bd[idx(nr, c)]) nr += dir;
        if (inBoard(nr, c) && bd[idx(nr, c)] === -side) push(r, c, nr, c);
      } else if (t === 2) {
        for (const [dr, dc] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
          const nr = r + dr, nc = c + dc;
          if (inPalace(side, nr, nc) && (!bd[idx(nr, nc)] || sideOf(bd[idx(nr, nc)]) !== side)) push(r, c, nr, nc);
        }
      } else if (t === 3) {
        for (const [dr, dc] of [[2, 2], [2, -2], [-2, 2], [-2, -2]]) {
          const nr = r + dr, nc = c + dc;
          if (!inBoard(nr, nc) || !ownSide(side, nr)) continue;
          if (bd[idx(r + dr / 2, c + dc / 2)]) continue;
          if (!bd[idx(nr, nc)] || sideOf(bd[idx(nr, nc)]) !== side) push(r, c, nr, nc);
        }
      } else if (t === 4) {
        const jumps = [[-2, -1, -1, 0], [-2, 1, -1, 0], [2, -1, 1, 0], [2, 1, 1, 0], [-1, -2, 0, -1], [1, -2, 0, -1], [-1, 2, 0, 1], [1, 2, 0, 1]];
        for (const [dr, dc, lr, lc] of jumps) {
          const nr = r + dr, nc = c + dc;
          if (!inBoard(nr, nc) || bd[idx(r + lr, c + lc)]) continue;
          if (!bd[idx(nr, nc)] || sideOf(bd[idx(nr, nc)]) !== side) push(r, c, nr, nc);
        }
      } else if (t === 5) {
        for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          let nr = r + dr, nc = c + dc;
          while (inBoard(nr, nc)) {
            const q = bd[idx(nr, nc)];
            if (!q) push(r, c, nr, nc);
            else { if (sideOf(q) !== side) push(r, c, nr, nc); break; }
            nr += dr; nc += dc;
          }
        }
      } else if (t === 6) {
        for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          let nr = r + dr, nc = c + dc, mounted = false;
          while (inBoard(nr, nc)) {
            const q = bd[idx(nr, nc)];
            if (!mounted) {
              if (!q) push(r, c, nr, nc);
              else mounted = true;
            } else if (q) {
              if (sideOf(q) !== side) push(r, c, nr, nc);
              break;
            }
            nr += dr; nc += dc;
          }
        }
      } else {
        const dir = side === 1 ? -1 : 1;
        const crossed = side === 1 ? r <= 4 : r >= 5;
        const steps = [[dir, 0]];
        if (crossed) { steps.push([0, 1], [0, -1]); }
        for (const [dr, dc] of steps) {
          const nr = r + dr, nc = c + dc;
          if (!inBoard(nr, nc)) continue;
          if (!bd[idx(nr, nc)] || sideOf(bd[idx(nr, nc)]) !== side) push(r, c, nr, nc);
        }
      }
    }
    return out;
  }

  function attacked(bd, r, c, by) {
    for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      let nr = r + dr, nc = c + dc, second = false;
      while (inBoard(nr, nc)) {
        const q = bd[idx(nr, nc)];
        if (q) {
          if (sideOf(q) === by) {
            const t = typeOf(q);
            if (!second && t === 5) return true;
            if (!second && t === 1 && dc === 0) return true;
            if (second && t === 6) return true;
          }
          if (second) break;
          second = true;
        }
        nr += dr; nc += dc;
      }
    }
    for (const [dr, dc] of [[-2, -1], [-2, 1], [2, -1], [2, 1], [-1, -2], [1, -2], [-1, 2], [1, 2]]) {
      const hr = r + dr, hc = c + dc;
      if (!inBoard(hr, hc) || bd[idx(hr, hc)] !== by * 4) continue;
      const lr = Math.abs(dr) === 2 ? r + dr / 2 : r;
      const lc = Math.abs(dc) === 2 ? c + dc / 2 : c;
      if (!bd[idx(lr, lc)]) return true;
    }
    if (by === 1) {
      if (inBoard(r + 1, c) && bd[idx(r + 1, c)] === 7) return true;
      if (r <= 4) {
        if (inBoard(r, c - 1) && bd[idx(r, c - 1)] === 7) return true;
        if (inBoard(r, c + 1) && bd[idx(r, c + 1)] === 7) return true;
      }
    } else {
      if (inBoard(r - 1, c) && bd[idx(r - 1, c)] === -7) return true;
      if (r >= 5) {
        if (inBoard(r, c - 1) && bd[idx(r, c - 1)] === -7) return true;
        if (inBoard(r, c + 1) && bd[idx(r, c + 1)] === -7) return true;
      }
    }
    return false;
  }

  function inCheck(bd, side) {
    const g = findGeneral(bd, side);
    if (g < 0) return true;
    return attacked(bd, Math.floor(g / COLS), g % COLS, -side);
  }

  function make(bd, m) {
    const cap = bd[idx(m.tr, m.tc)];
    bd[idx(m.tr, m.tc)] = bd[idx(m.fr, m.fc)];
    bd[idx(m.fr, m.fc)] = 0;
    return cap;
  }
  function unmake(bd, m, cap) {
    bd[idx(m.fr, m.fc)] = bd[idx(m.tr, m.tc)];
    bd[idx(m.tr, m.tc)] = cap;
  }

  function legalMoves(bd, side) {
    const out = [];
    for (const m of pseudoMoves(bd, side)) {
      const cap = make(bd, m);
      if (!inCheck(bd, side)) out.push(m);
      unmake(bd, m, cap);
    }
    return out;
  }

  const CN = ['一', '二', '三', '四', '五', '六', '七', '八', '九'];
  function moveText(bd, m) {
    const p = bd[idx(m.fr, m.fc)];
    const side = sideOf(p), t = typeOf(p);
    const num = n => (side === 1 ? CN[n - 1] : String(n));
    const file = c => (side === 1 ? 9 - c : c + 1);
    const mates = [];
    for (let r = 0; r < ROWS; r++) if (bd[idx(r, m.fc)] === p) mates.push(r);
    let origin;
    if (mates.length === 2 || mates.length === 3) {
      mates.sort((a, b) => (side === 1 ? a - b : b - a));
      const pos = mates.indexOf(m.fr);
      origin = (mates.length === 2 ? ['前', '后'] : ['前', '中', '后'])[pos];
    } else origin = num(file(m.fc));
    let act, val;
    if (m.tr === m.fr) { act = '平'; val = num(file(m.tc)); }
    else {
      const forward = side === 1 ? m.tr < m.fr : m.tr > m.fr;
      act = forward ? '进' : '退';
      val = (t === 2 || t === 3 || t === 4) ? num(file(m.tc)) : num(Math.abs(m.tr - m.fr));
    }
    return NAMES[side][t] + origin + act + val;
  }

  const api = { ROWS, COLS, NAMES, idx, sideOf, typeOf, inBoard, inPalace, initial, findGeneral, pseudoMoves, attacked, inCheck, make, unmake, legalMoves, moveText };
  if (typeof window !== 'undefined') window.XiangqiEngine = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();