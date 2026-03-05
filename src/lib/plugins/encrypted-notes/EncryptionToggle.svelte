<script lang="ts">
	import { LockOpen, Lock } from 'lucide-svelte';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import { editorStore } from '$lib/core/editor/editor.store.svelte';
	import { isVirtualTab } from '$lib/core/editor/editor.logic';
	import { isCanvasFile, isCollectionFile } from '$lib/core/filesystem/fs.logic';
	import RecoveryKeyDialog from './RecoveryKeyDialog.svelte';

	/** Whether the active tab is a regular markdown file (not virtual, not canvas, not collection) */
	let isMarkdownTab = $derived.by(() => {
		const tab = editorStore.activeTab;
		if (!tab || isVirtualTab(tab)) return false;
		if (isCanvasFile(tab.name) || isCollectionFile(tab.name)) return false;
		return true;
	});

	let isEncrypted = $derived(editorStore.activeTab?.encrypted ?? false);
	let isLoading = $state(false);
	let showRecoveryDialog = $state(false);
	let recoveryKey = $state('');

	async function handleToggle() {
		if (isLoading) return;
		isLoading = true;
		try {
			if (isEncrypted) {
				const { decryptCurrentFile } = await import('./encrypted-notes.service');
				await decryptCurrentFile();
			} else {
				const { encryptCurrentFile } = await import('./encrypted-notes.service');
				const result = await encryptCurrentFile();
				if (result.recoveryKey) {
					recoveryKey = result.recoveryKey;
					showRecoveryDialog = true;
				}
			}
		} catch (err) {
			const { toast } = await import('svelte-sonner');
			console.error('Encryption toggle failed:', err);
			toast.error(isEncrypted ? 'Failed to decrypt file.' : 'Failed to encrypt file.');
		} finally {
			isLoading = false;
		}
	}
</script>

{#if isMarkdownTab}
	<Tooltip.Provider delayDuration={400}>
		<Tooltip.Root>
			<Tooltip.Trigger>
				{#snippet child({ props })}
					<button
						{...props}
						class="flex items-center gap-1 hover:text-foreground transition-colors disabled:opacity-50 disabled:pointer-events-none"
						onclick={handleToggle}
						disabled={isLoading}
					>
						{#if isEncrypted}
							<Lock class="size-3" />
						{:else}
							<LockOpen class="size-3" />
						{/if}
					</button>
				{/snippet}
			</Tooltip.Trigger>
			<Tooltip.Content>
				{isEncrypted ? 'Remove encryption' : 'Encrypt note'}
			</Tooltip.Content>
		</Tooltip.Root>
	</Tooltip.Provider>
{/if}

<RecoveryKeyDialog
	bind:open={showRecoveryDialog}
	mode="show"
	{recoveryKey}
/>
