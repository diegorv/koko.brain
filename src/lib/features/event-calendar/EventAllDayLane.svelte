<script lang="ts">
	import { openFileInEditor } from '$lib/core/editor/editor.service';
	import { eventColorStyle } from './event-calendar-event.logic';
	import { buildAllDayChips, laneRows } from './event-calendar-view.logic';
	import { eventCalendarViewStore } from './event-calendar-view.store.svelte';
	import type { EventNote } from './event-calendar.types';

	interface Props {
		/** Visible day keys, one lane cell each. */
		days: string[];
		/** Events of any lane; only the all-day ones on `days` render. */
		events: EventNote[];
	}

	let { days, events }: Props = $props();

	/** Height of one chip, in px. */
	const CHIP_HEIGHT = 28;
	/** Gap between chips, in px. */
	const CHIP_GAP = 4;
	/** Padding above and below the chips, in px. */
	const ROW_PADDING = 6;

	let cells = $derived(buildAllDayChips(days, events));
	let rows = $derived(laneRows(Math.max(0, ...cells.map((c) => c.chips.length + c.overflow))));
	let height = $derived(ROW_PADDING * 2 + rows * CHIP_HEIGHT + (rows - 1) * CHIP_GAP + 1);

	/** Opens day view on `day` (the "+N" button). */
	function openDay(day: string) {
		eventCalendarViewStore.setDate(day);
		eventCalendarViewStore.setView('day');
	}
</script>

<div class="flex w-full shrink-0 items-stretch overflow-hidden border-b border-border" style="height: {height}px" data-all-day-lane>
	<div class="sticky left-0 z-10 flex w-(--axis) shrink-0 items-center justify-end bg-editor-bg pr-2">
		<span class="text-[11px] text-muted-foreground">All day</span>
	</div>
	{#each cells as cell (cell.day)}
		<div
			role="group"
			aria-label="All-day events"
			class="flex min-w-0 flex-1 flex-col justify-center gap-1 overflow-hidden border-l border-border px-1"
			data-all-day-cell={cell.day}
		>
			{#each cell.chips as chip (chip.path)}
				<button
					type="button"
					class="flex h-7 w-full shrink-0 items-center overflow-hidden rounded-md px-2 text-left outline-none hover:brightness-110 focus-visible:ring-2 focus-visible:ring-ring"
					style={eventColorStyle(chip.color)}
					data-event-path={chip.path}
					onclick={() => openFileInEditor(chip.path)}
				>
					<span class="min-w-0 flex-1 truncate text-sm font-medium">{chip.title}</span>
				</button>
			{/each}
			{#if cell.overflow > 0}
				<button
					type="button"
					class="flex h-7 w-full shrink-0 items-center rounded-md px-2 text-left text-xs text-muted-foreground outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
					aria-label="{cell.overflow} more all-day events, open day view"
					data-all-day-more
					onclick={() => openDay(cell.day)}
				>
					+{cell.overflow}
				</button>
			{/if}
		</div>
	{/each}
</div>
