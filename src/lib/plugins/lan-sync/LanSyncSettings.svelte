<script lang="ts">
	import { untrack } from 'svelte';
	import { writeText } from '@tauri-apps/plugin-clipboard-manager';
	import { toast } from 'svelte-sonner';
	import CopyIcon from '@lucide/svelte/icons/copy';
	import CheckIcon from '@lucide/svelte/icons/check';
	import { Button } from '$lib/components/ui/button';
	import { Switch } from '$lib/components/ui/switch';
	import { Separator } from '$lib/components/ui/separator';
	import { lanSyncStore } from '$lib/plugins/lan-sync/lan-sync.store.svelte';
	import type { LanSyncService } from '$lib/plugins/lan-sync/lan-sync.service';
	import type { DiscoveredPeer, TrustedPeer } from '$lib/plugins/lan-sync/lan-sync.types';
	import { appendLog } from '$lib/utils/log.service';
	import { formatTrustedAt } from './LanSyncSettings.logic';

	let { vaultPath, service }: {
		/** Absolute path to the currently-open vault. Passed to every service call. */
		vaultPath: string;
		/** LAN sync service singleton owned by the host. */
		service: LanSyncService;
	} = $props();

	/** UI-local mirror of the discoverable toggle; not persisted on the store. */
	let discoverable = $state(false);
	/** True while a setDiscoverable request is in flight so the toggle stays disabled. */
	let toggling = $state(false);
	/** True briefly after the user clicks "Copy fingerprint" to flash a "Copied" hint. */
	let copied = $state(false);

	// Seed identity + trusted peers once when the component mounts and the
	// store hasn't been populated by a previous host call. Service calls go
	// through untrack so we never re-fire reactively.
	$effect(() => {
		const _vault = vaultPath;
		untrack(() => {
			if (lanSyncStore.myFingerprint === null) {
				service.getMyFingerprint(_vault).catch((err) => {
					appendLog('LAN-SYNC', `LanSyncSettings: getMyFingerprint failed: ${String(err)}`);
				});
			}
			if (lanSyncStore.trustedPeers.length === 0) {
				service.listTrustedPeers(_vault).catch((err) => {
					appendLog('LAN-SYNC', `LanSyncSettings: listTrustedPeers failed: ${String(err)}`);
				});
			}
		});
	});

	/** Handler invoked when the user flips the Discoverable switch. */
	async function handleDiscoverableChange(next: boolean) {
		toggling = true;
		try {
			await service.setDiscoverable(vaultPath, next);
			discoverable = next;
		} catch (err) {
			toast.error(`Failed to ${next ? 'enable' : 'disable'} discoverable: ${err}`);
			// Revert the visual state on error.
			discoverable = !next;
		} finally {
			toggling = false;
		}
	}

	/** Copies the local fingerprintHex to the clipboard and flashes "Copied" for ~2s. */
	async function handleCopyFingerprint() {
		const fp = lanSyncStore.myFingerprint;
		if (!fp) return;
		try {
			await writeText(fp.fingerprintHex);
			copied = true;
			setTimeout(() => {
				copied = false;
			}, 2000);
		} catch (err) {
			toast.error(`Failed to copy fingerprint: ${err}`);
		}
	}

	/** Stage 3F-3b will replace this with a real pair-receiver flow. */
	async function handlePair(peer: DiscoveredPeer) {
		toast.info('Pair flow not yet wired');
		try {
			await service.pairWithPeer(vaultPath, peer.addr, peer.port, peer.fingerprintHex, true);
		} catch (err) {
			appendLog('LAN-SYNC', `LanSyncSettings: pairWithPeer failed: ${String(err)}`);
		}
	}

	/** Removes a trusted peer after the user clicks the Remove button. */
	async function handleRemoveTrusted(peer: TrustedPeer) {
		try {
			await service.removeTrustedPeer(vaultPath, peer.fingerprintHex);
		} catch (err) {
			toast.error(`Failed to remove peer: ${err}`);
		}
	}
</script>

