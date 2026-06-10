import type { CompletionContext, CompletionResult, Completion } from '@codemirror/autocomplete';
import { detectDateShortcut, dateForToken } from './completion.logic';

/**
 * Completion source for `@today` / `@tomorrow` / `@yesterday` date
 * shortcuts. Selecting an option inserts the plain `YYYY-MM-DD` string
 * (not a daily-note wikilink), replacing the typed `@query`.
 *
 * Detection is line-local and conservative (see completion.logic.ts):
 * the `@` must sit at a word boundary and the typed characters must
 * prefix-match a token, so emails never open the popup.
 *
 * Registered together with the wikilink source in ONE `autocompletion()`
 * instance (editor-extensions.ts) — the autocomplete config facet has no
 * combiner for `override`, so a second `autocompletion()` instance would
 * throw "Config merge conflict" at editor startup.
 */
export function dateShortcutCompletionSource(context: CompletionContext): CompletionResult | null {
	const { state, pos } = context;
	const line = state.doc.lineAt(pos);
	const match = detectDateShortcut(line.text, pos - line.from);
	if (!match) return null;

	const options: Completion[] = match.matches.map((token) => {
		const date = dateForToken(token);
		return {
			label: `@${token}`,
			detail: date,
			type: 'constant',
			apply: date,
		};
	});

	return { from: line.from + match.from, to: pos, options, filter: false };
}
