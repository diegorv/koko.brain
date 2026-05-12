<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { lanSyncStore } from './lan-sync.store.svelte';
	import type { LanSyncService } from './lan-sync.service';
	import {
		createPairingPromptState,
		handleOpenChange,
		runPair,
		shouldDialogBeOpen,
	} from './PairingPrompt.logic';

	let {
		vaultPath,
		service,
	}: {
		/** Absolute path of the active vault; forwarded to every service call. */
		vaultPath: string;
		/** LAN sync service instance bound at app init. */
		service: LanSyncService;
	} = $props();

	/** Local submit/error state owned by this dialog; resets per request. */
	const state = $state(createPairingPromptState());

	/** Derived directly from the store so the dialog auto-closes when the service clears pendingPair. */
	const open = $derived(shouldDialogBeOpen(lanSyncStore.pendingPair));

	async function onAccept() {
		await runPair(state, service, vaultPath, lanSyncStore.pendingPair, true);
	}

	async function onReject() {
		await runPair(state, service, vaultPath, lanSyncStore.pendingPair, false);
	}

	function onOpenChange(next: boolean) {
		void handleOpenChange(next, state, service, vaultPath, lanSyncStore.pendingPair);
	}
</script>

<Dialog.Root {open} {onOpenChange}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Pair with new device</Dialog.Title>
			<Dialog.Description>
				Confirm this matches the same phrase shown on the other device. Only accept if it does.
			</Dialog.Description>
		</Dialog.Header>

		{#if lanSyncStore.pendingPair}
			<div class="flex flex-col gap-3">
				<code
					class="block w-full rounded-md border bg-muted p-4 text-center font-mono text-lg leading-relaxed break-words select-all"
					data-testid="pairing-prompt-display"
				>
					{lanSyncStore.pendingPair.fingerprintDisplay}
				</code>
				<code
					class="block w-full rounded-md border bg-muted/50 p-2 text-center font-mono text-xs text-muted-foreground break-all select-all"
					data-testid="pairing-prompt-hex"
				>
					{lanSyncStore.pendingPair.fingerprintHex}
				</code>
				<p class="text-xs text-muted-foreground text-center" data-testid="pairing-prompt-addr">
					{lanSyncStore.pendingPair.addr}:{lanSyncStore.pendingPair.port}
				</p>
			</div>
		{/if}

		{#if state.error}
			<p class="text-xs text-destructive" data-testid="pairing-prompt-error">{state.error}</p>
		{/if}

		<Dialog.Footer>
			<Button
				variant="secondary"
				onclick={onReject}
				disabled={state.submitting}
				data-testid="pairing-prompt-reject"
			>
				Reject
			</Button>
			<Button
				onclick={onAccept}
				disabled={state.submitting}
				data-testid="pairing-prompt-accept"
			>
				Accept
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
