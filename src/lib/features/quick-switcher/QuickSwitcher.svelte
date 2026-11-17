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
	import { lifecycleFilterStore } from '#lib/features/properties/lifecycle-filter.store.svelte.js';
	import { relativePath } from '#lib/utils/path.js';
	import { flattenFileTree, filterAndRank } from '#lib/core/filesystem/file-entries.logic.js';
	import { quickSwitcherStore } from './quick-switcher.store.svelte';
	import { createTargetLabel, parseCreatePath } from './quick-switcher.logic';
	import FileText from '@lucide/svelte/icons/file-text';
	import Archive from '@lucide/svelte/icons/archive';
	import FilePlus from '@lucide/svelte/icons/file-plus';

	let searchQuery = $state('');

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
		{#if hasResults}
			<Command.Group>
				{#each filteredFiles as file (file.path)}
					{@const isArchived = lifecycleFilterStore.isArchived(file.path)}
					<Command.Item
						value={file.path}
						onSelect={() => selectFile(file.path)}
					>
						{#if isArchived}
							<Archive class="size-4 text-muted-foreground/50" />
						{:else}
							<FileText class="size-4 text-muted-foreground" />
						{/if}
						<div class="flex flex-col gap-0.5">
							<span class={isArchived ? 'opacity-50' : ''}>{file.nameWithoutExt}</span>
							{#if vaultStore.path}
								<span class="text-xs text-muted-foreground">
									{relativePath(vaultStore.path, file.path)}
								</span>
							{/if}
						</div>
					</Command.Item>
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
