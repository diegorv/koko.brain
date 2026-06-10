import { formatNow } from '$lib/utils/date';

/** Tokens recognised after `@`, in popup order. */
export const DATE_SHORTCUT_TOKENS = ['today', 'tomorrow', 'yesterday'] as const;

/** One of the recognised date-shortcut tokens. */
export type DateShortcutToken = (typeof DATE_SHORTCUT_TOKENS)[number];

/** Result of a successful `@token` detection at the cursor. */
export interface DateShortcutMatch {
	/** Offset of the `@` character within the searched text. */
	from: number;
	/** Cursor offset within the searched text (end of the typed query). */
	to: number;
	/** Tokens whose name starts with the typed query, in popup order. */
	matches: DateShortcutToken[];
}

/**
 * Detects an `@token` date shortcut ending at `pos`. Conservative on
 * purpose: the `@` must sit at a word boundary (the preceding character is
 * not a letter/digit/underscore), and everything between `@` and the cursor
 * must be letters that prefix-match a known token (case-insensitive) — so
 * email addresses (`eu@d…`) and unrelated `@mentions` never trigger.
 * Returns `null` when the popup should not open.
 */
export function detectDateShortcut(text: string, pos: number): DateShortcutMatch | null {
	let i = pos - 1;
	while (i >= 0 && /[a-zA-Z]/.test(text[i])) i--;
	if (i < 0 || text[i] !== '@') return null;
	if (i > 0 && /[\p{L}\p{N}_]/u.test(text[i - 1])) return null;
	const query = text.slice(i + 1, pos).toLowerCase();
	const matches = DATE_SHORTCUT_TOKENS.filter((t) => t.startsWith(query));
	if (matches.length === 0) return null;
	return { from: i, to: pos, matches };
}

/** Resolves a token to its `YYYY-MM-DD` date string (relative to now). */
export function dateForToken(token: DateShortcutToken): string {
	switch (token) {
		case 'today':
			return formatNow('YYYY-MM-DD');
		case 'tomorrow':
			return formatNow('YYYY-MM-DD', 1);
		case 'yesterday':
			return formatNow('YYYY-MM-DD', -1);
	}
}
