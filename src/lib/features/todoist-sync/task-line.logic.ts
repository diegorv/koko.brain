/**
 * Token patches on a raw task line: each one changes a single field and keeps
 * every other character of the line. The sync computes the new line here and
 * the writer only swaps the expected line for it. Design:
 * `.scratch/todoist-bisync/research/design.md` rules 4 and 5.
 *
 * The regexes mirror the Rust task parser in `src-tauri/src/vault/parsing.rs`;
 * each names the constant it copies. Tags follow the note tag rule, read with
 * `findInlineTags`, the TS mirror of Rust `scan_inline_tags`.
 */

import { findInlineTags, INLINE_TAG_NAME_SOURCE } from '#lib/utils/tag-extraction.js';
import { insertToken, removeSpans, setDueToken, setPriorityToken, trailingBlockId, type PriorityEmoji, type Span } from '#lib/utils/task-tokens.js';

export { PRIORITY_EMOJIS, trailingBlockId, type PriorityEmoji } from '#lib/utils/task-tokens.js';

/** Whether a task line is set open or closed. */
export type TaskLineState = 'open' | 'closed';

/** Result of a description replace: the new line, or why it was refused. */
export type DescriptionPatch =
	| { kind: 'line'; line: string }
	| { kind: 'conflict'; reason: 'mid-sentence' | 'no-description' };

/** Why Todoist content would not survive a write into a line and a parse back. */
export type RoundTripProblem = 'newline' | 'empty' | 'hash' | 'signifier' | 'whitespace';

/**
 * Task line split around the status char. Rust `TASK_RE` and
 * `ORDERED_TASK_RE`: group 1 is indent + marker + `[`, group 2 the status
 * char, group 3 `] ` and group 4 the text. The text group is `[^\n]*`, not
 * `.*`: Rust's `.` matches `\r`, so a CRLF line is a task there too.
 */
const TASK_LINE_RES = [
	/^(\s*[-*+]\s\[)([xX \-/?!>])(\]\s)([^\n]*)$/u,
	/^(\s*\d+\.\s\[)([xX \-/?!>])(\]\s)([^\n]*)$/u,
];

/** Every signifier emoji the parser reads (Rust `DATE_EMOJIS`, `PRIORITY_EMOJIS`, the id/recurrence/depends/completion consts). */
const SIGNIFIER_CHARS = '📅⏳🛫➕✅❌🔺⏫🔼🔽⏬🔁🆔⛔🏁';

/** Where the recurrence text stops, Rust `RECURRENCE_RE` alternatives (everything but `🔁`). */
const RECURRENCE_STOP = `[📅⏳🛫➕✅❌🔺⏫🔼🔽⏬🆔⛔🏁]\\uFE0F?|#[A-Za-z0-9_]`;

/** A wikilink, markdown link or bare URL. */
const LINK_SOURCE = String.raw`!?\[\[[^\]]*\]\]|!?\[[^\]]*\]\([^)]*\)|https?:\/\/\S+`;

/**
 * The non-word tokens of a task text, leftmost first. Group order decides
 * the kind: links, then signifiers with their values, then tags. A tag needs
 * the start or whitespace before its `#`, as in `findInlineTags`, so
 * `word#tag` and `#2026` stay words.
 */
const TOKEN_RE = new RegExp(
	[
		`(?<link>${LINK_SOURCE})`,
		String.raw`(?<due>📅️?(?:\s*\d{4}-\d{2}-\d{2})?)`,
		String.raw`(?<date>[⏳🛫➕✅❌]️?(?:\s*\d{4}-\d{2}-\d{2})?)`,
		String.raw`(?<priority>[🔺⏫🔼🔽⏬]️?)`,
		String.raw`(?<recurrence>🔁️?(?:\s*.+?(?=\s*(?:${RECURRENCE_STOP})|$))?)`,
		String.raw`(?<id>🆔️?(?:\s*\S+)?)`,
		String.raw`(?<depends>⛔️?(?:\s*[^,\s]+(?:\s*,\s*[^,\s]+)*)?)`,
		String.raw`(?<completion>🏁️?(?:\s*\S+)?)`,
		`(?<tag>(?<!\\S)#${INLINE_TAG_NAME_SOURCE})`,
	].join('|'),
	'gu'
);

/** What a span of task text is, for the mid-sentence rule. */
type TokenKind = 'word' | 'link' | 'tag' | 'mapped' | 'unmapped';

interface Token {
	kind: TokenKind;
	start: number;
	end: number;
}

