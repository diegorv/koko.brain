<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Select from '$lib/components/ui/select';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { lanSyncStore } from './lan-sync.store.svelte';
	import type { LanSyncService } from './lan-sync.service';
	import type { TrustedPeer } from './lan-sync.types';
	import { canSubmitPush, formatBytes } from './PushFolderDialog.logic';
	import { untrack } from 'svelte';

	let {
		vaultPath,
		sourceRelPath,
		service,
		open,
		onClose,
	}: {
		/** Absolute filesystem path of the local vault root. */
		vaultPath: string;
		/** Folder path being pushed, relative to the vault root. */
		sourceRelPath: string;
		/** Service binding used to invoke `pushFolder`. */
		service: LanSyncService;
		/** Whether the dialog is open. Controlled by the host. */
		open: boolean;
		/** Called when the dialog should be closed (cancel, X, or auto-close). */
		onClose: () => void;
	} = $props();

	/** Fingerprint hex of the peer selected in the picker; empty string when none. */
	let peerFingerprintHex = $state('');
	/** Target subpath the user wants the folder written to on the remote vault. */
	let targetRelPath = $state('');
	/** Local error captured from a rejected `service.pushFolder` invocation. */
	let invokeError = $state<string | null>(null);

	// Seed target on first mount so the field starts with the source path.
	$effect(() => {
		untrack(() => {
			targetRelPath = sourceRelPath;
		});
	});

	// Reset local form state every time the dialog opens for a fresh source path.
	$effect(() => {
		if (open) {
			const seed = sourceRelPath;
			untrack(() => {
				targetRelPath = seed;
				peerFingerprintHex = '';
				invokeError = null;
			});
		}
	});

	/** Label rendered inside `Select.Trigger` for the currently-selected peer. */
	function peerLabel(peer: TrustedPeer): string {
		return peer.displayName ? `${peer.fingerprintDisplay} (${peer.displayName})` : peer.fingerprintDisplay;
	}

	/** Looks up the trusted peer record matching `peerFingerprintHex` for display. */
	function selectedPeerLabel(): string {
		const found = lanSyncStore.trustedPeers.find((p) => p.fingerprintHex === peerFingerprintHex);
		return found ? peerLabel(found) : 'Select a paired device';
	}

	/** Fires `service.pushFolder` and lets the store event listeners drive UI updates. */
	async function handlePush(): Promise<void> {
		invokeError = null;
		try {
			await service.pushFolder(vaultPath, peerFingerprintHex, sourceRelPath, targetRelPath.trim());
		} catch (err) {
			invokeError = err instanceof Error ? err.message : String(err);
		}
	}

	/** Clears the previous push result so the Push button is enabled again. */
	function handleTryAgain(): void {
		lanSyncStore.setLastPushComplete(null);
		invokeError = null;
	}

	/** True when the live progress event matches the peer the user is sending to. */
	const progressMatchesPeer = $derived(
		lanSyncStore.pushProgress !== null
			&& lanSyncStore.pushProgress.peerFingerprint === peerFingerprintHex,
	);

	/** True when the terminal result event matches the peer the user is sending to. */
	const completeMatchesPeer = $derived(
		lanSyncStore.lastPushComplete !== null
			&& lanSyncStore.lastPushComplete.peerFingerprint === peerFingerprintHex,
	);

	/** True iff we have a success result for the currently-selected peer. */
	const successForThisPeer = $derived(
		completeMatchesPeer && lanSyncStore.lastPushComplete?.error === undefined,
	);

	// Auto-close on success after a 2-second toast window.
	$effect(() => {
		if (!successForThisPeer) return;
		const handle = setTimeout(() => {
			untrack(() => {
				lanSyncStore.setLastPushComplete(null);
				onClose();
			});
		}, 2000);
		return () => clearTimeout(handle);
	});

	/** Push button enabled state — combines form validity with in-flight guard. */
	const pushEnabled = $derived(
		canSubmitPush(peerFingerprintHex, targetRelPath, lanSyncStore.isPushInProgress),
	);
</script>

