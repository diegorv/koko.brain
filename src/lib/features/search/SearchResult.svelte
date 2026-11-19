<script lang="ts">
	import FileText from '@lucide/svelte/icons/file-text';
	import { openFileInEditor } from '#lib/core/editor/editor.service.js';
	import { openNoteAt } from '#lib/core/editor/open-note-at.service.js';
	import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
	import ShowInCalendarButton from '#lib/features/event-calendar/ShowInCalendarButton.svelte';
	import { markdownToPlainText } from '#lib/utils/markdown-plain-text.js';
	import { relativePath } from '#lib/utils/path.js';
	import { sanitizeSnippetHtml } from './search.logic';
	import type {
		SearchResult,
		FtsSearchResult,
		SemanticSearchResult,
		HybridSearchResult,
	} from './search.types';

	let {
		ftsResult,
		semanticResult,
		hybridResult,
		legacyResult,
		tabindex,
	}: {
		ftsResult?: FtsSearchResult;
		semanticResult?: SemanticSearchResult;
		hybridResult?: HybridSearchResult;
		legacyResult?: SearchResult;
		/** The card button's tabindex: 0 on the list's one Tab stop, -1 on the other rows */
		tabindex?: number;
	} = $props();

	/** Build absolute file path from a vault-relative path */
	function toAbsolutePath(relativePath: string): string {
		const vault = vaultStore.path ?? '';
		if (relativePath.startsWith('/') || relativePath.startsWith(vault)) return relativePath;
		return vault ? `${vault}/${relativePath}` : relativePath;
	}

	/** Extract display title from a vault-relative path */
	function titleFromPath(path: string): string {
		return path.split('/').pop()?.replace(/\.md$/, '') ?? path;
	}

	/** Format a score as percentage */
	function pct(score: number): string {
		return `${Math.round(score * 100)}%`;
	}

	// --- Unified derived data ---

	let title = $derived(
		ftsResult ? ftsResult.title
			: semanticResult ? titleFromPath(semanticResult.sourcePath)
				: hybridResult ? hybridResult.title
					: legacyResult ? legacyResult.fileName
						: '',
	);

	let vaultRelPath = $derived(
		ftsResult ? ftsResult.path
			: semanticResult ? semanticResult.sourcePath
				: hybridResult ? hybridResult.path
					: legacyResult ? relativePath(vaultStore.path ?? '', legacyResult.filePath)
						: '',
	);

	/** Parent folder shown in the subtitle; empty for a note at the vault root. */
	let folder = $derived(
		vaultRelPath.includes('/') ? vaultRelPath.slice(0, vaultRelPath.lastIndexOf('/')) : '',
	);

	let heading = $derived(semanticResult?.heading ?? hybridResult?.heading ?? '');

	let rawSnippet = $derived(
		ftsResult ? (ftsResult.snippet ?? '')
			: semanticResult ? semanticResult.content.substring(0, 200)
				: hybridResult ? (hybridResult.snippet ?? '')
					: legacyResult && legacyResult.snippets.length > 0
						? legacyResult.snippets
							.map((s) => s.text)
							.join(' ... ')
							.substring(0, 200)
						: '',
	);

	/** Plain text, `<mark>` kept. The HTML path sanitizes this, so stripping runs first. */
	let snippet = $derived(markdownToPlainText(rawSnippet));

	let snippetIsHtml = $derived(!!ftsResult || !!hybridResult);

	let rightLabel = $derived(
		semanticResult ? pct(semanticResult.score)
			: legacyResult
				? `${legacyResult.matches.length} ${legacyResult.matches.length === 1 ? 'match' : 'matches'}`
				: '',
	);

	let badgeSource = $derived(hybridResult?.source ?? null);

	/** Absolute path of the note the result stands for. */
	let notePath = $derived(
		ftsResult ? toAbsolutePath(ftsResult.path)
			: semanticResult ? toAbsolutePath(semanticResult.sourcePath)
				: hybridResult ? toAbsolutePath(hybridResult.path)
					: legacyResult ? legacyResult.filePath
						: '',
	);

	async function handleClick() {
		if (ftsResult) {
			openFileInEditor(toAbsolutePath(ftsResult.path));
		} else if (semanticResult) {
			const path = toAbsolutePath(semanticResult.sourcePath);
			if (semanticResult.lineStart > 0) {
				await openNoteAt(path, { kind: 'line', line: semanticResult.lineStart });
			} else {
				await openFileInEditor(path);
			}
		} else if (hybridResult) {
			const path = toAbsolutePath(hybridResult.path);
			if (hybridResult.lineStart !== undefined && hybridResult.lineStart > 0) {
				await openNoteAt(path, { kind: 'line', line: hybridResult.lineStart });
			} else {
				await openFileInEditor(path);
			}
		} else if (legacyResult) {
			const position = legacyResult.matches[0]?.position;
			if (position !== undefined) {
				await openNoteAt(legacyResult.filePath, { kind: 'offset', offset: position });
			} else {
				openFileInEditor(legacyResult.filePath);
			}
		}
	}
</script>

<!-- Fixed-height wrapper ensures every card is exactly the same size -->
<div class="relative h-20 overflow-hidden" data-search-result>
	<button
		class="w-full h-full text-left px-2 py-2 hover:bg-file-explorer-accent/60 transition-colors cursor-pointer"
		{tabindex}
		onclick={handleClick}
	>
		<!-- A button holds only phrasing content, so every row is a span styled flex or block. -->
		<!-- Row 1: Icon + Title + optional right element -->
		<span class="flex items-center gap-1.5">
			<FileText class="size-3.5 shrink-0 text-file-explorer-muted-fg" />
			<span class="text-xs font-medium truncate" data-search-result-title>{title}</span>
			{#if badgeSource}
				<span
					class="text-label px-1 rounded-xs ml-auto shrink-0
						{badgeSource === 'both'
						? 'bg-file-explorer-primary/15 text-file-explorer-primary-tint-fg'
						: badgeSource === 'semantic'
							? 'bg-search-semantic-bg text-search-semantic-tint-fg'
							: 'bg-muted text-file-explorer-fg'}"
				>
					{badgeSource === 'both' ? 'Both' : badgeSource === 'semantic' ? 'Semantic' : 'Text'}
				</span>
			{:else if rightLabel}
				<span class="text-meta text-file-explorer-muted-fg ml-auto shrink-0">{rightLabel}</span>
			{/if}
		</span>

		<!-- Row 2: Subtitle (parent folder, then § heading). Rendered even when empty so every card keeps its rows. -->
		<span class="block text-meta truncate pl-5 text-file-explorer-muted-fg" data-search-result-subtitle>
			{folder}{#if heading}{folder ? ' ' : ''}<span class="text-file-explorer-primary">§ {heading}</span>{/if}
		</span>

		<!-- Row 3: Snippet — 2-line clamp -->
		<span class="text-xs text-file-explorer-muted-fg leading-tight pl-5 mt-0.5 line-clamp-2" data-search-result-snippet>
			{#if snippetIsHtml && snippet}
				{@html sanitizeSnippetHtml(snippet)}
			{:else}
				{snippet}
			{/if}
		</span>
	</button>
	{#if notePath}
		<!-- Sibling of the card button: a button cannot nest in a button. -->
		<ShowInCalendarButton path={notePath} class="absolute right-1 bottom-1 bg-list-bg" />
	{/if}
</div>
