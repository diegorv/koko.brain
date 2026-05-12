<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { lanSyncStore } from './lan-sync.store.svelte';
	import { confirmPair, startPairClient, startPairServer } from './lan-sync.service';
	import { vaultStore } from '$lib/core/vault/vault.store.svelte';
	import { Check, Copy, KeyRound, X } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';
	import PeerListPanel from './PeerListPanel.svelte';

	let { open = $bindable(false) }: { open?: boolean } = $props();

	let mode = $state<'choose' | 'host' | 'guest-pick' | 'guest-enter' | 'confirm'>('choose');
	let busy = $state(false);
	let typedPassphrase = $state('');
	let selectedPeerAddr = $state('');
	let selectedPeerPort = $state(31337);
	let selectedPeerFingerprint = $state('');

	const peerSummary = $derived(() => {
		if (!selectedPeerFingerprint) return null;
		return lanSyncStore.discoveredPeers.find(
			(p) => p.fingerprintHex === selectedPeerFingerprint,
		);
	});

	function reset() {
		mode = 'choose';
		busy = false;
		typedPassphrase = '';
		selectedPeerAddr = '';
		selectedPeerPort = 31337;
		selectedPeerFingerprint = '';
	}

	async function startHost() {
		const vaultPath = vaultStore.path;
		if (!vaultPath) {
			toast.error('Open a vault first.');
			return;
		}
		busy = true;
		try {
			await startPairServer(vaultPath);
			mode = 'host';
		} catch (err) {
			toast.error(`Pairing not available yet: ${String(err)}`);
		} finally {
			busy = false;
		}
	}

	async function startGuestFromList(fingerprintHex: string) {
		const peer = lanSyncStore.discoveredPeers.find((p) => p.fingerprintHex === fingerprintHex);
		if (!peer) return;
		selectedPeerFingerprint = fingerprintHex;
		selectedPeerAddr = peer.addr;
		selectedPeerPort = peer.port;
		mode = 'guest-enter';
	}

	async function submitGuestPassphrase() {
		const vaultPath = vaultStore.path;
		if (!vaultPath) return;
		busy = true;
		try {
			await startPairClient(vaultPath, selectedPeerAddr, selectedPeerPort, typedPassphrase);
			mode = 'confirm';
		} catch (err) {
			toast.error(`Pairing not available yet: ${String(err)}`);
		} finally {
			busy = false;
		}
	}

	async function confirmAndFinish(accept: boolean) {
		const sessionId = lanSyncStore.pendingPairing?.sessionId;
		if (!sessionId) {
			toast.error('No active pairing session.');
			return;
		}
		busy = true;
		try {
			await confirmPair(sessionId, accept);
			if (accept) {
				toast.success('Peer paired.');
				open = false;
				reset();
			} else {
				toast.message('Pairing rejected.');
				open = false;
				reset();
			}
		} catch (err) {
			toast.error(String(err));
		} finally {
			busy = false;
		}
	}

	async function copyPassphrase() {
		const passphrase = lanSyncStore.pendingPairing?.passphrase?.join('-') ?? '';
		try {
			await navigator.clipboard.writeText(passphrase);
			toast.success('Passphrase copied.');
		} catch {
			toast.error('Copy failed.');
		}
	}

	$effect(() => {
		if (!open) {
			reset();
		}
	});
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="max-w-md">
		<Dialog.Header>
			<Dialog.Title>Pair a new device</Dialog.Title>
		</Dialog.Header>

		{#if mode === 'choose'}
			<div class="flex flex-col gap-3">
				<Button onclick={startHost} disabled={busy}>
					<KeyRound class="size-4" />
					Show passphrase (this is the host)
				</Button>
				<Button variant="outline" onclick={() => (mode = 'guest-pick')} disabled={busy}>
					Enter a passphrase (join an existing host)
				</Button>
			</div>
		{:else if mode === 'host'}
			<div class="flex flex-col gap-3">
				<p class="text-muted-foreground text-xs">
					Type these 7 words on the other device, in order.
				</p>
				<div class="bg-muted rounded p-3 font-mono text-base leading-relaxed">
					{lanSyncStore.pendingPairing?.passphrase?.join(' - ') ?? '…'}
				</div>
				<Button variant="outline" size="sm" onclick={copyPassphrase}>
					<Copy class="size-3" />
					Copy
				</Button>
				<p class="text-muted-foreground text-xs">
					Waiting for the other device to connect. Confirm the fingerprint when it appears.
				</p>
			</div>
		{:else if mode === 'guest-pick'}
			<PeerListPanel onSelect={startGuestFromList} />
		{:else if mode === 'guest-enter'}
			<div class="flex flex-col gap-3">
				{#if peerSummary()}
					<p class="text-muted-foreground text-xs">
						Pairing with
						<span class="font-mono" title={peerSummary()?.fingerprintHex}>
							{peerSummary()?.fingerprintDisplay}
						</span>
						at {peerSummary()?.addr}:{peerSummary()?.port}.
					</p>
				{/if}
				<Label for="lan-sync-passphrase">Passphrase</Label>
				<Input
					id="lan-sync-passphrase"
					bind:value={typedPassphrase}
					placeholder="seven dash separated words"
				/>
				<Button onclick={submitGuestPassphrase} disabled={busy || typedPassphrase.length === 0}>
					Continue
				</Button>
			</div>
		{:else if mode === 'confirm'}
			<div class="flex flex-col gap-3">
				<p class="text-muted-foreground text-xs">
					Compare this fingerprint with the one shown on the other device. Confirm only if they
					match exactly.
				</p>
				<div class="bg-muted rounded p-3 text-center font-mono text-lg">
					{lanSyncStore.pendingPairing?.remoteFingerprint ?? '…'}
				</div>
				<div class="flex gap-2">
					<Button class="flex-1" onclick={() => confirmAndFinish(true)} disabled={busy}>
						<Check class="size-4" />
						Confirm
					</Button>
					<Button
						class="flex-1"
						variant="outline"
						onclick={() => confirmAndFinish(false)}
						disabled={busy}
					>
						<X class="size-4" />
						Reject
					</Button>
				</div>
			</div>
		{/if}
	</Dialog.Content>
</Dialog.Root>
