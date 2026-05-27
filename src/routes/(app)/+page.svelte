<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { vaultStore } from '$lib/core/vault/vault.store.svelte';
	import { openVaultDialog, openRecentVault } from '$lib/core/vault/vault.service';
	import BuildInfo from '$lib/core/settings/BuildInfo.svelte';
	import FolderOpen from '@lucide/svelte/icons/folder-open';
	import Clock from '@lucide/svelte/icons/clock';
	import ShieldCheck from '@lucide/svelte/icons/shield-check';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';

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

	<Button size="lg" onclick={handleOpenVault} class="gap-2 transition-all hover:scale-[1.02] hover:shadow-md">
		<FolderOpen class="size-4" />
		Open Vault
	</Button>

	{#if vaultStore.recentVaults.length > 0}
		<div class="flex w-[32rem] flex-col gap-2 rounded-lg border border-muted-foreground/10 p-3">
			<div class="flex items-center gap-2 text-sm text-muted-foreground">
				<Clock class="size-3.5" />
				<span>Recent Vaults</span>
			</div>
			<div class="flex items-center gap-1.5 rounded-md border border-muted-foreground/10 bg-card px-3 py-1.5 text-xs text-muted-foreground">
				<ShieldCheck class="size-3.5 shrink-0" />
				<span>Allowed locations: <span class="font-medium text-foreground/80">~/Documents/kokobrain-vaults/</span> and <span class="font-medium text-foreground/80">~/kokobrain-vaults/</span></span>
			</div>
			{#each vaultStore.recentVaults as vault}
				<button
					class="group flex items-center gap-2 text-left transition-all"
					onclick={() => handleOpenRecent(vault.path)}
				>
					<ChevronRight class="size-4 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5 group-hover:text-muted-foreground" />
					<div class="flex flex-1 flex-col rounded-md border bg-card px-3 py-2 transition-all group-hover:bg-secondary group-hover:scale-[1.02] group-hover:shadow-md group-hover:border-muted-foreground/30">
						<span class="text-sm font-medium">{vault.name}</span>
						<span class="truncate text-xs text-muted-foreground">{vault.path}</span>
					</div>
				</button>
			{/each}
		</div>
	{/if}

	<div class="absolute bottom-4">
		<BuildInfo variant="footer" />
	</div>
</div>
