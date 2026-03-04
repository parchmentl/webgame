import type { Board, Color, PieceType } from '../types';

export const CN_NAME: Record<Color, Record<PieceType, string>> = {
  r: { K: '帅', A: '仕', B: '相', N: '马', R: '车', C: '炮', P: '兵' },
  b: { K: '将', A: '士', B: '象', N: '马', R: '车', C: '炮', P: '卒' }
};

export function initialBoard(): Board {
  const empty: Board = Array.from({ length: 10 }, () => Array(9).fill(null));
  const put = (x: number, y: number, c: Color, t: PieceType) => {
    empty[y][x] = { c, t };
  };

  put(0, 0, 'b', 'R');
  put(1, 0, 'b', 'N');
  put(2, 0, 'b', 'B');
  put(3, 0, 'b', 'A');
  put(4, 0, 'b', 'K');
  put(5, 0, 'b', 'A');
  put(6, 0, 'b', 'B');
  put(7, 0, 'b', 'N');
  put(8, 0, 'b', 'R');
  put(1, 2, 'b', 'C');
  put(7, 2, 'b', 'C');
  put(0, 3, 'b', 'P');
  put(2, 3, 'b', 'P');
  put(4, 3, 'b', 'P');
  put(6, 3, 'b', 'P');
  put(8, 3, 'b', 'P');

  put(0, 9, 'r', 'R');
  put(1, 9, 'r', 'N');
  put(2, 9, 'r', 'B');
  put(3, 9, 'r', 'A');
  put(4, 9, 'r', 'K');
  put(5, 9, 'r', 'A');
  put(6, 9, 'r', 'B');
  put(7, 9, 'r', 'N');
  put(8, 9, 'r', 'R');
  put(1, 7, 'r', 'C');
  put(7, 7, 'r', 'C');
  put(0, 6, 'r', 'P');
  put(2, 6, 'r', 'P');
  put(4, 6, 'r', 'P');
  put(6, 6, 'r', 'P');
  put(8, 6, 'r', 'P');

  return empty;
}
