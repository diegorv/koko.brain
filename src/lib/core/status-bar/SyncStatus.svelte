<script lang="ts">
	import { syncStore } from '$lib/features/sync/sync.store.svelte';
	import { settingsDialogStore } from '$lib/core/settings/settings-dialog.store.svelte';
	import RefreshCwIcon from '@lucide/svelte/icons/refresh-cw';
	import * as Tooltip from '$lib/components/ui/tooltip';

	function openSyncSettings() {
		settingsDialogStore.open('sync');
	}
</script>

{#if syncStore.isRunning}
	<Tooltip.Provider>
		<Tooltip.Root>
			<Tooltip.Trigger>
				<button
					class="flex items-center gap-1 hover:text-foreground"
					onclick={openSyncSettings}
				>
					{#if syncStore.status.state === 'error'}
						<RefreshCwIcon class="size-3 text-red-400" />
						<span class="text-red-400">Sync error</span>
					{:else if syncStore.status.state === 'syncing'}
						<RefreshCwIcon class="size-3 animate-spin" />
						<span>Syncing…</span>
					{:else if syncStore.peers.length === 0}
						<RefreshCwIcon class="size-3 text-muted-foreground" />
						<span class="text-muted-foreground">No peers</span>
					{:else}
						<RefreshCwIcon class="size-3 text-green-400" />
						<span class="text-green-400">Synced</span>
					{/if}
				</button>
			</Tooltip.Trigger>
			<Tooltip.Content>
				{#if syncStore.status.state === 'error'}
					<p>{syncStore.status.error ?? 'Sync error'}</p>
				{:else if syncStore.status.state === 'syncing'}
					<p>Syncing with peer…</p>
				{:else if syncStore.peers.length === 0}
					<p>No peers discovered</p>
				{:else}
					<p>{syncStore.peers.length} peer{syncStore.peers.length > 1 ? 's' : ''} connected</p>
				{/if}
			</Tooltip.Content>
		</Tooltip.Root>
	</Tooltip.Provider>
{/if}
