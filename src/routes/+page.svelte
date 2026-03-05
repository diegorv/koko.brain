<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { vaultStore } from '$lib/core/vault/vault.store.svelte';
	import { openVaultDialog, openRecentVault } from '$lib/core/vault/vault.service';
	import { FolderOpen, Clock } from 'lucide-svelte';

	async function handleOpenVault() {
		await openVaultDialog();
	}

	async function handleOpenRecent(path: string) {
		await openRecentVault(path);
	}
</script>

<div class="flex h-screen flex-col items-center justify-center gap-8 relative">
	<div class="flex flex-col items-center gap-2">
		<h1 class="text-3xl font-bold">KokoBrain</h1>
		<p class="text-sm text-muted-foreground">Your second brain for personal knowledge</p>
	</div>

	<Button size="lg" onclick={handleOpenVault} class="gap-2">
		<FolderOpen class="size-4" />
		Open Vault
	</Button>

	{#if vaultStore.recentVaults.length > 0}
		<div class="flex w-72 flex-col gap-2">
			<div class="flex items-center gap-2 text-sm text-muted-foreground">
				<Clock class="size-3.5" />
				<span>Recent Vaults</span>
			</div>
			{#each vaultStore.recentVaults as vault}
				<button
					class="flex flex-col rounded-md border px-3 py-2 text-left transition-colors hover:bg-accent"
					onclick={() => handleOpenRecent(vault.path)}
				>
					<span class="text-sm font-medium">{vault.name}</span>
					<span class="truncate text-xs text-muted-foreground">{vault.path}</span>
				</button>
			{/each}
		</div>
	{/if}

	<p class="absolute bottom-4 font-mono text-xs text-muted-foreground/50">{__BUILD_INFO__}</p>
</div>
