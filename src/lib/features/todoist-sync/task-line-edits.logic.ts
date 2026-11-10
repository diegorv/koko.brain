/**
 * The guarded task-line batch applied to a string, for notes open in a tab.
 * A port of Rust `apply_task_line_edits` (`src-tauri/src/vault/task_lines.rs`),
 * which does the same for notes on disk: same checks in the same order, same
 * stale reasons. Change both together. Design:
 * `.scratch/todoist-bisync/research/design.md` rule 12.
 */

import type { TaskLineEdits, TaskLinesStale, TaskLinesStaleReason } from '#lib/contracts/index.js';
import { idValues } from './anchor.logic.js';

/** Result of {@link applyTaskLineEdits}. */
export type TaskLineEditOutcome =
	/** The content after the batch. */
	| { kind: 'applied'; content: string }
	/** A check failed; the content is untouched. */
	| { kind: 'stale'; stale: TaskLinesStale };

/**
 * Rust `HEADING_RE`. The text group is `[^\n]*`, not `.*`: Rust's `.`
 * matches `\r`, so a line with a lone `\r` is a heading there too.
 */
const HEADING_RE = /^(#{1,6})\s+([^\n]*)$/u;

/**
 * Applies `edits` to `content`. Any edit on a CRLF note is stale. A line
 * carries an anchor when any of its `🆔` values equals it; two edits that
 * locate the same line are stale as `anchorDuplicated`. Anchors inside code
 * fences count too: being stale is the safe side.
 *
 * A replacement with `lineNumber` writes a line's first anchor: that line
 * must still equal `expectedLine`, and no line may carry the anchor yet.
 *
 * Throws on a batch the caller built wrong: a new or inserted line with a
 * line break, an anchor named by two replacements or removals, the same
 * anchor in two inserted lines, or a line-number replacement whose new line
 * does not carry its anchor.
 */
export function applyTaskLineEdits(content: string, edits: TaskLineEdits): TaskLineEditOutcome {
	validate(edits);
	const isEmpty = edits.replace.length === 0 && edits.insert.length === 0 && edits.remove.length === 0;
	if (!isEmpty && content.includes('\r\n')) return staleOutcome('crlfLineEndings', '');
	const lines = content.split('\n');

	// Locate every replacement and removal before changing anything.
	const replaced: [number, string][] = [];
	const removed: number[] = [];
	const taken = new Set<number>();
	const located: [string, string, string | null, number | undefined][] = [
		...edits.replace.map((r): [string, string, string | null, number | undefined] => [r.anchor, r.expectedLine, r.newLine, r.lineNumber]),
		...edits.remove.map((r): [string, string, string | null, number | undefined] => [r.anchor, r.expectedLine, null, undefined]),
	];
	for (const [anchor, expected, newLine, lineNumber] of located) {
		const at = lineNumber === undefined ? locate(lines, anchor, expected) : locateUnanchored(lines, lineNumber, anchor, expected);
		if (typeof at !== 'number') return { kind: 'stale', stale: at };
		if (taken.has(at)) return staleOutcome('anchorDuplicated', anchor);
		taken.add(at);
		if (newLine === null) removed.push(at);
		else replaced.push([at, newLine]);
	}
	for (const [at, newLine] of replaced) lines[at] = newLine;
	for (const at of removed.sort((a, b) => b - a)) lines.splice(at, 1);

	const present = new Set(lines.flatMap(idValues));
	const existing = edits.insert.flatMap((i) => i.lines.flatMap(idValues)).find((a) => present.has(a));
	if (existing !== undefined) return staleOutcome('anchorExists', existing);
	for (const insert of edits.insert) {
		let at: number;
		if (insert.afterHeading === null) {
			at = afterLastNonBlank(lines, 0, lines.length) ?? 0;
		} else {
			const end = sectionEnd(lines, insert.afterHeading);
			if (typeof end !== 'number') return { kind: 'stale', stale: end };
			at = end;
		}
		lines.splice(at, 0, ...insert.lines);
	}
	return { kind: 'applied', content: lines.join('\n') };
}

function validate(edits: TaskLineEdits): void {
	for (const line of [...edits.replace.map((r) => r.newLine), ...edits.insert.flatMap((i) => i.lines)]) {
		if (/[\n\r]/u.test(line)) throw new Error(`A task line may not hold a line break: ${JSON.stringify(line)}`);
	}
	const named = new Set<string>();
	for (const anchor of [...edits.replace, ...edits.remove].map((r) => r.anchor)) {
		if (named.has(anchor)) throw new Error(`Anchor ${anchor} is named by two edits`);
		named.add(anchor);
	}
	for (const r of edits.replace) {
		if (r.lineNumber !== undefined && !idValues(r.newLine).includes(r.anchor)) {
			throw new Error(`The new line for ${r.anchor} does not carry it: ${JSON.stringify(r.newLine)}`);
		}
	}
	const inserted = new Set<string>();
	for (const anchor of edits.insert.flatMap((i) => i.lines.flatMap(idValues))) {
		if (inserted.has(anchor)) throw new Error(`Anchor ${anchor} is inserted twice`);
		inserted.add(anchor);
	}
}

/** The index of the one line carrying `anchor`, if it equals `expected`. */
function locate(lines: readonly string[], anchor: string, expected: string): number | TaskLinesStale {
	const hits = lines.flatMap((line, i) => (idValues(line).includes(anchor) ? [i] : []));
	if (hits.length === 0) return stale('anchorMissing', anchor);
	if (hits.length > 1) return stale('anchorDuplicated', anchor);
	if (lines[hits[0]] !== expected) return stale('lineDiffers', anchor);
	return hits[0];
}

/** The index of 1-based line `lineNumber`, if it equals `expected` and no line carries `anchor` yet. */
function locateUnanchored(lines: readonly string[], lineNumber: number, anchor: string, expected: string): number | TaskLinesStale {
	const at = lineNumber - 1;
	if (at < 0 || lines[at] !== expected) return stale('lineDiffers', anchor);
	if (lines.some((line) => idValues(line).includes(anchor))) return stale('anchorExists', anchor);
	return at;
}

/**
 * Where lines inserted under `heading` go: after the last non-blank line
 * between it and the next heading of any level, or right below it.
 */
function sectionEnd(lines: readonly string[], heading: string): number | TaskLinesStale {
	const headings = headingIndexes(lines);
	const matches = headings.filter(([, text]) => text === heading);
	if (matches.length === 0) return stale('headingMissing', heading);
	if (matches.length > 1) return stale('headingDuplicated', heading);
	const at = matches[0][0];
	const end = headings.find(([i]) => i > at)?.[0] ?? lines.length;
	return afterLastNonBlank(lines, at + 1, end) ?? at + 1;
}

/** The index after the last non-blank line in `lines[from..to)`, if any. */
function afterLastNonBlank(lines: readonly string[], from: number, to: number): number | undefined {
	for (let i = to - 1; i >= from; i--) {
		if (lines[i].trim() !== '') return i + 1;
	}
	return undefined;
}

/** Rust `detect_code_fence`: the fence marker a line opens or closes, if any. */
export function codeFence(line: string): string | null {
	const trimmed = line.replace(/^[ \t]+/u, '');
	if (trimmed.startsWith('```')) return '```';
	if (trimmed.startsWith('~~~')) return '~~~';
	return null;
}

/** `[index, trimmed text]` of every heading outside frontmatter and code fences. */
function headingIndexes(lines: readonly string[]): [number, string][] {
	const out: [number, string][] = [];
	let start = 0;
	if (lines.length > 0 && lines[0].trimEnd() === '---') {
		const close = lines.findIndex((l, i) => i > 0 && l.trimEnd() === '---');
		if (close > 0) start = close + 1;
	}
	let fence: string | null = null;
	for (let i = start; i < lines.length; i++) {
		const marker = codeFence(lines[i]);
		if (marker !== null) {
			if (fence === null) fence = marker;
			else if (fence === marker) fence = null;
			continue;
		}
		if (fence !== null) continue;
		const m = HEADING_RE.exec(lines[i]);
		if (m) out.push([i, m[2].trim()]);
	}
	return out;
}

function stale(reason: TaskLinesStaleReason, subject: string): TaskLinesStale {
	return { reason, subject };
}

function staleOutcome(reason: TaskLinesStaleReason, subject: string): TaskLineEditOutcome {
	return { kind: 'stale', stale: stale(reason, subject) };
}
