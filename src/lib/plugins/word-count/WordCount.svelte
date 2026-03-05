<script lang="ts">
	import { untrack } from 'svelte';
	import { editorStore } from '$lib/core/editor/editor.store.svelte';
	import { countWords, countCharacters, estimateReadingTime } from './word-count.logic';

	let words = $state(0);
	let characters = $state(0);
	let readingTime = $state(1);

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

{#if editorStore.activeTab}
	<span>{words} words, {characters} characters, {readingTime} min read</span>
{/if}
