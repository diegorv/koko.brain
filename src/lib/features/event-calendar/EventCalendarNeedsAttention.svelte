<script lang="ts">
	import { openFileInEditor } from '$lib/core/editor/editor.service';
	import { eventCalendarStore } from './event-calendar.store.svelte';
	import type { EventIssue } from './event-calendar.types';

	/** Whether the quiet "N unscheduled" link has expanded its list. */
	let unscheduledOpen = $state(false);

	let attention = $derived(eventCalendarStore.attentionIssues);
	let unscheduled = $derived(eventCalendarStore.unscheduledIssues);
	let attentionCount = $derived(eventCalendarStore.attentionCount);
	let archivedCount = $derived(eventCalendarStore.archivedCount);

	/** Reason text of an actionable issue. */
	function reasonText(issue: EventIssue): string {
		switch (issue.reason) {
			case 'invalid-time':
				return issue.detail === 'all_day'
					? 'all_day is not true or false'
					: issue.detail === 'end_date'
						? 'end_date is not YYYY-MM-DD'
						: `${issue.detail ?? 'start'} is not a valid time (HH:mm)`;
			case 'end-before-start':
				return issue.detail === 'end_date' ? 'end_date is before date' : 'end is not after start';
			case 'trailing-comment':
				return `${issue.detail ?? 'a value'} has a trailing # comment`;
			default:
				return issue.reason;
		}
	}

	/** Hint of an informational `unscheduled` issue. */
	function unscheduledHint(issue: EventIssue): string {
		return issue.detail === 'not-a-day'
			? 'date is not YYYY-MM-DD'
			: 'add `date:` (and `start` / `end` for a timed event)';
	}
</script>

{#snippet issueRow(issue: EventIssue, text: string)}
	<li>
		<button
			type="button"
			class="flex w-full flex-col items-start rounded px-2 py-1 text-left hover:bg-muted"
			data-issue-path={issue.path}
			onclick={() => openFileInEditor(issue.path)}
		>
			<span class="text-sm" data-issue-title>{issue.title}</span>
			<span class="text-xs text-muted-foreground" data-issue-reason>{text}</span>
		</button>
	</li>
{/snippet}

{#snippet unscheduledList()}
	<ul class="mt-1 max-h-40 overflow-y-auto" data-unscheduled-list>
		{#each unscheduled as issue (issue.path)}
			{@render issueRow(issue, unscheduledHint(issue))}
		{/each}
	</ul>
{/snippet}

{#if attentionCount > 0 || unscheduled.length > 0 || archivedCount > 0}
	<div class="border-t border-border px-4 py-2 text-sm" data-calendar-issues>
		{#if attentionCount > 0}
			<section aria-label="Needs attention" data-needs-attention>
				<span
					class="inline-flex items-center rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive"
					data-attention-badge
				>
					{attentionCount} {attentionCount === 1 ? 'event needs' : 'events need'} attention
				</span>
				<ul class="mt-1 max-h-40 overflow-y-auto" data-attention-list>
					{#each attention as issue (issue.path)}
						{@render issueRow(issue, reasonText(issue))}
					{/each}
				</ul>
			</section>
			{#if unscheduled.length > 0}
				<details class="mt-2" data-unscheduled>
					<summary class="cursor-pointer text-xs text-muted-foreground">Unscheduled ({unscheduled.length})</summary>
					{@render unscheduledList()}
				</details>
			{/if}
		{:else if unscheduled.length > 0}
			<div data-unscheduled>
				<button
					type="button"
					class="text-xs text-muted-foreground underline-offset-2 hover:underline"
					aria-expanded={unscheduledOpen}
					onclick={() => (unscheduledOpen = !unscheduledOpen)}
				>
					{unscheduled.length} unscheduled
				</button>
				{#if unscheduledOpen}
					{@render unscheduledList()}
				{/if}
			</div>
		{/if}
		{#if archivedCount > 0}
			<p class="mt-2 text-xs text-muted-foreground" data-archived-footer>
				{archivedCount} archived {archivedCount === 1 ? 'event' : 'events'} hidden
			</p>
		{/if}
	</div>
{/if}
