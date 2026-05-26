<script lang="ts">
	import { untrack } from 'svelte';
	import { editorStore } from '$lib/core/editor/editor.store.svelte';
	import { isVirtualTab } from '$lib/core/editor/editor.logic';
	import { countWords, countCharacters, estimateReadingTime } from './word-count.logic';

	let words = $state(0);
	let characters = $state(0);
	let readingTime = $state(1);

	let isMarkdown = $derived.by(() => {
		const tab = editorStore.activeTab;
		if (!tab || isVirtualTab(tab)) return false;
		return tab.path.endsWith('.md') || tab.path.endsWith('.markdown');
	});

	$effect(() => {
		const content = editorStore.activeTab?.content ?? '';

		const timer = setTimeout(() => {
			untrack(() => {
				words = countWords(content);
				characters = countCharacters(content);
				readingTime = estimateReadingTime(words);
			});
		}, 500);

		return () => clearTimeout(timer);
	});
</script>

{#if isMarkdown}
	<span class="word-count-stats">{words} words <span class="sep"></span> {characters} characters <span class="sep"></span> {readingTime} min read</span>
{/if}

<style>
	.sep {
		display: inline-block;
		width: 1px;
		height: 12px;
		margin: 0 6px;
		background: var(--status-bar-fg);
		opacity: 0.3;
		vertical-align: middle;
	}
</style>
