<script lang="ts">
	import FileText from '@lucide/svelte/icons/file-text';
	import { openFileInEditor } from '$lib/core/editor/editor.service';
	import { editorStore } from '$lib/core/editor/editor.store.svelte';
	import { vaultStore } from '$lib/core/vault/vault.store.svelte';
	import { relativePath } from '$lib/utils/path';
	import { sanitizeSnippetHtml, lineStartToOffset } from './search.logic';
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
	}: {
		ftsResult?: FtsSearchResult;
		semanticResult?: SemanticSearchResult;
		hybridResult?: HybridSearchResult;
		legacyResult?: SearchResult;
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

	let subtitle = $derived(
		ftsResult ? ftsResult.path
			: semanticResult
				? semanticResult.heading
					? `§ ${semanticResult.heading}`
					: semanticResult.sourcePath
				: hybridResult
					? hybridResult.heading
						? `§ ${hybridResult.heading}`
						: hybridResult.path
					: legacyResult
						? relativePath(vaultStore.path ?? '', legacyResult.filePath)
						: '',
	);

	let hasHeading = $derived(
		(semanticResult && !!semanticResult.heading) || (hybridResult && !!hybridResult.heading),
	);

	let snippet = $derived(
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

	let snippetIsHtml = $derived(!!ftsResult || !!hybridResult);

	let rightLabel = $derived(
		semanticResult ? pct(semanticResult.score)
			: legacyResult
				? `${legacyResult.matches.length} ${legacyResult.matches.length === 1 ? 'match' : 'matches'}`
				: '',
	);

	let badgeSource = $derived(hybridResult?.source ?? null);

	/**
	 * Converts a 1-indexed lineStart into the character offset expected by
	 * `pendingScrollPosition`, reading the freshly opened tab's content.
	 * Mirrors the wikilink anchor jump in MarkdownEditor.svelte (await the
	 * open, then compute the offset from `tab.content`). Skips the scroll
	 * when the open failed (active tab is not the requested file).
	 */
	function scrollToLine(absolutePath: string, lineStart: number) {
		const tab = editorStore.activeTab;
		if (!tab || tab.path !== absolutePath) return;
		editorStore.setPendingScrollPosition(lineStartToOffset(tab.content, lineStart));
	}

	async function handleClick() {
		if (ftsResult) {
			openFileInEditor(toAbsolutePath(ftsResult.path));
		} else if (semanticResult) {
			const path = toAbsolutePath(semanticResult.sourcePath);
			await openFileInEditor(path);
			if (semanticResult.lineStart > 0) {
				scrollToLine(path, semanticResult.lineStart);
			}
		} else if (hybridResult) {
			const path = toAbsolutePath(hybridResult.path);
			await openFileInEditor(path);
			if (hybridResult.lineStart !== undefined && hybridResult.lineStart > 0) {
				scrollToLine(path, hybridResult.lineStart);
			}
		} else if (legacyResult) {
			openFileInEditor(legacyResult.filePath);
			if (legacyResult.matches[0]?.position !== undefined) {
				requestAnimationFrame(() => {
					editorStore.setPendingScrollPosition(legacyResult!.matches[0].position);
				});
			}
		}
	}
</script>

<!-- Fixed-height wrapper ensures every card is exactly the same size -->
<div class="h-20 overflow-hidden">
	<button
		class="w-full h-full text-left px-2 py-2 hover:bg-file-explorer-accent/60 transition-colors cursor-pointer"
		onclick={handleClick}
	>
		<!-- Row 1: Icon + Title + optional right element -->
		<div class="flex items-center gap-1.5">
			<FileText class="size-3.5 shrink-0 text-file-explorer-muted-fg" />
			<span class="text-xs font-medium truncate">{title}</span>
			{#if badgeSource}
				<span
					class="text-[9px] px-1 rounded ml-auto shrink-0
						{badgeSource === 'both'
						? 'bg-file-explorer-primary/15 text-file-explorer-primary'
						: badgeSource === 'semantic'
							? 'bg-search-semantic-bg text-search-semantic-fg'
							: 'bg-muted text-file-explorer-muted-fg'}"
				>
					{badgeSource === 'both' ? 'Both' : badgeSource === 'semantic' ? 'Semantic' : 'Text'}
				</span>
			{:else if rightLabel}
				<span class="text-[10px] text-file-explorer-fg/40 ml-auto shrink-0">{rightLabel}</span>
			{/if}
		</div>

		<!-- Row 2: Subtitle (path or § heading) — always present -->
		<p class="text-[10px] truncate pl-5 {hasHeading ? 'text-file-explorer-primary/70' : 'text-file-explorer-fg/40'}">
			{subtitle}
		</p>

		<!-- Row 3: Snippet — 2-line clamp -->
		<p class="text-xs text-file-explorer-fg/60 leading-tight pl-5 mt-0.5 line-clamp-2">
			{#if snippetIsHtml && snippet}
				{@html sanitizeSnippetHtml(snippet)}
			{:else}
				{snippet}
			{/if}
		</p>
	</button>
</div>
