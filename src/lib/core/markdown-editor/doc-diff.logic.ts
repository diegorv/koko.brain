/** One replaced range in a change that turns one doc into another. */
export interface DocChange {
	/** Start of the replaced range in the old doc. */
	from: number;
	/** End of the replaced range in the old doc. */
	to: number;
	/** Text that replaces `from..to`. */
	insert: string;
}

/**
 * Most line insertions plus deletions `docDiff` looks for before it gives up.
 * The Myers search costs O((lines) x edits), so this bounds a sync that
 * rewrites most of a large note.
 */
export const DOC_DIFF_MAX_EDITS = 400;

/**
 * The changes that turn `prev` into `next`: one per changed region (a run of
 * changed lines, trimmed to its differing characters), ordered, with
 * positions in `prev`. Dispatching these instead of a whole-doc replace lets
 * CodeMirror map undo events and the selection through the edit, so an undo
 * lands where it was made, also when it sits between two changed regions.
 * Returns null when the docs differ by more than `DOC_DIFF_MAX_EDITS` line
 * edits; the caller then has no local mapping for the undo history.
 */
export function docDiff(prev: string, next: string): DocChange[] | null {
	if (prev === next) return [];
	const a = splitLines(prev);
	const b = splitLines(next);

	let head = 0;
	while (head < a.length && head < b.length && a[head] === b[head]) head++;
	let tail = 0;
	while (tail < a.length - head && tail < b.length - head && a[a.length - 1 - tail] === b[b.length - 1 - tail]) {
		tail++;
	}

	const hunks = diffLines(a.slice(head, a.length - tail), b.slice(head, b.length - tail));
	if (!hunks) return null;

	// Character offset of each line start in `prev` / `next`.
	const aStart = lineStarts(a);
	const bStart = lineStarts(b);
	const changes: DocChange[] = [];
	for (const h of hunks) {
		const from = aStart[head + h.aFrom];
		const to = aStart[head + h.aTo];
		const insert = next.slice(bStart[head + h.bFrom], bStart[head + h.bTo]);
		changes.push(trim(prev.slice(from, to), insert, from));
	}
	return changes;
}

/** Splits `s` into lines, each keeping its trailing `\n`. */
function splitLines(s: string): string[] {
	const out: string[] = [];
	let start = 0;
	for (;;) {
		const i = s.indexOf('\n', start);
		if (i < 0) break;
		out.push(s.slice(start, i + 1));
		start = i + 1;
	}
	if (start < s.length) out.push(s.slice(start));
	return out;
}

/** Offsets of each line start, plus the end of the text as the last entry. */
function lineStarts(lines: string[]): number[] {
	const out = [0];
	for (const line of lines) out.push(out[out.length - 1] + line.length);
	return out;
}

/** Narrows the replacement of `old` (at `offset`) by `insert` to the characters that differ. */
function trim(old: string, insert: string, offset: number): DocChange {
	const max = Math.min(old.length, insert.length);
	let start = 0;
	while (start < max && old.charCodeAt(start) === insert.charCodeAt(start)) start++;
	let end = 0;
	while (end < max - start && old.charCodeAt(old.length - 1 - end) === insert.charCodeAt(insert.length - 1 - end)) {
		end++;
	}
	return { from: offset + start, to: offset + old.length - end, insert: insert.slice(start, insert.length - end) };
}

/** A run of changed lines: `a[aFrom..aTo]` is replaced by `b[bFrom..bTo]`. */
interface Hunk {
	aFrom: number;
	aTo: number;
	bFrom: number;
	bTo: number;
}

/**
 * Myers' O((N+M)D) line diff of `a` and `b`, grouped into hunks of adjacent
 * edits. Null past `DOC_DIFF_MAX_EDITS` edits.
 */
function diffLines(a: string[], b: string[]): Hunk[] | null {
	const n = a.length;
	const m = b.length;
	const limit = Math.min(n + m, DOC_DIFF_MAX_EDITS);
	const off = limit + 1;
	const v = new Int32Array(2 * limit + 3);
	const trace: Int32Array[] = [];
	let found = -1;
	for (let d = 0; d <= limit && found < 0; d++) {
		trace.push(v.slice());
		for (let k = -d; k <= d; k += 2) {
			let x = k === -d || (k !== d && v[off + k - 1] < v[off + k + 1]) ? v[off + k + 1] : v[off + k - 1] + 1;
			let y = x - k;
			while (x < n && y < m && a[x] === b[y]) {
				x++;
				y++;
			}
			v[off + k] = x;
			if (x >= n && y >= m) {
				found = d;
				break;
			}
		}
	}
	if (found < 0) return null;

	// Walk back from (n, m), collecting one hunk per run of edits with no
	// equal line between them.
	const hunks: Hunk[] = [];
	let x = n;
	let y = m;
	let open: Hunk | null = null;
	for (let d = found; d > 0; d--) {
		const vd = trace[d];
		const k = x - y;
		const prevK = k === -d || (k !== d && vd[off + k - 1] < vd[off + k + 1]) ? k + 1 : k - 1;
		const prevX = vd[off + prevK];
		const prevY = prevX - prevK;
		if (x > prevX && y > prevY) {
			// An equal line closes the hunk being built.
			open = null;
			while (x > prevX && y > prevY) {
				x--;
				y--;
			}
		}
		if (!open) {
			open = { aFrom: x, aTo: x, bFrom: y, bTo: y };
			hunks.push(open);
		}
		// One edit from (prevX, prevY): a deletion when x moved, an insertion when y did.
		x = prevX;
		y = prevY;
		open.aFrom = x;
		open.bFrom = y;
	}
	return hunks.reverse();
}
