<script lang="ts">
	import { fsStore } from '$lib/core/filesystem/fs.store.svelte';
	import { vaultStore } from '$lib/core/vault/vault.store.svelte';
	import { bookmarksStore } from '$lib/features/bookmarks/bookmarks.store.svelte';
	import { toggleBookmarkForPath } from '$lib/features/bookmarks/bookmarks.service';
	import { fileIconsStore } from '$lib/features/file-icons/file-icons.store.svelte';
	import {
		setIconForPath,
		removeIconForPath,
		trackRecentIcon,
	} from '$lib/features/file-icons/file-icons.service';
	import { openFileInEditor } from '$lib/core/editor/editor.service';
	import {
		createFile,
		createFolder,
		deleteItem,
		duplicateItem,
		moveItem,
		revealInSystemExplorer,
	} from '$lib/core/filesystem/fs.service';
	import {
		validateDragDrop,
		getRelativePath,
		getParentPath,
	} from '$lib/core/filesystem/fs.logic';
	import { createCanvasFile } from '$lib/features/canvas/canvas.service';
	import { createKanbanFile } from '$lib/plugins/kanban/kanban.service';
	import { ask } from '@tauri-apps/plugin-dialog';
	import IconPicker from '$lib/features/file-icons/IconPicker.svelte';
	import type { FileTreeNode } from '$lib/core/filesystem/fs.types';
	import type { IconPackId } from '$lib/features/file-icons/file-icons.types';
	import Vault from '@lucide/svelte/icons/vault';
	import FilePlus from '@lucide/svelte/icons/file-plus';
	import FolderPlus from '@lucide/svelte/icons/folder-plus';
	import LayoutDashboard from '@lucide/svelte/icons/layout-dashboard';
	import Kanban from '@lucide/svelte/icons/kanban';
	import Pencil from '@lucide/svelte/icons/pencil';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import Copy from '@lucide/svelte/icons/copy';
	import Bookmark from '@lucide/svelte/icons/bookmark';
	import BookmarkMinus from '@lucide/svelte/icons/bookmark-minus';
	import ExternalLink from '@lucide/svelte/icons/external-link';
	import FolderSearch from '@lucide/svelte/icons/folder-search';
	import Palette from '@lucide/svelte/icons/palette';
	import { ScrollArea } from '$lib/components/ui/scroll-area';
	import { Separator } from '$lib/components/ui/separator';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import * as ContextMenu from '$lib/components/ui/context-menu';
	import FileExplorerHeader from './FileExplorerHeader.svelte';
	import FileTreeItem from './FileTreeItem.svelte';
	import { setFileExplorerContext } from './file-explorer.context';

	// --- Shared context menu + icon picker state ---

	/** The node under the shared context menu (null = menu opened on empty vault-root area) */
	let contextTargetNode = $state<FileTreeNode | null>(null);
	/** The node the shared IconPicker dialog is bound to (null when closed) */
	let iconPickerNode = $state<FileTreeNode | null>(null);
	/** Controls the IconPicker Dialog open/closed state (two-way bound) */
	let iconPickerOpen = $state(false);

	let targetIsBookmarked = $derived(
		contextTargetNode ? bookmarksStore.isBookmarked(contextTargetNode.path) : false
	);
	let iconPickerRef = $derived(
		iconPickerNode ? fileIconsStore.getFrontmatterIcon(iconPickerNode.path) : undefined
	);

	setFileExplorerContext({
		setContextTarget(node) {
			contextTargetNode = node;
		},
		openIconPicker(node) {
			iconPickerNode = node;
			iconPickerOpen = true;
		},
	});

	// --- Creation target resolution ---

	/** Resolves the directory to create a new item in for the current context target */
	function getCreationDir(target: FileTreeNode | null): string | null {
		if (!target) return vaultStore.path;
		return target.isDirectory ? target.path : getParentPath(target.path);
	}

	// --- Shared context menu actions (operate on a target node, or null = vault root) ---

	/** Creates a new markdown file at the resolved target dir and enters rename mode */
	async function handleNewFile(target: FileTreeNode | null) {
		const dir = getCreationDir(target);
		if (!dir) return;
		if (target?.isDirectory) fsStore.expandDir(target.path);
		const path = await createFile(dir, 'Untitled.md');
		if (path) {
			fsStore.setPendingCreationPath(path);
			fsStore.setRenamingPath(path);
		}
	}

	/** Creates a new folder at the resolved target dir and enters rename mode */
	async function handleNewFolder(target: FileTreeNode | null) {
		const dir = getCreationDir(target);
		if (!dir) return;
		if (target?.isDirectory) fsStore.expandDir(target.path);
		const path = await createFolder(dir, 'Untitled');
		if (path) {
			fsStore.setRenamingPath(path);
		}
	}

	/** Creates a new .canvas file at the resolved target dir and enters rename mode */
	async function handleNewCanvas(target: FileTreeNode | null) {
		const dir = getCreationDir(target);
		if (!dir) return;
		if (target?.isDirectory) fsStore.expandDir(target.path);
		const path = await createCanvasFile(dir);
		if (path) {
			fsStore.setPendingCreationPath(path);
			fsStore.setRenamingPath(path);
		}
	}

	/** Creates a new .kanban file at the resolved target dir and enters rename mode */
	async function handleNewKanban(target: FileTreeNode | null) {
		const dir = getCreationDir(target);
		if (!dir) return;
		if (target?.isDirectory) fsStore.expandDir(target.path);
		const path = await createKanbanFile(dir);
		if (path) {
			fsStore.setPendingCreationPath(path);
			fsStore.setRenamingPath(path);
		}
	}

	/** Opens the target file in the editor (no-op for directories) */
	function handleOpenInNewTab(target: FileTreeNode) {
		if (!target.isDirectory) openFileInEditor(target.path);
	}

	/** Duplicates the file or folder with a "copy" suffix */
	async function handleDuplicate(target: FileTreeNode) {
		await duplicateItem(target.path, target.isDirectory);
	}

	/** Toggles the bookmark state for the target */
	async function handleToggleBookmark(target: FileTreeNode) {
		if (!vaultStore.path) return;
		await toggleBookmarkForPath(vaultStore.path, target.path, target.name, target.isDirectory);
	}

	/** Copies the absolute path to the clipboard */
	async function handleCopyAbsolutePath(target: FileTreeNode) {
		await navigator.clipboard.writeText(target.path);
	}

	/** Copies the vault-relative path to the clipboard */
	async function handleCopyRelativePath(target: FileTreeNode) {
		if (!vaultStore.path) return;
		await navigator.clipboard.writeText(getRelativePath(vaultStore.path, target.path));
	}

	/** Reveals the target in the system file explorer */
	async function handleRevealInFinder(target: FileTreeNode) {
		await revealInSystemExplorer(target.path);
	}

	/** Enters inline rename mode for the target */
	function handleStartRename(target: FileTreeNode) {
		fsStore.setRenamingPath(target.path);
	}

	/** Prompts for confirmation, then moves the target to trash */
	async function handleDelete(target: FileTreeNode) {
		const confirmed = await ask(
			`Move "${target.name}" to trash?${target.isDirectory ? ' This will include all contents.' : ''}`,
			{ title: 'Move to Trash', kind: 'warning' }
		);
		if (confirmed) {
			await deleteItem(target.path, target.isDirectory);
		}
	}

	/** Opens the shared icon picker dialog bound to the target */
	function handleChangeIcon(target: FileTreeNode) {
		iconPickerNode = target;
		iconPickerOpen = true;
	}

	/** Handles icon selection from the picker (uses iconPickerNode as the target) */
	async function handleIconSelect(
		pack: IconPackId,
		name: string,
		color?: string,
		textColor?: string
	) {
		if (!vaultStore.path || !iconPickerNode) return;
		await setIconForPath(vaultStore.path, iconPickerNode.path, pack, name, color, textColor, iconPickerNode.isDirectory);
		await trackRecentIcon(vaultStore.path, pack, name);
	}

	/** Handles icon removal from the picker (uses iconPickerNode as the target) */
	async function handleIconRemove() {
		if (!vaultStore.path || !iconPickerNode) return;
		await removeIconForPath(vaultStore.path, iconPickerNode.path, iconPickerNode.isDirectory);
	}

	/** Closes the icon picker and clears the bound node so the component unmounts */
	function handleIconPickerClose() {
		iconPickerOpen = false;
		iconPickerNode = null;
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
		<FileExplorerHeader />
		<Separator />
		<ScrollArea class="flex-1 overflow-hidden">
			<ContextMenu.Root>
				<ContextMenu.Trigger>
					{#snippet child({ props })}
						<div
							{...props}
							class="p-1 min-h-full {isRootDragOver ? 'bg-file-explorer-accent/30' : ''}"
							role="tree"
							tabindex="0"
							ondragover={handleRootDragOver}
							ondragleave={handleRootDragLeave}
							ondrop={handleRootDrop}
							oncontextmenu={(e) => {
								if (e.target === e.currentTarget) contextTargetNode = null;
								if (typeof props.oncontextmenu === 'function') props.oncontextmenu(e);
							}}
						>
							{#each fsStore.fileTree as node (node.path)}
								<FileTreeItem {node} />
							{/each}
						</div>
					{/snippet}
				</ContextMenu.Trigger>
				<ContextMenu.Content class="w-56">
					{#if contextTargetNode}
						{@const target = contextTargetNode}
						{#if !target.isDirectory}
							<ContextMenu.Item onclick={() => handleOpenInNewTab(target)}>
								<ExternalLink class="size-4" />
								<span>Open in new tab</span>
							</ContextMenu.Item>
							<ContextMenu.Separator />
						{/if}

						<ContextMenu.Item onclick={() => handleNewFile(target)}>
							<FilePlus class="size-4" />
							<span>New File</span>
						</ContextMenu.Item>
						<ContextMenu.Item onclick={() => handleNewFolder(target)}>
							<FolderPlus class="size-4" />
							<span>New Folder</span>
						</ContextMenu.Item>
						<ContextMenu.Item onclick={() => handleNewCanvas(target)}>
							<LayoutDashboard class="size-4" />
							<span>New Canvas</span>
						</ContextMenu.Item>
						<ContextMenu.Item onclick={() => handleNewKanban(target)}>
							<Kanban class="size-4" />
							<span>New Kanban Board</span>
						</ContextMenu.Item>
						<ContextMenu.Separator />

						<ContextMenu.Item onclick={() => handleDuplicate(target)}>
							<Copy class="size-4" />
							<span>Duplicate</span>
						</ContextMenu.Item>
						<ContextMenu.Item onclick={() => handleToggleBookmark(target)}>
							{#if targetIsBookmarked}
								<BookmarkMinus class="size-4" />
								<span>Remove bookmark</span>
							{:else}
								<Bookmark class="size-4" />
								<span>Bookmark</span>
							{/if}
						</ContextMenu.Item>
						<ContextMenu.Item onclick={() => handleChangeIcon(target)}>
							<Palette class="size-4" />
							<span>Change icon</span>
						</ContextMenu.Item>
						<ContextMenu.Separator />

						<ContextMenu.Sub>
							<ContextMenu.SubTrigger>
								<Copy class="size-4" />
								<span>Copy path</span>
							</ContextMenu.SubTrigger>
							<ContextMenu.SubContent>
								<ContextMenu.Item onclick={() => handleCopyAbsolutePath(target)}>
									<span>Copy absolute path</span>
								</ContextMenu.Item>
								<ContextMenu.Item onclick={() => handleCopyRelativePath(target)}>
									<span>Copy relative path</span>
								</ContextMenu.Item>
							</ContextMenu.SubContent>
						</ContextMenu.Sub>
						<ContextMenu.Separator />

						<ContextMenu.Item onclick={() => handleRevealInFinder(target)}>
							<FolderSearch class="size-4" />
							<span>Reveal in Finder</span>
						</ContextMenu.Item>
						<ContextMenu.Separator />

						<ContextMenu.Item onclick={() => handleStartRename(target)}>
							<Pencil class="size-4" />
							<span>Rename</span>
							<ContextMenu.Shortcut>F2</ContextMenu.Shortcut>
						</ContextMenu.Item>
						<ContextMenu.Item variant="destructive" onclick={() => handleDelete(target)}>
							<Trash2 class="size-4" />
							<span>Move to Trash</span>
							<ContextMenu.Shortcut>⌘⌫</ContextMenu.Shortcut>
						</ContextMenu.Item>
					{:else}
						<ContextMenu.Item onclick={() => handleNewFile(null)}>
							<FilePlus class="size-4" />
							<span>New File</span>
						</ContextMenu.Item>
						<ContextMenu.Item onclick={() => handleNewFolder(null)}>
							<FolderPlus class="size-4" />
							<span>New Folder</span>
						</ContextMenu.Item>
						<ContextMenu.Separator />
						<ContextMenu.Item onclick={() => handleNewCanvas(null)}>
							<LayoutDashboard class="size-4" />
							<span>New Canvas</span>
						</ContextMenu.Item>
						<ContextMenu.Item onclick={() => handleNewKanban(null)}>
							<Kanban class="size-4" />
							<span>New Kanban Board</span>
						</ContextMenu.Item>
					{/if}
				</ContextMenu.Content>
			</ContextMenu.Root>
		</ScrollArea>
		<Separator />
		<div class="flex items-center gap-1.5 px-3 py-2 shrink-0">
			<Vault class="size-3.5 text-file-explorer-muted-fg shrink-0" />
			<span class="truncate text-xs text-file-explorer-muted-fg">{vaultStore.name}</span>
		</div>
	</div>
</Tooltip.Provider>

{#if iconPickerNode}
	<IconPicker
		bind:open={iconPickerOpen}
		currentPack={iconPickerRef?.iconPack}
		currentName={iconPickerRef?.iconName}
		currentColor={iconPickerRef?.color}
		currentTextColor={iconPickerRef?.titleColor}
		onSelect={handleIconSelect}
		onRemove={handleIconRemove}
		onClose={handleIconPickerClose}
	/>
{/if}
