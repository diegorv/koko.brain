<script lang="ts">
	import { onDestroy } from 'svelte';
	import type { FileTreeNode } from '$lib/core/filesystem/fs.types';
	import { fsStore } from '$lib/core/filesystem/fs.store.svelte';
	import { openFileInEditor } from '$lib/core/editor/editor.service';
	import {
		createFile,
		createFolder,
		deleteItem,
		renameItem,
		moveItem,
		duplicateItem,
		revealInSystemExplorer,
	} from '$lib/core/filesystem/fs.service';
	import { isValidFileName, getRelativePath, validateDragDrop } from '$lib/core/filesystem/fs.logic';
	import { vaultStore } from '$lib/core/vault/vault.store.svelte';
	import { bookmarksStore } from '$lib/features/bookmarks/bookmarks.store.svelte';
	import { toggleBookmarkForPath } from '$lib/features/bookmarks/bookmarks.service';
	import { fileIconsStore } from '$lib/features/file-icons/file-icons.store.svelte';
	import { setIconForPath, removeIconForPath, trackRecentIcon } from '$lib/features/file-icons/file-icons.service';
	import { getIconSync } from '$lib/features/file-icons/file-icons.icon-data';
	import type { IconPackId } from '$lib/features/file-icons/file-icons.types';
	import IconRenderer from '$lib/features/file-icons/IconRenderer.svelte';
	import IconPicker from '$lib/features/file-icons/IconPicker.svelte';
	import { settingsStore } from '$lib/core/settings/settings.store.svelte';
	import { findFolderNote } from '$lib/features/folder-notes/folder-notes.logic';
	import * as ContextMenu from '$lib/components/ui/context-menu';
	import Self from './FileTreeItem.svelte';
	import {
		ChevronRight,
		ChevronDown,
		FolderOpen,
		Folder,
		File,
		FilePlus,
		FolderPlus,
		LayoutDashboard,
		Pencil,
		Trash2,
		Copy,
		Bookmark,
		BookmarkMinus,
		ExternalLink,
		FolderSearch,
		Palette,
		Kanban,
	} from 'lucide-svelte';
	import { createCanvasFile } from '$lib/features/canvas/canvas.service';
	import { createKanbanFile } from '$lib/plugins/kanban/kanban.service';
	import { ask } from '@tauri-apps/plugin-dialog';

	/**
	 * Recursive tree item — renders a single file or folder row,
	 * and recursively renders its children via the `Self` import.
	 */
	interface Props {
		/** The file system node (file or directory) this item represents */
		node: FileTreeNode;
		/** Nesting level used to calculate left padding (0 = root) */
		depth?: number;
	}

	let { node, depth = 0 }: Props = $props();

	let isExpanded = $derived(fsStore.expandedDirs.has(node.path));
	let fileCount = $derived(node.fileCount ?? 0);
	let isSelected = $derived(fsStore.selectedFilePath === node.path);
	let isRenaming = $derived(fsStore.renamingPath === node.path);
	let renameValue = $state('');
	let renameInput: HTMLInputElement | undefined = $state();
	/** Guards against blur firing commitRename after Escape already cancelled */
	let renameCancelled = $state(false);

	/** Whether a dragged item is hovering over this directory */
	let isDragOver = $state(false);
	/** Timer for auto-expanding directories during drag hover */
	let dragExpandTimer: ReturnType<typeof setTimeout> | undefined;

	onDestroy(() => {
		if (dragExpandTimer) clearTimeout(dragExpandTimer);
	});

	/** When rename mode activates (from any source), prefill and focus the input */
	$effect(() => {
		if (isRenaming) {
			renameCancelled = false;
			renameValue = node.name;
			requestAnimationFrame(() => {
				if (renameInput) {
					renameInput.focus();
					const dotIndex = renameValue.lastIndexOf('.');
					if (dotIndex > 0 && !node.isDirectory) {
						renameInput.setSelectionRange(0, dotIndex);
					} else {
						renameInput.select();
					}
				}
			});
		}
	});
	let isNodeBookmarked = $derived(bookmarksStore.isBookmarked(node.path));
	let customIconEntry = $derived(fileIconsStore.getIcon(node.path));
	let customIcon = $derived(customIconEntry ? getIconSync(customIconEntry.iconPack, customIconEntry.iconName) : undefined);
	let frontmatterRef = $derived(fileIconsStore.getFrontmatterIcon(node.path));
	let frontmatterIcon = $derived(frontmatterRef ? getIconSync(frontmatterRef.iconPack, frontmatterRef.iconName) : undefined);
	let resolvedIcon = $derived(frontmatterIcon ?? customIcon);
	let resolvedColor = $derived(frontmatterIcon ? undefined : customIconEntry?.color);
	let resolvedTextColor = $derived(frontmatterIcon ? undefined : customIconEntry?.textColor);
	let iconPickerOpen = $state(false);

	/** Path to the folder note inside this directory, if one exists */
	let folderNotePath = $derived(
		node.isDirectory && node.children && settingsStore.folderNotes.enabled
			? findFolderNote(node.name, node.children)
			: null
	);

	/** Toggles directory expansion or opens the file in the editor */
	function handleClick() {
		if (node.isDirectory) {
			fsStore.toggleDir(node.path);
			if (folderNotePath) {
				openFileInEditor(folderNotePath);
			}
		} else {
			openFileInEditor(node.path);
		}
	}

	/** Double-clicking a file enters rename mode */
	function handleDoubleClick() {
		if (!node.isDirectory) {
			startRename();
		}
	}

	/** Enters inline rename mode — focus and selection are handled by the $effect above */
	function startRename() {
		fsStore.setRenamingPath(node.path);
	}

	/** Validates and applies the rename, or silently discards invalid input */
	async function commitRename() {
		if (renameCancelled) return;
		const currentPath = node.path;
		const isPendingCreation = fsStore.pendingCreationPath === currentPath;
		fsStore.setRenamingPath(null);
		const trimmed = renameValue.trim();
		if (!trimmed || trimmed === node.name || !isValidFileName(trimmed)) {
			if (isPendingCreation) {
				fsStore.setPendingCreationPath(null);
				if (!node.isDirectory) openFileInEditor(currentPath);
			}
			return;
		}
		const newPath = await renameItem(currentPath, trimmed);
		if (isPendingCreation) {
			fsStore.setPendingCreationPath(null);
			if (newPath && !node.isDirectory) openFileInEditor(newPath);
		}
	}

	/** Exits rename mode without applying changes */
	function cancelRename() {
		renameCancelled = true;
		const isPendingCreation = fsStore.pendingCreationPath === node.path;
		if (isPendingCreation) {
			fsStore.setPendingCreationPath(null);
			if (!node.isDirectory) openFileInEditor(node.path);
		}
		fsStore.setRenamingPath(null);
	}

	/** Enter confirms the rename, Escape cancels it */
	function handleRenameKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			commitRename();
		} else if (e.key === 'Escape') {
			e.preventDefault();
			cancelRename();
		}
	}

	/** Creates a file inside this node's directory (or parent if node is a file) */
	async function handleNewFile() {
		const targetDir = node.isDirectory ? node.path : node.path.substring(0, node.path.lastIndexOf('/'));
		if (node.isDirectory) fsStore.expandDir(node.path);
		const path = await createFile(targetDir, 'Untitled.md');
		if (path) {
			fsStore.setPendingCreationPath(path);
			fsStore.setRenamingPath(path);
		}
	}

	/** Creates a folder inside this node's directory (or parent if node is a file) */
	async function handleNewFolder() {
		const targetDir = node.isDirectory ? node.path : node.path.substring(0, node.path.lastIndexOf('/'));
		if (node.isDirectory) fsStore.expandDir(node.path);
		const path = await createFolder(targetDir, 'Untitled');
		if (path) {
			fsStore.setRenamingPath(path);
		}
	}

	/** Creates a .canvas file inside this node's directory (or parent if node is a file) */
	async function handleNewCanvas() {
		const targetDir = node.isDirectory ? node.path : node.path.substring(0, node.path.lastIndexOf('/'));
		if (node.isDirectory) fsStore.expandDir(node.path);
		const path = await createCanvasFile(targetDir);
		if (path) {
			fsStore.setPendingCreationPath(path);
			fsStore.setRenamingPath(path);
		}
	}

	/** Creates a .kanban file inside this node's directory (or parent if node is a file) */
	async function handleNewKanban() {
		const targetDir = node.isDirectory ? node.path : node.path.substring(0, node.path.lastIndexOf('/'));
		if (node.isDirectory) fsStore.expandDir(node.path);
		const path = await createKanbanFile(targetDir);
		if (path) {
			fsStore.setPendingCreationPath(path);
			fsStore.setRenamingPath(path);
		}
	}

	/** Prompts for confirmation, then moves the file or folder to trash */
	async function handleDelete() {
		const confirmed = await ask(
			`Move "${node.name}" to trash?${node.isDirectory ? ' This will include all contents.' : ''}`,
			{ title: 'Move to Trash', kind: 'warning' }
		);
		if (confirmed) {
			await deleteItem(node.path, node.isDirectory);
		}
	}

	// --- Context menu action handlers ---

	/** Opens the file in a new editor tab */
	function handleOpenInNewTab() {
		if (!node.isDirectory) openFileInEditor(node.path);
	}

	/** Duplicates the file or folder with a "copy" suffix */
	async function handleDuplicate() {
		await duplicateItem(node.path, node.isDirectory);
	}

	/** Toggles the bookmark state for this item */
	async function handleToggleBookmark() {
		if (!vaultStore.path) return;
		await toggleBookmarkForPath(vaultStore.path, node.path, node.name, node.isDirectory);
	}

	/** Copies the absolute path to the clipboard */
	async function handleCopyAbsolutePath() {
		await navigator.clipboard.writeText(node.path);
	}

	/** Copies the vault-relative path to the clipboard */
	async function handleCopyRelativePath() {
		if (!vaultStore.path) return;
		await navigator.clipboard.writeText(getRelativePath(vaultStore.path, node.path));
	}

	/** Reveals the item in the system file explorer */
	async function handleRevealInFinder() {
		await revealInSystemExplorer(node.path);
	}

	/** Opens the icon picker modal */
	function handleChangeIcon() {
		iconPickerOpen = true;
	}

	/** Handles icon selection from the picker */
	async function handleIconSelect(pack: IconPackId, name: string, color?: string, textColor?: string) {
		if (!vaultStore.path) return;
		await setIconForPath(vaultStore.path, node.path, pack, name, color, textColor);
		await trackRecentIcon(vaultStore.path, pack, name);
	}

	/** Handles icon removal from the picker */
	async function handleIconRemove() {
		if (!vaultStore.path) return;
		await removeIconForPath(vaultStore.path, node.path);
	}

	// --- Drag and drop handlers ---

	/** Stores the dragged item's path in the dataTransfer payload */
	function handleDragStart(e: DragEvent) {
		if (isRenaming) {
			e.preventDefault();
			return;
		}
		e.dataTransfer?.setData('text/plain', node.path);
		if (e.dataTransfer) {
			e.dataTransfer.effectAllowed = 'move';
		}
	}

	/** Only directories accept drops — shows visual feedback and auto-expands after 600ms */
	function handleDragOver(e: DragEvent) {
		if (!node.isDirectory) return;
		e.preventDefault();
		if (e.dataTransfer) {
			e.dataTransfer.dropEffect = 'move';
		}
		isDragOver = true;
		if (!isExpanded && !dragExpandTimer) {
			dragExpandTimer = setTimeout(() => {
				fsStore.expandDir(node.path);
				dragExpandTimer = undefined;
			}, 600);
		}
	}

	/** Clears drag-over state only when truly leaving this element */
	function handleDragLeave(e: DragEvent) {
		const currentTarget = e.currentTarget as HTMLElement;
		const relatedTarget = e.relatedTarget as Node | null;
		if (relatedTarget && currentTarget.contains(relatedTarget)) return;
		isDragOver = false;
		clearTimeout(dragExpandTimer);
		dragExpandTimer = undefined;
	}

	/** Moves the dragged item into this directory, with validation */
	async function handleDrop(e: DragEvent) {
		isDragOver = false;
		clearTimeout(dragExpandTimer);
		dragExpandTimer = undefined;
		if (!node.isDirectory) return;
		e.preventDefault();
		const sourcePath = e.dataTransfer?.getData('text/plain');
		if (!sourcePath) return;
		if (validateDragDrop(sourcePath, node.path)) return;
		await moveItem(sourcePath, node.path);
	}
