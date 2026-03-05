import type { Decoration } from '@codemirror/view';

export type LineInfo = { text: string; from: number; to: number; number: number };
export type DecorationEntry = { from: number; to: number; deco: Decoration };
