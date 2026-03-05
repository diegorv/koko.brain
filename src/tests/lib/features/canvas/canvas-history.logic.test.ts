import { describe, it, expect } from 'vitest';
import {
	createHistory,
	pushSnapshot,
	snapshotsEqual,
	canUndo,
	canRedo,
	undo,
	redo,
	type CanvasSnapshot,
} from '$lib/features/canvas/canvas-history.logic';

/** Helper to create a minimal snapshot */
function snap(label: string): CanvasSnapshot {
	return {
		nodes: [{ id: label, type: 'text', position: { x: 0, y: 0 }, data: {} }] as any,
		edges: [],
	};
}

describe('createHistory', () => {
	it('creates an empty history with index -1', () => {
		const h = createHistory();
		expect(h.stack).toEqual([]);
		expect(h.index).toBe(-1);
		expect(h.maxSize).toBe(50);
	});

	it('accepts a custom maxSize', () => {
		const h = createHistory(10);
		expect(h.maxSize).toBe(10);
	});
});

describe('pushSnapshot', () => {
	it('adds to the stack and increments index', () => {
		let h = createHistory();
		h = pushSnapshot(h, snap('a'));
		expect(h.stack).toHaveLength(1);
		expect(h.index).toBe(0);

		h = pushSnapshot(h, snap('b'));
		expect(h.stack).toHaveLength(2);
		expect(h.index).toBe(1);
	});

	it('discards redo entries when pushing after undo', () => {
		let h = createHistory();
		h = pushSnapshot(h, snap('a'));
		h = pushSnapshot(h, snap('b'));
		h = pushSnapshot(h, snap('c'));
		// Undo twice
		h = undo(h)!.history;
		h = undo(h)!.history;
		expect(h.index).toBe(0);

		// Push new snapshot — 'b' and 'c' should be discarded
		h = pushSnapshot(h, snap('d'));
		expect(h.stack).toHaveLength(2);
		expect(h.index).toBe(1);
		expect(h.stack[0].nodes[0].id).toBe('a');
		expect(h.stack[1].nodes[0].id).toBe('d');
	});

	it('respects maxSize by trimming oldest entries', () => {
		let h = createHistory(3);
		h = pushSnapshot(h, snap('a'));
		h = pushSnapshot(h, snap('b'));
		h = pushSnapshot(h, snap('c'));
		expect(h.stack).toHaveLength(3);

		h = pushSnapshot(h, snap('d'));
		expect(h.stack).toHaveLength(3);
		expect(h.stack[0].nodes[0].id).toBe('b'); // 'a' trimmed
		expect(h.index).toBe(2);
	});
});

describe('snapshotsEqual', () => {
	it('returns true for identical node/edge references', () => {
		const s = snap('a');
		expect(snapshotsEqual(s, s)).toBe(true);
	});

	it('returns true for snapshots with same references in arrays', () => {
		const node = { id: 'n1', type: 'text', position: { x: 0, y: 0 }, data: {} } as any;
		const edge = { id: 'e1', source: 'a', target: 'b' } as any;
		const a: CanvasSnapshot = { nodes: [node], edges: [edge] };
		const b: CanvasSnapshot = { nodes: [node], edges: [edge] };
		expect(snapshotsEqual(a, b)).toBe(true);
	});

	it('returns false for different node counts', () => {
		const a: CanvasSnapshot = { nodes: [], edges: [] };
		const b = snap('x');
		expect(snapshotsEqual(a, b)).toBe(false);
	});

	it('returns false for different edge counts', () => {
		const a: CanvasSnapshot = { nodes: [], edges: [] };
		const b: CanvasSnapshot = { nodes: [], edges: [{ id: 'e1', source: 'a', target: 'b' } as any] };
		expect(snapshotsEqual(a, b)).toBe(false);
	});

	it('returns false for different node references (same data)', () => {
		const a = snap('a');
		const b = snap('a');
		expect(snapshotsEqual(a, b)).toBe(false);
	});
});

