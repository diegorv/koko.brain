<script lang="ts">
	import RefreshCw from '@lucide/svelte/icons/refresh-cw';
	import CircleAlert from '@lucide/svelte/icons/circle-alert';
	import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
	import { syncStatusLabel } from './sync-scheduler.logic';
	import { todoistSyncStore } from './todoist-sync.store.svelte';

	let label = $derived(
		syncStatusLabel({
			status: todoistSyncStore.status,
			lastSyncedAt: todoistSyncStore.lastSyncedAt,
			lastError: todoistSyncStore.lastError,
		}),
	);
</script>

{#if settingsStore.todoist.syncEnabled}
	<span
		class="inline-flex items-center gap-1"
		class:text-destructive={todoistSyncStore.status === 'error'}
		title={label.title}
		data-todoist-sync-status
	>
		{#if todoistSyncStore.status === 'error'}
			<CircleAlert class="size-3" />
		{:else}
			<RefreshCw class="size-3 {todoistSyncStore.isSyncing ? 'animate-spin' : ''}" />
		{/if}
		{label.text}
	</span>
{/if}
