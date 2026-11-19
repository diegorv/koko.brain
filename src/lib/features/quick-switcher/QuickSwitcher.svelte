<script lang="ts">
	import * as Command from '#lib/components/ui/command/index.js';
	import { fsStore } from '#lib/core/filesystem/fs.store.svelte.js';
	import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
	import { openFileInEditor } from '#lib/core/editor/editor.service.js';
	import { notifyNoteCreated } from '#lib/core/editor/editor.hooks.js';
	import { toast } from 'svelte-sonner';
	import { call } from '#lib/contracts/ipc.js';
	import { createFile } from '#lib/core/filesystem/fs.service.js';
	import { applyExplicitOrganization } from '#lib/core/note-creator/explicit-organization.logic.js';
	import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
	import { appliedThemeStore } from '#lib/core/settings/applied-theme.store.svelte.js';
	import { themeSurface } from '#lib/core/settings/theme-surfaces.logic.js';
	import { lifecycleFilterStore } from '#lib/features/properties/lifecycle-filter.store.svelte.js';
	import { resolveIconForPath } from '#lib/features/file-icons/icon-resolver.js';
	import IconRenderer from '#lib/features/file-icons/IconRenderer.svelte';
	import { iconColorStyle, readableIconColor } from '#lib/features/file-icons/file-icons.logic.js';
	import { fileKind } from '#lib/features/rail-shell/lens.logic.js';
	import { KIND_ICONS } from '#lib/features/rail-shell/kind-icons.js';
	import { fuzzyMatchPositions } from '#lib/utils/fuzzy-match.js';
	import {
		entryFolder,
		flattenFileTree,
		filterAndRank,
		splitRecentFiles,
		type FileEntry,
	} from '#lib/core/filesystem/file-entries.logic.js';
	import { quickSwitcherStore } from './quick-switcher.store.svelte';
	import { createTargetLabel, matchSegments, parseCreatePath } from './quick-switcher.logic';
	import FilePlus from '@lucide/svelte/icons/file-plus';

	let searchQuery = $state('');
	/** What a row's colored icon sits on: the dialog, and the selected row (`aria-selected:bg-accent`). */
	let rowBgs = $derived([themeSurface(appliedThemeStore, 'popover'), themeSurface(appliedThemeStore, 'accent')]);

	let allFiles = $derived(flattenFileTree(fsStore.fileTree));
	let createPath = $derived(parseCreatePath(searchQuery));
	/**
	 * The note the query names (case-insensitive) in its target folder, if it
	 * exists. Create would make `Ideas 1.md` there, so it hides the Create row.
	 */
	let existingTarget = $derived.by(() => {
		if (!searchQuery.trim() || 'error' in createPath || !vaultStore.path) return undefined;
		const target = targetPath(vaultStore.path, createPath.folder, createPath.name).toLowerCase();
		return allFiles.find((f) => f.path.toLowerCase() === target);
	});
	/**
	 * Ranked matches, led by `existingTarget` when the ranking misses it:
	 * `filterAndRank` matches the name only, so `Projects/Idea` finds nothing.
	 */
	let filteredFiles = $derived.by(() => {
		const ranked = filterAndRank(searchQuery, allFiles, quickSwitcherStore.recentPaths);
		if (!existingTarget || ranked.some((f) => f.path === existingTarget.path)) return ranked;
		return [existingTarget, ...ranked];
	});
	let hasResults = $derived(filteredFiles.length > 0);
	/** The Recent notes group and the rest: only on an empty query with recents. */
	let recentGroups = $derived.by(() => {
		if (searchQuery.length > 0) return null;
		const groups = splitRecentFiles(allFiles, quickSwitcherStore.recentPaths);
		return groups.recent.length > 0 ? groups : null;
	});
	/** Whether the Create row renders: any non-empty query that names no existing note. */
	let showCreate = $derived(!!searchQuery.trim() && !existingTarget);

	/** The switcher's footer hints, in reading order. */
	const KEY_HINTS = [
		{ keys: '↵', label: 'Open' },
		{ keys: '⇧↵', label: 'Create' },
		{ keys: 'Esc', label: 'Close' },
	];

	/** Absolute path of `name` in `folder` (`''` is the vault root). */
	function targetPath(vaultPath: string, folder: string, name: string): string {
		return folder ? `${vaultPath}/${folder}/${name}` : `${vaultPath}/${name}`;
	}

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

		const parsed = parseCreatePath(searchQuery);
		if ('error' in parsed) {
			toast.error(parsed.error);
			return;
		}
		const folderPath = parsed.folder ? `${vaultStore.path}/${parsed.folder}` : vaultStore.path;

		let filePath: string;
		try {
			// `create_folder` is recursive and a no-op for an existing folder; `createFile`
			// adds the note to the tree, and `insertTreeNode` adds its missing parents.
			if (parsed.folder) await call('create_folder', { path: folderPath });
			filePath = await createFile(folderPath, parsed.name, applyExplicitOrganization('', settingsStore.explicitOrganization));
		} catch (err) {
			toast.error(`Failed to create file: ${err instanceof Error ? err.message : String(err)}`);
			return;
		}
		quickSwitcherStore.addRecentPath(filePath);
		await openFileInEditor(filePath);
		notifyNoteCreated(filePath);
		quickSwitcherStore.close();
		searchQuery = '';
	}

	/**
	 * Shift+Enter runs Create while matches hold the selection. Stops the event:
	 * bits-ui's root keydown treats Shift+Enter as Enter and ignores
	 * `defaultPrevented`. The IME guard mirrors bits-ui's own.
	 */
	function handleInputKeydown(e: KeyboardEvent) {
		if (e.key !== 'Enter' || !e.shiftKey || e.isComposing || e.keyCode === 229 || !showCreate) return;
		e.preventDefault();
		e.stopPropagation();
		void createAndOpenNote();
	}
