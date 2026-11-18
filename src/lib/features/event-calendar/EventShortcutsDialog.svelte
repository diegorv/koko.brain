<script lang="ts">
	import * as Dialog from '#lib/components/ui/dialog/index.js';
	import { eventCalendarViewStore } from './event-calendar-view.store.svelte';
	import { CALENDAR_GESTURES, CALENDAR_SHORTCUTS } from './event-calendar-keys.logic';
	import type { CalendarViewMode } from './event-calendar.types';

	const id = $props.id();

	/** How a gesture row names the views it applies to. */
	const VIEW_NAMES: Record<CalendarViewMode, string> = { day: 'Day', week: 'Week', month: 'Month' };

	function handleOpenChange(next: boolean) {
		if (!next) eventCalendarViewStore.closeHelp();
	}
</script>

<Dialog.Root open={eventCalendarViewStore.helpOpen} onOpenChange={handleOpenChange}>
	<Dialog.Content class="gap-4 p-5 sm:max-w-[440px]" data-calendar-shortcuts>
		<Dialog.Header>
			<Dialog.Title>Keyboard shortcuts</Dialog.Title>
			<Dialog.Description>These work while the Calendar has focus, not while you type in a field.</Dialog.Description>
		</Dialog.Header>
		<table class="w-full text-sm">
			<tbody>
				{#each CALENDAR_SHORTCUTS as row (row.action)}
					<tr class="border-b border-border last:border-0" data-shortcut={row.action}>
						<td class="py-1.5 pr-4 align-top whitespace-nowrap">
							{#each row.keys as chord, i (chord)}
								{#if i > 0}<span class="px-1 text-muted-foreground">/</span>{/if}<kbd
									class="rounded-xs border border-border bg-muted px-1.5 py-0.5 font-mono text-xs">{chord}</kbd
								>
							{/each}
						</td>
						<td class="py-1.5 text-muted-foreground">{row.label}</td>
					</tr>
				{/each}
			</tbody>
		</table>
		<!-- The description above covers keys only, so the gestures get their own heading. -->
		<h3 id="{id}-mouse" class="section-label" data-gesture-heading>Mouse</h3>
		<table class="w-full text-sm" aria-labelledby="{id}-mouse">
			<tbody>
				{#each CALENDAR_GESTURES as row (row.gesture)}
					<tr class="border-b border-border last:border-0" data-gesture>
						<td class="py-1.5 pr-4 align-top" data-gesture-text>{row.gesture}</td>
						<td class="py-1.5 align-top text-muted-foreground">
							<span class="block" data-gesture-label>{row.label}</span>
							<span class="block text-meta" data-gesture-views>{row.views.map((v) => VIEW_NAMES[v]).join(', ')}</span>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</Dialog.Content>
</Dialog.Root>