interface TaskLineParts {
	prefix: string;
	status: string;
	separator: string;
	text: string;
}

function splitTaskLine(line: string): TaskLineParts | null {
	for (const re of TASK_LINE_RES) {
		const m = re.exec(line);
		if (m) return { prefix: m[1], status: m[2], separator: m[3], text: m[4] };
	}
	return null;
}

/**
 * The text of a task line after `[ ] ` (Rust `Task.text`), or null when the
 * line is no task.
 */
export function taskLineText(line: string): string | null {
	return splitTaskLine(line)?.text ?? null;
}

/** The status char of a task line, or null when the line is no task. */
export function taskLineStatus(line: string): string | null {
	return splitTaskLine(line)?.status ?? null;
}

/** Whether a status char means closed (design rule 5): `x`, `X` or `-`. `[/] [?] [!] [>]` are open. */
export function isClosedStatus(status: string): boolean {
	return status === 'x' || status === 'X' || status === '-';
}

/**
 * The status char {@link setTaskStatus} writes over `status`: closing keeps
 * `x`, `X` and `-`, otherwise `x`; opening keeps ` / ? ! >`, otherwise a space.
 */
export function nextStatusChar(status: string, state: TaskLineState): string {
	const closed = isClosedStatus(status);
	if (state === 'closed') return closed ? status : 'x';
	return closed ? ' ' : status;
}

function joinTaskLine(parts: TaskLineParts): string {
	return parts.prefix + parts.status + parts.separator + parts.text;
}

/** Applies `patch` to the text of a task line; null for a non-task line. */
function patchText(line: string, patch: (text: string) => string): string | null {
	const parts = splitTaskLine(line);
	if (!parts) return null;
	return joinTaskLine({ ...parts, text: patch(parts.text) });
}

/**
 * Sets the status char per design rule 5. Closing keeps `x`, `X` and `-`,
 * otherwise writes `x`; opening keeps ` / ? ! >`, otherwise writes a space.
 * Returns null for a non-task line.
 */
export function setTaskStatus(line: string, state: TaskLineState): string | null {
	const parts = splitTaskLine(line);
	if (!parts) return null;
	return joinTaskLine({ ...parts, status: nextStatusChar(parts.status, state) });
}

/**
 * Sets the `📅 YYYY-MM-DD` due date of a task line, or removes every one when
 * `date` is null (`setDueToken`). Returns null for a non-task line.
 */
export function setDueDate(line: string, date: string | null): string | null {
	return patchText(line, (text) => setDueToken(text, date));
}

/**
 * Sets the priority emoji of a task line, or removes every one when `emoji`
 * is null (`setPriorityToken`). Returns null for a non-task line.
 */
export function setPriority(line: string, emoji: PriorityEmoji | null): string | null {
	return patchText(line, (text) => setPriorityToken(text, emoji));
}

/**
 * Whether `#name` is read back as exactly the tag `name` (design rule 8): a
 * letter or `_` first, then letters, digits, `_`, `/` and `-`, no trailing
 * `/`. So `2026`, `-x`, `work/` and `two words` are no task tag names.
 */
export function isTaskTagName(name: string): boolean {
	return findInlineTags(`#${name}`)[0]?.tag === name;
}

/**
 * Every `#tag` the parser reads as this tag, case-insensitive, outside links:
 * `#` at the start or after whitespace (not `word#tag` or `(#tag)`), and a
 * following tag char makes it a longer tag. Tags inside markdown links and
 * URLs are skipped, so the parser can still read one there.
 *
 * Known gap: this scans the raw text, while Rust `parse_task_metadata` scans
 * after it strips the signifiers. A tag glued to a signifier (`🔺#shop`,
 * `📅 2026-11-13#shop`) is a tag to Rust but not here, so `removeTag` keeps it
 * and `addTag` adds a second one. The sync always writes a space before a tag,
 * so only a hand-typed line hits this.
 */
function tagMatches(text: string, tag: string): Span[] {
	const links = [...text.matchAll(new RegExp(LINK_SOURCE, 'gu'))].map((m) => [m.index, m.index + m[0].length]);
	const lower = tag.toLowerCase();
	return findInlineTags(text).filter((t) => t.tag.toLowerCase() === lower && !links.some(([start, end]) => t.from >= start && t.from < end));
}

function assertTagName(tag: string): void {
	if (!isTaskTagName(tag)) throw new Error(`Not a task tag name: ${tag}`);
}