describe('pushSnapshot — deduplication', () => {
	it('skips push when snapshot is identical to current', () => {
		const s = snap('a');
		let h = createHistory();
		h = pushSnapshot(h, s);
		expect(h.stack).toHaveLength(1);

		// Push same snapshot again — should be a no-op
		const h2 = pushSnapshot(h, s);
		expect(h2.stack).toHaveLength(1);
		expect(h2).toBe(h); // exact same object returned
	});

	it('allows push when snapshot has different references', () => {
		let h = createHistory();
		h = pushSnapshot(h, snap('a'));
		h = pushSnapshot(h, snap('a')); // different reference, different snap() call
		expect(h.stack).toHaveLength(2);
	});
});

describe('canUndo', () => {
	it('returns false for empty history', () => {
		expect(canUndo(createHistory())).toBe(false);
	});

	it('returns false at index 0 (one entry)', () => {
		let h = createHistory();
		h = pushSnapshot(h, snap('a'));
		expect(canUndo(h)).toBe(false);
	});

	it('returns true when index > 0', () => {
		let h = createHistory();
		h = pushSnapshot(h, snap('a'));
		h = pushSnapshot(h, snap('b'));
		expect(canUndo(h)).toBe(true);
	});
});

describe('canRedo', () => {
	it('returns false at end of stack', () => {
		let h = createHistory();
		h = pushSnapshot(h, snap('a'));
		h = pushSnapshot(h, snap('b'));
		expect(canRedo(h)).toBe(false);
	});

	it('returns true after undo', () => {
		let h = createHistory();
		h = pushSnapshot(h, snap('a'));
		h = pushSnapshot(h, snap('b'));
		h = undo(h)!.history;
		expect(canRedo(h)).toBe(true);
	});

	it('returns false for empty history', () => {
		expect(canRedo(createHistory())).toBe(false);
	});
});

describe('undo', () => {
	it('returns the previous snapshot and decrements index', () => {
		let h = createHistory();
		h = pushSnapshot(h, snap('a'));
		h = pushSnapshot(h, snap('b'));
		const result = undo(h);
		expect(result).not.toBeNull();
		expect(result!.history.index).toBe(0);
		expect(result!.snapshot.nodes[0].id).toBe('a');
	});

	it('returns null when at the beginning', () => {
		let h = createHistory();
		h = pushSnapshot(h, snap('a'));
		expect(undo(h)).toBeNull();
	});

	it('returns null for empty history', () => {
		expect(undo(createHistory())).toBeNull();
	});
});

describe('redo', () => {
	it('returns the next snapshot and increments index', () => {
		let h = createHistory();
		h = pushSnapshot(h, snap('a'));
		h = pushSnapshot(h, snap('b'));
		h = undo(h)!.history;
		const result = redo(h);
		expect(result).not.toBeNull();
		expect(result!.history.index).toBe(1);
		expect(result!.snapshot.nodes[0].id).toBe('b');
	});

	it('returns null when at end of stack', () => {
		let h = createHistory();
		h = pushSnapshot(h, snap('a'));
		expect(redo(h)).toBeNull();
	});
});

describe('full undo/redo cycle', () => {
	it('push → push → undo → undo → redo → push (redo discarded)', () => {
		let h = createHistory();
		h = pushSnapshot(h, snap('1'));
		h = pushSnapshot(h, snap('2'));
		h = pushSnapshot(h, snap('3'));
		expect(h.index).toBe(2);

		// Undo twice → back to '1'
		let r = undo(h)!;
		h = r.history;
		expect(r.snapshot.nodes[0].id).toBe('2');

		r = undo(h)!;
		h = r.history;
		expect(r.snapshot.nodes[0].id).toBe('1');
		expect(h.index).toBe(0);

		// Redo once → back to '2'
		r = redo(h)!;
		h = r.history;
		expect(r.snapshot.nodes[0].id).toBe('2');
		expect(h.index).toBe(1);

		// Push new entry → '3' should be discarded from redo
		h = pushSnapshot(h, snap('4'));
		expect(h.stack).toHaveLength(3);
		expect(h.stack[2].nodes[0].id).toBe('4');
		expect(canRedo(h)).toBe(false);
	});
});
