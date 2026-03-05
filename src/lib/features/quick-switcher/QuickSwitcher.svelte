<script lang="ts">
	import * as Command from '$lib/components/ui/command';
	import { fsStore } from '$lib/core/filesystem/fs.store.svelte';
	import { vaultStore } from '$lib/core/vault/vault.store.svelte';
	import { openFileInEditor } from '$lib/core/editor/editor.service';
	import { toast } from 'svelte-sonner';
	import { createFile } from '$lib/core/filesystem/fs.service';
	import { quickSwitcherStore } from './quick-switcher.store.svelte';
	import { flattenFileTree, filterAndRank, getRelativePath } from './quick-switcher.logic';
	import FileText from '@lucide/svelte/icons/file-text';
	import FilePlus from '@lucide/svelte/icons/file-plus';

	let searchQuery = $state('');

	let allFiles = $derived(flattenFileTree(fsStore.fileTree));
	let filteredFiles = $derived(
		filterAndRank(searchQuery, allFiles, quickSwitcherStore.recentPaths),
	);
	let hasResults = $derived(filteredFiles.length > 0);

	function handleOpenChange(open: boolean) {
		if (!open) {
			quickSwitcherStore.close();
			searchQuery = '';
		}
	}

	async function selectFile(path: string) {
		quickSwitcherStore.addRecentPath(path);
		quickSwitcherStore.close();
		searchQuery = '';
		await openFileInEditor(path);
	}

	async function createAndOpenNote() {
		if (!searchQuery.trim() || !vaultStore.path) return;

		const name = searchQuery.trim().endsWith('.md')
			? searchQuery.trim()
			: `${searchQuery.trim()}.md`;

		const filePath = await createFile(vaultStore.path, name);
		if (filePath) {
			quickSwitcherStore.addRecentPath(filePath);
			await openFileInEditor(filePath);
			quickSwitcherStore.close();
			searchQuery = '';
		} else {
			toast.error('Failed to create file.');
		}
	}
</script>

<Command.Dialog
	open={quickSwitcherStore.isOpen}
	onOpenChange={handleOpenChange}
	shouldFilter={false}
	title="Quick Switcher"
	description="Search for a note to open"
>
	<Command.Input placeholder="Type a note name..." bind:value={searchQuery} />
	<Command.List>
		{#if hasResults}
			<Command.Group>
				{#each filteredFiles as file (file.path)}
					<Command.Item
						value={file.path}
						onSelect={() => selectFile(file.path)}
					>
						<FileText class="size-4 text-muted-foreground" />
						<div class="flex flex-col gap-0.5">
							<span>{file.nameWithoutExt}</span>
							{#if vaultStore.path}
								<span class="text-xs text-muted-foreground">
									{getRelativePath(file.path, vaultStore.path)}
								</span>
							{/if}
						</div>
					</Command.Item>
				{/each}
			</Command.Group>
		{:else if searchQuery.trim().length > 0}
			<Command.Empty>
				<button
					class="flex w-full items-center justify-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
					onclick={createAndOpenNote}
				>
					<FilePlus class="size-4" />
					<span>Create "{searchQuery.trim()}"</span>
				</button>
			</Command.Empty>
		{:else}
			<Command.Empty>No files found.</Command.Empty>
		{/if}
	</Command.List>
</Command.Dialog>