<div class="flex flex-col gap-4">
	<h2 class="text-lg font-semibold">LAN sync</h2>

	<!-- Identity card -->
	<section class="flex flex-col gap-2">
		<h3 class="text-sm font-medium text-muted-foreground">This device</h3>
		<div class="flex items-center justify-between gap-4 rounded-lg bg-setting-item-bg px-4 py-3">
			{#if lanSyncStore.myFingerprint}
				<div class="flex min-w-0 flex-1 flex-col gap-1">
					<span
						class="truncate text-sm font-medium text-settings-text"
						data-testid="lan-sync-fingerprint-display"
					>
						{lanSyncStore.myFingerprint.fingerprintDisplay}
					</span>
					<span
						class="truncate font-mono text-xs text-muted-foreground"
						data-testid="lan-sync-fingerprint-hex"
					>
						{lanSyncStore.myFingerprint.fingerprintHex}
					</span>
				</div>
				<div class="flex shrink-0 items-center gap-2">
					{#if copied}
						<span class="text-xs text-muted-foreground" data-testid="lan-sync-copied">
							Copied
						</span>
					{/if}
					<Button
						variant="ghost"
						size="icon-sm"
						title="Copy fingerprint"
						aria-label="Copy fingerprint"
						onclick={handleCopyFingerprint}
					>
						{#if copied}
							<CheckIcon class="size-3.5" />
						{:else}
							<CopyIcon class="size-3.5" />
						{/if}
					</Button>
				</div>
			{:else}
				<span class="text-sm text-muted-foreground">Loading device identity...</span>
			{/if}
		</div>
	</section>

	<Separator />

	<!-- Discoverable toggle -->
	<section class="flex flex-col gap-2">
		<div class="flex items-center justify-between gap-4 rounded-lg bg-setting-item-bg px-4 py-3">
			<div class="flex min-w-0 flex-1 flex-col gap-0.5">
				<span class="text-sm font-medium text-settings-text">Discoverable on LAN</span>
				<span class="text-xs text-muted-foreground">
					Other devices on this network can see this vault and ask to pair.
				</span>
			</div>
			<div class="flex shrink-0">
				<Switch
					checked={discoverable}
					disabled={toggling}
					onCheckedChange={handleDiscoverableChange}
					aria-label="Discoverable on LAN"
				/>
			</div>
		</div>
	</section>

	<Separator />

	<!-- Discovered peers -->
	<section class="flex flex-col gap-2">
		<h3 class="text-sm font-medium text-muted-foreground">Discovered on this network</h3>
		{#if lanSyncStore.discoveredUntrusted.length === 0}
			<p
				class="rounded-lg bg-setting-item-bg px-4 py-3 text-xs text-muted-foreground"
				data-testid="lan-sync-discovered-empty"
			>
				Toggle discoverable on this device and another on the same network to see them here.
			</p>
		{:else}
			<ul class="flex flex-col gap-1" data-testid="lan-sync-discovered-list">
				{#each lanSyncStore.discoveredUntrusted as peer (peer.fingerprintHex)}
					<li
						class="flex items-center gap-3 rounded-lg bg-setting-item-bg px-4 py-2.5"
						data-testid="lan-sync-discovered-row"
					>
						<div class="flex min-w-0 flex-1 flex-col">
							<span class="truncate text-sm font-medium text-settings-text">
								{peer.fingerprintDisplay}
							</span>
							<span class="truncate text-xs text-muted-foreground">
								{peer.addr}:{peer.port}
							</span>
						</div>
						<Button
							variant="outline"
							size="sm"
							onclick={() => handlePair(peer)}
						>
							Pair
						</Button>
					</li>
				{/each}
			</ul>
		{/if}
	</section>

	<Separator />

	<!-- Trusted peers -->
	<section class="flex flex-col gap-2">
		<h3 class="text-sm font-medium text-muted-foreground">Trusted devices</h3>
		{#if lanSyncStore.trustedPeers.length === 0}
			<p
				class="rounded-lg bg-setting-item-bg px-4 py-3 text-xs text-muted-foreground"
				data-testid="lan-sync-trusted-empty"
			>
				No paired devices yet.
			</p>
		{:else}
			<ul class="flex flex-col gap-1" data-testid="lan-sync-trusted-list">
				{#each lanSyncStore.trustedPeers as peer (peer.fingerprintHex)}
					<li
						class="flex items-center gap-3 rounded-lg bg-setting-item-bg px-4 py-2.5"
						data-testid="lan-sync-trusted-row"
					>
						<div class="flex min-w-0 flex-1 flex-col">
							<span class="truncate text-sm font-medium text-settings-text">
								{peer.fingerprintDisplay}
							</span>
							<div class="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
								{#if peer.displayName}
									<span class="truncate">{peer.displayName}</span>
									<span aria-hidden="true">&middot;</span>
								{/if}
								<span>{formatTrustedAt(peer.trustedAtMs, Date.now())}</span>
							</div>
						</div>
						<Button
							variant="ghost"
							size="sm"
							class="text-destructive hover:text-destructive"
							onclick={() => handleRemoveTrusted(peer)}
						>
							Remove
						</Button>
					</li>
				{/each}
			</ul>
		{/if}
	</section>
</div>
