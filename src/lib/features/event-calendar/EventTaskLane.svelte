<script lang="ts">
	import { ALL_DAY_MAX_ROWS } from './event-calendar-view.logic';
	import { eventCalendarViewStore } from './event-calendar-view.store.svelte';
	import { taskLaneCells, type CalendarTask } from './event-calendar-tasks.logic';
	import EventTaskChip from './EventTaskChip.svelte';

	interface Props {
		/** Visible day keys, one lane cell each. */
		days: string[];
		/** Dated tasks; only those due on `days` render. */
		tasks: CalendarTask[];
	}

	let { days, tasks }: Props = $props();

	/** Height of one chip, in px. */
	const CHIP_HEIGHT = 24;
	/** Gap between chips, in px. */
	const CHIP_GAP = 4;
	/** Padding above and below the chips, in px. */
	const ROW_PADDING = 6;

	let cells = $derived(taskLaneCells(tasks, days));
	let rows = $derived(Math.min(ALL_DAY_MAX_ROWS, Math.max(0, ...cells.map((c) => c.chips.length + c.overflow))));
	let height = $derived(ROW_PADDING * 2 + rows * CHIP_HEIGHT + (rows - 1) * CHIP_GAP + 1);
	// Day view scrolls its one cell instead of capping it; the count says how many there are.
	let label = $derived(cells.length === 1 ? `Tasks ${cells[0].chips.length}` : 'Tasks');

	/** Opens day view on `day` (the "+N" button). */
	function openDay(day: string) {
		eventCalendarViewStore.setDate(day);
		eventCalendarViewStore.setView('day');
	}
</script>

<!-- Only rendered when a visible day has a task. A busy week day caps at "+N"; the day view's one cell scrolls. -->
{#if rows > 0}
	<div class="flex w-full shrink-0 items-stretch overflow-clip border-b border-border" style="height: {height}px" data-task-lane>
		<div class="sticky left-0 z-10 flex w-(--axis) shrink-0 items-center justify-end bg-editor-bg pr-2">
			<span class="text-[11px] text-muted-foreground">{label}</span>
		</div>
		<div class="flex min-w-0 flex-1 items-stretch">
			{#each cells as cell (cell.day)}
				<div
					role="group"
					aria-label="Tasks due"
					class="flex min-w-0 flex-1 flex-col gap-1 overflow-y-auto border-l border-border px-1 py-1.5"
					data-task-lane-cell={cell.day}
				>
					{#each cell.chips as task (`${task.path}:${task.line}`)}
						<EventTaskChip {task} class="h-6" />
					{/each}
					{#if cell.overflow > 0}
						<button
							type="button"
							class="flex h-6 w-full shrink-0 items-center rounded-md px-1.5 text-left text-xs text-muted-foreground outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
							aria-label="{cell.overflow} more tasks, open day view"
							data-task-lane-more
							onclick={() => openDay(cell.day)}
						>
							+{cell.overflow}
						</button>
					{/if}
				</div>
			{/each}
		</div>
	</div>
{/if}
