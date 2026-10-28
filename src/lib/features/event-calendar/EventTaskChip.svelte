<script lang="ts">
	import Circle from '@lucide/svelte/icons/circle';
	import CircleCheckBig from '@lucide/svelte/icons/circle-check-big';
	import { openNoteAt } from '$lib/core/editor/open-note-at.service';
	import type { CalendarTask } from './event-calendar-tasks.logic';

	interface Props {
		/** The dated task to show. */
		task: CalendarTask;
		/** Extra classes for the button (its height). */
		class?: string;
	}

	let { task, class: className = '' }: Props = $props();
</script>

<!--
	Outlined and unfilled, unlike the colored event chips. No data-event-path:
	the day drag, the popover and the Delete key only act on events.
-->
<button
	type="button"
	class="flex w-full shrink-0 items-center gap-1 overflow-hidden rounded-md border border-border px-1.5 text-left text-xs text-foreground outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring {className}"
	title="{task.description} ({task.fileName})"
	aria-label="Task: {task.description}{task.checked ? ', done' : ''}, open {task.fileName} at the task"
	data-calendar-task={task.date}
	data-task-path={task.path}
	data-task-line={task.line}
	data-checked={task.checked || undefined}
	onclick={() => void openNoteAt(task.path, { kind: 'line', line: task.line })}
>
	{#if task.checked}
		<CircleCheckBig class="size-3 shrink-0 text-muted-foreground" />
		<span class="min-w-0 flex-1 truncate text-muted-foreground line-through">{task.description}</span>
	{:else}
		<Circle class="size-3 shrink-0 text-muted-foreground" />
		<span class="min-w-0 flex-1 truncate">{task.description}</span>
	{/if}
</button>
