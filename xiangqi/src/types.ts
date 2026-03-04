export type Color = 'r' | 'b';

export type PieceType = 'K' | 'A' | 'B' | 'N' | 'R' | 'C' | 'P';

export type Piece = { c: Color; t: PieceType };

export type Cell = Piece | null;

export type Board = Cell[][];

export type Pos = { x: number; y: number };
