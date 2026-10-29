<script lang="ts">
	import FileText from '@lucide/svelte/icons/file-text';
	import { openFileInEditor } from '#lib/core/editor/editor.service.js';
	import ShowInCalendarButton from '#lib/features/event-calendar/ShowInCalendarButton.svelte';
	import type { BacklinkEntry } from './backlinks.types';

	let { entry }: { entry: BacklinkEntry } = $props();

	function handleClick() {
		openFileInEditor(entry.sourcePath);
	}
</script>

<!-- The calendar action is a sibling of the entry button: a button cannot nest in a button. -->
<div class="relative">
	<button
		class="w-full text-left rounded-md px-2 py-1 hover:bg-right-sidebar-accent transition-colors cursor-pointer"
		onclick={handleClick}
	>
		<div class="flex items-center gap-1.5 mb-1">
			<FileText class="size-3.5 shrink-0 text-right-sidebar-muted-fg" />
			<span class="text-[14px] truncate">{entry.sourceName}</span>
		</div>
		{#each entry.snippets as snippet}
			<p class="text-[14px] text-right-sidebar-muted-fg leading-relaxed pl-5 truncate">
				{#if snippet.linkStart >= 0 && snippet.linkEnd > snippet.linkStart && snippet.linkEnd <= snippet.text.length}
					{snippet.text.substring(0, snippet.linkStart)}<span class="text-right-sidebar-primary font-semibold">{snippet.text.substring(snippet.linkStart, snippet.linkEnd)}</span>{snippet.text.substring(snippet.linkEnd)}
				{:else}
					{snippet.text}
				{/if}
			</p>
		{/each}
	</button>
	<ShowInCalendarButton path={entry.sourcePath} class="absolute right-1 top-0.5 bg-right-sidebar-bg" />
</div>
