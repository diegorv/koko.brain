<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import CopyIcon from '@lucide/svelte/icons/copy';
	import CheckIcon from '@lucide/svelte/icons/check';
	import ShieldAlertIcon from '@lucide/svelte/icons/shield-alert';
	import KeyRoundIcon from '@lucide/svelte/icons/key-round';

	let {
		open = $bindable(false),
		mode,
		recoveryKey = '',
		onrestore,
	}: {
		/** Whether the dialog is open */
		open: boolean;
		/** 'show' to display a recovery key, 'restore' to input one */
		mode: 'show' | 'restore';
		/** The recovery key to display (only used in 'show' mode) */
		recoveryKey?: string;
		/** Called when the user submits a recovery key (only used in 'restore' mode) */
		onrestore?: (key: string) => Promise<void>;
	} = $props();

	let copied = $state(false);
	let inputKey = $state('');
	let restoreError = $state('');
	let isRestoring = $state(false);

	async function handleCopy() {
		try {
			await navigator.clipboard.writeText(recoveryKey);
			copied = true;
			setTimeout(() => { copied = false; }, 2000);
		} catch {
			// Fallback: select the text for manual copy
		}
	}

	async function handleRestore() {
		if (!inputKey.trim() || !onrestore) return;
		isRestoring = true;
		restoreError = '';
		try {
			await onrestore(inputKey.trim());
			open = false;
			inputKey = '';
		} catch (err) {
			restoreError = String(err);
		} finally {
			isRestoring = false;
		}
	}

	function handleOpenChange(isOpen: boolean) {
		open = isOpen;
		if (!isOpen) {
			copied = false;
			inputKey = '';
			restoreError = '';
			isRestoring = false;
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !isRestoring && inputKey.trim()) {
			handleRestore();
		}
	}
</script>

<Dialog.Root {open} onOpenChange={handleOpenChange}>
	<Dialog.Content class="sm:max-w-md">
		{#if mode === 'show'}
			<Dialog.Header>
				<Dialog.Title class="flex items-center gap-2">
					<ShieldAlertIcon class="size-5 text-yellow-500" />
					Recovery Key
				</Dialog.Title>
				<Dialog.Description>
					Save this key somewhere safe. If you lose access to this Mac, this is the only way to decrypt your notes.
				</Dialog.Description>
			</Dialog.Header>

			<div class="flex flex-col gap-3">
				<div class="relative">
					<code class="block w-full rounded-md border bg-muted p-3 pr-10 font-mono text-sm break-all select-all">
						{recoveryKey}
					</code>
					<button
						class="absolute right-2 top-2 rounded-md p-1.5 text-muted-foreground hover:text-foreground transition-colors"
						onclick={handleCopy}
					>
						{#if copied}
							<CheckIcon class="size-4 text-green-500" />
						{:else}
							<CopyIcon class="size-4" />
						{/if}
					</button>
				</div>

				<p class="text-xs text-muted-foreground">
					This key will not be shown again automatically. You can view it later in Settings &gt; Security.
				</p>
			</div>

			<Dialog.Footer>
				<Button onclick={() => { open = false; }}>
					I've saved my recovery key
				</Button>
			</Dialog.Footer>
		{:else}
			<Dialog.Header>
				<Dialog.Title class="flex items-center gap-2">
					<KeyRoundIcon class="size-5" />
					Restore from Recovery Key
				</Dialog.Title>
				<Dialog.Description>
					Paste the recovery key you saved when you first encrypted notes in this vault.
				</Dialog.Description>
			</Dialog.Header>

			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div class="flex flex-col gap-3" onkeydown={handleKeydown}>
				<Input
					placeholder="Paste your recovery key..."
					class="font-mono text-sm"
					bind:value={inputKey}
				/>

				{#if restoreError}
					<p class="text-xs text-destructive">{restoreError}</p>
				{/if}
			</div>

			<Dialog.Footer>
				<Button variant="outline" onclick={() => { open = false; }}>
					Cancel
				</Button>
				<Button onclick={handleRestore} disabled={isRestoring || !inputKey.trim()}>
					{isRestoring ? 'Restoring...' : 'Restore'}
				</Button>
			</Dialog.Footer>
		{/if}
	</Dialog.Content>
</Dialog.Root>
