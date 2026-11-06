<script lang="ts">
	import type { Snippet } from 'svelte';
	import { ask } from '@tauri-apps/plugin-dialog';
	import { toast } from 'svelte-sonner';
	import ExternalLink from '@lucide/svelte/icons/external-link';
	import Copy from '@lucide/svelte/icons/copy';
	import Eye from '@lucide/svelte/icons/eye';
	import Pencil from '@lucide/svelte/icons/pencil';
	import FolderSearch from '@lucide/svelte/icons/folder-search';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import Palette from '@lucide/svelte/icons/palette';
	import Star from '@lucide/svelte/icons/star';
	import Table from '@lucide/svelte/icons/table';
	import * as ContextMenu from '#lib/components/ui/context-menu/index.js';
	import { openFileInEditor } from '#lib/core/editor/editor.service.js';
	import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
	import { fsStore } from '#lib/core/filesystem/fs.store.svelte.js';
	import { deleteItem, duplicateItem, renameItem, revealInSystemExplorer } from '#lib/core/filesystem/fs.service.js';
	import { fileOperationErrorMessage, getFileName, getRelativePath, isCollectionFile, isMarkdownFile, isViewFile, PreDeleteSaveError } from '#lib/core/filesystem/fs.logic.js';
	import IconPicker from '#lib/features/file-icons/IconPicker.svelte';
	import { fileIconsStore } from '#lib/features/file-icons/file-icons.store.svelte.js';
	import { setIconForPath, setIconColors, removeIconForPath, trackRecentIcon } from '#lib/features/file-icons/file-icons.service.js';
	import type { IconPackId } from '#lib/features/file-icons/file-icons.types.js';
	import { toggleFavoriteForPath } from '#lib/features/properties/lifecycle.service.js';
	import { buildRenameFileName } from '#lib/features/type-definitions/type-note-list.logic.js';
	import { showViewInViews, ViewWriteError } from '#lib/features/type-definitions/type-definitions.service.js';
	import { typeDefinitionsStore } from '#lib/features/type-definitions/type-definitions.store.svelte.js';
	import { getViewVisible } from '#lib/features/type-definitions/type-sidebar.logic.js';
	import { formatShortcut } from '#lib/utils/keybindings.js';
	import { RENAME_SHORTCUT, setNoteRowMenuContext, type NoteRowRenameState } from './note-row-menu.context';
	import type { NoteRowNote } from './note-row.types';

	interface Props {
		/** The listed notes; inline rename looks its target up here */
		notes: NoteRowNote[];
		/** Classes of the element that wraps the rows and receives right-clicks */
		class?: string;
		/** The list content, holding NoteRow components */
		children: Snippet;
	}

	let { notes, class: className = '', children }: Props = $props();

	let contextTarget = $state<NoteRowNote | null>(null);
	let rename = $state<NoteRowRenameState>({ value: '', input: undefined });
	/** Guards against blur firing commitRename after Escape already cancelled */
	let renameCancelled = $state(false);
	/** Path already prefilled into the rename input — prevents list refreshes from resetting a rename in progress */
	let renamePrefilledPath = $state<string | null>(null);
	let iconPickerPath = $state<string | null>(null);
	let iconPickerOpen = $state(false);
	let iconPickerRef = $derived(
		iconPickerPath ? fileIconsStore.getFrontmatterIcon(iconPickerPath) : undefined
	);

	setNoteRowMenuContext({
		setContextTarget: (note) => { contextTarget = note; },
		startRename: handleStartRename,
		rename,
		commitRename,
		onRenameKeydown: handleRenameKeydown,
	});

	/** Runs a file operation on `note` and toasts its failure (the fs services log and rethrow). */
	async function runOrToast(verb: string, note: NoteRowNote, op: () => Promise<unknown>) {
		try {
			await op();
		} catch (err) {
			// The editor already toasted the failed save.
			if (err instanceof PreDeleteSaveError) return;
			toast.error(fileOperationErrorMessage(verb, getFileName(note.path), err));
		}
	}

	async function handleDuplicate(note: NoteRowNote) {
		await runOrToast('duplicate', note, () => duplicateItem(note.path, false));
	}

	/**
	 * Renames a `.collection` to `.view`, same bytes (open tabs follow), so it
	 * becomes a menu entry. `renameItem` refuses a taken name before touching
	 * the disk. The new `.view` reaches the index through the watcher's full
	 * rebuild; the prompt refresh lands that bump at once.
	 */
	async function handleConvertToView(note: NoteRowNote) {
		const viewName = getFileName(note.path).replace(/\.collection$/i, '.view');
		let converted = false;
		await runOrToast('convert {name} to a view', note, async () => {
			await renameItem(note.path, viewName);
			converted = true;
		});
		if (converted) vaultStore.requestPromptIndexRefresh();
	}

	/** True for a `.view` row that Views does not list (`_visible: false` in its entry). */
	function isHiddenView(path: string): boolean {
		return isViewFile(path) && !getViewVisible(typeDefinitionsStore.getEntryByPath(path));
	}

	/** Removes `_visible` and `_open_in_editor` from a hidden `.view`, so Views lists it. */
	async function handleShowInViews(note: NoteRowNote) {
		try {
			await showViewInViews(note.path);
		} catch (err) {
			// The editor already toasted the failed save.
			if (err instanceof ViewWriteError && err.reason === 'save-failed') return;
			toast.error(fileOperationErrorMessage('show {name} in Views', getFileName(note.path), err));
		}
	}

	function handleStartRename(note: NoteRowNote) {
		fsStore.setRenamingPath(note.path);
	}

	/** When rename mode targets a note in this list, prefill and focus the inline input */
	$effect(() => {
		const path = fsStore.renamingPath;
		if (!path) {
			renamePrefilledPath = null;
			return;
		}
		const note = notes.find((n) => n.path === path);
		if (!note || renamePrefilledPath === path) return;
		renamePrefilledPath = path;
		renameCancelled = false;
		rename.value = note.title;
		requestAnimationFrame(() => {
			rename.input?.focus();
			rename.input?.select();
		});
	});

	/** Validates and applies the rename, or silently discards invalid input */
	async function commitRename() {
		if (renameCancelled) return;
		const path = fsStore.renamingPath;
		const note = path ? notes.find((n) => n.path === path) : null;
		fsStore.setRenamingPath(null);
		if (!note) return;
		const newName = buildRenameFileName(note.path, note.title, rename.value);
		if (!newName) return;
		await runOrToast('rename', note, () => renameItem(note.path, newName));
	}

	/** Exits rename mode without applying changes */
	function cancelRename() {
		renameCancelled = true;
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

	async function handleDelete(note: NoteRowNote) {
		const confirmed = await ask(
			`Move "${note.title}" to trash?`,
			{ title: 'Move to Trash', kind: 'warning', okLabel: 'Move to Trash', cancelLabel: 'Cancel' },
		);
		if (confirmed) {
			await runOrToast('move {name} to the Trash', note, () => deleteItem(note.path, false));
		}
	}

	function handleChangeIcon(path: string) {
		iconPickerPath = path;
		iconPickerOpen = true;
	}

	async function handleIconSelect(pack: IconPackId, name: string, color?: string, textColor?: string) {
		if (!vaultStore.path || !iconPickerPath) return;
		await setIconForPath(vaultStore.path, iconPickerPath, pack, name, color, textColor);
		await trackRecentIcon(vaultStore.path, pack, name);
	}

	async function handleIconColors(color?: string, textColor?: string) {
		if (!iconPickerPath) return;
		await setIconColors(iconPickerPath, color, textColor);
	}

	async function handleIconRemove() {
		if (!vaultStore.path || !iconPickerPath) return;
		await removeIconForPath(vaultStore.path, iconPickerPath);
	}

	function handleIconPickerClose() {
		iconPickerOpen = false;
		iconPickerPath = null;
	}
</script>

<ContextMenu.Root>
	<ContextMenu.Trigger>
		{#snippet child({ props })}
			<div
				{...props}
				class={className}
				oncontextmenu={(e) => {
					// List virtualizers wrap every row in positioning divs, so "blank area"
					// cannot be detected via target === currentTarget; anything outside a
					// note row counts as blank and suppresses the menu.
					if (!(e.target instanceof Element) || !e.target.closest('[data-note-row]')) {
						contextTarget = null;
						e.preventDefault();
						return;
					}
					if (typeof props.oncontextmenu === 'function') props.oncontextmenu(e);
				}}
			>
				{@render children()}
			</div>
		{/snippet}
	</ContextMenu.Trigger>
	<ContextMenu.Content class="w-56">
		{#if contextTarget}
			{@const target = contextTarget}
			<ContextMenu.Item onclick={() => openFileInEditor(target.path)}>
				<ExternalLink class="size-4" />
				<span>Open in new tab</span>
			</ContextMenu.Item>
			<ContextMenu.Item onclick={() => handleDuplicate(target)}>
				<Copy class="size-4" />
				<span>Duplicate</span>
			</ContextMenu.Item>
			{#if isCollectionFile(target.path)}
				<ContextMenu.Item onclick={() => handleConvertToView(target)}>
					<Table class="size-4" />
					<span>Convert to view</span>
				</ContextMenu.Item>
			{/if}
			{#if isHiddenView(target.path)}
				<ContextMenu.Item onclick={() => handleShowInViews(target)}>
					<Eye class="size-4" />
					<span>Show in Views</span>
				</ContextMenu.Item>
			{/if}
			<ContextMenu.Separator />

			<ContextMenu.Sub>
				<ContextMenu.SubTrigger>
					<Copy class="size-4" />
					<span>Copy path</span>
				</ContextMenu.SubTrigger>
				<ContextMenu.SubContent>
					<ContextMenu.Item onclick={() => navigator.clipboard.writeText(target.path)}>
						<span>Copy absolute path</span>
					</ContextMenu.Item>
					<ContextMenu.Item onclick={() => { if (vaultStore.path) navigator.clipboard.writeText(getRelativePath(vaultStore.path, target.path)); }}>
						<span>Copy relative path</span>
					</ContextMenu.Item>
				</ContextMenu.SubContent>
			</ContextMenu.Sub>

			<!-- Both write frontmatter: a canvas, view, PDF or image row has none, and writing it would corrupt the file -->
			{#if isMarkdownFile(target.path)}
				<ContextMenu.Item onclick={() => handleChangeIcon(target.path)}>
					<Palette class="size-4" />
					<span>Change icon</span>
				</ContextMenu.Item>
				<ContextMenu.Item onclick={() => toggleFavoriteForPath(target.path, !target.favorite)}>
					<Star class="size-4 {target.favorite ? 'fill-current' : ''}" />
					<span>{target.favorite ? 'Unfavorite' : 'Favorite'}</span>
				</ContextMenu.Item>
			{/if}
			<ContextMenu.Item onclick={() => revealInSystemExplorer(target.path)}>
				<FolderSearch class="size-4" />
				<span>Reveal in Finder</span>
			</ContextMenu.Item>
			<ContextMenu.Separator />

			<ContextMenu.Item onclick={() => handleStartRename(target)}>
				<Pencil class="size-4" />
				<span>Rename</span>
				<ContextMenu.Shortcut>{formatShortcut(RENAME_SHORTCUT)}</ContextMenu.Shortcut>
			</ContextMenu.Item>
			<ContextMenu.Item variant="destructive" onclick={() => handleDelete(target)}>
				<Trash2 class="size-4" />
				<span>Move to Trash</span>
			</ContextMenu.Item>
		{/if}
	</ContextMenu.Content>
</ContextMenu.Root>

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
