<script lang="ts">
	import { CANVAS_COLOR_MAP } from './canvas.types';
	import type { CanvasColor } from './canvas.types';
	import { X } from 'lucide-svelte';

	interface Props {
		/** Currently selected color */
		currentColor?: CanvasColor;
		/** Called when a color is selected */
		onSelect: (color: CanvasColor | undefined) => void;
	}

	let { currentColor, onSelect }: Props = $props();

	const presets = Object.entries(CANVAS_COLOR_MAP) as [CanvasColor, string][];
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="color-picker" onpointerdown={(e) => e.stopPropagation()}>
	<button
		class="color-dot none"
		class:active={!currentColor}
		onclick={() => onSelect(undefined)}
		title="No color"
	>
		<X class="size-3" />
	</button>
	{#each presets as [key, hex]}
		<button
			class="color-dot"
			style:background-color={hex}
			class:active={currentColor === key}
			onclick={() => onSelect(key)}
			title={key}
		></button>
	{/each}
</div>

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
</style>
