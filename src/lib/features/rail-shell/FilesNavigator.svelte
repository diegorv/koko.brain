<script lang="ts">
	import { ask } from '@tauri-apps/plugin-dialog';
	import { toast } from 'svelte-sonner';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import Copy from '@lucide/svelte/icons/copy';
	import Database from '@lucide/svelte/icons/database';
	import FilePlus from '@lucide/svelte/icons/file-plus';
	import Folder from '@lucide/svelte/icons/folder';
	import FolderOpen from '@lucide/svelte/icons/folder-open';
	import FolderPlus from '@lucide/svelte/icons/folder-plus';
	import FolderSearch from '@lucide/svelte/icons/folder-search';
	import LayoutDashboard from '@lucide/svelte/icons/layout-dashboard';
	import Palette from '@lucide/svelte/icons/palette';
	import Pencil from '@lucide/svelte/icons/pencil';
	import Table from '@lucide/svelte/icons/table';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import Vault from '@lucide/svelte/icons/vault';
	import * as ContextMenu from '#lib/components/ui/context-menu/index.js';
	import { openFileInEditor } from '#lib/core/editor/editor.service.js';
	import { fsStore } from '#lib/core/filesystem/fs.store.svelte.js';
	import type { FileTreeNode } from '#lib/core/filesystem/fs.types.js';
	import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
	import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
	import {
		createFile,
		createFolder,
		deleteItem,
		moveItem,
		renameItem,
		revealInSystemExplorer,
	} from '#lib/core/filesystem/fs.service.js';
	import {
		fileOperationErrorMessage,
		findNodeByPath,
		getFileName,
		getFileNameError,
		getRelativePath,
		PreDeleteSaveError,
		validateDragDrop,
	} from '#lib/core/filesystem/fs.logic.js';
	import { applyExplicitOrganization } from '#lib/core/note-creator/explicit-organization.logic.js';
	import { createCanvasFile } from '#lib/features/canvas/canvas.service.js';
	import { createCollectionFile } from '#lib/features/collection/collection.service.js';
	import { resolveIconForPath } from '#lib/features/file-icons/icon-resolver.js';
	import IconRenderer from '#lib/features/file-icons/IconRenderer.svelte';
	import IconPicker from '#lib/features/file-icons/IconPicker.svelte';
	import { fileIconsStore } from '#lib/features/file-icons/file-icons.store.svelte.js';
	import { setIconForPath, setIconColors, removeIconForPath, trackRecentIcon } from '#lib/features/file-icons/file-icons.service.js';
	import type { IconPackId } from '#lib/features/file-icons/file-icons.types.js';
	import { findFolderNote } from '#lib/core/filesystem/folder-notes.logic.js';
	import ViewDialog from '#lib/features/type-definitions/ViewDialog.svelte';
	import { typeDefinitionsStore } from '#lib/features/type-definitions/type-definitions.store.svelte.js';
	import { FILES_LENS, FOLDER_LENS_KIND, navigatorFolders, VIEW_LENS_KIND, viewLabels } from './lens.logic';
	import { railRegistryStore } from './rail-registry.store.svelte';
	import type { Lens, RailFolderCreator } from './rail-shell.types';

	interface Props {
		/** The folder lens the note list shows; no target is the vault root */
		picked: Lens;
		/** Absolute paths of the expanded folders */
		expanded: readonly string[];
		/** Called with the lens of the clicked folder (`FILES_LENS` for the vault root) */
		onPick: (lens: Lens) => void;
		/** Called with a folder's path when its chevron is clicked */
		onToggle: (path: string) => void;
		/** Called with the view lens of a `.view` made by New view, which the Types item shows */
		onPickView: (lens: Lens) => void;
	}

	let { picked, expanded, onPick, onToggle, onPickView }: Props = $props();

	let expandedSet = $derived(new Set(expanded));
	let vaultRoot = $derived(vaultStore.path?.replace(/\/+$/, '') ?? '');
	let rootPicked = $derived(!picked.target || picked.target === vaultRoot);
	let topFolders = $derived(navigatorFolders(fsStore.fileTree));

	/** The menu's "New <file>" items, plugin-registered ones (New Kanban Board) after the built-in ones. */
	let fileCreators = $derived<RailFolderCreator[]>([
		{
			id: 'builtin:note',
			label: 'New note',
			icon: FilePlus,
			fileName: 'Untitled.md',
			create: (dir) => createFile(dir, 'Untitled.md', applyExplicitOrganization('', settingsStore.explicitOrganization)),
		},
		{ id: 'builtin:canvas', label: 'New Canvas', icon: LayoutDashboard, fileName: 'Untitled.canvas', create: createCanvasFile },
		{ id: 'builtin:table', label: 'New table', icon: Database, fileName: 'Untitled.view', create: createCollectionFile },
		...railRegistryStore.folderCreators,
	]);

	/** The folder under the context menu (the vault root for a right-click outside the folder rows); null before any right-click */
	let menuTarget = $state<{ path: string; name: string; isRoot: boolean } | null>(null);
	/** The folder whose row shows the inline rename input */
	let renamingPath = $state<string | null>(null);
	let renameValue = $state('');
	/** Guards against blur firing commitRename after Escape already cancelled */
	let renameCancelled = false;
	let iconPickerPath = $state<string | null>(null);
	let iconPickerOpen = $state(false);
	let iconPickerRef = $derived(iconPickerPath ? fileIconsStore.getFrontmatterIcon(iconPickerPath) : undefined);
	let newViewOpen = $state(false);
	/** The folder New view creates its `.view` in */
	let newViewFolder = $state<string | undefined>(undefined);

	/** The lens that shows the files directly in `dir` */
	function lensFor(dir: string): Lens {
		return dir === vaultRoot ? { ...FILES_LENS } : { kind: FOLDER_LENS_KIND, target: dir };
	}

	/** Runs a file operation and toasts its failure (the fs services log and rethrow). Null on failure. */
	async function runOrToast<T>(verb: string, name: string, op: () => Promise<T>): Promise<T | null> {
		try {
			return await op();
		} catch (err) {
			// The editor already toasted the failed save.
			if (!(err instanceof PreDeleteSaveError)) toast.error(fileOperationErrorMessage(verb, name, err));
			return null;
		}
	}

	/** Creates a file in `dir`, picks `dir` so the note list shows it, and opens it */
	async function handleNewFile(dir: string, creator: RailFolderCreator) {
		const path = await runOrToast('create', creator.fileName, () => creator.create(dir));
		if (!path) return;
		onPick(lensFor(dir));
		await openFileInEditor(path);
	}

	/** Opens the New view dialog to create a `.view` in `dir` */
	function handleNewView(dir: string) {
		newViewFolder = dir;
		newViewOpen = true;
	}

	/** Creates "Untitled" in `dir`, expands `dir` so the new row shows, and starts its inline rename */
	async function handleNewFolder(dir: string) {
		const path = await runOrToast('create', 'Untitled', () => createFolder(dir, 'Untitled'));
		if (!path) return;
		if (dir !== vaultRoot && !expandedSet.has(dir)) onToggle(dir);
		startRename(path);
	}

	function startRename(path: string) {
		renameCancelled = false;
		renameValue = getFileName(path);
		renamingPath = path;
	}

	/** Focuses and selects the rename input once the context menu has given focus back */
	function focusRenameInput(input: HTMLInputElement) {
		requestAnimationFrame(() => {
			input.focus();
			input.select();
		});
	}

	/**
	 * Validates and applies the rename. An empty or unchanged name is a cancel;
	 * an invalid name or a failed rename (a taken name included) toasts and
	 * leaves the folder as it was. The pick and expanded state follow through
	 * the path-change consumer (`files-navigator.service.ts`).
	 */
	async function commitRename(path: string) {
		// Enter ends rename mode, and removing the focused input fires blur, which
		// calls this again: only the first call may commit.
		if (renameCancelled || renamingPath !== path) return;
		renamingPath = null;
		const name = getFileName(path);
		const trimmed = renameValue.trim();
		if (!trimmed || trimmed === name) return;
		const nameError = getFileNameError(trimmed);
		if (nameError) {
			toast.error(`Could not rename "${name}": ${nameError}`);
			return;
		}
		await runOrToast('rename', name, () => renameItem(path, trimmed));
	}

	/** Enter confirms the rename, Escape cancels it */
	function handleRenameKeydown(e: KeyboardEvent, path: string) {
		if (e.key === 'Enter') {
			e.preventDefault();
			commitRename(path);
		} else if (e.key === 'Escape') {
			e.preventDefault();
			renameCancelled = true;
			renamingPath = null;
		}
	}

	/** Asks first, then moves the folder and everything in it to the Trash */
	async function handleDelete(path: string, name: string) {
		const confirmed = await ask(`Move "${name}" to trash? This will include all contents.`, {
			title: 'Move to Trash',
			kind: 'warning',
			okLabel: 'Move to Trash',
			cancelLabel: 'Cancel',
		});
		if (confirmed) await runOrToast('move {name} to the Trash', name, () => deleteItem(path, true));
	}

	/** Copies `text` (the folder's path) to the clipboard and toasts a refusal */
	async function copyPath(name: string, text: string) {
		await runOrToast('copy the path of {name}', name, () => navigator.clipboard.writeText(text));
	}

	async function handleCopyRelativePath(path: string, name: string) {
		if (vaultStore.path) await copyPath(name, getRelativePath(vaultStore.path, path));
	}

	function handleChangeIcon(path: string) {
		iconPickerPath = path;
		iconPickerOpen = true;
	}

	async function handleIconSelect(pack: IconPackId, name: string, color?: string, textColor?: string) {
		if (!vaultStore.path || !iconPickerPath) return;
		await setIconForPath(vaultStore.path, iconPickerPath, pack, name, color, textColor, true);
		await trackRecentIcon(vaultStore.path, pack, name);
	}

	async function handleIconColors(color?: string, textColor?: string) {
		if (!iconPickerPath) return;
		await setIconColors(iconPickerPath, color, textColor, true);
	}

	async function handleIconRemove() {
		if (!vaultStore.path || !iconPickerPath) return;
		await removeIconForPath(vaultStore.path, iconPickerPath, true);
	}

	function handleIconPickerClose() {
		iconPickerOpen = false;
		iconPickerPath = null;
	}

	/** Picks a folder row and, with folder notes on, opens its folder note */
	function pickFolder(node: FileTreeNode) {
		onPick({ kind: FOLDER_LENS_KIND, target: node.path });
		const folderNote = settingsStore.folderNotes.enabled && node.children ? findFolderNote(node.name, node.children) : null;
		if (folderNote) openFileInEditor(folderNote);
	}

	/** The folder (or vault root) a dragged item hovers, for the drop look */
	let dragOverPath = $state<string | null>(null);

	/** Puts a folder row's path in the drag payload; the note list rows carry theirs the same way */
	function handleDragStart(e: DragEvent, path: string) {
		if (renamingPath === path) {
			e.preventDefault();
			return;
		}
		e.dataTransfer?.setData('text/plain', path);
		if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
	}

	function handleDragOver(e: DragEvent, dir: string) {
		e.preventDefault();
		if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
		dragOverPath = dir;
	}

	/** Clears the drop look only when the pointer leaves the row, not when it crosses into a child */
	function handleDragLeave(e: DragEvent, dir: string) {
		const related = e.relatedTarget as Node | null;
		if (related && (e.currentTarget as HTMLElement).contains(related)) return;
		if (dragOverPath === dir) dragOverPath = null;
	}

	/**
	 * Moves the dropped file or folder into `dir`. A folder moved into a
	 * collapsed folder expands it, so the moved row shows. A taken name or a
	 * refused move toasts; the pick and expanded state follow through the
	 * path-change consumer (`files-navigator.service.ts`).
	 */
	async function handleDrop(e: DragEvent, dir: string) {
		e.preventDefault();
		dragOverPath = null;
		const source = e.dataTransfer?.getData('text/plain');
		if (!source || validateDragDrop(source, dir)) return;
		// Any text drag (an editor selection, a browser link) carries text/plain: only a path in the tree is a move.
		const node = findNodeByPath(fsStore.fileTree, source);
		if (!node) return;
		const isFolder = node.isDirectory === true;
		const moved = await runOrToast('move', getFileName(source), () => moveItem(source, dir));
		if (moved && isFolder && dir !== vaultRoot && !expandedSet.has(dir)) onToggle(dir);
	}

	/** Same look as the Types navigator rows: region tokens only. */
	function rowClass(active: boolean, dropTarget = false): string {
		// The drop background replaces the picked one: two bg utilities on one row leave CSS order to pick.
		const activeBg = dropTarget ? '' : 'bg-file-explorer-primary/25 ';
		return `flex w-full items-center gap-1.5 rounded-md py-[5px] pr-2 text-row cursor-default select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset ${active
			? `${activeBg}text-file-explorer-primary`
			: 'hover:bg-file-explorer-primary/10'} ${dropTarget ? 'bg-file-explorer-accent/50 outline-dashed outline-1 outline-ring' : ''}`;
	}
