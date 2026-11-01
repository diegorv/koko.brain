import type { CompletionContext, CompletionResult, Completion } from '@codemirror/autocomplete';
import { getNoteName } from '#lib/core/filesystem/wikilink-resolution.logic.js';
import { fuzzyMatch } from '#lib/utils/fuzzy-match.js';
import type { NoteEntryV2, FrontmatterValue } from '#lib/types/vault-v2.types.js';
import { editorHost, type EditorHost } from '../../editor-host';
import { reportError } from '../live-preview/core/profiling';
import {
	detectWikilinkContext,
	matchFilesForWikilink,
	extractHeadingsFromContent,
	extractBlockIdsFromContent,
} from './completion.logic';

/** Reads the resolved target's content through the host. Returns null on read failure or when the target doesn't resolve. */
async function resolveTargetContent(host: EditorHost, target: string): Promise<string | null> {
	const resolved = host.resolveLink(target);
	if (!resolved) return null;
	try {
		return await host.readNote(resolved);
	} catch (err) {
		reportError('WIKILINK_COMPLETION', 'readNote failed:', err);
		return null;
	}
}

/** Pulls aliases from a Rust-parsed `NoteEntryV2.frontmatter`. Accepts both `aliases: [a, b]` and `alias: a`. */
function getAliasesFromEntry(entry: NoteEntryV2): string[] {
	const value: FrontmatterValue | undefined =
		entry.frontmatter['aliases'] ?? entry.frontmatter['alias'];
	if (value == null) return [];
	if (Array.isArray(value)) {
		return value.filter((v): v is string => typeof v === 'string');
	}
	if (typeof value === 'string') return [value];
	return [];
}

/**
 * Completion source for `[[wikilinks]]` (files, aliases, headings, block
 * IDs). Registered in the single shared `autocompletion()` instance built
 * in editor-extensions.ts.
 */
export async function wikilinkCompletionSource(context: CompletionContext): Promise<CompletionResult | null> {
	const { state, pos } = context;
	const docText = state.doc.toString();

	const match = detectWikilinkContext(docText, pos);
	if (!match) return null;

	if (match.mode === 'heading') {
		return buildHeadingCompletions(match, context);
	}

	if (match.mode === 'blockId') {
		return buildBlockIdCompletions(match, context);
	}

	return buildFileCompletions(match, context);
}

/** Builds file completions with alias support (alias entries come from cached Rust frontmatter). */
async function buildFileCompletions(
	match: ReturnType<typeof detectWikilinkContext> & {},
	context: CompletionContext,
): Promise<CompletionResult | null> {
	const { state } = context;
	// Aliases come from the note entries, which only a non-empty query needs.
	const { files, notes } = await state.facet(editorHost).listLinkCandidates(match.query.length > 0);

	// Build options from file names
	const fileOptions: Completion[] = matchFilesForWikilink(match.query, files).map((file) => ({
		label: file.nameWithoutExt,
		type: 'file',
		apply: (view, completion, from, to) => {
			const after = state.doc.sliceString(to, Math.min(to + 2, state.doc.length));
			const closingBrackets = after === ']]' ? '' : ']]';
			view.dispatch({
				changes: { from, to, insert: completion.label + closingBrackets },
				selection: { anchor: from + completion.label.length + closingBrackets.length },
			});
		},
	}));

	// Build options from aliases (Rust pre-parsed frontmatter - no per-file YAML re-parsing).
	const aliasOptions: Completion[] = [];
	if (match.query.length > 0) {
		for (const entry of notes) {
			const aliases = getAliasesFromEntry(entry);
			if (aliases.length === 0) continue;
			const noteName = getNoteName(entry.path);
			for (const alias of aliases) {
				const result = fuzzyMatch(match.query, alias);
				if (result.match) {
					aliasOptions.push({
						label: noteName,
						displayLabel: alias,
						detail: noteName,
						type: 'file',
						boost: -result.score,
						apply: (view, _completion, from, to) => {
							const after = state.doc.sliceString(to, Math.min(to + 2, state.doc.length));
							const closingBrackets = after === ']]' ? '' : ']]';
							const insertText = `${noteName}|${alias}`;
							view.dispatch({
								changes: { from, to, insert: insertText + closingBrackets },
								selection: { anchor: from + insertText.length + closingBrackets.length },
							});
						},
					});
				}
			}
		}
	}

	const options = [...fileOptions, ...aliasOptions];
	if (options.length === 0 && !context.explicit) return null;

	return {
		from: match.from,
		to: match.to,
		options,
		filter: false,
	};
}

/** Builds heading completions for `[[Note#query` */
async function buildHeadingCompletions(
	match: ReturnType<typeof detectWikilinkContext> & {},
	context: CompletionContext,
): Promise<CompletionResult | null> {
	const { state } = context;
	const target = match.target ?? '';

	let content: string | null;
	if (target === '') {
		// [[#heading → current document headings
		content = state.doc.toString();
	} else {
		content = await resolveTargetContent(state.facet(editorHost), target);
	}
	if (content === null) return null;

	const headings = extractHeadingsFromContent(content);
	let filtered: string[];
	if (match.query.length === 0) {
		filtered = headings;
	} else {
		filtered = headings
			.map((h) => ({ heading: h, ...fuzzyMatch(match.query, h) }))
			.filter((e) => e.match)
			.sort((a, b) => a.score - b.score)
			.map((e) => e.heading);
	}

	if (filtered.length === 0 && !context.explicit) return null;

	const options: Completion[] = filtered.map((heading) => ({
		label: heading,
		type: 'text',
		apply: (view, completion, from, to) => {
			const after = state.doc.sliceString(to, Math.min(to + 2, state.doc.length));
			const closingBrackets = after === ']]' ? '' : ']]';
			view.dispatch({
				changes: { from, to, insert: completion.label + closingBrackets },
				selection: { anchor: from + completion.label.length + closingBrackets.length },
			});
		},
	}));

	return {
		from: match.from,
		to: match.to,
		options,
		filter: false,
	};
}

/** Builds block ID completions for `[[Note#^query` */
async function buildBlockIdCompletions(
	match: ReturnType<typeof detectWikilinkContext> & {},
	context: CompletionContext,
): Promise<CompletionResult | null> {
	const { state } = context;
	const target = match.target ?? '';

	let content: string | null;
	if (target === '') {
		// [[#^blockId → current document block IDs
		content = state.doc.toString();
	} else {
		content = await resolveTargetContent(state.facet(editorHost), target);
	}
	if (content === null) return null;

	const blockIds = extractBlockIdsFromContent(content);
	let filtered: string[];
	if (match.query.length === 0) {
		filtered = blockIds;
	} else {
		filtered = blockIds
			.map((id) => ({ id, ...fuzzyMatch(match.query, id) }))
			.filter((e) => e.match)
			.sort((a, b) => a.score - b.score)
			.map((e) => e.id);
	}

	if (filtered.length === 0 && !context.explicit) return null;

	const options: Completion[] = filtered.map((id) => ({
		label: id,
		type: 'text',
		apply: (view, completion, from, to) => {
			const after = state.doc.sliceString(to, Math.min(to + 2, state.doc.length));
			const closingBrackets = after === ']]' ? '' : ']]';
			view.dispatch({
				changes: { from, to, insert: completion.label + closingBrackets },
				selection: { anchor: from + completion.label.length + closingBrackets.length },
			});
		},
	}));

	return {
		from: match.from,
		to: match.to,
		options,
		filter: false,
	};
}

