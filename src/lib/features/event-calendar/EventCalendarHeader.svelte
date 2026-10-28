<script lang="ts">
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import { Button } from '$lib/components/ui/button';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import { eventCalendarViewStore } from './event-calendar-view.store.svelte';
	import type { CalendarViewMode } from './event-calendar.types';

	/** The D/W/M segments in tab order. */
	const VIEWS: { mode: CalendarViewMode; short: string; label: string }[] = [
		{ mode: 'day', short: 'D', label: 'Day' },
		{ mode: 'week', short: 'W', label: 'Week' },
		{ mode: 'month', short: 'M', label: 'Month' },
	];

	/** Tab button elements, indexed like `VIEWS`, for arrow-key focus moves. */
	let tabEls: HTMLButtonElement[] = $state([]);

	let label = $derived(eventCalendarViewStore.rangeLabel);
	let unit = $derived(VIEWS.find((v) => v.mode === eventCalendarViewStore.view)?.label.toLowerCase() ?? 'week');

	/** Moves the selection one tab left or right (wrapping) and focuses it. */
	function handleTabKeydown(e: KeyboardEvent) {
		if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
		e.preventDefault();
		const current = VIEWS.findIndex((v) => v.mode === eventCalendarViewStore.view);
		const delta = e.key === 'ArrowRight' ? 1 : -1;
		const next = (current + delta + VIEWS.length) % VIEWS.length;
		eventCalendarViewStore.setView(VIEWS[next].mode);
		tabEls[next]?.focus();
	}
</script>

<header class="flex flex-wrap items-center gap-3 border-b border-border px-4 py-2">
	<div class="min-w-0 flex-1">
		<h2 class="truncate text-base font-semibold" data-calendar-title>{label.title}</h2>
		<p class="truncate text-xs text-muted-foreground" data-calendar-subtitle>{label.subtitle}</p>
	</div>

	<div class="flex items-center gap-1">
		<Button variant="outline" size="sm" onclick={() => eventCalendarViewStore.goToToday()}>Today</Button>

		<Tooltip.Root>
			<Tooltip.Trigger>
				{#snippet child({ props })}
					<Button
						{...props}
						variant="ghost"
						size="icon-sm"
						aria-label="Previous {unit}"
						onclick={() => eventCalendarViewStore.step(-1)}
					>
						<ChevronLeft class="size-4" />
					</Button>
				{/snippet}
			</Tooltip.Trigger>
			<Tooltip.Content>Previous {unit}</Tooltip.Content>
		</Tooltip.Root>

		<Tooltip.Root>
			<Tooltip.Trigger>
				{#snippet child({ props })}
					<Button
						{...props}
						variant="ghost"
						size="icon-sm"
						aria-label="Next {unit}"
						onclick={() => eventCalendarViewStore.step(1)}
					>
						<ChevronRight class="size-4" />
					</Button>
				{/snippet}
			</Tooltip.Trigger>
			<Tooltip.Content>Next {unit}</Tooltip.Content>
		</Tooltip.Root>
	</div>

	<div
		class="flex items-center rounded-md border border-border p-0.5"
		role="tablist"
		aria-label="Calendar view"
		tabindex="-1"
		onkeydown={handleTabKeydown}
	>
		{#each VIEWS as v, i (v.mode)}
			{@const selected = eventCalendarViewStore.view === v.mode}
			<button
				bind:this={tabEls[i]}
				type="button"
				role="tab"
				aria-selected={selected}
				aria-label={v.label}
				aria-keyshortcuts={v.short}
				tabindex={selected ? 0 : -1}
				class="rounded px-2 py-0.5 text-xs font-medium transition-colors
					{selected ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'}"
				onclick={() => eventCalendarViewStore.setView(v.mode)}
			>
				{v.short}
			</button>
		{/each}
	</div>
</header>
