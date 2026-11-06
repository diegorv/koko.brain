import type { CompletionContext, CompletionResult } from '@codemirror/autocomplete';
import { editorHost, type VaultTag } from '../../editor-host';
import { reportError } from '../live-preview/core/profiling';
import { detectTagContext, rankTags } from './completion.logic';

/**
 * Completion source for `#tags`: the vault's tags (through `editorHost`)
 * that the prefix typed after `#` fuzzy-matches, most-used first among equal
 * matches. Accepting one replaces the tag at the cursor (the typed prefix and
 * any tag characters after the cursor) with the full tag name.
 * Registered in the single shared `autocompletion()` instance built in
 * editor-extensions.ts.
 */
export async function tagCompletionSource(context: CompletionContext): Promise<CompletionResult | null> {
	const { state, pos } = context;
	const line = state.doc.lineAt(pos);
	// The detector reads the whole document (fences, frontmatter); skip the
	// copy on the keystrokes whose line has no `#` before the cursor.
	if (!line.text.slice(0, pos - line.from).includes('#')) return null;

	const match = detectTagContext(state.doc.toString(), pos);
	if (!match) return null;

	let tags: readonly VaultTag[];
	try {
		tags = await state.facet(editorHost).listTags();
	} catch (err) {
		reportError('TAG_COMPLETION', 'listTags failed:', err);
		return null;
	}

	const ranked = rankTags(match.query, tags);
	if (ranked.length === 0) return null;

	return {
		from: match.from,
		to: match.to,
		options: ranked.map((tag) => ({ label: tag.name, type: 'keyword' })),
		filter: false,
	};
}
