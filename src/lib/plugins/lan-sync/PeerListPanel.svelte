<script lang="ts">
	import { Radio, RefreshCw } from 'lucide-svelte';
	import { Button } from '$lib/components/ui/button';
	import { lanSyncStore } from './lan-sync.store.svelte';
	import { startBrowse, stopBrowse } from './lan-sync.service';
	import { toast } from 'svelte-sonner';

	let { onSelect }: { onSelect?: (fingerprintHex: string) => void } = $props();

	let browsing = $state(false);

	async function toggleBrowse() {
		if (browsing) {
			browsing = false;
			await stopBrowse();
			return;
		}
		try {
			await startBrowse();
			browsing = true;
		} catch (err) {
			toast.error(`mDNS browse unavailable: ${String(err)}`);
		}
	}
</script>

<div class="flex flex-col gap-3 p-3">
	<div class="flex items-center justify-between">
		<h3 class="text-sm font-medium">Discovered peers</h3>
		<Button variant="outline" size="sm" onclick={toggleBrowse}>
			{#if browsing}
				<RefreshCw class="size-3 animate-spin" />
				Stop scan
			{:else}
				<Radio class="size-3" />
				Scan
			{/if}
		</Button>
	</div>

	{#if lanSyncStore.discoveredPeers.length === 0}
		<p class="text-muted-foreground text-xs">
			{browsing ? 'Listening for peers on the LAN…' : 'Click Scan to look for peers.'}
		</p>
	{:else}
		<ul class="flex flex-col gap-1">
			{#each lanSyncStore.discoveredPeers as peer (peer.fingerprintHex)}
				<li>
					<button
						type="button"
						class="hover:bg-primary/10 flex w-full items-center justify-between rounded px-2 py-1.5 text-left"
						onclick={() => onSelect?.(peer.fingerprintHex)}
					>
						<div class="flex flex-col">
							<span class="font-mono text-xs" title={peer.fingerprintHex}>
								{peer.fingerprintDisplay}
							</span>
							<span class="text-muted-foreground text-[11px]">
								{peer.addr}:{peer.port}
							</span>
						</div>
						<span class="text-muted-foreground text-[11px]">
							v{peer.protocolVersionRange[0]}
							{#if peer.protocolVersionRange[1] !== peer.protocolVersionRange[0]}
								–v{peer.protocolVersionRange[1]}
							{/if}
						</span>
					</button>
				</li>
			{/each}
		</ul>
	{/if}
</div>
