/**
 * Due date and priority token patches on a task text (Rust `Task.text`, the
 * part after `[ ] `). Each one changes a single token and keeps every other
 * character. Shared by the Todoist sync (`todoist-sync/task-line.logic.ts`)
 * and the Tasks view row menu.
 *
 * The regexes mirror the Rust task parser in `src-tauri/src/vault/parsing.rs`;
 * each names the constant it copies. `task-line-edits.fixture.json` pins the
 * results against `parse_task_metadata`
 * (`src-tauri/tests/vault_task_line_edits_parity_test.rs`).
 */

/** Priority signifiers, highest to lowest (Rust `PRIORITY_EMOJIS`). */
export const PRIORITY_EMOJIS = ['🔺', '⏫', '🔼', '🔽', '⏬'] as const;

/** One of the priority signifier emojis. */
export type PriorityEmoji = (typeof PRIORITY_EMOJIS)[number];

/**
 * The id signifier emoji (Rust `ID_EMOJI`). The Todoist anchor is `🆔 td-…`;
 * `todoist-sync/anchor.logic.ts` holds its own copy, which `utils` cannot import.
 */
const ID_EMOJI = '🆔';

/** The recurrence signifier emoji (Rust `RECURRENCE_EMOJI`). */
const RECURRENCE_EMOJI = '🔁';

/** `📅` + date, Rust `build_date_regex` for the due emoji. */
export const DUE_RE = /📅️?\s*\d{4}-\d{2}-\d{2}/gu;

/** Any priority emoji, Rust `build_priority_regex`. */
export const PRIORITY_RE = /[🔺⏫🔼🔽⏬]️?/gu;

/** A block id ending the text, with the space before it and trailing whitespace. */
const TRAILING_BLOCK_ID_RE = / (\^[\w-]+)\s*$/u;

/**
 * The block id that ends a task text (` ^id`, trailing whitespace allowed),
 * without its space; null without one. Only the end of the line counts
 * (`live-preview/parsers/block-reference.ts`). The parser keeps it in the
 * description.
 */
export function trailingBlockId(text: string): string | null {
	return TRAILING_BLOCK_ID_RE.exec(text)?.[1] ?? null;
}

/**
 * Removes `[start, end)` and the whitespace run before it; at the text start,
 * the run after it. A span glued to a word on the left (`milk🔺`) loses
 * only itself, so the word keeps its gap to whatever follows.
 */
function removeSpan(text: string, start: number, end: number): string {
	const before = /\s+$/u.exec(text.slice(0, start));
	if (before) return text.slice(0, start - before[0].length) + text.slice(end);
	if (start > 0) return text.slice(0, start) + text.slice(end);
	const after = /^\s+/u.exec(text.slice(end));
	return text.slice(end + (after ? after[0].length : 0));
}

/** A `[from, to)` span of task text. */
export interface Span {
	/** First index of the span. */
	from: number;
	/** Index after the span's last character. */
	to: number;
}

/** Removes the given spans, right to left so offsets stay valid. */
export function removeSpans(text: string, spans: readonly Span[]): string {
	return spans.reduceRight((acc, s) => removeSpan(acc, s.from, s.to), text);
}

/** Removes every match of a global regex. */
function removeAll(text: string, re: RegExp): string {
	return removeSpans(text, [...text.matchAll(re)].map((m) => ({ from: m.index, to: m.index + m[0].length })));
}

/** Inserts `token` and a space at `index`, adding a space before it when glued to a word. */
function insertBefore(text: string, index: number, token: string): string {
	const gap = index > 0 && !/\s/u.test(text[index - 1]) ? ' ' : '';
	return `${text.slice(0, index)}${gap}${token} ${text.slice(index)}`;
}

/**
 * Inserts a token before the first `🆔`; without one, before a block id that
 * ends the text, so `^id` stays last and keeps resolving; otherwise at the
 * end before trailing whitespace. With a block id and a `🔁`, it goes before
 * the `🔁`: Rust `RECURRENCE_RE` can run up to the block id, and a token
 * between them would leave its removed gap inside the parsed recurrence.
 */
export function insertToken(text: string, token: string): string {
	const idIndex = text.indexOf(ID_EMOJI);
	if (idIndex >= 0) return insertBefore(text, idIndex, token);
	const blockId = TRAILING_BLOCK_ID_RE.exec(text);
	const recurrenceIndex = blockId ? text.indexOf(RECURRENCE_EMOJI) : -1;
	if (recurrenceIndex >= 0) return insertBefore(text, recurrenceIndex, token);
	const tailStart = blockId ? blockId.index : text.length - (/\s*$/u.exec(text)?.[0].length ?? 0);
	const body = text.slice(0, tailStart);
	const tail = text.slice(tailStart);
	return body === '' ? token + tail : `${body} ${token}${tail}`;
}

/**
 * Sets the `📅 YYYY-MM-DD` due date, or removes every one when `date` is
 * null. An existing date is replaced in place (the parser reads the leftmost);
 * a missing one goes where {@link insertToken} puts it.
 */
export function setDueToken(text: string, date: string | null): string {
	if (date === null) return removeAll(text, DUE_RE);
	const token = `📅 ${date}`;
	const m = new RegExp(DUE_RE.source, 'u').exec(text);
	if (!m) return insertToken(text, token);
	return text.slice(0, m.index) + token + text.slice(m.index + m[0].length);
}

/**
 * Sets the priority emoji, or removes every one when `emoji` is null. The
 * first priority emoji is replaced in place and any other is dropped (the
 * parser picks by list order, not position); a missing one goes where
 * {@link insertToken} puts it.
 */
export function setPriorityToken(text: string, emoji: PriorityEmoji | null): string {
	if (emoji === null) return removeAll(text, PRIORITY_RE);
	const first = new RegExp(PRIORITY_RE.source, 'u').exec(text);
	if (!first) return insertToken(text, emoji);
	const head = text.slice(0, first.index) + emoji;
	return head + removeAll(text.slice(first.index + first[0].length), PRIORITY_RE);
}
