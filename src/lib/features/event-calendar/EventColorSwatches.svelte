<script lang="ts">
	import { EVENT_CALENDAR_COLORS } from '#lib/core/settings/settings.logic.js';
	import type { EventColor } from './event-calendar.types';

	interface Props {
		/** The selected color. */
		value: EventColor;
		/** Called with the color the user picked. */
		onchange: (color: EventColor) => void;
		/** Accessible name of the group. */
		label?: string;
	}

	let { value, onchange, label = 'Color' }: Props = $props();

	let buttons: HTMLButtonElement[] = $state([]);

	/** Selects the color at `index` (wrapping) and moves focus to it. */
	function select(index: number) {
		const count = EVENT_CALENDAR_COLORS.length;
		const next = (index + count) % count;
		onchange(EVENT_CALENDAR_COLORS[next]);
		buttons[next]?.focus();
	}

	/** Arrow keys move and select, as in a native radio group; Home and End jump to the ends. */
	function handleKeydown(e: KeyboardEvent, index: number) {
		let target: number | null = null;
		if (e.key === 'ArrowRight' || e.key === 'ArrowDown') target = index + 1;
		else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') target = index - 1;
		else if (e.key === 'Home') target = 0;
		else if (e.key === 'End') target = EVENT_CALENDAR_COLORS.length - 1;
		if (target === null) return;
		e.preventDefault();
		select(target);
	}
</script>

<div role="radiogroup" aria-label={label} class="flex items-center gap-2" data-color-swatches>
	{#each EVENT_CALENDAR_COLORS as color, i (color)}
		{@const checked = color === value}
		<button
			bind:this={buttons[i]}
			type="button"
			role="radio"
			aria-checked={checked}
			aria-label={color}
			tabindex={checked ? 0 : -1}
			class="size-6 rounded-full border-2 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 {checked
				? 'border-foreground'
				: 'border-transparent'}"
			style="background: var(--event-{color}-fg)"
			data-color={color}
			onclick={() => select(i)}
			onkeydown={(e) => handleKeydown(e, i)}
		></button>
	{/each}
</div>
