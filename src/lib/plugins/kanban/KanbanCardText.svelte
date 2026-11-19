<script lang="ts">
	import { parseCardSegments, type CardSegment } from './kanban.logic';
	import { COLOR_PRESET_BG, COLOR_PRESET_CHIP_TEXT } from '#lib/utils/color-presets.js';

	interface Props {
		text: string;
		tagColors?: Record<string, string>;
		onWikilinkClick?: (target: string, heading?: string) => void;
		/** Called with the tag (no `#`) on a chip click. Without it the chips are plain text. */
		onTagClick?: (tag: string) => void;
		/** Skips the tag segments, for a view that shows tags elsewhere (the table's Tags column). */
		hideTags?: boolean;
	}

	let { text, tagColors = {}, onWikilinkClick, onTagClick, hideTags = false }: Props = $props();

	let segments = $derived(parseCardSegments(text));
</script>

{#each segments as seg}
	{#if seg.type === 'text'}
		{seg.value}
	{:else if seg.type === 'wikilink'}
		<button
			class="inline cursor-pointer text-primary underline decoration-primary/40 hover:decoration-primary"
			onclick={() => onWikilinkClick?.(seg.target, seg.heading)}
		>
			{seg.display}
		</button>
	{:else if seg.type === 'tag' && !hideTags}
		{#if onTagClick}
			<button
				class="inline cursor-pointer rounded-sm px-1 py-0.5 text-xs hover:ring-1 hover:ring-foreground/20"
				style="background: {COLOR_PRESET_BG[tagColors[seg.value] ?? 'gray']}; color: {COLOR_PRESET_CHIP_TEXT[tagColors[seg.value] ?? 'gray']}"
				type="button"
				onclick={() => onTagClick(seg.value)}
			>
				#{seg.value}
			</button>
		{:else}
			<span
				class="rounded-sm px-1 py-0.5 text-xs"
				style="background: {COLOR_PRESET_BG[tagColors[seg.value] ?? 'gray']}; color: {COLOR_PRESET_CHIP_TEXT[tagColors[seg.value] ?? 'gray']}"
			>
				#{seg.value}
			</span>
		{/if}
	{/if}
{/each}
