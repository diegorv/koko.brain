import type { CompletionContext, CompletionResult, Completion } from '@codemirror/autocomplete';
import { autocompletion } from '@codemirror/autocomplete';
import type { Extension } from '@codemirror/state';
import { flattenFileTree } from '$lib/features/quick-switcher/quick-switcher.logic';
import { fsStore } from '$lib/core/filesystem/fs.store.svelte';
import { noteIndexStore } from '$lib/features/backlinks/note-index.store.svelte';
import { resolveWikilink, getNoteName } from '$lib/features/backlinks/backlinks.logic';
import { fuzzyMatch } from '$lib/utils/fuzzy-match';
import {
	detectWikilinkContext,
	matchFilesForWikilink,
	extractHeadingsFromContent,
	extractBlockIdsFromContent,
	extractAliasesFromContent,
} from './completion.logic';

/** Returns the content for a resolved note target, or null */
function resolveTargetContent(target: string): string | null {
	const files = flattenFileTree(fsStore.fileTree);
	const allPaths = files.map((f) => f.path);
	const resolved = resolveWikilink(target, allPaths);
	if (!resolved) return null;
	return noteIndexStore.noteContents.get(resolved) ?? null;
}

function wikilinkCompletionSource(context: CompletionContext): CompletionResult | null {
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

/** Builds file completions with alias support */
function buildFileCompletions(
	match: ReturnType<typeof detectWikilinkContext> & {},
	context: CompletionContext,
): CompletionResult | null {
	const { state } = context;
	const files = flattenFileTree(fsStore.fileTree);

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

	// Build options from aliases
	const aliasOptions: Completion[] = [];
	if (match.query.length > 0) {
		for (const [filePath, content] of noteIndexStore.noteContents) {
			const aliases = extractAliasesFromContent(content);
			const noteName = getNoteName(filePath);
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
function buildHeadingCompletions(
	match: ReturnType<typeof detectWikilinkContext> & {},
	context: CompletionContext,
): CompletionResult | null {
	const { state } = context;
	const target = match.target ?? '';

	let content: string | null;
	if (target === '') {
		// [[#heading → current document headings
		content = state.doc.toString();
	} else {
		content = resolveTargetContent(target);
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
function buildBlockIdCompletions(
	match: ReturnType<typeof detectWikilinkContext> & {},
	context: CompletionContext,
): CompletionResult | null {
	const { state } = context;
	const target = match.target ?? '';

	let content: string | null;
	if (target === '') {
		// [[#^blockId → current document block IDs
		content = state.doc.toString();
	} else {
		content = resolveTargetContent(target);
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

export function wikilinkCompletion(): Extension {
	return autocompletion({
		override: [wikilinkCompletionSource],
		activateOnTyping: true,
	});
}
