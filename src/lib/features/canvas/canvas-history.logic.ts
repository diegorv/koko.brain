import type { Node, Edge } from '@xyflow/svelte';

/** A snapshot of the canvas state at a point in time */
export interface CanvasSnapshot {
	nodes: Node[];
	edges: Edge[];
}

/** Manages an undo/redo history stack */
export interface CanvasHistory {
	/** Stack of state snapshots */
	stack: CanvasSnapshot[];
	/** Current position in the stack (-1 = no history) */
	index: number;
	/** Maximum number of entries to retain */
	maxSize: number;
}

/** Creates a new empty history */
export function createHistory(maxSize = 50): CanvasHistory {
	return { stack: [], index: -1, maxSize };
}

/** Checks if two snapshots are structurally identical (same node/edge references) */
export function snapshotsEqual(a: CanvasSnapshot, b: CanvasSnapshot): boolean {
	if (a.nodes.length !== b.nodes.length || a.edges.length !== b.edges.length) return false;
	for (let i = 0; i < a.nodes.length; i++) {
		if (a.nodes[i] !== b.nodes[i]) return false;
	}
	for (let i = 0; i < a.edges.length; i++) {
		if (a.edges[i] !== b.edges[i]) return false;
	}
	return true;
}

/** Pushes a new snapshot, discarding any redo entries beyond current index. Skips if identical to current. */
export function pushSnapshot(
	history: CanvasHistory,
	snapshot: CanvasSnapshot,
): CanvasHistory {
	// Skip duplicate snapshots (e.g., tab switch re-sync with unchanged content)
	if (history.index >= 0 && snapshotsEqual(history.stack[history.index], snapshot)) {
		return history;
	}
	const stack = history.stack.slice(0, history.index + 1);
	stack.push(snapshot);
	// Trim to max size
	if (stack.length > history.maxSize) stack.shift();
	return { ...history, stack, index: stack.length - 1 };
}

/** Returns true if undo is possible */
export function canUndo(history: CanvasHistory): boolean {
	return history.index > 0;
}

/** Returns true if redo is possible */
export function canRedo(history: CanvasHistory): boolean {
	return history.index < history.stack.length - 1;
}

/** Returns the previous snapshot (for undo) without mutating */
export function undo(
	history: CanvasHistory,
): { history: CanvasHistory; snapshot: CanvasSnapshot } | null {
	if (!canUndo(history)) return null;
	const newIndex = history.index - 1;
	return {
		history: { ...history, index: newIndex },
		snapshot: history.stack[newIndex],
	};
}

/** Returns the next snapshot (for redo) without mutating */
export function redo(
	history: CanvasHistory,
): { history: CanvasHistory; snapshot: CanvasSnapshot } | null {
	if (!canRedo(history)) return null;
	const newIndex = history.index + 1;
	return {
		history: { ...history, index: newIndex },
		snapshot: history.stack[newIndex],
	};
}
