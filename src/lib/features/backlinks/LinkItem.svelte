<script lang="ts">
	import { FileText } from 'lucide-svelte';
	import { openFileInEditor } from '$lib/core/editor/editor.service';
	import type { BacklinkEntry } from './backlinks.types';

	let { entry }: { entry: BacklinkEntry } = $props();

	function handleClick() {
		openFileInEditor(entry.sourcePath);
	}
</script>

<button
	class="w-full text-left rounded-md px-2 py-1 hover:bg-accent transition-colors cursor-pointer"
	onclick={handleClick}
>
	<div class="flex items-center gap-1.5 mb-1">
		<FileText class="size-3.5 shrink-0 text-muted-foreground" />
		<span class="text-[14px] truncate">{entry.sourceName}</span>
	</div>
	{#each entry.snippets as snippet}
		<p class="text-[14px] text-muted-foreground leading-relaxed pl-5 truncate">
			{#if snippet.linkStart >= 0 && snippet.linkEnd > snippet.linkStart && snippet.linkEnd <= snippet.text.length}
				{snippet.text.substring(0, snippet.linkStart)}<span class="text-primary font-semibold">{snippet.text.substring(snippet.linkStart, snippet.linkEnd)}</span>{snippet.text.substring(snippet.linkEnd)}
			{:else}
				{snippet.text}
			{/if}
		</p>
	{/each}
</button>
