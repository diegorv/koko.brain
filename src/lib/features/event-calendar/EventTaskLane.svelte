<script lang="ts">
	import { ALL_DAY_MAX_ROWS } from './event-calendar-view.logic';
	import { tasksByDay, type CalendarTask } from './event-calendar-tasks.logic';
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

	let byDay = $derived(tasksByDay(tasks, days));
	let rows = $derived(Math.min(ALL_DAY_MAX_ROWS, Math.max(0, ...[...byDay.values()].map((list) => list.length))));
	let height = $derived(ROW_PADDING * 2 + rows * CHIP_HEIGHT + (rows - 1) * CHIP_GAP + 1);
</script>

<!-- Only rendered when a visible day has a task; a busier day scrolls inside its cell. -->
{#if rows > 0}
	<div class="flex w-full shrink-0 items-stretch overflow-clip border-b border-border" style="height: {height}px" data-task-lane>
		<div class="sticky left-0 z-10 flex w-(--axis) shrink-0 items-center justify-end bg-editor-bg pr-2">
			<span class="text-[11px] text-muted-foreground">Tasks</span>
		</div>
		<div class="flex min-w-0 flex-1 items-stretch">
			{#each days as day (day)}
				<div
					role="group"
					aria-label="Tasks due"
					class="flex min-w-0 flex-1 flex-col gap-1 overflow-y-auto border-l border-border px-1 py-1.5"
					data-task-lane-cell={day}
				>
					{#each byDay.get(day) ?? [] as task (`${task.path}:${task.line}`)}
						<EventTaskChip {task} class="h-6" />
					{/each}
				</div>
			{/each}
		</div>
	</div>
{/if}
