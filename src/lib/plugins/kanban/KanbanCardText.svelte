<script lang="ts">
	import { parseCardSegments, type CardSegment } from './kanban.logic';
	import { COLOR_PRESET_BG, COLOR_PRESET_TEXT } from '$lib/utils/color-presets';
	import { Popover as PopoverPrimitive } from 'bits-ui';

	interface Props {
		text: string;
		tagColors?: Record<string, string>;
		onWikilinkClick?: (target: string, heading?: string) => void;
		onSetTagColor?: (tag: string, color: string) => void;
		onRemoveTagColor?: (tag: string) => void;
	}

	let { text, tagColors = {}, onWikilinkClick, onSetTagColor, onRemoveTagColor }: Props = $props();

	let segments = $derived(parseCardSegments(text));

	const COLOR_NAMES = ['blue', 'green', 'red', 'orange', 'purple', 'yellow', 'gray'] as const;
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
	{:else if seg.type === 'tag'}
		{#if onSetTagColor}
			<PopoverPrimitive.Root>
				<PopoverPrimitive.Trigger>
					{#snippet children()}
						<button
							class="inline cursor-pointer rounded-sm px-1 py-0.5 text-xs hover:ring-1 hover:ring-foreground/20"
							style="background: {COLOR_PRESET_BG[tagColors[seg.value] ?? 'gray']}; color: {COLOR_PRESET_TEXT[tagColors[seg.value] ?? 'gray']}"
							type="button"
						>
							#{seg.value}
						</button>
					{/snippet}
				</PopoverPrimitive.Trigger>
				<PopoverPrimitive.Content
					class="z-50 rounded-md border bg-popover p-2 shadow-md"
					sideOffset={4}
					align="start"
					onOpenAutoFocus={(e) => e.preventDefault()}
				>
					<div class="flex gap-1.5">
						{#each COLOR_NAMES as color}
							<button
								class="size-5 rounded-full ring-offset-1 transition-transform hover:scale-110 {tagColors[seg.value] === color ? 'ring-2 ring-foreground' : ''}"
								style="background: {COLOR_PRESET_TEXT[color]}"
								onmousedown={(e) => { e.preventDefault(); onSetTagColor?.(seg.value, color); }}
								title={color}
								type="button"
							></button>
						{/each}
					</div>
					{#if tagColors[seg.value] && tagColors[seg.value] !== 'gray'}
						<button
							class="mt-2 w-full rounded px-2 py-0.5 text-xs text-muted-foreground hover:bg-muted"
							onmousedown={(e) => { e.preventDefault(); onRemoveTagColor?.(seg.value); }}
							type="button"
						>
							Reset to default
						</button>
					{/if}
				</PopoverPrimitive.Content>
			</PopoverPrimitive.Root>
		{:else}
			<span
				class="rounded-sm px-1 py-0.5 text-xs"
				style="background: {COLOR_PRESET_BG[tagColors[seg.value] ?? 'gray']}; color: {COLOR_PRESET_TEXT[tagColors[seg.value] ?? 'gray']}"
			>
				#{seg.value}
			</span>
		{/if}
	{/if}
{/each}
