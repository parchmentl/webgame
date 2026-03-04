import type { Board, Color, Pos } from '../types';
import { initialBoard } from '../engine/setup';

export type Snapshot = {
  board: Board;
  turn: Color;
  moveLogLen: number;
  gameOver: boolean;
};

export type GameState = {
  board: Board;
  turn: Color;
  selected: Pos | null;
  legalMoves: Pos[];
  gameOver: boolean;
  history: Snapshot[];
  moveLog: string[];
};

export function cloneBoard(b: Board): Board {
  return b.map(row => row.map(p => (p ? { c: p.c, t: p.t } : null)));
}

export function createGameState(): GameState {
  return {
    board: initialBoard(),
    turn: 'r',
    selected: null,
    legalMoves: [],
    gameOver: false,
    history: [],
    moveLog: []
  };
}
