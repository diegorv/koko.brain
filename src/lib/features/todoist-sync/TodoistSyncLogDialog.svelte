<script lang="ts">
	import * as Dialog from '#lib/components/ui/dialog/index.js';
	import { formatLogTime } from './sync-scheduler.logic';
	import { todoistSyncStore } from './todoist-sync.store.svelte';

	function handleOpenChange(next: boolean) {
		if (!next) todoistSyncStore.closeLog();
	}
</script>

<Dialog.Root open={todoistSyncStore.logOpen} onOpenChange={handleOpenChange}>
	<Dialog.Content class="gap-4 p-5 sm:max-w-[720px]" data-todoist-sync-log>
		<Dialog.Header>
			<Dialog.Title>Todoist sync log</Dialog.Title>
			<Dialog.Description>Newest first: conflicts, detached and frozen tasks, skipped lines and command errors.</Dialog.Description>
		</Dialog.Header>
		{#if todoistSyncStore.logEntries.length === 0}
			<p class="text-sm text-muted-foreground" data-sync-log-empty>No sync log entries yet.</p>
		{:else}
			<div class="max-h-[60vh] overflow-y-auto">
				<table class="w-full text-sm">
					<tbody>
						{#each todoistSyncStore.logEntries as entry (entry.id)}
							<tr class="border-b border-border align-top last:border-0" data-sync-log-entry={entry.id}>
								<td class="py-1.5 pr-3 whitespace-nowrap text-muted-foreground">{formatLogTime(entry.createdAt)}</td>
								<td class="py-1.5 pr-3 whitespace-nowrap">{entry.kind}</td>
								<td class="py-1.5 pr-3 font-mono text-xs whitespace-nowrap">{entry.anchor ?? ''}</td>
								<td class="py-1.5 break-words">{entry.message}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</Dialog.Content>
</Dialog.Root>
