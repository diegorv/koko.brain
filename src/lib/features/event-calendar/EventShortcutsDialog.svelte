<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { eventCalendarViewStore } from './event-calendar-view.store.svelte';
	import { CALENDAR_SHORTCUTS } from './event-calendar-keys.logic';

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
									class="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-xs">{chord}</kbd
								>
							{/each}
						</td>
						<td class="py-1.5 text-muted-foreground">{row.label}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</Dialog.Content>
</Dialog.Root>
