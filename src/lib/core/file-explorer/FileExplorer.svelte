<script lang="ts">
	import { fsStore } from '$lib/core/filesystem/fs.store.svelte';
	import { vaultStore } from '$lib/core/vault/vault.store.svelte';
	import { createFile, createFolder, moveItem } from '$lib/core/filesystem/fs.service';
	import { validateDragDrop } from '$lib/core/filesystem/fs.logic';
	import { createCanvasFile } from '$lib/features/canvas/canvas.service';
	import { createKanbanFile } from '$lib/plugins/kanban/kanban.service';
	import { Vault, FilePlus, FolderPlus, LayoutDashboard, Kanban } from 'lucide-svelte';
	import { ScrollArea } from '$lib/components/ui/scroll-area';
	import { Separator } from '$lib/components/ui/separator';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import * as ContextMenu from '$lib/components/ui/context-menu';
	import FileExplorerHeader from './FileExplorerHeader.svelte';
	import FileTreeItem from './FileTreeItem.svelte';

	/** Creates a new file at the vault root and immediately enters rename mode */
	async function handleNewFile() {
		const path = vaultStore.path;
		if (!path) return;
		const filePath = await createFile(path, 'Untitled.md');
		if (filePath) {
			fsStore.setPendingCreationPath(filePath);
			fsStore.setRenamingPath(filePath);
		}
	}

	/** Creates a new folder at the vault root and immediately enters rename mode */
	async function handleNewFolder() {
		const path = vaultStore.path;
		if (!path) return;
		const folderPath = await createFolder(path, 'Untitled');
		if (folderPath) {
			fsStore.setRenamingPath(folderPath);
		}
	}

	/** Creates a new .canvas file at the vault root */
	async function handleNewCanvas() {
		const path = vaultStore.path;
		if (!path) return;
		const filePath = await createCanvasFile(path);
		if (filePath) {
			fsStore.setPendingCreationPath(filePath);
			fsStore.setRenamingPath(filePath);
		}
	}

	/** Creates a new .kanban file at the vault root */
	async function handleNewKanban() {
		const path = vaultStore.path;
		if (!path) return;
		const filePath = await createKanbanFile(path);
		if (filePath) {
			fsStore.setPendingCreationPath(filePath);
			fsStore.setRenamingPath(filePath);
		}
	}

	// --- Vault-root drag & drop (empty space in the tree) ---

	let isRootDragOver = $state(false);

	/** Accepts drops only directly on the tree container (not bubbled from children) */
	function handleRootDragOver(e: DragEvent) {
		if (e.target !== e.currentTarget) return;
		e.preventDefault();
		if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
		isRootDragOver = true;
	}

	function handleRootDragLeave(e: DragEvent) {
		if (e.target !== e.currentTarget) return;
		isRootDragOver = false;
	}

	/** Moves the dropped item to the vault root */
	async function handleRootDrop(e: DragEvent) {
		isRootDragOver = false;
		if (e.target !== e.currentTarget) return;
		e.preventDefault();
		const sourcePath = e.dataTransfer?.getData('text/plain');
		if (!sourcePath || !vaultStore.path) return;
		if (validateDragDrop(sourcePath, vaultStore.path)) return;
		await moveItem(sourcePath, vaultStore.path);
	}
</script>

<Tooltip.Provider delayDuration={400}>
	<div class="flex h-full flex-col bg-file-explorer-bg">
		<FileExplorerHeader onNewFile={handleNewFile} onNewFolder={handleNewFolder} />
		<Separator />
		<ScrollArea class="flex-1 overflow-hidden">
			<ContextMenu.Root>
				<ContextMenu.Trigger>
					{#snippet child({ props })}
						<div
							{...props}
							class="p-1 min-h-full {isRootDragOver ? 'bg-accent/30' : ''}"
							role="tree"
							tabindex="0"
							ondragover={handleRootDragOver}
							ondragleave={handleRootDragLeave}
							ondrop={handleRootDrop}
						>
							{#each fsStore.fileTree as node (node.path)}
								<FileTreeItem {node} />
							{/each}
						</div>
					{/snippet}
				</ContextMenu.Trigger>
				<ContextMenu.Content class="w-48">
					<ContextMenu.Item onclick={handleNewFile}>
						<FilePlus class="size-4" />
						<span>New File</span>
					</ContextMenu.Item>
					<ContextMenu.Item onclick={handleNewFolder}>
						<FolderPlus class="size-4" />
						<span>New Folder</span>
					</ContextMenu.Item>
					<ContextMenu.Separator />
					<ContextMenu.Item onclick={handleNewCanvas}>
						<LayoutDashboard class="size-4" />
						<span>New Canvas</span>
					</ContextMenu.Item>
					<ContextMenu.Item onclick={handleNewKanban}>
						<Kanban class="size-4" />
						<span>New Kanban Board</span>
					</ContextMenu.Item>
				</ContextMenu.Content>
			</ContextMenu.Root>
		</ScrollArea>
		<Separator />
		<div class="flex items-center gap-1.5 px-3 py-2 shrink-0">
			<Vault class="size-3.5 text-muted-foreground shrink-0" />
			<span class="truncate text-xs text-muted-foreground">{vaultStore.name}</span>
		</div>
	</div>
</Tooltip.Provider>