/**
 * Adds `#tag` before the anchor (or at the end). A no-op when the parser
 * already reads the tag outside a link, compared case-insensitively. Throws
 * when `tag` fails `isTaskTagName`. Returns null for a non-task line.
 */
export function addTag(line: string, tag: string): string | null {
	assertTagName(tag);
	return patchText(line, (text) => (tagMatches(text, tag).length > 0 ? text : insertToken(text, `#${tag}`)));
}

/**
 * Removes every `#tag` the parser reads outside a link, case-insensitively.
 * Tag text inside links is kept, and the parser can still read it as a tag
 * (`[see #tag](url)`), so callers compare the parsed result. Throws when `tag`
 * fails `isTaskTagName`. Returns null for a non-task line.
 */
export function removeTag(line: string, tag: string): string | null {
	assertTagName(tag);
	return patchText(line, (text) => removeSpans(text, tagMatches(text, tag)));
}

function tokenKind(groups: Record<string, string | undefined>): TokenKind {
	if (groups.link !== undefined) return 'link';
	if (groups.tag !== undefined) return 'tag';
	if (groups.due !== undefined || groups.priority !== undefined || groups.id !== undefined) return 'mapped';
	return 'unmapped';
}

/** Splits task text into tokens and the whitespace-separated words between them. */
function tokenize(text: string): Token[] {
	const tokens: Token[] = [];
	const pushWords = (from: number, to: number) => {
		for (const w of text.slice(from, to).matchAll(/\S+/gu)) {
			tokens.push({ kind: 'word', start: from + w.index, end: from + w.index + w[0].length });
		}
	};
	let cursor = 0;
	for (const m of text.matchAll(TOKEN_RE)) {
		pushWords(cursor, m.index);
		tokens.push({ kind: tokenKind(m.groups ?? {}), start: m.index, end: m.index + m[0].length });
		cursor = m.index + m[0].length;
	}
	pushWords(cursor, text.length);
	return tokens;
}

/**
 * Replaces the description words of a task line (design rule 4). Links count
 * as words, since the parser keeps them in the description; the span from
 * the first to the last word is replaced. Returns a conflict instead of a
 * line when a tag, link or signifier sits between the first and the last
 * word, since replacing the span would lose it; also when there is no word.
 * Tokens before the first word (`- [ ] #todoist Call Bob`) or after the last
 * stay in place, and so does a block id that ends the line. Returns null for
 * a non-task line.
 */
export function replaceDescription(line: string, description: string): DescriptionPatch | null {
	const parts = splitTaskLine(line);
	if (!parts) return null;
	const tokens = tokenize(parts.text);
	if (trailingBlockId(parts.text) !== null && tokens.at(-1)?.kind === 'word') tokens.pop();
	const wordIndexes = tokens.flatMap((t, i) => (t.kind === 'word' || t.kind === 'link' ? [i] : []));
	if (wordIndexes.length === 0) return { kind: 'conflict', reason: 'no-description' };
	const first = wordIndexes[0];
	const last = wordIndexes[wordIndexes.length - 1];
	const midSentence = tokens.some((t, i) => i > first && i < last && t.kind !== 'word');
	if (midSentence) return { kind: 'conflict', reason: 'mid-sentence' };
	const { text } = parts;
	const newText = text.slice(0, tokens[first].start) + description + text.slice(tokens[last].end);
	return { kind: 'line', line: joinTaskLine({ ...parts, text: newText }) };
}

/**
 * Reports whether Todoist content, written as a line's description and parsed
 * back, would come out changed, without calling the parser: a newline, any
 * `#`, a signifier emoji (`🆔` included), or whitespace the parser collapses
 * or trims; empty or whitespace-only content, since the parser drops a task
 * with no text. Returns the first problem found, or null.
 */
export function contentRoundTripProblem(content: string): RoundTripProblem | null {
	if (/[\r\n]/u.test(content)) return 'newline';
	if (content.trim() === '') return 'empty';
	if (content.includes('#')) return 'hash';
	if (hasSignifier(content)) return 'signifier';
	if (/\s{2,}/u.test(content) || content !== content.trim()) return 'whitespace';
	return null;
}

const SIGNIFIER_RE = new RegExp(`[${SIGNIFIER_CHARS}]`, 'u');

/**
 * Whether the text holds a signifier emoji (`🆔` included), whatever other
 * round-trip problem it has: a line holding one would parse back with
 * metadata or an anchor that is not the item's.
 */
export function hasSignifier(text: string): boolean {
	return SIGNIFIER_RE.test(text);
}
