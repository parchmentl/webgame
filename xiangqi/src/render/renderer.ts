import type { Board, Pos } from '../types';
import { pieceAt } from '../engine/rules';
import { CN_NAME } from '../engine/setup';

export type Layout = {
  PAD: number;
  CELL: number;
  ORGX: number;
  ORGY: number;
};

export function computeLayout(cv: HTMLCanvasElement): Layout {
  const PAD = 14;
  const GRID_W = cv.width - PAD * 2;
  const GRID_H = cv.height - PAD * 2;
  const CELL = Math.min(GRID_W / 8, GRID_H / 9);
  const ORGX = (cv.width - CELL * 8) / 2;
  const ORGY = (cv.height - CELL * 9) / 2;
  return { PAD, CELL, ORGX, ORGY };
}

export function cellCenter(layout: Layout, x: number, y: number): { cx: number; cy: number } {
  return { cx: layout.ORGX + layout.CELL * x, cy: layout.ORGY + layout.CELL * y };
}

export function pointToCell(layout: Layout, px: number, py: number): Pos | null {
  const x = Math.round((px - layout.ORGX) / layout.CELL);
  const y = Math.round((py - layout.ORGY) / layout.CELL);
  if (x < 0 || x > 8 || y < 0 || y > 9) return null;
  const c = cellCenter(layout, x, y);
  const d = Math.hypot(px - c.cx, py - c.cy);
  if (d > layout.CELL * 0.55) return null;
  return { x, y };
}

export function draw(
  ctx: CanvasRenderingContext2D,
  cv: HTMLCanvasElement,
  board: Board,
  selected: Pos | null,
  legalMoves: Pos[]
): void {
  const layout = computeLayout(cv);
  ctx.clearRect(0, 0, cv.width, cv.height);
  drawBoard(ctx, cv, layout);
  drawPieces(ctx, layout, board);
  drawSelection(ctx, layout, board, selected, legalMoves);
}

function drawBoard(ctx: CanvasRenderingContext2D, cv: HTMLCanvasElement, layout: Layout): void {
  ctx.save();
  ctx.translate(0, 0);
  ctx.fillStyle = 'rgba(255,255,255,0.03)';
  ctx.strokeStyle = 'rgba(255,255,255,0.10)';
  roundRect(ctx, 6, 6, cv.width - 12, cv.height - 12, 18, true, true);

  ctx.lineWidth = 1.2;
  ctx.strokeStyle = 'rgba(200,220,255,0.22)';

  const left = layout.ORGX;
  const top = layout.ORGY;
  const right = layout.ORGX + layout.CELL * 8;
  const bottom = layout.ORGY + layout.CELL * 9;

  for (let y = 0; y <= 9; y++) {
    const yy = top + layout.CELL * y;
    ctx.beginPath();
    ctx.moveTo(left, yy);
    ctx.lineTo(right, yy);
    ctx.stroke();
  }

  for (let x = 0; x <= 8; x++) {
    const xx = left + layout.CELL * x;
    ctx.beginPath();
    ctx.moveTo(xx, top);
    ctx.lineTo(xx, top + layout.CELL * 4);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(xx, top + layout.CELL * 5);
    ctx.lineTo(xx, bottom);
    ctx.stroke();
  }

  drawPalace(ctx, layout, 3, 0);
  drawPalace(ctx, layout, 3, 7);

  ctx.fillStyle = 'rgba(200,220,255,0.20)';
  ctx.font = `bold ${Math.floor(layout.CELL * 0.55)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('楚 河', left + layout.CELL * 2, top + layout.CELL * 4.5);
  ctx.fillText('汉 界', left + layout.CELL * 6, top + layout.CELL * 4.5);

  ctx.restore();
}

function drawPalace(ctx: CanvasRenderingContext2D, layout: Layout, x0: number, y0: number): void {
  const left = layout.ORGX + layout.CELL * x0;
  const top = layout.ORGY + layout.CELL * y0;
  ctx.beginPath();
  ctx.moveTo(left, top);
  ctx.lineTo(left + layout.CELL * 2, top + layout.CELL * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(left + layout.CELL * 2, top);
  ctx.lineTo(left, top + layout.CELL * 2);
  ctx.stroke();
}

function drawPieces(ctx: CanvasRenderingContext2D, layout: Layout, board: Board): void {
  for (let y = 0; y < 10; y++) {
    for (let x = 0; x < 9; x++) {
      const p = board[y][x];
      if (!p) continue;
      const { cx, cy } = cellCenter(layout, x, y);

      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.45)';
      ctx.shadowBlur = 10;
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.beginPath();
      ctx.arc(cx, cy, layout.CELL * 0.42, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(255,255,255,0.16)';
      ctx.beginPath();
      ctx.arc(cx, cy, layout.CELL * 0.42, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = p.c === 'r' ? '#ff6a75' : '#e3e3e3';
      ctx.font = `700 ${Math.floor(layout.CELL * 0.52)}px "PingFang SC","Microsoft YaHei",sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(CN_NAME[p.c][p.t], cx, cy + 1);

      ctx.restore();
    }
  }
}

function drawSelection(
  ctx: CanvasRenderingContext2D,
  layout: Layout,
  board: Board,
  selected: Pos | null,
  legalMoves: Pos[]
): void {
  if (!selected) return;

  const { cx, cy } = cellCenter(layout, selected.x, selected.y);
  ctx.save();
  ctx.strokeStyle = 'rgba(77,208,255,0.9)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, layout.CELL * 0.46, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  for (const m of legalMoves) {
    const c = cellCenter(layout, m.x, m.y);
    ctx.save();
    const target = pieceAt(board, m.x, m.y);
    if (target) {
      ctx.strokeStyle = 'rgba(255,183,77,0.9)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(c.cx, c.cy, layout.CELL * 0.22, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.fillStyle = 'rgba(83,242,139,0.85)';
      ctx.beginPath();
      ctx.arc(c.cx, c.cy, layout.CELL * 0.12, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fill: boolean,
  stroke: boolean
): void {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
  if (fill) ctx.fill();
  if (stroke) ctx.stroke();
}
