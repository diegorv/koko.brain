<script lang="ts">
	import { onMount } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import { Switch } from '$lib/components/ui/switch';
	import { Label } from '$lib/components/ui/label';
	import { Plus, Radio, Shield, Trash2, Users } from 'lucide-svelte';
	import { settingsStore } from '$lib/core/settings/settings.store.svelte';
	import { saveSettings } from '$lib/core/settings/settings.service';
	import { vaultStore } from '$lib/core/vault/vault.store.svelte';
	import { lanSyncStore } from './lan-sync.store.svelte';
	import {
		initLanSync,
		listAuthEvents,
		removeShare,
		removeTrustedPeer,
		setDiscoverable,
		unblock,
	} from './lan-sync.service';
	import PairingDialog from './PairingDialog.svelte';
	import ShareEditDialog from './ShareEditDialog.svelte';
	import { toast } from 'svelte-sonner';

	let pairingOpen = $state(false);
	let shareEditOpen = $state(false);
	let activityLogOpen = $state(false);

	onMount(async () => {
		const vaultPath = vaultStore.path;
		if (!vaultPath) return;
		try {
			await initLanSync(vaultPath);
		} catch (err) {
			toast.error(`LAN sync init failed: ${String(err)}`);
		}
	});

	async function toggleDiscoverable(enabled: boolean) {
		const vaultPath = vaultStore.path;
		if (!vaultPath) return;
		settingsStore.updateLanSync({ discoverable: enabled });
		try {
			await saveSettings(vaultPath);
			await setDiscoverable(vaultPath, enabled);
		} catch (err) {
			// Live wiring not ready yet — keep the persisted preference but
			// surface a heads-up.
			toast.message(`Discovery toggle saved (live wiring pending): ${String(err)}`);
		}
	}

	async function handleRemoveShare(shareId: string) {
		const vaultPath = vaultStore.path;
		if (!vaultPath) return;
		try {
			await removeShare(vaultPath, shareId);
		} catch (err) {
			toast.error(`Remove share failed: ${String(err)}`);
		}
	}

	async function handleRemovePeer(fingerprintHex: string) {
		const vaultPath = vaultStore.path;
		if (!vaultPath) return;
		try {
			await removeTrustedPeer(vaultPath, fingerprintHex);
		} catch (err) {
			toast.error(`Remove peer failed: ${String(err)}`);
		}
	}

	async function handleUnblock(identifier: string) {
		const vaultPath = vaultStore.path;
		if (!vaultPath) return;
		try {
			await unblock(vaultPath, identifier);
		} catch (err) {
			toast.error(`Unblock failed: ${String(err)}`);
		}
	}

	async function refreshActivityLog() {
		const vaultPath = vaultStore.path;
		if (!vaultPath) return;
		try {
			await listAuthEvents(vaultPath, { limit: 50 });
		} catch (err) {
			toast.error(`Load activity log failed: ${String(err)}`);
		}
	}

	function formatTime(ms: number): string {
		return new Date(ms).toLocaleString();
	}

	function blockCountdown(untilMs: number): string {
		const remaining = untilMs - Date.now();
		if (remaining <= 0) return 'expiring soon';
		const hours = Math.floor(remaining / (60 * 60 * 1000));
		const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
		if (hours > 0) return `${hours}h ${minutes}m left`;
		return `${minutes}m left`;
	}
</script>

