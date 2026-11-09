/**
 * `🆔 td-…` anchors that tie a task line to a Todoist task, and the path
 * scope the sync reads lines from. Design: `.scratch/todoist-bisync/research/design.md`
 * (Anchor, rules 10 and 11).
 */

/** Prefix that marks a `🆔` value as a sync anchor rather than a user id. */
export const ANCHOR_PREFIX = 'td-';

/** The id signifier emoji (Rust `ID_EMOJI`, `src-tauri/src/vault/parsing.rs`). */
export const ID_EMOJI = '🆔';

/**
 * Every `🆔` token with its value, mirroring Rust `ID_RE`
 * (`🆔`, optional U+FE0F, optional space, non-whitespace value). The parser
 * keeps only the first match.
 */
export const ID_TOKEN_RE = /🆔️?\s*(\S+)/gu;

const ANCHOR_CHARS = '0123456789abcdefghijklmnopqrstuvwxyz';
const ANCHOR_RANDOM_LENGTH = 8;

/** The values of every `🆔` token on the line, in order. */
function idValues(line: string): string[] {
	return [...line.matchAll(ID_TOKEN_RE)].map((m) => m[1]);
}

/**
 * Reads the sync anchor (`td-…`, prefix included) from a line. Uses the first
 * `🆔` on the line, the one the parser keeps; returns null when there is none
 * or its value is not `td-` followed by at least one character.
 */
export function readAnchor(line: string): string | null {
	const first = idValues(line)[0];
	if (first === undefined || !first.startsWith(ANCHOR_PREFIX) || first.length === ANCHOR_PREFIX.length) {
		return null;
	}
	return first;
}

/**
 * Whether the line carries a user `🆔`: a value without the `td-` prefix, or a
 * bare `td-` that is no anchor. Such a line stays out of the sync: the parser
 * keeps only one id, so appending an anchor would not be read.
 */
export function hasForeignId(line: string): boolean {
	return idValues(line).some((value) => !value.startsWith(ANCHOR_PREFIX) || value === ANCHOR_PREFIX);
}

/** The anchor of a Todoist-born task: `td-<todoist id>`. */
export function anchorForTodoistId(todoistId: string): string {
	return `${ANCHOR_PREFIX}${todoistId}`;
}

/** The line token for an anchor: `🆔 td-…`. */
export function anchorToken(anchor: string): string {
	return `${ID_EMOJI} ${anchor}`;
}

/**
 * Generates a brain-born anchor, `td-` plus 8 random base36 chars, not present
 * in `taken`. `random` returns a number in [0, 1), like `Math.random`.
 */
export function generateAnchor(taken: ReadonlySet<string>, random: () => number = Math.random): string {
	for (;;) {
		let value = ANCHOR_PREFIX;
		for (let i = 0; i < ANCHOR_RANDOM_LENGTH; i++) {
			value += ANCHOR_CHARS[Math.floor(random() * ANCHOR_CHARS.length)];
		}
		if (!taken.has(value)) return value;
	}
}

/** A task line and the vault-relative path of the note it sits in. */
export interface AnchoredLineSource {
	/** Vault-relative note path. */
	relPath: string;
	/** The raw line text. */
	line: string;
}

/**
 * Maps each anchor to every line that carries it, in input order. Lines
 * without an anchor are skipped. Two or more occurrences mean a duplicated
 * anchor, which freezes that link (design rule 10).
 */
export function buildAnchorOccurrences<T extends AnchoredLineSource>(lines: readonly T[]): Map<string, T[]> {
	const map = new Map<string, T[]>();
	for (const item of lines) {
		const anchor = readAnchor(item.line);
		if (anchor === null) continue;
		const list = map.get(anchor);
		if (list) list.push(item);
		else map.set(anchor, [item]);
	}
	return map;
}

/**
 * Whether a vault-relative path may hold synced lines (design rule 11).
 * Excludes the templates folder (from settings), `_system/`, `.view` files
 * and `.kokobrain/`. An empty `templatesFolder` excludes nothing extra.
 */
export function isInSyncScope(relPath: string, templatesFolder: string): boolean {
	if (relPath.startsWith('_system/') || relPath.startsWith('.kokobrain/')) return false;
	if (relPath.endsWith('.view')) return false;
	const folder = templatesFolder.replace(/\/+$/, '');
	if (folder !== '' && (relPath === folder || relPath.startsWith(`${folder}/`))) return false;
	return true;
}
