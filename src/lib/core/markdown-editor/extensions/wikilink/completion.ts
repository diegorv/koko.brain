import type { CompletionContext, CompletionResult, Completion } from '@codemirror/autocomplete';
import { autocompletion } from '@codemirror/autocomplete';
import type { Extension } from '@codemirror/state';
import { readTextFile } from '$lib/api';
import { invoke } from '$lib/api';
import { flattenFileTree } from '$lib/features/quick-switcher/quick-switcher.logic';
import { fsStore } from '$lib/core/filesystem/fs.store.svelte';
import { vaultStore } from '$lib/core/vault/vault.store.svelte';
import { resolveWikilink, getNoteName } from '$lib/features/backlinks/backlinks.logic';
import { fuzzyMatch } from '$lib/utils/fuzzy-match';
import { error } from '$lib/utils/debug';
import type { NoteEntryV2, FrontmatterValue } from '$lib/types/vault-v2.types';
import {
	detectWikilinkContext,
	matchFilesForWikilink,
	extractHeadingsFromContent,
	extractBlockIdsFromContent,
} from './completion.logic';

/**
 * Module-level cache of `NoteEntryV2[]` keyed by
 * `vaultStore.vaultIndexVersion`. The completion source is invoked on
 * every keystroke; without this cache each invocation would refetch the
 * full vault snapshot via IPC. Refresh happens lazily — when the version
 * differs from the last successful fetch.
 *
 * `pendingFetch` deduplicates concurrent calls (e.g. fast keystrokes
 * during the IPC roundtrip).
 */
let cachedEntries: NoteEntryV2[] = [];
let cachedVersion = -1;
let pendingFetch: Promise<NoteEntryV2[]> | null = null;

async function ensureEntriesCached(): Promise<NoteEntryV2[]> {
	const current = vaultStore.vaultIndexVersion;
	if (current === cachedVersion) return cachedEntries;
	if (pendingFetch) return pendingFetch;
	pendingFetch = (async () => {
		try {
			const fresh = await invoke<NoteEntryV2[]>('get_all_vault_entries_v2');
			cachedEntries = fresh;
			cachedVersion = current;
			return fresh;
		} finally {
			pendingFetch = null;
		}
	})();
	return pendingFetch;
}

/** Reads the resolved target's content from disk. Returns null on read failure or when the target doesn't resolve. */
async function resolveTargetContent(target: string): Promise<string | null> {
	const files = flattenFileTree(fsStore.fileTree);
	const allPaths = files.map((f) => f.path);
	const resolved = resolveWikilink(target, allPaths);
	if (!resolved) return null;
	try {
		return await readTextFile(resolved);
	} catch (err) {
		error('WIKILINK_COMPLETION', 'readTextFile failed:', err);
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

async function wikilinkCompletionSource(context: CompletionContext): Promise<CompletionResult | null> {
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

	// Build options from aliases (Rust pre-parsed frontmatter — no per-file YAML re-parsing)
	const aliasOptions: Completion[] = [];
	if (match.query.length > 0) {
		const entries = await ensureEntriesCached();
		for (const entry of entries) {
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
		content = await resolveTargetContent(target);
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
		content = await resolveTargetContent(target);
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
