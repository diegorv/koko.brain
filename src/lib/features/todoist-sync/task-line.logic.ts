/**
 * Token patches on a raw task line: each one changes a single field and keeps
 * every other character of the line. The sync computes the new line here and
 * the writer only swaps the expected line for it. Design:
 * `.scratch/todoist-bisync/research/design.md` rules 4 and 5.
 *
 * The regexes mirror the Rust task parser in `src-tauri/src/vault/parsing.rs`;
 * each names the constant it copies.
 */

import { ID_EMOJI } from './anchor.logic.js';

/** Priority signifiers, highest to lowest (Rust `PRIORITY_EMOJIS`). */
export const PRIORITY_EMOJIS = ['🔺', '⏫', '🔼', '🔽', '⏬'] as const;

/** One of the priority signifier emojis. */
export type PriorityEmoji = (typeof PRIORITY_EMOJIS)[number];

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

/**
 * Task tag name rule, Rust `TASK_TAG_RE` (`src-tauri/src/vault/parsing.rs`):
 * ASCII only, no leading hyphen.
 */
const TAG_NAME = '[A-Za-z0-9_][A-Za-z0-9_-]*';

/** Every signifier emoji the parser reads (Rust `DATE_EMOJIS`, `PRIORITY_EMOJIS`, the id/recurrence/depends/completion consts). */
const SIGNIFIER_CHARS = '📅⏳🛫➕✅❌🔺⏫🔼🔽⏬🔁🆔⛔🏁';

/** `📅` + date, Rust `build_date_regex` for the due emoji. */
const DUE_RE = /📅️?\s*\d{4}-\d{2}-\d{2}/gu;

/** Any priority emoji, Rust `build_priority_regex`. */
const PRIORITY_RE = /[🔺⏫🔼🔽⏬]️?/gu;

/** Where the recurrence text stops, Rust `RECURRENCE_RE` alternatives (everything but `🔁`). */
const RECURRENCE_STOP = `[📅⏳🛫➕✅❌🔺⏫🔼🔽⏬🆔⛔🏁]\\uFE0F?|#[A-Za-z0-9_]`;

/** A wikilink, markdown link or bare URL. */
const LINK_SOURCE = String.raw`!?\[\[[^\]]*\]\]|!?\[[^\]]*\]\([^)]*\)|https?:\/\/\S+`;

/**
 * The non-word tokens of a task text, leftmost first. Group order decides
 * the kind: links, then signifiers with their values, then tags.
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
		`(?<tag>#${TAG_NAME})`,
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
 * Removes `[start, end)` and the whitespace run before it; at the text start,
 * the run after it. A span glued to a word on the left (`milk#shop`) loses
 * only itself, so the word keeps its gap to whatever follows.
 */
function removeSpan(text: string, start: number, end: number): string {
	const before = /\s+$/u.exec(text.slice(0, start));
	if (before) return text.slice(0, start - before[0].length) + text.slice(end);
	if (start > 0) return text.slice(0, start) + text.slice(end);
	const after = /^\s+/u.exec(text.slice(end));
	return text.slice(end + (after ? after[0].length : 0));
}

/** Removes the given matches, right to left so offsets stay valid. */
function removeMatches(text: string, matches: readonly RegExpExecArray[]): string {
	return [...matches].reverse().reduce((acc, m) => removeSpan(acc, m.index, m.index + m[0].length), text);
}

/** Removes every match of a global regex. */
function removeAll(text: string, re: RegExp): string {
	return removeMatches(text, [...text.matchAll(re)]);
}

/** Inserts a token before the first `🆔`, or at the end before trailing whitespace. */
function insertToken(text: string, token: string): string {
	const idIndex = text.indexOf(ID_EMOJI);
	if (idIndex >= 0) {
		const gap = idIndex > 0 && !/\s/u.test(text[idIndex - 1]) ? ' ' : '';
		return `${text.slice(0, idIndex)}${gap}${token} ${text.slice(idIndex)}`;
	}
	const trailing = /\s*$/u.exec(text)?.[0] ?? '';
	const body = text.slice(0, text.length - trailing.length);
	return body === '' ? token + trailing : `${body} ${token}${trailing}`;
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
 * Sets the `📅 YYYY-MM-DD` due date, or removes every one when `date` is
 * null. An existing date is replaced in place (the parser reads the leftmost);
 * a missing one is inserted before the anchor. Returns null for a non-task line.
 */
export function setDueDate(line: string, date: string | null): string | null {
	return patchText(line, (text) => {
		if (date === null) return removeAll(text, DUE_RE);
		const token = `📅 ${date}`;
		const m = new RegExp(DUE_RE.source, 'u').exec(text);
		if (!m) return insertToken(text, token);
		return text.slice(0, m.index) + token + text.slice(m.index + m[0].length);
	});
}

/**
 * Sets the priority emoji, or removes every one when `emoji` is null. The
 * first priority emoji is replaced in place and any other is dropped (the
 * parser picks by list order, not position); a missing one is inserted
 * before the anchor. Returns null for a non-task line.
 */
export function setPriority(line: string, emoji: PriorityEmoji | null): string | null {
	return patchText(line, (text) => {
		if (emoji === null) return removeAll(text, PRIORITY_RE);
		const first = new RegExp(PRIORITY_RE.source, 'u').exec(text);
		if (!first) return insertToken(text, emoji);
		const head = text.slice(0, first.index) + emoji;
		return head + removeAll(text.slice(first.index + first[0].length), PRIORITY_RE);
	});
}

/** Whether `name` matches the parser's whole tag rule (design rule 8). */
export function isTaskTagName(name: string): boolean {
	return new RegExp(`^${TAG_NAME}$`, 'u').test(name);
}

/**
 * Every `#tag` the parser reads as this tag, case-insensitive, outside links.
 * Rust `TASK_TAG_RE` has no left boundary, so `(#tag)` and `word#tag` count;
 * a following tag char makes it a longer tag. Tags inside `[[note#tag]]`,
 * markdown links and URLs are skipped, so the parser can still read one there.
 */
function tagMatches(text: string, tag: string): RegExpExecArray[] {
	const links = [...text.matchAll(new RegExp(LINK_SOURCE, 'gu'))].map((m) => [m.index, m.index + m[0].length]);
	return [...text.matchAll(new RegExp(`#${tag}(?![A-Za-z0-9_-])`, 'giu'))].filter(
		(m) => !links.some(([start, end]) => m.index >= start && m.index < end)
	);
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
 * Tag text inside links and wikilinks is kept, and the parser still reads it
 * as a tag, so callers compare the parsed result. Throws when `tag` fails
 * `isTaskTagName`. Returns null for a non-task line.
 */
export function removeTag(line: string, tag: string): string | null {
	assertTagName(tag);
	return patchText(line, (text) => removeMatches(text, tagMatches(text, tag)));
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
 * The block id that ends a task text (` ^id`, trailing whitespace allowed),
 * without its space; null without one. Only the end of the line counts
 * (`live-preview/parsers/block-reference.ts`). The parser keeps it in the
 * description, but it is no part of the Todoist content.
 */
export function trailingBlockId(text: string): string | null {
	return / (\^[\w-]+)\s*$/u.exec(text)?.[1] ?? null;
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
