<script lang="ts">
	import { Cloud, CloudOff, ArrowUpDown, AlertTriangle } from 'lucide-svelte';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import { lanSyncStore } from './lan-sync.store.svelte';

	/**
	 * Compact status indicator for LAN sync, designed to live in the
	 * app status bar (`src/lib/core/layout/AppShell.svelte`).
	 *
	 * Visibility:
	 * - Hidden entirely while no LAN sync state is active (no
	 *   peers, no transfers, no conflicts). The status bar stays
	 *   uncluttered for users who don't use the feature.
	 * - Shown with one of four states once activity exists.
	 */

	const visible = $derived(
		lanSyncStore.connectedPeerCount > 0 ||
			lanSyncStore.activeTransfers > 0 ||
			lanSyncStore.recentConflicts.length > 0 ||
			lanSyncStore.connectionState === 'connecting' ||
			lanSyncStore.connectionState === 'error',
	);

	const display = $derived.by(() => {
		const transfers = lanSyncStore.activeTransfers;
		const peers = lanSyncStore.connectedPeerCount;
		const conflicts = lanSyncStore.recentConflicts.length;
		const state = lanSyncStore.connectionState;

		if (state === 'error') {
			return { label: 'LAN sync error', tone: 'error' as const };
		}
		if (conflicts > 0) {
			return {
				label: `${conflicts} conflict${conflicts === 1 ? '' : 's'}`,
				tone: 'warning' as const,
			};
		}
		if (transfers > 0) {
			return {
				label: `↑↓ ${transfers} file${transfers === 1 ? '' : 's'}`,
				tone: 'active' as const,
			};
		}
		if (peers > 0) {
			return {
				label: `↕ ${peers} peer${peers === 1 ? '' : 's'}`,
				tone: 'connected' as const,
			};
		}
		if (state === 'connecting') {
			return { label: 'Connecting…', tone: 'pending' as const };
		}
		return { label: 'LAN sync idle', tone: 'idle' as const };
	});

	const tooltipText = $derived.by(() => {
		const parts: string[] = [];
		if (lanSyncStore.connectedPeerCount > 0) {
			parts.push(`${lanSyncStore.connectedPeerCount} connected peer(s)`);
		}
		if (lanSyncStore.activeTransfers > 0) {
			parts.push(`${lanSyncStore.activeTransfers} transfer(s) in flight`);
		}
		if (lanSyncStore.recentConflicts.length > 0) {
			parts.push(`${lanSyncStore.recentConflicts.length} conflict(s)`);
		}
		if (lanSyncStore.shares.length > 0) {
			parts.push(`${lanSyncStore.shares.length} share(s) configured`);
		}
		if (lanSyncStore.lastError) {
			parts.push(`Last error: ${lanSyncStore.lastError}`);
		}
		return parts.join(' · ') || 'LAN sync';
	});
</script>

{#if visible}
	<Tooltip.Provider delayDuration={300}>
		<Tooltip.Root>
			<Tooltip.Trigger>
				<div
					class="flex items-center gap-1.5 text-xs"
					class:text-emerald-500={display.tone === 'connected' || display.tone === 'active'}
					class:text-amber-500={display.tone === 'warning' || display.tone === 'pending'}
					class:text-destructive={display.tone === 'error'}
				>
					{#if display.tone === 'active'}
						<ArrowUpDown class="size-3 animate-pulse" />
					{:else if display.tone === 'warning'}
						<AlertTriangle class="size-3" />
					{:else if display.tone === 'error'}
						<CloudOff class="size-3" />
					{:else}
						<Cloud class="size-3" />
					{/if}
					<span>{display.label}</span>
				</div>
			</Tooltip.Trigger>
			<Tooltip.Content>{tooltipText}</Tooltip.Content>
		</Tooltip.Root>
	</Tooltip.Provider>
{/if}
