import type { Color, Pos } from './types';
import { createGameState, cloneBoard } from './state/gameState';
import { getDomRefs, moveLogLine, renderLog, setStatus, updateTurnUI } from './ui/dom';
import { applyMoveToBoard, isInCheck, legalMovesFor, pieceAt } from './engine/rules';
import { computeLayout, draw, pointToCell } from './render/renderer';
import { initialBoard } from './engine/setup';

function initStatus(turn: Color): string {
  return `<div><b>${turn === 'r' ? '红方回合' : '黑方回合'}</b></div><div>状态：<span class="ok">未被将军</span></div>`;
}

function start(): void {
  const dom = getDomRefs();
  const ctxMaybe = dom.cv.getContext('2d');
  if (!ctxMaybe) throw new Error('Canvas context not available');
  const ctx: CanvasRenderingContext2D = ctxMaybe;

  // Fixed canvas size for compatibility
  dom.cv.width = 520;
  dom.cv.height = 580;

  const state = createGameState();

  function redraw(): void {
    draw(ctx, dom.cv, state.board, state.selected, state.legalMoves);
  }

  function pick(cell: Pos | null): void {
    if (!cell || state.gameOver) return;

    const p = pieceAt(state.board, cell.x, cell.y);

    if (state.selected) {
      if (state.legalMoves.some(m => m.x === cell.x && m.y === cell.y)) {
        applyMove(state.selected, cell);
        return;
      }

      if (p && p.c === state.turn) {
        state.selected = { x: cell.x, y: cell.y };
        state.legalMoves = legalMovesFor(state.board, state.turn, cell.x, cell.y);
        redraw();
        return;
      }

      state.selected = null;
      state.legalMoves = [];
      redraw();
      return;
    }

    if (p && p.c === state.turn) {
      state.selected = { x: cell.x, y: cell.y };
      state.legalMoves = legalMovesFor(state.board, state.turn, cell.x, cell.y);
      redraw();
    }
  }

  function applyMove(from: Pos, to: Pos): void {
    if (state.gameOver) return;
    const p = pieceAt(state.board, from.x, from.y);
    if (!p) return;

    const moves = legalMovesFor(state.board, state.turn, from.x, from.y);
    if (!moves.some(m => m.x === to.x && m.y === to.y)) return;

    state.history.push({
      board: cloneBoard(state.board),
      turn: state.turn,
      moveLogLen: state.moveLog.length,
      gameOver: state.gameOver
    });

    const { nextBoard, captured } = applyMoveToBoard(state.board, from, to);
    state.board = nextBoard;

    state.moveLog.push(moveLogLine(state.turn, p, from, to, captured));

    if (captured && captured.t === 'K') {
      state.gameOver = true;
      setStatus(dom.statusEl, `<div class="ok">游戏结束：${state.turn === 'r' ? '红方' : '黑方'}吃掉了对方${captured.c === 'r' ? '帅' : '将'}！</div>`);
    } else {
      state.turn = state.turn === 'r' ? 'b' : 'r';
      const chk = isInCheck(state.board, state.turn);
      const me = state.turn === 'r' ? '红方' : '黑方';
      const msg = chk ? `<span class="warn">${me}被将军！</span>` : `<span class="ok">${me}未被将军</span>`;
      setStatus(dom.statusEl, `<div><b>${state.turn === 'r' ? '红方回合' : '黑方回合'}</b></div><div>状态：${msg}</div>`);
    }

    state.selected = null;
    state.legalMoves = [];
    updateTurnUI(dom.turnText, dom.turnDot, state.turn);
    renderLog(dom.logEl, state.moveLog);
    redraw();
  }

  dom.cv.addEventListener('click', e => {
    const r = dom.cv.getBoundingClientRect();
    const x = (e.clientX - r.left) * (dom.cv.width / r.width);
    const y = (e.clientY - r.top) * (dom.cv.height / r.height);
    const layout = computeLayout(dom.cv);
    pick(pointToCell(layout, x, y));
  });

  dom.cv.addEventListener(
    'touchstart',
    e => {
      const t = e.touches[0];
      const r = dom.cv.getBoundingClientRect();
      const x = (t.clientX - r.left) * (dom.cv.width / r.width);
      const y = (t.clientY - r.top) * (dom.cv.height / r.height);
      const layout = computeLayout(dom.cv);
      pick(pointToCell(layout, x, y));
    },
    { passive: true }
  );

  dom.btnReset.addEventListener('click', () => {
    state.board = initialBoard();
    state.turn = 'r';
    state.selected = null;
    state.legalMoves = [];
    state.gameOver = false;
    state.history.length = 0;
    state.moveLog.length = 0;
    setStatus(dom.statusEl, initStatus('r'));
    updateTurnUI(dom.turnText, dom.turnDot, 'r');
    renderLog(dom.logEl, state.moveLog);
    redraw();
  });

  dom.btnUndo.addEventListener('click', () => {
    if (state.history.length === 0) return;
    const s = state.history.pop();
    if (!s) return;
    state.board = s.board;
    state.turn = s.turn;
    state.gameOver = s.gameOver;
    state.selected = null;
    state.legalMoves = [];
    state.moveLog.length = s.moveLogLen;
    updateTurnUI(dom.turnText, dom.turnDot, state.turn);
    setStatus(dom.statusEl, `<div><b>${state.turn === 'r' ? '红方回合' : '黑方回合'}</b></div><div>已悔棋。</div>`);
    renderLog(dom.logEl, state.moveLog);
    redraw();
  });

  updateTurnUI(dom.turnText, dom.turnDot, state.turn);
  setStatus(dom.statusEl, initStatus(state.turn));
  redraw();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start);
} else {
  start();
}
