import type { Color, Piece, Pos } from '../types';
import { CN_NAME } from '../engine/setup';

export type DomRefs = {
  cv: HTMLCanvasElement;
  btnReset: HTMLButtonElement;
  btnUndo: HTMLButtonElement;
  statusEl: HTMLElement;
  logEl: HTMLElement;
  turnText: HTMLElement;
  turnDot: HTMLElement;
};

export function getDomRefs(): DomRefs {
  const cv = document.getElementById('cv') as HTMLCanvasElement | null;
  const btnReset = document.getElementById('btnReset') as HTMLButtonElement | null;
  const btnUndo = document.getElementById('btnUndo') as HTMLButtonElement | null;
  const statusEl = document.getElementById('status') as HTMLElement | null;
  const logEl = document.getElementById('log') as HTMLElement | null;
  const turnText = document.getElementById('turnText') as HTMLElement | null;
  const turnDot = document.getElementById('turnDot') as HTMLElement | null;

  if (!cv || !btnReset || !btnUndo || !statusEl || !logEl || !turnText || !turnDot) {
    throw new Error('DOM elements not found');
  }

  return { cv, btnReset, btnUndo, statusEl, logEl, turnText, turnDot };
}

export function setStatus(statusEl: HTMLElement, html: string): void {
  statusEl.innerHTML = html;
}

export function updateTurnUI(turnText: HTMLElement, turnDot: HTMLElement, turn: Color): void {
  turnText.textContent = turn === 'r' ? '红方回合' : '黑方回合';
  turnDot.className = 'dot ' + (turn === 'r' ? 'red' : 'black');
}

export function posStr(p: Pos): string {
  return `(${p.x + 1},${p.y + 1})`;
}

export function moveLogLine(turn: Color, piece: Piece, from: Pos, to: Pos, captured: Piece | null): string {
  const cap = captured ? `×${CN_NAME[captured.c][captured.t]}` : '';
  return `${turn === 'r' ? '红' : '黑'}：${CN_NAME[piece.c][piece.t]} ${posStr(from)} → ${posStr(to)} ${cap}`;
}

export function renderLog(logEl: HTMLElement, moveLog: string[]): void {
  const last = moveLog.slice(-60);
  logEl.innerHTML = last
    .map((s, i) => `<div>${moveLog.length - (last.length - i) + 1}. ${escapeHtml(s)}</div>`)
    .join('');
  logEl.scrollTop = logEl.scrollHeight;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m] as string));
}
