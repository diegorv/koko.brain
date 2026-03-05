<script lang="ts">
	import { detectWikilinkContext } from '$lib/core/markdown-editor/extensions/wikilink/completion.logic';
	import { matchFilesForWikilink } from '$lib/core/markdown-editor/extensions/wikilink/completion.logic';
	import { flattenFileTree } from '$lib/features/quick-switcher/quick-switcher.logic';
	import { fsStore } from '$lib/core/filesystem/fs.store.svelte';

	interface Props {
		/** Current text content of the input/textarea */
		text: string;
		/** Current cursor position (selectionStart) */
		cursorPos: number;
		/** Called when user selects a file. Receives the replacement text and the range to replace. */
		onSelect: (filename: string, from: number, to: number) => void;
	}

	let { text, cursorPos, onSelect }: Props = $props();

	const MAX_SUGGESTIONS = 8;

	let selectedIndex = $state(0);

	let context = $derived(detectWikilinkContext(text, cursorPos));
	let isActive = $derived(context !== null && context.mode === 'file');

	let files = $derived.by(() => {
		if (!isActive || !context) return [];
		const allFiles = flattenFileTree(fsStore.fileTree);
		return matchFilesForWikilink(context.query, allFiles).slice(0, MAX_SUGGESTIONS);
	});

	let showSuggestions = $derived(isActive && files.length > 0);

	// Reset selected index when query changes
	$effect(() => {
		if (context?.query !== undefined) {
			selectedIndex = 0;
		}
	});

	/** Parent calls this on keydown. Returns true if event was consumed. */
	export function handleKeydown(e: KeyboardEvent): boolean {
		if (!showSuggestions) return false;

		switch (e.key) {
			case 'ArrowDown':
				e.preventDefault();
				selectedIndex = (selectedIndex + 1) % files.length;
				return true;
			case 'ArrowUp':
				e.preventDefault();
				selectedIndex = (selectedIndex - 1 + files.length) % files.length;
				return true;
			case 'Enter':
				e.preventDefault();
				selectItem(selectedIndex);
				return true;
			case 'Escape':
				e.preventDefault();
				return true;
			case 'Tab':
				e.preventDefault();
				selectItem(selectedIndex);
				return true;
			default:
				return false;
		}
	}

	function selectItem(index: number) {
		const file = files[index];
		if (!file || !context) return;
		// from = position after [[, minus 2 to include the [[ itself
		const bracketStart = context.from - 2;
		onSelect(file.nameWithoutExt, bracketStart, cursorPos);
	}
</script>

{#if showSuggestions}
	<div class="absolute left-0 right-0 z-50 mt-1 max-h-48 overflow-y-auto rounded-md border bg-popover shadow-md">
		{#each files as file, i}
			<button
				class="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors {i === selectedIndex ? 'bg-accent text-accent-foreground' : 'hover:bg-muted'}"
				onmousedown={(e) => { e.preventDefault(); selectItem(i); }}
				type="button"
			>
				<span class="truncate">{file.nameWithoutExt}</span>
			</button>
		{/each}
	</div>
{/if}
