<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { vaultStore } from '$lib/core/vault/vault.store.svelte';
	import { openVaultDialog, openRecentVault } from '$lib/core/vault/vault.service';
	import { channelLabel } from '$lib/utils/build-info';
	import FolderOpen from 'lucide-svelte/icons/folder-open';
	import Clock from 'lucide-svelte/icons/clock';

	const channelBadgeClass = __APP_CHANNEL__ === 'nightly'
		? 'bg-amber-500/20 text-amber-700 dark:text-amber-400'
		: 'bg-muted text-muted-foreground';

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

	<p class="absolute bottom-4 inline-flex items-center gap-2 font-mono text-xs text-muted-foreground/50">
		<span class="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider {channelBadgeClass}">{channelLabel(__APP_CHANNEL__)}</span>
		<span>{__BUILD_INFO__}</span>
	</p>
</div>