<div class="flex flex-col gap-6 p-4">
	<header class="flex flex-col gap-1">
		<h2 class="text-lg font-semibold">LAN sync</h2>
		<p class="text-muted-foreground text-sm">
			Sync vault folders with other devices on the same local network. End-to-end encrypted; never
			leaves your LAN.
		</p>
	</header>

	<section class="flex flex-col gap-3">
		<h3 class="text-sm font-medium">This device</h3>
		<div class="bg-muted/40 flex items-center justify-between rounded p-3">
			<div class="flex flex-col gap-1">
				<span class="text-muted-foreground text-xs">Your fingerprint</span>
				<span class="font-mono text-base">
					{lanSyncStore.myFingerprint?.fingerprintDisplay ?? '…'}
				</span>
			</div>
			<Shield class="text-muted-foreground size-5" />
		</div>
		<div class="flex items-center justify-between">
			<Label for="lan-sync-discoverable" class="flex flex-col gap-1">
				<span>Make this vault discoverable</span>
				<span class="text-muted-foreground text-xs">
					Announce via mDNS while pairing. Default off.
				</span>
			</Label>
			<Switch
				id="lan-sync-discoverable"
				checked={settingsStore.lanSync?.discoverable ?? false}
				onCheckedChange={toggleDiscoverable}
			/>
		</div>
	</section>

	<section class="flex flex-col gap-3">
		<header class="flex items-center justify-between">
			<h3 class="text-sm font-medium">Trusted peers</h3>
			<Button size="sm" onclick={() => (pairingOpen = true)}>
				<Plus class="size-3" />
				Pair new device
			</Button>
		</header>
		{#if lanSyncStore.trustedPeers.length === 0}
			<p class="text-muted-foreground text-xs">No paired devices yet.</p>
		{:else}
			<ul class="flex flex-col gap-1">
				{#each lanSyncStore.trustedPeers as peer (peer.fingerprintHex)}
					<li
						class="hover:bg-primary/10 flex items-center justify-between rounded px-2 py-1.5"
					>
						<div class="flex flex-col">
							<span class="font-mono text-xs">{peer.fingerprintHex}</span>
							<span class="text-muted-foreground text-[11px]">{peer.displayName}</span>
						</div>
						<Button
							variant="ghost"
							size="sm"
							onclick={() => handleRemovePeer(peer.fingerprintHex)}
							aria-label="Remove peer"
						>
							<Trash2 class="size-3" />
						</Button>
					</li>
				{/each}
			</ul>
		{/if}
	</section>

	<section class="flex flex-col gap-3">
		<header class="flex items-center justify-between">
			<h3 class="text-sm font-medium">Shares</h3>
			<Button size="sm" onclick={() => (shareEditOpen = true)}>
				<Plus class="size-3" />
				Add share
			</Button>
		</header>
		{#if lanSyncStore.shares.length === 0}
			<p class="text-muted-foreground text-xs">No shares yet.</p>
		{:else}
			<ul class="flex flex-col gap-1">
				{#each lanSyncStore.shares as share (share.id)}
					<li
						class="hover:bg-primary/10 flex items-center justify-between rounded px-2 py-1.5"
					>
						<div class="flex flex-col">
							<span class="font-mono text-xs">
								{share.mode === 'root-with-excludes' ? '(vault root)' : share.localPath}
							</span>
							<span class="text-muted-foreground text-[11px]">
								{share.mode} · {share.direction}
								{#if share.readOnly} · read-only{/if}
								· {share.allowedPeerFingerprints.length} peer(s)
								{#if share.mode === 'root-with-excludes' && share.excludes.length > 0}
									· {share.excludes.length} exclude(s)
								{/if}
							</span>
						</div>
						<Button
							variant="ghost"
							size="sm"
							onclick={() => handleRemoveShare(share.id)}
							aria-label="Remove share"
						>
							<Trash2 class="size-3" />
						</Button>
					</li>
				{/each}
			</ul>
		{/if}
	</section>

	<section class="flex flex-col gap-3">
		<h3 class="text-sm font-medium">Blocked attempts</h3>
		{#if lanSyncStore.blockedEntries.length === 0}
			<p class="text-muted-foreground text-xs">No blocked peers.</p>
		{:else}
			<ul class="flex flex-col gap-1">
				{#each lanSyncStore.blockedEntries as block (block.identifier)}
					<li
						class="flex items-center justify-between rounded border border-destructive/30 px-2 py-1.5"
					>
						<div class="flex flex-col">
							<span class="font-mono text-xs">{block.identifier}</span>
							<span class="text-muted-foreground text-[11px]">
								{block.triggerReason} · {block.failureCountInWindow} failures ·
								{blockCountdown(block.blockedUntilMs)}
							</span>
						</div>
						<Button variant="outline" size="sm" onclick={() => handleUnblock(block.identifier)}>
							Unblock
						</Button>
					</li>
				{/each}
			</ul>
		{/if}
	</section>

	<section class="flex flex-col gap-3">
		<header class="flex items-center justify-between">
			<h3 class="text-sm font-medium">Activity log</h3>
			<Button
				variant="ghost"
				size="sm"
				onclick={async () => {
					activityLogOpen = !activityLogOpen;
					if (activityLogOpen) await refreshActivityLog();
				}}
			>
				<Users class="size-3" />
				{activityLogOpen ? 'Hide' : 'Show'}
			</Button>
		</header>
		{#if activityLogOpen}
			{#if lanSyncStore.recentAuthEvents.length === 0}
				<p class="text-muted-foreground text-xs">No events recorded yet.</p>
			{:else}
				<ul class="flex flex-col gap-1 text-xs">
					{#each lanSyncStore.recentAuthEvents as event (event.id)}
						<li class="flex items-center justify-between rounded px-2 py-1">
							<div class="flex flex-col">
								<span class="font-mono">{event.identifier}</span>
								<span class="text-muted-foreground">
									{event.handshakePhase}
									{#if event.failureReason} · {event.failureReason}{/if}
								</span>
							</div>
							<div class="flex flex-col items-end gap-0">
								<span class={event.outcome === 'success' ? 'text-emerald-500' : 'text-destructive'}>
									{event.outcome}
								</span>
								<span class="text-muted-foreground">{formatTime(event.timestampMs)}</span>
							</div>
						</li>
					{/each}
				</ul>
			{/if}
		{/if}
	</section>
</div>

<PairingDialog bind:open={pairingOpen} />
<ShareEditDialog bind:open={shareEditOpen} />
