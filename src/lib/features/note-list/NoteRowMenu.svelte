<script lang="ts">
	import type { Component, Snippet } from 'svelte';
	import { toast } from 'svelte-sonner';
	import Archive from '@lucide/svelte/icons/archive';
	import ArchiveRestore from '@lucide/svelte/icons/archive-restore';
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import History from '@lucide/svelte/icons/history';
	import ExternalLink from '@lucide/svelte/icons/external-link';
	import Copy from '@lucide/svelte/icons/copy';
	import Eye from '@lucide/svelte/icons/eye';
	import Pencil from '@lucide/svelte/icons/pencil';
	import FolderSearch from '@lucide/svelte/icons/folder-search';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import Palette from '@lucide/svelte/icons/palette';
	import Star from '@lucide/svelte/icons/star';
	import * as ContextMenu from '#lib/components/ui/context-menu/index.js';
	import { openFileInEditor } from '#lib/core/editor/editor.service.js';
	import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
	import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
	import { fsStore } from '#lib/core/filesystem/fs.store.svelte.js';
	import { duplicateItem, renameItem, revealInSystemExplorer } from '#lib/core/filesystem/fs.service.js';
	import { deleteNoteWithConfirm } from '#lib/core/filesystem/delete-note.service.js';
	import { fileOperationErrorMessage, getFileName, getRelativePath, isMarkdownFile, isViewFile, PreDeleteSaveError, renamedPath } from '#lib/core/filesystem/fs.logic.js';
	import IconPicker from '#lib/features/file-icons/IconPicker.svelte';
	import { fileIconsStore } from '#lib/features/file-icons/file-icons.store.svelte.js';
	import { setIconForPath, setIconColors, removeIconForPath, trackRecentIcon } from '#lib/features/file-icons/file-icons.service.js';
	import type { IconPackId } from '#lib/features/file-icons/file-icons.types.js';
	import { openFileHistory } from '#lib/features/file-history/file-history.service.js';
	import { setArchivedForPath, setOrganizedForPath, toggleFavoriteForPath } from '#lib/features/properties/lifecycle.service.js';
	import { noteActions, type NoteActionId } from '#lib/features/properties/note-actions.logic.js';
	import { buildRenameFileName } from '#lib/features/type-definitions/type-note-list.logic.js';
	import { showViewInViews, ViewWriteError } from '#lib/features/type-definitions/type-definitions.service.js';
	import { typeDefinitionsStore } from '#lib/features/type-definitions/type-definitions.store.svelte.js';
	import { getViewVisible } from '#lib/features/type-definitions/type-sidebar.logic.js';
	import { formatShortcut } from '#lib/utils/keybindings.js';
	import type { MenuActionItem } from '#lib/utils/menu-action.types.js';
	import { RENAME_SHORTCUT, setNoteRowMenuContext, type NoteRowRenameState } from './note-row-menu.context';
	import type { NoteRowNote } from './note-row.types';

	interface Props {
		/** The listed notes; inline rename looks its target up here */
		notes: NoteRowNote[];
		/** Data-only menu actions; markdown rows only unless an entry opts into all files */
		extraItems?: readonly MenuActionItem[];
		/** Classes of the element that wraps the rows and receives right-clicks */
		class?: string;
		/** The list content, holding NoteRow components */
		children: Snippet;
		/** The wrapper element; a click on its blank area focuses it (the menu trigger's `tabindex="-1"`) */
		ref?: HTMLElement | null;
		/** Called with the old and the new path when an inline rename is applied, before the file moves */
		onRename?: (from: string, to: string) => void;
		/** Called with the old path when an inline rename announced through `onRename` fails */
		onRenameFailed?: (from: string) => void;
	}

	let { notes, extraItems = [], class: className = '', children, ref = $bindable(null), onRename, onRenameFailed }: Props = $props();

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

	/**
	 * Runs a file operation on `note` and toasts its failure (the fs services log and rethrow).
	 * Lens lists read the index snapshot, so the operation's index event skips the refresh
	 * throttle. Asked here, at the user's own action, not in the fs services: auto-organize
	 * and vault mods call those too, and their bursts stay throttled. Asked before the
	 * operation, since its index event can arrive before the operation resolves.
	 * Resolves to whether the operation succeeded.
	 */
	async function runOrToast(verb: string, note: NoteRowNote, op: () => Promise<unknown>): Promise<boolean> {
		vaultStore.requestPromptIndexRefresh();
		try {
			await op();
			return true;
		} catch (err) {
			// The editor already toasted the failed save.
			if (!(err instanceof PreDeleteSaveError)) toast.error(fileOperationErrorMessage(verb, getFileName(note.path), err));
			return false;
		}
	}

	async function handleDuplicate(note: NoteRowNote) {
		await runOrToast('duplicate', note, () => duplicateItem(note.path, false));
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

	/**
	 * Validates and applies the rename. An empty or unchanged title is a cancel;
	 * an illegal name or a failed rename toasts and leaves the note as it was.
	 */
	async function commitRename() {
		if (renameCancelled) return;
		const path = fsStore.renamingPath;
		const note = path ? notes.find((n) => n.path === path) : null;
		fsStore.setRenamingPath(null);
		if (!note) return;
		const result = buildRenameFileName(note.path, note.title, rename.value);
		if (!result) return;
		if (!result.ok) {
			toast.error(`Could not rename "${note.title}": ${result.error}`);
			return;
		}
		onRename?.(note.path, renamedPath(note.path, result.name));
		if (!(await runOrToast('rename', note, () => renameItem(note.path, result.name)))) onRenameFailed?.(note.path);
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

	/** The icon of a note action; Archive shows the restore icon on an archived note. */
	function noteActionIcon(id: NoteActionId, note: NoteRowNote): Component {
		if (id === 'archive') return note.archived ? ArchiveRestore : Archive;
		if (id === 'organize') return CircleCheck;
		if (id === 'history') return History;
		return Trash2;
	}

	/** Runs a note action on the row's own note, never on the active tab. */
	async function runNoteAction(id: NoteActionId, note: NoteRowNote) {
		if (id === 'archive') return setArchivedForPath(note.path, !note.archived);
		if (id === 'organize') return setOrganizedForPath(note.path, !note.organized);
		if (id === 'trash') return deleteNoteWithConfirm(note.path);
		// History's Restore writes into the active tab (file-history.service), so
		// the note is activated first and the dialog opens only once it is.
		await openFileInEditor(note.path);
		if (editorStore.activeTabPath === note.path) await openFileHistory(note.path);
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
				bind:this={ref}
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
			{#each extraItems.filter((item) => item.on.includes('note') && (item.files === 'all' || isMarkdownFile(target.path))) as item (item.id)}
				<ContextMenu.Item inset onclick={() => { if (vaultStore.path) item.run({ on: 'note', path: getRelativePath(vaultStore.path.replace(/\/+$/, ''), target.path) }); }}>
					<span>{item.label}</span>
				</ContextMenu.Item>
			{/each}
			<ContextMenu.Separator />

			<ContextMenu.Item onclick={() => handleStartRename(target)}>
				<Pencil class="size-4" />
				<span>Rename</span>
				<ContextMenu.Shortcut>{formatShortcut(RENAME_SHORTCUT)}</ContextMenu.Shortcut>
			</ContextMenu.Item>
			{#each noteActions(isMarkdownFile(target.path) ? 'markdown' : 'other', target) as action (action.id)}
				{@const Icon = noteActionIcon(action.id, target)}
				<ContextMenu.Item variant={action.danger ? 'destructive' : 'default'} onclick={() => runNoteAction(action.id, target)}>
					<Icon class="size-4" />
					<span>{action.label}</span>
				</ContextMenu.Item>
			{/each}
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