<Dialog.Root
	{open}
	onOpenChange={(next) => {
		if (!next) onClose();
	}}
>
	<Dialog.Content class="max-w-md">
		<Dialog.Header>
			<Dialog.Title>Send folder to peer</Dialog.Title>
			<Dialog.Description>
				Stream this folder to a paired device over an encrypted LAN channel.
			</Dialog.Description>
		</Dialog.Header>

		<div class="flex flex-col gap-4">
			<div class="flex flex-col gap-1.5">
				<Label for="lan-sync-push-source">Source</Label>
				<Input
					id="lan-sync-push-source"
					data-testid="lan-sync-push-source"
					value={sourceRelPath}
					readonly
					disabled
				/>
			</div>

			<div class="flex flex-col gap-1.5">
				<Label for="lan-sync-push-peer">Peer</Label>
				{#if lanSyncStore.trustedPeers.length === 0}
					<p
						id="lan-sync-push-peer"
						data-testid="lan-sync-push-peer-empty"
						class="text-muted-foreground text-sm"
					>
						Pair a device in Settings first.
					</p>
				{:else}
					<Select.Root
						type="single"
						bind:value={peerFingerprintHex}
					>
						<Select.Trigger
							id="lan-sync-push-peer"
							data-testid="lan-sync-push-peer"
							class="w-full"
						>
							<span data-slot="select-value">{selectedPeerLabel()}</span>
						</Select.Trigger>
						<Select.Content>
							{#each lanSyncStore.trustedPeers as peer (peer.fingerprintHex)}
								<Select.Item value={peer.fingerprintHex} label={peerLabel(peer)} />
							{/each}
						</Select.Content>
					</Select.Root>
				{/if}
			</div>

			<div class="flex flex-col gap-1.5">
				<Label for="lan-sync-push-target">Target sub-path</Label>
				<Input
					id="lan-sync-push-target"
					data-testid="lan-sync-push-target"
					bind:value={targetRelPath}
					placeholder="Notes/From Other Device"
				/>
			</div>

			{#if progressMatchesPeer && lanSyncStore.pushProgress}
				<div class="flex flex-col gap-1.5" data-testid="lan-sync-push-progress">
					<div class="bg-muted h-2 w-full overflow-hidden rounded">
						<div
							class="bg-primary h-full transition-[width]"
							style="width: {lanSyncStore.pushPercent}%"
						></div>
					</div>
					<p class="text-muted-foreground text-xs">
						{lanSyncStore.pushProgress.filesDone} of {lanSyncStore.pushProgress.filesTotal} files
						— {formatBytes(lanSyncStore.pushProgress.bytesDone)} of {formatBytes(lanSyncStore.pushProgress.bytesTotal)}
					</p>
				</div>
			{/if}

			{#if completeMatchesPeer && lanSyncStore.lastPushComplete}
				{#if lanSyncStore.lastPushComplete.error === undefined}
					<p
						class="text-sm text-emerald-600 dark:text-emerald-400"
						data-testid="lan-sync-push-success"
					>
						Sent {lanSyncStore.lastPushComplete.filesTransferred} files.
					</p>
				{:else}
					<div class="flex flex-col gap-2" data-testid="lan-sync-push-error">
						<p class="text-destructive text-sm">
							{lanSyncStore.lastPushComplete.error}
						</p>
						<Button
							type="button"
							variant="outline"
							size="sm"
							onclick={handleTryAgain}
							data-testid="lan-sync-push-try-again"
						>
							Try again
						</Button>
					</div>
				{/if}
			{/if}

			{#if invokeError}
				<p class="text-destructive text-sm" data-testid="lan-sync-push-invoke-error">
					{invokeError}
				</p>
			{/if}
		</div>

		<Dialog.Footer>
			<Button
				type="button"
				variant="secondary"
				onclick={onClose}
				data-testid="lan-sync-push-cancel"
			>
				Cancel
			</Button>
			<Button
				type="button"
				variant="default"
				disabled={!pushEnabled}
				onclick={handlePush}
				data-testid="lan-sync-push-submit"
			>
				Push
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
