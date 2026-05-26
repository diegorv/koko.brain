<script lang="ts">
	import { onDestroy } from 'svelte';
	import type { FileTreeNode } from '$lib/core/filesystem/fs.types';
	import { fsStore } from '$lib/core/filesystem/fs.store.svelte';
	import { openFileInEditor } from '$lib/core/editor/editor.service';
	import { renameItem, moveItem } from '$lib/core/filesystem/fs.service';
	import { isValidFileName, validateDragDrop } from '$lib/core/filesystem/fs.logic';
	import { resolveIconForPath } from '$lib/features/file-icons/icon-resolver';
	import IconRenderer from '$lib/features/file-icons/IconRenderer.svelte';
	import { settingsStore } from '$lib/core/settings/settings.store.svelte';
	import { findFolderNote } from '$lib/features/folder-notes/folder-notes.logic';
	import Self from './FileTreeItem.svelte';
	import { useFileExplorerContext } from './file-explorer.context';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import FolderOpen from '@lucide/svelte/icons/folder-open';
	import Folder from '@lucide/svelte/icons/folder';
	import File from '@lucide/svelte/icons/file';

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

	const fileExplorerCtx = useFileExplorerContext();

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

	let resolved = $derived(resolveIconForPath(node.path));
	let resolvedIcon = $derived(resolved?.icon);
	let resolvedColor = $derived(resolved?.color);
	let resolvedTextColor = $derived(resolved?.titleColor);

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

	/** Registers this node as the shared context-menu target; event bubbles up to the tree-root ContextMenu.Trigger which opens the menu at the cursor */
	function handleContextMenu() {
		fileExplorerCtx.setContextTarget(node);
	}

	/** Suppress the context menu entirely while the row is being renamed */
	function handleRenameContextMenu(e: MouseEvent) {
		e.stopPropagation();
		e.preventDefault();
	}
</script>

{#if isRenaming}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="relative flex items-center gap-1 px-2 py-0.5 {depth > 0 ? 'ft-indent-lines' : ''}"
		style="padding-left: {depth * 16 + 8}px; --ft-indent-depth: {depth};"
		oncontextmenu={handleRenameContextMenu}
	>
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
		class="relative flex w-full items-center gap-1 rounded px-2 py-[5px] text-[15px] hover:bg-primary/10 hover:text-primary text-left cursor-default select-none
			{isSelected ? 'bg-primary/25' : ''}
			{isDragOver ? 'bg-accent/50 outline-dashed outline-1 outline-ring' : ''}
			{depth > 0 ? 'ft-indent-lines' : ''}"
		style="padding-left: {depth * 16 + 8}px; --ft-indent-depth: {depth};"
		onclick={handleClick}
		ondblclick={handleDoubleClick}
		oncontextmenu={handleContextMenu}
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
		<span
			class="truncate {isSelected ? 'text-primary' : ''}"
			class:underline={!!folderNotePath}
			style:text-underline-offset={folderNotePath ? '2px' : undefined}
			style:color={!isSelected && resolvedTextColor ? resolvedTextColor : undefined}
		>{node.name}</span>
		{#if node.isDirectory && fileCount > 0}
			<span class="ml-auto shrink-0 pr-1 text-xs text-[#8a8faa]">{String(fileCount).padStart(2, '0')}</span>
		{/if}
	</div>
{/if}

{#if node.isDirectory && isExpanded && node.children}
	{#each node.children as child (child.path)}
		<Self node={child} depth={depth + 1} />
	{/each}
{/if}

<style>
	.ft-indent-lines {
		background-image: repeating-linear-gradient(
			to right,
			transparent 0 12px,
			color-mix(in oklch, var(--muted-foreground) 40%, transparent) 12px 13px,
			transparent 13px 16px
		);
		background-size: calc(var(--ft-indent-depth, 0) * 16px) 100%;
		background-repeat: no-repeat;
	}
</style>