</script>

<ContextMenu.Root>
	<ContextMenu.Trigger>
		{#snippet child({ props })}
			{#if isRenaming}
				<div
					class="relative flex items-center gap-1 px-2 py-0.5"
					style="padding-left: {depth * 16 + 8}px"
				>
					{#if depth > 0}
						{#each Array(depth) as _, i}
							<div
								class="absolute top-0 bottom-0 w-px bg-muted-foreground/40 pointer-events-none"
								style="left: {i * 16 + 12}px"
							></div>
						{/each}
					{/if}
					{#if node.isDirectory}
						<FolderOpen class="size-3.5 shrink-0 text-muted-foreground" />
					{:else}
						<File class="size-3.5 shrink-0 text-muted-foreground" />
					{/if}
					<input
						bind:this={renameInput}
						bind:value={renameValue}
						onkeydown={handleRenameKeydown}
						onblur={commitRename}
						class="h-5 flex-1 rounded border border-ring bg-background px-1 text-sm outline-none"
					/>
				</div>
			{:else}
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<div
					{...props}
					class="relative flex w-full items-center gap-1 rounded px-2 py-[5px] text-[15px] hover:bg-primary/10 hover:text-primary text-left cursor-default select-none
						{isSelected ? 'bg-primary/25' : ''}
						{isDragOver ? 'bg-accent/50 outline-dashed outline-1 outline-ring' : ''}"
					style="padding-left: {depth * 16 + 8}px"
					onclick={handleClick}
					ondblclick={handleDoubleClick}
					draggable={!isRenaming}
					ondragstart={handleDragStart}
					ondragover={handleDragOver}
					ondragleave={handleDragLeave}
					ondrop={handleDrop}
					role="treeitem"
					aria-expanded={node.isDirectory ? isExpanded : undefined}
					aria-selected={isSelected}
					tabindex={0}
					onkeydown={(e) => {
						if (e.key === 'Enter') handleClick();
						if (e.key === 'F2') startRename();
					}}
				>
					{#if depth > 0}
						{#each Array(depth) as _, i}
							<div
								class="absolute top-0 bottom-0 w-px bg-muted-foreground/40 pointer-events-none"
								style="left: {i * 16 + 12}px"
							></div>
						{/each}
					{/if}
					{#if node.isDirectory}
						{#if isExpanded}
							<ChevronDown class="size-3.5 shrink-0 text-muted-foreground" />
						{:else}
							<ChevronRight class="size-3.5 shrink-0 text-muted-foreground" />
						{/if}
						{#if resolvedIcon}
							<IconRenderer icon={resolvedIcon} class="size-4 shrink-0" color={resolvedColor} />
						{:else if isExpanded}
							<FolderOpen class="size-3.5 shrink-0 text-muted-foreground" />
						{:else}
							<Folder class="size-3.5 shrink-0 text-muted-foreground" />
						{/if}
					{:else}
						{#if resolvedIcon}
							<IconRenderer icon={resolvedIcon} class="size-4 shrink-0" color={resolvedColor} />
						{:else}
							<File class="size-3.5 shrink-0 text-muted-foreground" />
						{/if}
					{/if}
					<span class="truncate {isSelected ? 'text-primary' : ''}" class:underline={!!folderNotePath} style:text-underline-offset={folderNotePath ? '2px' : undefined} style:color={!isSelected && resolvedTextColor ? resolvedTextColor : undefined}>{node.name}</span>
					{#if node.isDirectory && fileCount > 0}
						<span class="ml-auto shrink-0 pr-1 text-xs text-[#8a8faa]">{String(fileCount).padStart(2, '0')}</span>
					{/if}
				</div>
			{/if}
		{/snippet}
	</ContextMenu.Trigger>
	<ContextMenu.Content class="w-56">
		{#if !node.isDirectory}
			<ContextMenu.Item onclick={handleOpenInNewTab}>
				<ExternalLink class="size-4" />
				<span>Open in new tab</span>
			</ContextMenu.Item>
			<ContextMenu.Separator />
		{/if}

		<ContextMenu.Item onclick={handleNewFile}>
			<FilePlus class="size-4" />
			<span>New File</span>
		</ContextMenu.Item>
		<ContextMenu.Item onclick={handleNewFolder}>
			<FolderPlus class="size-4" />
			<span>New Folder</span>
		</ContextMenu.Item>
		<ContextMenu.Item onclick={handleNewCanvas}>
			<LayoutDashboard class="size-4" />
			<span>New Canvas</span>
		</ContextMenu.Item>
		<ContextMenu.Item onclick={handleNewKanban}>
			<Kanban class="size-4" />
			<span>New Kanban Board</span>
		</ContextMenu.Item>
		<ContextMenu.Separator />

		<ContextMenu.Item onclick={handleDuplicate}>
			<Copy class="size-4" />
			<span>Duplicate</span>
		</ContextMenu.Item>
		<ContextMenu.Item onclick={handleToggleBookmark}>
			{#if isNodeBookmarked}
				<BookmarkMinus class="size-4" />
				<span>Remove bookmark</span>
			{:else}
				<Bookmark class="size-4" />
				<span>Bookmark</span>
			{/if}
		</ContextMenu.Item>
		<ContextMenu.Item onclick={handleChangeIcon}>
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
				<ContextMenu.Item onclick={handleCopyAbsolutePath}>
					<span>Copy absolute path</span>
				</ContextMenu.Item>
				<ContextMenu.Item onclick={handleCopyRelativePath}>
					<span>Copy relative path</span>
				</ContextMenu.Item>
			</ContextMenu.SubContent>
		</ContextMenu.Sub>
		<ContextMenu.Separator />

		<ContextMenu.Item onclick={handleRevealInFinder}>
			<FolderSearch class="size-4" />
			<span>Reveal in Finder</span>
		</ContextMenu.Item>
		<ContextMenu.Separator />

		<ContextMenu.Item onclick={startRename}>
			<Pencil class="size-4" />
			<span>Rename</span>
			<ContextMenu.Shortcut>F2</ContextMenu.Shortcut>
		</ContextMenu.Item>
		<ContextMenu.Item variant="destructive" onclick={handleDelete}>
			<Trash2 class="size-4" />
			<span>Move to Trash</span>
			<ContextMenu.Shortcut>⌘⌫</ContextMenu.Shortcut>
		</ContextMenu.Item>
	</ContextMenu.Content>
</ContextMenu.Root>

{#if node.isDirectory && isExpanded && node.children}
	{#each node.children as child (child.path)}
		<Self node={child} depth={depth + 1} />
	{/each}
{/if}

<IconPicker
	bind:open={iconPickerOpen}
	currentPack={customIconEntry?.iconPack}
	currentName={customIconEntry?.iconName}
	currentColor={customIconEntry?.color}
	currentTextColor={customIconEntry?.textColor}
	onSelect={handleIconSelect}
	onRemove={handleIconRemove}
	onClose={() => iconPickerOpen = false}
/>