</script>

{#snippet fileRow(file: FileEntry)}
	{@const resolved = resolveIconForPath(file.path)}
	{@const iconColor = readableIconColor(appliedThemeStore, resolved?.color, rowBgs)}
	{@const KindIcon = KIND_ICONS[fileKind(file.name)]}
	{@const folder = vaultStore.path ? entryFolder(vaultStore.path, file.path) : ''}
	<Command.Item
		value={file.path}
		onSelect={() => selectFile(file.path)}
	>
		{#if resolved?.icon}
			<IconRenderer icon={resolved.icon} class="size-4 shrink-0" color={iconColor} />
		{:else}
			<KindIcon class="size-4 shrink-0 text-muted-foreground" style={iconColorStyle(iconColor)} />
		{/if}
		<span class="min-w-0 flex-1 truncate" data-quick-switcher-name>
			{#each matchSegments(file.nameWithoutExt, fuzzyMatchPositions(searchQuery, file.nameWithoutExt)) as segment, i (i)}
				{#if segment.match}<mark class="bg-transparent font-semibold text-foreground">{segment.text}</mark>{:else}{segment.text}{/if}
			{/each}
		</span>
		{#if folder}
			<span class="min-w-0 max-w-[50%] truncate text-right text-xs text-muted-foreground" data-quick-switcher-folder>{folder}</span>
		{/if}
		{#if lifecycleFilterStore.isArchived(file.path)}
			<span class="shrink-0 rounded-xs bg-muted px-1.5 text-[11px] text-muted-foreground" data-quick-switcher-archived>Archived</span>
		{/if}
	</Command.Item>
{/snippet}

<Command.Dialog
	open={quickSwitcherStore.isOpen}
	onOpenChange={handleOpenChange}
	shouldFilter={false}
	title="Quick Switcher"
	description="Search for a note to open"
	hints={KEY_HINTS}
>
	<Command.Input placeholder="Type a note name..." bind:value={searchQuery} onkeydown={handleInputKeydown} />
	<Command.List>
		{#if recentGroups}
			<Command.Group heading="Recent notes">
				{#each recentGroups.recent as file (file.path)}
					{@render fileRow(file)}
				{/each}
			</Command.Group>
			{#if recentGroups.rest.length > 0}
				<Command.Group>
					{#each recentGroups.rest as file (file.path)}
						{@render fileRow(file)}
					{/each}
				</Command.Group>
			{/if}
		{:else if hasResults}
			<Command.Group>
				{#each filteredFiles as file (file.path)}
					{@render fileRow(file)}
				{/each}
			</Command.Group>
		{/if}
		{#if showCreate}
			<!-- A Command.Item, not a button, so bits-ui selects it and Enter runs it when nothing matches. -->
			<Command.Group>
				<Command.Item
					value={`create:${searchQuery.trim()}`}
					onSelect={createAndOpenNote}
				>
					<FilePlus class="size-4" />
					<span>Create "{searchQuery.trim()}"</span>
					{#if !('error' in createPath)}
						<span class="text-xs text-muted-foreground">{createTargetLabel(createPath.folder)}</span>
					{/if}
				</Command.Item>
			</Command.Group>
		{:else if !hasResults}
			<Command.Empty>No files found.</Command.Empty>
		{/if}
	</Command.List>
</Command.Dialog>
