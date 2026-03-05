<script lang="ts">
	import type { Snippet } from 'svelte';
	import * as Popover from '$lib/components/ui/popover';
	import { X } from 'lucide-svelte';
	import { TAG_COLOR_PRESET_ENTRIES } from './tag-colors.logic';
	import { hexToColorInputValue } from '$lib/core/settings/theme-editor.logic';

	interface Props {
		/** Currently selected hex color */
		currentColor?: string;
		/** Called when a color is selected (undefined = remove) */
		onSelect: (color: string | undefined) => void;
		/** Trigger element snippet */
		children: Snippet;
	}

	let { currentColor, onSelect, children }: Props = $props();
	let open = $state(false);

	function handlePresetSelect(color: string | undefined) {
		onSelect(color);
		open = false;
	}

	function handleCustomColorInput(e: Event) {
		const value = (e.currentTarget as HTMLInputElement).value;
		onSelect(value);
	}
</script>

<Popover.Root bind:open>
	<Popover.Trigger class="shrink-0 cursor-pointer rounded-sm hover:bg-accent/50 transition-colors p-0.5">
		{@render children()}
	</Popover.Trigger>
	<Popover.Content class="w-auto p-0" side="bottom" align="start" sideOffset={4}>
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="color-picker" onpointerdown={(e) => e.stopPropagation()}>
			<button
				class="color-dot none"
				class:active={!currentColor}
				onclick={() => handlePresetSelect(undefined)}
				title="No color"
			>
				<X class="size-3" />
			</button>
			{#each TAG_COLOR_PRESET_ENTRIES as [name, hex]}
				<button
					class="color-dot"
					style:background-color={hex}
					class:active={currentColor === hex}
					onclick={() => handlePresetSelect(hex)}
					title={name}
				></button>
			{/each}
			<label
				class="color-dot custom"
				class:active={currentColor != null && !TAG_COLOR_PRESET_ENTRIES.some(([, hex]) => hex === currentColor)}
				style:background-color={currentColor ?? 'rgba(255, 255, 255, 0.1)'}
				title="Custom color"
			>
				<input
					type="color"
					class="absolute inset-0 h-full w-full cursor-pointer opacity-0"
					value={hexToColorInputValue(currentColor ?? '#000000')}
					oninput={handleCustomColorInput}
				/>
			</label>
		</div>
	</Popover.Content>
</Popover.Root>

<style>
	.color-picker {
		display: flex;
		gap: 4px;
		padding: 6px 10px;
		align-items: center;
	}

	.color-dot {
		width: 20px;
		height: 20px;
		border-radius: 50%;
		border: 2px solid transparent;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: border-color 0.15s;
		padding: 0;
	}

	.color-dot:hover {
		border-color: rgba(255, 255, 255, 0.5);
	}

	.color-dot.active {
		border-color: var(--foreground);
	}

	.color-dot.none {
		background: rgba(255, 255, 255, 0.1);
		color: var(--muted-foreground);
	}

	.color-dot.custom {
		position: relative;
		overflow: hidden;
	}
</style>
