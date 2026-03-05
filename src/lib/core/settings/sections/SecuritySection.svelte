<script lang="ts">
	import { invoke } from '@tauri-apps/api/core';
	import { toast } from 'svelte-sonner';
	import { Button } from '$lib/components/ui/button';
	import { vaultStore } from '$lib/core/vault/vault.store.svelte';
	import { error } from '$lib/utils/debug';
	import SettingItem from './SettingItem.svelte';
	import RecoveryKeyDialog from '$lib/plugins/encrypted-notes/RecoveryKeyDialog.svelte';

	let hasKey = $state(false);
	let isChecking = $state(true);
	let showDialog = $state(false);
	let dialogMode = $state<'show' | 'restore'>('show');
	let recoveryKey = $state('');

	/** Check if this vault has an encryption key (no Touch ID prompt) */
	async function checkKeyExists() {
		const vaultPath = vaultStore.path;
		if (!vaultPath) {
			isChecking = false;
			return;
		}
		try {
			hasKey = await invoke<boolean>('has_encryption_key', { vaultPath });
		} catch (err) {
			error('SETTINGS', 'Failed to check encryption key:', err);
		} finally {
			isChecking = false;
		}
	}

	$effect(() => {
		if (vaultStore.path) {
			checkKeyExists();
		}
	});

	async function handleShowRecoveryKey() {
		const vaultPath = vaultStore.path;
		if (!vaultPath) return;
		try {
			recoveryKey = await invoke<string>('get_recovery_key', { vaultPath });
			dialogMode = 'show';
			showDialog = true;
		} catch (err) {
			const msg = String(err);
			if (msg.includes('canceled') || msg.includes('cancelled')) return;
			error('SETTINGS', 'Failed to get recovery key:', err);
			toast.error('Failed to retrieve recovery key.');
		}
	}

	function handleOpenRestore() {
		dialogMode = 'restore';
		showDialog = true;
	}

	async function handleRestore(key: string) {
		const vaultPath = vaultStore.path;
		if (!vaultPath) throw new Error('No vault open');
		await invoke('restore_from_recovery_key', { vaultPath, recoveryKey: key });
		hasKey = true;
		toast.success('Encryption key restored successfully.');
	}
</script>

<div class="flex flex-col gap-2">
	<h2 class="mb-4 text-lg font-semibold">Security</h2>

	<h3 class="mb-2 text-sm font-medium text-muted-foreground">Encryption</h3>

	<SettingItem
		label="Show recovery key"
		description="View the recovery key for this vault (requires Touch ID)"
	>
		<Button
			variant="outline"
			size="sm"
			onclick={handleShowRecoveryKey}
			disabled={isChecking || !hasKey}
		>
			{isChecking ? 'Checking...' : hasKey ? 'Show' : 'No key'}
		</Button>
	</SettingItem>

	<SettingItem
		label="Restore from recovery key"
		description="Import a recovery key from another machine"
	>
		<Button variant="outline" size="sm" onclick={handleOpenRestore}>
			Restore
		</Button>
	</SettingItem>
</div>

<RecoveryKeyDialog
	bind:open={showDialog}
	mode={dialogMode}
	{recoveryKey}
	onrestore={handleRestore}
/>