</script>

<div class="flex h-full flex-col bg-file-explorer-bg text-file-explorer-fg" data-files-navigator>
	<!-- The pad clears the macOS traffic lights and the rail toggle. -->
	<div
		class="flex h-10 shrink-0 items-center gap-2 bg-tab-bar pl-[var(--rail-header-pad)] pr-3"
		style="box-shadow: inset 0 -1px 0 var(--divider)"
		data-tauri-drag-region
	>
		<span class="truncate text-title text-tab-text-active" data-files-navigator-title>Files</span>
	</div>

	<ContextMenu.Root>
		<ContextMenu.Trigger>
			{#snippet child({ props })}
				<div
					{...props}
					class="flex-1 overflow-y-auto px-1 py-1"
					data-files-navigator-tree
					oncontextmenu={(e) => {
						// A right-click outside every folder row is a right-click on the vault root.
						if (!(e.target instanceof Element) || !e.target.closest('[data-files-navigator-row]')) {
							menuTarget = { path: vaultRoot, name: getFileName(vaultRoot), isRoot: true };
						}
						if (typeof props.oncontextmenu === 'function') props.oncontextmenu(e);
					}}
				>
					<button
						class="{rowClass(rootPicked, dragOverPath === vaultRoot)} pl-2"
						aria-current={rootPicked ? 'true' : undefined}
						onclick={() => onPick({ ...FILES_LENS })}
						ondragover={(e) => handleDragOver(e, vaultRoot)}
						ondragleave={(e) => handleDragLeave(e, vaultRoot)}
						ondrop={(e) => handleDrop(e, vaultRoot)}
						data-files-navigator-folder={vaultRoot}
						data-files-navigator-root
					>
						<Vault class="size-4 shrink-0 {rootPicked ? 'text-file-explorer-primary' : 'text-file-explorer-muted-fg'}" />
						<span class="truncate font-medium">{getFileName(vaultRoot)}</span>
					</button>
					{#each topFolders as node (node.path)}
						{@render folderRow(node, 1)}
					{/each}
				</div>
			{/snippet}
		</ContextMenu.Trigger>
		<ContextMenu.Content class="w-56">
			{#if menuTarget}
				{@const target = menuTarget}
				{#each fileCreators as creator (creator.id)}
					<ContextMenu.Item onclick={() => handleNewFile(target.path, creator)}>
						<creator.icon class="size-4" />
						<span>{creator.label}</span>
					</ContextMenu.Item>
				{/each}
				<ContextMenu.Item onclick={() => handleNewView(target.path)}>
					<Table class="size-4" />
					<span>New view</span>
				</ContextMenu.Item>
				<ContextMenu.Item onclick={() => handleNewFolder(target.path)}>
					<FolderPlus class="size-4" />
					<span>New folder</span>
				</ContextMenu.Item>
				{#if !target.isRoot}
					<ContextMenu.Separator />
					<ContextMenu.Item onclick={() => handleChangeIcon(target.path)}>
						<Palette class="size-4" />
						<span>Change icon</span>
					</ContextMenu.Item>
					<ContextMenu.Sub>
						<ContextMenu.SubTrigger>
							<Copy class="size-4" />
							<span>Copy path</span>
						</ContextMenu.SubTrigger>
						<ContextMenu.SubContent>
							<ContextMenu.Item onclick={() => copyPath(target.name, target.path)}>
								<span>Copy absolute path</span>
							</ContextMenu.Item>
							<ContextMenu.Item onclick={() => handleCopyRelativePath(target.path, target.name)}>
								<span>Copy relative path</span>
							</ContextMenu.Item>
						</ContextMenu.SubContent>
					</ContextMenu.Sub>
					<ContextMenu.Item onclick={() => revealInSystemExplorer(target.path)}>
						<FolderSearch class="size-4" />
						<span>Reveal in Finder</span>
					</ContextMenu.Item>
					<ContextMenu.Separator />
					<ContextMenu.Item onclick={() => startRename(target.path)}>
						<Pencil class="size-4" />
						<span>Rename</span>
					</ContextMenu.Item>
					<ContextMenu.Item variant="destructive" onclick={() => handleDelete(target.path, target.name)}>
						<Trash2 class="size-4" />
						<span>Move to Trash</span>
					</ContextMenu.Item>
				{/if}
			{/if}
		</ContextMenu.Content>
	</ContextMenu.Root>
</div>

<!-- Same duplicate-name check as New view in the Types navigator: every `.view` label, hidden ones included. -->
<ViewDialog
	bind:open={newViewOpen}
	folder={newViewFolder}
	existingLabels={viewLabels(fsStore.fileTree, typeDefinitionsStore.entriesByPath)}
	oncreated={(path) => onPickView({ kind: VIEW_LENS_KIND, target: path })}
/>

{#if iconPickerPath}
	<IconPicker
		bind:open={iconPickerOpen}
		currentPack={iconPickerRef?.iconPack}
		currentName={iconPickerRef?.iconName}
		currentColor={iconPickerRef?.color}
		currentTextColor={iconPickerRef?.titleColor}
		onSelect={handleIconSelect}
		onColorsChange={handleIconColors}
		onRemove={handleIconRemove}
		onClose={handleIconPickerClose}
	/>
{/if}

{#snippet folderRow(node: FileTreeNode, depth: number)}
	{@const subfolders = navigatorFolders(node.children)}
	{@const open = expandedSet.has(node.path)}
	{@const active = !rootPicked && picked.target === node.path}
	{@const resolved = resolveIconForPath(node.path)}
	<!-- The div never takes focus, so its buttons light the row; scoped to button so the rename input does not. -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="{rowClass(active, dragOverPath === node.path)} has-[button:focus-visible]:ring-2 has-[button:focus-visible]:ring-ring/50 has-[button:focus-visible]:ring-inset"
		style:padding-left="{depth * 12}px"
		data-files-navigator-row={node.path}
		draggable={renamingPath !== node.path}
		ondragstart={(e) => handleDragStart(e, node.path)}
		ondragover={(e) => handleDragOver(e, node.path)}
		ondragleave={(e) => handleDragLeave(e, node.path)}
		ondrop={(e) => handleDrop(e, node.path)}
		oncontextmenu={(e) => {
			// The rename input keeps the native text menu, not the folder menu.
			if (renamingPath === node.path) {
				e.stopPropagation();
				return;
			}
			menuTarget = { path: node.path, name: node.name, isRoot: false };
		}}
	>
		{#if subfolders.length > 0}
			<button
				type="button"
				class="shrink-0 cursor-default rounded-xs p-0.5 text-file-explorer-muted-fg hover:bg-file-explorer-primary/10"
				aria-label={open ? `Collapse ${node.name}` : `Expand ${node.name}`}
				aria-expanded={open}
				onclick={() => onToggle(node.path)}
				data-files-navigator-toggle={node.path}
			>
				<ChevronRight class="size-3.5 transition-transform {open ? 'rotate-90' : ''}" />
			</button>
		{:else}
			<span class="w-[18px] shrink-0"></span>
		{/if}
		{#if renamingPath === node.path}
			<input
				bind:value={renameValue}
				use:focusRenameInput
				onkeydown={(e) => handleRenameKeydown(e, node.path)}
				onblur={() => commitRename(node.path)}
				aria-label="Rename {node.name}"
				class="h-5 min-w-0 flex-1 rounded-xs border border-ring bg-background px-1 text-row text-file-explorer-fg outline-none"
				data-files-navigator-rename={node.path}
			/>
		{:else}
			<button
				type="button"
				class="flex min-w-0 flex-1 cursor-default items-center gap-2 text-left focus-visible:outline-none"
				aria-current={active ? 'true' : undefined}
				onclick={() => pickFolder(node)}
				data-files-navigator-folder={node.path}
			>
				{#if resolved?.icon}
					<IconRenderer icon={resolved.icon} class="size-4 shrink-0" color={resolved.color} />
				{:else if open}
					<FolderOpen class="size-4 shrink-0 {active ? 'text-file-explorer-primary' : 'text-file-explorer-muted-fg'}" />
				{:else}
					<Folder class="size-4 shrink-0 {active ? 'text-file-explorer-primary' : 'text-file-explorer-muted-fg'}" />
				{/if}
				<span class="truncate" style:color={!active && resolved?.titleColor ? resolved.titleColor : undefined}>{node.name}</span>
			</button>
		{/if}
	</div>
	{#if open}
		{#each subfolders as child (child.path)}
			{@render folderRow(child, depth + 1)}
		{/each}
	{/if}
{/snippet}
