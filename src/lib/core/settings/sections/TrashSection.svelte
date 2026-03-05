<script lang="ts">
	import { onMount } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import { ScrollArea } from '$lib/components/ui/scroll-area';
	import { trashStore } from '$lib/core/trash/trash.store.svelte';
	import { loadTrash, restoreItem, deletePermanently, emptyTrash } from '$lib/core/trash/trash.service';
	import { formatTrashedDate } from '$lib/core/trash/trash.logic';
	import { vaultStore } from '$lib/core/vault/vault.store.svelte';
	import type { TrashItem } from '$lib/core/trash/trash.types';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';
	import UndoIcon from '@lucide/svelte/icons/undo-2';
	import FolderIcon from '@lucide/svelte/icons/folder';
	import FileIcon from '@lucide/svelte/icons/file';
	import { ask } from '@tauri-apps/plugin-dialog';
	import { toast } from 'svelte-sonner';

	onMount(() => {
		if (vaultStore.path) {
			loadTrash(vaultStore.path);
		}
	});

	async function handleRestore(item: TrashItem) {
		if (!vaultStore.path) return;
		try {
			await restoreItem(vaultStore.path, item);
		} catch (err) {
			toast.error(`Failed to restore "${item.fileName}": ${err}`);
		}
	}

	async function handleDeletePermanently(item: TrashItem) {
		if (!vaultStore.path) return;
		const confirmed = await ask(
			`Permanently delete "${item.fileName}"? This cannot be undone.`,
			{ title: 'Delete Permanently', kind: 'warning' }
		);
		if (confirmed) {
			try {
				await deletePermanently(vaultStore.path, item);
			} catch (err) {
				toast.error(`Failed to delete "${item.fileName}": ${err}`);
			}
		}
	}

	async function handleEmptyTrash() {
		if (!vaultStore.path) return;
		const confirmed = await ask(
			`Permanently delete all ${trashStore.count} item${trashStore.count !== 1 ? 's' : ''} in trash? This cannot be undone.`,
			{ title: 'Empty Trash', kind: 'warning' }
		);
		if (confirmed) {
			try {
				await emptyTrash(vaultStore.path);
			} catch (err) {
				toast.error(`Failed to empty trash: ${err}`);
			}
		}
	}
</script>

<div class="flex flex-col gap-2">
	<div class="mb-4 flex items-center justify-between">
		<div class="flex items-center gap-2">
			<h2 class="text-lg font-semibold">Trash</h2>
			{#if trashStore.count > 0}
				<span class="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
					{trashStore.count}
				</span>
			{/if}
		</div>
		{#if !trashStore.isEmpty}
			<Button variant="destructive" size="sm" onclick={handleEmptyTrash}>
				Empty Trash
			</Button>
		{/if}
	</div>

	{#if trashStore.loading}
		<p class="text-sm text-muted-foreground">Loading...</p>
	{:else if trashStore.isEmpty}
		<div class="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
			<Trash2Icon class="size-10 opacity-30" />
			<p class="text-sm">Trash is empty</p>
		</div>
	{:else}
		<ScrollArea class="max-h-[50vh]">
			<div class="flex flex-col gap-1">
				{#each trashStore.items as item (item.id)}
					<div class="flex items-center gap-3 rounded-lg px-4 py-2.5 bg-setting-item-bg hover:bg-settings-hover-bg">
						<!-- File/folder icon -->
						<div class="shrink-0 text-muted-foreground">
							{#if item.isDirectory}
								<FolderIcon class="size-4" />
							{:else}
								<FileIcon class="size-4" />
							{/if}
						</div>

						<!-- Name and path -->
						<div class="flex min-w-0 flex-1 flex-col">
							<span class="truncate text-sm font-medium">{item.fileName}</span>
							<span class="truncate text-xs text-muted-foreground">{item.originalPath}</span>
						</div>

						<!-- Trashed date -->
						<span class="shrink-0 text-xs text-muted-foreground">
							{formatTrashedDate(item.trashedAt)}
						</span>

						<!-- Actions -->
						<div class="flex shrink-0 gap-1">
							<Button
								variant="ghost"
								size="icon"
								class="size-7"
								title="Restore"
								onclick={() => handleRestore(item)}
							>
								<UndoIcon class="size-3.5" />
							</Button>
							<Button
								variant="ghost"
								size="icon"
								class="size-7 text-destructive hover:text-destructive"
								title="Delete permanently"
								onclick={() => handleDeletePermanently(item)}
							>
								<Trash2Icon class="size-3.5" />
							</Button>
						</div>
					</div>
				{/each}
			</div>
		</ScrollArea>
	{/if}
</div>
