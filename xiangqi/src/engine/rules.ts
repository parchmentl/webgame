import type { Board, Color, Piece, Pos } from '../types';
import { cloneBoard } from '../state/gameState';

export function inBounds(x: number, y: number): boolean {
  return x >= 0 && x < 9 && y >= 0 && y < 10;
}

export function pieceAt(board: Board, x: number, y: number): Piece | null {
  return inBounds(x, y) ? board[y][x] : null;
}

export function sameColor(a: Piece | null, b: Piece | null): boolean {
  return !!a && !!b && a.c === b.c;
}

export function findKing(board: Board, color: Color): Pos | null {
  for (let y = 0; y < 10; y++) {
    for (let x = 0; x < 9; x++) {
      const p = board[y][x];
      if (p && p.c === color && p.t === 'K') return { x, y };
    }
  }
  return null;
}

export function inPalace(color: Color, x: number, y: number): boolean {
  if (x < 3 || x > 5) return false;
  if (color === 'r') return y >= 7 && y <= 9;
  return y >= 0 && y <= 2;
}

export function riverCrossed(color: Color, y: number): boolean {
  return color === 'r' ? y <= 4 : y >= 5;
}

export function kingsFaceToFaceState(board: Board): boolean {
  const rk = findKing(board, 'r');
  const bk = findKing(board, 'b');
  if (!rk || !bk) return false;
  if (rk.x !== bk.x) return false;
  const x = rk.x;
  const step = bk.y > rk.y ? 1 : -1;
  for (let y = rk.y + step; y !== bk.y; y += step) {
    if (board[y][x]) return false;
  }
  return true;
}

export function isInCheck(board: Board, color: Color): boolean {
  const k = findKing(board, color);
  if (!k) return false;
  const opp: Color = color === 'r' ? 'b' : 'r';
  for (let y = 0; y < 10; y++) {
    for (let x = 0; x < 9; x++) {
      const p = board[y][x];
      if (!p || p.c !== opp) continue;
      const moves = pseudoMovesFor(board, x, y, p);
      if (moves.some(m => m.x === k.x && m.y === k.y)) return true;
    }
  }
  return false;
}

export function pseudoMovesFor(board: Board, x: number, y: number, p: Piece): Pos[] {
  const res: Pos[] = [];
  const add = (nx: number, ny: number) => {
    if (!inBounds(nx, ny)) return;
    const t = pieceAt(board, nx, ny);
    if (!t) res.push({ x: nx, y: ny });
    else if (t.c !== p.c) res.push({ x: nx, y: ny });
  };

  if (p.t === 'R') {
    const dirs = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1]
    ] as const;
    for (const [dx, dy] of dirs) {
      let nx = x + dx,
        ny = y + dy;
      while (inBounds(nx, ny)) {
        const t = pieceAt(board, nx, ny);
        if (!t) res.push({ x: nx, y: ny });
        else {
          if (t.c !== p.c) res.push({ x: nx, y: ny });
          break;
        }
        nx += dx;
        ny += dy;
      }
    }
  } else if (p.t === 'N') {
    const candidates = [
      { dx: 1, dy: -2, lx: 0, ly: -1 },
      { dx: -1, dy: -2, lx: 0, ly: -1 },
      { dx: 2, dy: -1, lx: 1, ly: 0 },
      { dx: 2, dy: 1, lx: 1, ly: 0 },
      { dx: 1, dy: 2, lx: 0, ly: 1 },
      { dx: -1, dy: 2, lx: 0, ly: 1 },
      { dx: -2, dy: -1, lx: -1, ly: 0 },
      { dx: -2, dy: 1, lx: -1, ly: 0 }
    ] as const;
    for (const c of candidates) {
      const leg = pieceAt(board, x + c.lx, y + c.ly);
      if (leg) continue;
      add(x + c.dx, y + c.dy);
    }
  } else if (p.t === 'B') {
    const ds = [
      [2, 2],
      [2, -2],
      [-2, 2],
      [-2, -2]
    ] as const;
    for (const [dx, dy] of ds) {
      const nx = x + dx,
        ny = y + dy;
      const ex = x + dx / 2,
        ey = y + dy / 2;
      if (!inBounds(nx, ny)) continue;
      if (pieceAt(board, ex, ey)) continue;
      if (p.c === 'r' && ny < 5) continue;
      if (p.c === 'b' && ny > 4) continue;
      add(nx, ny);
    }
  } else if (p.t === 'A') {
    const ds = [
      [1, 1],
      [1, -1],
      [-1, 1],
      [-1, -1]
    ] as const;
    for (const [dx, dy] of ds) {
      const nx = x + dx,
        ny = y + dy;
      if (!inBounds(nx, ny)) continue;
      if (!inPalace(p.c, nx, ny)) continue;
      add(nx, ny);
    }
  } else if (p.t === 'K') {
    const ds = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1]
    ] as const;
    for (const [dx, dy] of ds) {
      const nx = x + dx,
        ny = y + dy;
      if (!inBounds(nx, ny)) continue;
      if (!inPalace(p.c, nx, ny)) continue;
      add(nx, ny);
    }
  } else if (p.t === 'C') {
    const dirs = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1]
    ] as const;
    for (const [dx, dy] of dirs) {
      let nx = x + dx,
        ny = y + dy;
      while (inBounds(nx, ny)) {
        const t = pieceAt(board, nx, ny);
        if (!t) {
          res.push({ x: nx, y: ny });
          nx += dx;
          ny += dy;
        } else break;
      }
      nx += dx;
      ny += dy;
      while (inBounds(nx, ny)) {
        const t = pieceAt(board, nx, ny);
        if (t) {
          if (t.c !== p.c) res.push({ x: nx, y: ny });
          break;
        }
        nx += dx;
        ny += dy;
      }
    }
  } else if (p.t === 'P') {
    const dir = p.c === 'r' ? -1 : 1;
    add(x, y + dir);
    if (riverCrossed(p.c, y)) {
      add(x - 1, y);
      add(x + 1, y);
    }
  }

  return res;
}

export function legalMovesFor(board: Board, turn: Color, x: number, y: number): Pos[] {
  const p = pieceAt(board, x, y);
  if (!p || p.c !== turn) return [];
  const cand = pseudoMovesFor(board, x, y, p);

  const res: Pos[] = [];
  for (const m of cand) {
    if (sameColor(p, pieceAt(board, m.x, m.y))) continue;

    const snapshot = cloneBoard(board);
    snapshot[m.y][m.x] = snapshot[y][x];
    snapshot[y][x] = null;

    if (kingsFaceToFaceState(snapshot)) continue;
    if (isInCheck(snapshot, turn)) continue;

    res.push(m);
  }

  return res;
}

export function applyMoveToBoard(board: Board, from: Pos, to: Pos): { nextBoard: Board; captured: Piece | null } {
  const nextBoard = cloneBoard(board);
  const p = pieceAt(nextBoard, from.x, from.y);
  if (!p) return { nextBoard, captured: null };
  const captured = pieceAt(nextBoard, to.x, to.y);
  nextBoard[to.y][to.x] = p;
  nextBoard[from.y][from.x] = null;
  return { nextBoard, captured };
}
