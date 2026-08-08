<script lang="ts">
	import { ask } from '@tauri-apps/plugin-dialog';
	import { VList } from 'virtua/svelte';
	import FileText from '@lucide/svelte/icons/file-text';
	import ExternalLink from '@lucide/svelte/icons/external-link';
	import Copy from '@lucide/svelte/icons/copy';
	import Pencil from '@lucide/svelte/icons/pencil';
	import FolderSearch from '@lucide/svelte/icons/folder-search';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import Palette from '@lucide/svelte/icons/palette';
	import Plus from '@lucide/svelte/icons/plus';
	import Star from '@lucide/svelte/icons/star';
	import { openFileInEditor } from '$lib/core/editor/editor.service';
	import { editorStore } from '$lib/core/editor/editor.store.svelte';
	import { vaultStore } from '$lib/core/vault/vault.store.svelte';
	import { fsStore } from '$lib/core/filesystem/fs.store.svelte';
	import { settingsStore } from '$lib/core/settings/settings.store.svelte';
	import { deleteItem, duplicateItem, renameItem, revealInSystemExplorer } from '$lib/core/filesystem/fs.service';
	import { getRelativePath } from '$lib/core/filesystem/fs.logic';
	import { resolveIconForPath } from '$lib/features/file-icons/icon-resolver';
	import IconRenderer from '$lib/features/file-icons/IconRenderer.svelte';
	import IconPicker from '$lib/features/file-icons/IconPicker.svelte';
	import { fileIconsStore } from '$lib/features/file-icons/file-icons.store.svelte';
	import { setIconForPath, removeIconForPath, trackRecentIcon } from '$lib/features/file-icons/file-icons.service';
	import type { IconPackId } from '$lib/features/file-icons/file-icons.types';
	import { untrack } from 'svelte';
	import { appendLog } from '$lib/utils/log.service';
	import { createNoteOfType, toggleFavoriteForPath, updateViewQuery } from './type-definitions.service';
	import { typeDefinitionsStore } from './type-definitions.store.svelte';
	import { excludeSystemFolder, getNotesForSelection, getNotesForViewPaths, getViewLabel, getViewSort, getViewListProperties, shouldShowSubFilter, countSubFilters, countSubFiltersForPaths, formatRelativeTime, formatNoteDate, formatPropertyValue, splitPropertyIntoPills, type TypeSidebarNote, type NoteListSubFilter } from './type-sidebar.logic';
	import { resolveWikilink } from '$lib/features/backlinks/backlinks.logic';
	import { flattenFileTree } from '$lib/features/quick-switcher/quick-switcher.logic';
	import { executeQuery } from '$lib/features/collection/collection.logic';
	import { collectionStore } from '$lib/features/collection/collection.store.svelte';
	import type { SortDef } from '$lib/features/collection/collection.types';
	import type { FilterGroup } from '$lib/features/collection/toolbar/toolbar.types';
	import FilterPanel from '$lib/features/collection/toolbar/FilterPanel.svelte';
	import SortPanel from '$lib/features/collection/toolbar/SortPanel.svelte';
	import { Popover, PopoverTrigger, PopoverContent } from '$lib/components/ui/popover';
	import { Button } from '$lib/components/ui/button';
	import ListFilter from '@lucide/svelte/icons/list-filter';
	import ArrowUpDown from '@lucide/svelte/icons/arrow-up-down';
	import { getCachedViewDefinition } from './view-parse-cache';
	import {
		seedToolbarStateFromDefinition,
		buildOverriddenQuery,
		combineAvailableProperties,
		countActiveFilters,
		buildViewYamlUpdates,
		buildRenameFileName,
	} from './type-note-list.logic';
	import { getFileName } from '$lib/core/filesystem/fs.logic';
	import * as ContextMenu from '$lib/components/ui/context-menu';

	let notes = $state<TypeSidebarNote[]>([]);
	let subFilter = $state<NoteListSubFilter>('open');
	let subCounts = $state({ open: 0, archived: 0, favorites: 0 });
	let contextTarget = $state<TypeSidebarNote | null>(null);
	let renameValue = $state('');
	let renameInput = $state<HTMLInputElement | undefined>();
	/** Guards against blur firing commitRename after Escape already cancelled */
	let renameCancelled = $state(false);
	/** Path already prefilled into the rename input — prevents list refreshes from resetting a rename in progress */
	let renamePrefilledPath = $state<string | null>(null);
	let iconPickerPath = $state<string | null>(null);
	let iconPickerOpen = $state(false);
	let activePath = $derived(editorStore.activeTabPath);
	let selection = $derived(typeDefinitionsStore.selectedTypeOrNav);
	let showSubFilter = $derived(selection ? shouldShowSubFilter(selection) : false);
	let prevSelectionKey = $state('');
	let iconPickerRef = $derived(
		iconPickerPath ? fileIconsStore.getFrontmatterIcon(iconPickerPath) : undefined
	);
	let allPaths = $derived(flattenFileTree(fsStore.fileTree).map((f) => f.path));
	let viewLoadGeneration = 0;

	/** Local filter/sort state for the active view selection. Seeded once per view. */
	let localGlobalFilters = $state<FilterGroup[]>([]);
	let localViewFilters = $state<FilterGroup[]>([]);
	let localSort = $state<SortDef[]>([]);
	/** Path of the view whose YAML seeded the local state. Triggers re-seed when it changes. */
	let seededViewPath = $state<string | null>(null);
	/** Suppresses the next re-seed when the YAML change came from our own write. */
	let selfUpdate = $state(false);
	/** Popover open states. */
	let filterOpen = $state(false);
	let sortOpen = $state(false);

	let activeFilterCount = $derived(countActiveFilters(localGlobalFilters, localViewFilters));

	/** Formulas declared in the active .view (read-only here — Properties panel is out of scope). */
	let viewFormulas = $state<Record<string, string>>({});

	let availableProperties = $derived(combineAvailableProperties(collectionStore.propertyIndex, viewFormulas));

	let isViewSelection = $derived(selection?.kind === 'view');
	let viewToolbarReady = $derived(isViewSelection && seededViewPath === (selection?.kind === 'view' ? selection.path : null));

	let headerLabel = $derived.by(() => {
		if (!selection) return '';
		switch (selection.kind) {
			case 'type': {
				const meta = typeDefinitionsStore.getTypeMetadata(selection.name);
				return meta?.sidebarLabel ?? selection.name + 's';
			}
			case 'untyped':
				return 'Untyped';
			case 'nav':
				switch (selection.id) {
					case 'inbox': return 'Inbox';
					case 'all': return 'All Notes';
					case 'archive': return 'Archive';
					case 'favorites': return 'Favorites';
				}
			case 'view': {
				const entry = typeDefinitionsStore.entries.find((e) => e.path === selection.path);
				return getViewLabel(entry, getFileName(selection.path).replace(/\.view$/i, ''));
			}
		}
	});

	let canCreate = $derived(selection?.kind === 'type');
	let typeName = $derived(selection?.kind === 'type' ? selection.name : null);
	let listProperties = $derived.by(() => {
		if (selection?.kind === 'type') {
			const meta = typeDefinitionsStore.getTypeMetadata(selection.name);
			return meta?.listPropertiesDisplay ?? [];
		}
		if (selection?.kind === 'view') {
			const entry = typeDefinitionsStore.entries.find((e) => e.path === selection.path);
			return getViewListProperties(entry);
		}
		return [];
	});

	function selectionKey(sel: typeof selection): string {
		if (!sel) return '';
		switch (sel.kind) {
			case 'type': return `type:${sel.name}`;
			case 'nav': return `nav:${sel.id}`;
			case 'untyped': return 'untyped';
			case 'view': return `view:${sel.path}`;
		}
	}

	$effect(() => {
		const _version = typeDefinitionsStore.entriesVersion;
		const rawEntries = typeDefinitionsStore.entries;
		const entries = excludeSystemFolder(rawEntries, vaultStore.path, settingsStore.templates.systemFolder);
		const sel = typeDefinitionsStore.selectedTypeOrNav;
		if (!sel || entries.length === 0) {
			notes = [];
			subCounts = { open: 0, archived: 0, favorites: 0 };
			return;
		}
		const key = selectionKey(sel);
		if (key !== prevSelectionKey) {
			subFilter = 'open';
			prevSelectionKey = key;
		}

		if (sel.kind === 'view') {
			loadViewNotes(sel.path, entries, subFilter, ++viewLoadGeneration);
			return;
		}

		const sf = shouldShowSubFilter(sel) ? subFilter : undefined;
		notes = getNotesForSelection(entries, sel, typeDefinitionsStore.typeMetadataMap, sf);
		if (shouldShowSubFilter(sel)) {
			subCounts = countSubFilters(entries, sel);
		}
	});

	async function loadViewNotes(viewPath: string, entries: typeof typeDefinitionsStore.entries, sf: NoteListSubFilter, generation: number) {
		const t0 = performance.now();
		try {
			const parsed = await getCachedViewDefinition(viewPath);
			if (generation !== viewLoadGeneration) return;
			const sel = typeDefinitionsStore.selectedTypeOrNav;
			if (sel?.kind !== 'view' || sel.path !== viewPath) return;
			if (typeDefinitionsStore.entries.length === 0) return;

			if (!parsed.success) {
				notes = [];
				subCounts = { open: 0, archived: 0, favorites: 0 };
				seededViewPath = viewPath;
				return;
			}
			const view = parsed.definition.views[0];

			// Seed local toolbar state when switching to a different view, or after a
			// remote/external YAML change. Skip re-seeding when our own persistState
			// caused the reload (selfUpdate flag).
			if (selfUpdate) {
				selfUpdate = false;
			} else if (seededViewPath !== viewPath) {
				const seed = seedToolbarStateFromDefinition(parsed.definition, view);
				localGlobalFilters = seed.globalFilters;
				localViewFilters = seed.viewFilters;
				localSort = seed.sort;
				viewFormulas = seed.formulas;
				seededViewPath = viewPath;
			}

			const overridden = buildOverriddenQuery(
				parsed.definition,
				view,
				localGlobalFilters,
				localViewFilters,
				localSort,
			);
			if (!overridden) {
				notes = [];
				return;
			}
			const freshEntries = excludeSystemFolder(
				typeDefinitionsStore.entries,
				vaultStore.path,
				settingsStore.templates.systemFolder,
			);
			const result = executeQuery(overridden.definition, overridden.view, collectionStore.propertyIndex);
			const matchingPaths = new Set(result.records.map((r) => r.path));
			const viewEntry = freshEntries.find((e) => e.path === viewPath);
			notes = getNotesForViewPaths(freshEntries, matchingPaths, getViewSort(viewEntry), sf);
			subCounts = countSubFiltersForPaths(freshEntries, matchingPaths);
			appendLog('VIEW-NOTES', `${notes.length} notes in ${(performance.now() - t0).toFixed(1)}ms`);
		} catch {
			notes = [];
		}
	}

	/** Persists current local filter/sort state back into the .view YAML file. */
	async function persistViewState() {
		const sel = typeDefinitionsStore.selectedTypeOrNav;
		if (sel?.kind !== 'view') return;
		const viewPath = sel.path;
		selfUpdate = true;
		try {
			await updateViewQuery(viewPath, buildViewYamlUpdates(localGlobalFilters, localViewFilters, localSort));
			// Re-run the query so the panel updates immediately. Bump the generation
			// so the in-flight effect re-trigger (from entriesVersion bump) does not
			// race with this manual call.
			loadViewNotes(viewPath, typeDefinitionsStore.entries, subFilter, ++viewLoadGeneration);
		} catch {
			selfUpdate = false;
		}
	}

	function handleGlobalFiltersChange(groups: FilterGroup[]) {
		localGlobalFilters = groups;
		persistViewState();
	}

	function handleViewFiltersChange(groups: FilterGroup[]) {
		localViewFilters = groups;
		persistViewState();
	}

	function handleSortsChange(sorts: SortDef[]) {
		localSort = sorts;
		persistViewState();
	}

	// Reset seeded state when leaving view selections, so a re-entry triggers a fresh seed.
	$effect(() => {
		if (selection?.kind !== 'view') {
			seededViewPath = null;
			localGlobalFilters = [];
			localViewFilters = [];
			localSort = [];
			viewFormulas = {};
		}
	});



	function resolveNoteIcon(notePath: string) {
		const noteResolved = resolveIconForPath(notePath);
		if (noteResolved?.icon) return noteResolved;
		if (selection?.kind === 'type') {
			const defPath = typeDefinitionsStore.getTypeDefinitionPath(selection.name);
			if (defPath) {
				const typeResolved = resolveIconForPath(defPath);
				if (typeResolved?.icon) return typeResolved;
			}
		}
		return null;
	}

	async function handleDuplicate(note: TypeSidebarNote) {
		await duplicateItem(note.path, false);
	}

	function handleStartRename(note: TypeSidebarNote) {
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
		renameValue = note.title;
		requestAnimationFrame(() => {
			renameInput?.focus();
			renameInput?.select();
		});
	});

	/** Validates and applies the rename, or silently discards invalid input */
	async function commitRename() {
		if (renameCancelled) return;
		const path = fsStore.renamingPath;
		const note = path ? notes.find((n) => n.path === path) : null;
		fsStore.setRenamingPath(null);
		if (!note) return;
		const newName = buildRenameFileName(note.path, note.title, renameValue);
		if (!newName) return;
		await renameItem(note.path, newName);
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

	async function handleDelete(note: TypeSidebarNote) {
		const confirmed = await ask(
			`Move "${note.title}" to trash?`,
			{ title: 'Move to Trash', kind: 'warning' },
		);
		if (confirmed) {
			await deleteItem(note.path, false);
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

	async function handleIconRemove() {
		if (!vaultStore.path || !iconPickerPath) return;
		await removeIconForPath(vaultStore.path, iconPickerPath);
	}

	function handleIconPickerClose() {
		iconPickerOpen = false;
		iconPickerPath = null;
	}
</script>

<div class="flex flex-col h-full bg-card">
	<div class="flex items-center h-10 px-3 gap-2 bg-tab-bar shrink-0 border-b border-border" data-tauri-drag-region>
		<span class="text-sm font-medium truncate">{headerLabel}</span>
		{#if canCreate && typeName}
			{@const name = typeName}
			<button
				class="ml-auto shrink-0 rounded p-0.5 hover:bg-primary/10 cursor-default"
				onclick={() => createNoteOfType(name)}
			>
				<Plus class="size-4 text-muted-foreground" />
			</button>
		{:else if viewToolbarReady}
			<div class="ml-auto flex items-center gap-0.5">
				<Popover bind:open={sortOpen}>
					<PopoverTrigger>
						<Button
							variant="ghost"
							size="icon-sm"
							class={localSort.length > 0 ? 'text-primary' : 'text-muted-foreground'}
						>
							<ArrowUpDown class="size-3.5" />
						</Button>
					</PopoverTrigger>
					<PopoverContent align="end" class="w-72 p-3">
						<SortPanel
							sorts={localSort}
							{availableProperties}
							propertyConfigs={{}}
							propertyIndex={collectionStore.propertyIndex}
							onSortsChange={handleSortsChange}
						/>
					</PopoverContent>
				</Popover>

				<Popover bind:open={filterOpen}>
					<PopoverTrigger>
						<Button
							variant="ghost"
							size="icon-sm"
							class={activeFilterCount > 0 ? 'text-primary' : 'text-muted-foreground'}
						>
							<ListFilter class="size-3.5" />
						</Button>
					</PopoverTrigger>
					<PopoverContent align="end" class="w-80 p-3">
						<FilterPanel
							globalFilters={localGlobalFilters}
							viewFilters={localViewFilters}
							{availableProperties}
							propertyIndex={collectionStore.propertyIndex}
							onGlobalFiltersChange={handleGlobalFiltersChange}
							onViewFiltersChange={handleViewFiltersChange}
						/>
					</PopoverContent>
				</Popover>
			</div>
		{/if}
	</div>

	{#if showSubFilter}
		<div class="flex items-center pt-1.5 border-b border-border shrink-0">
			<button
				class="flex flex-1 items-center justify-center gap-1.5 py-1 text-xs cursor-pointer border-b-2 {subFilter === 'open' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}"
				onclick={() => { subFilter = 'open'; }}
			>
				Open
				<span class="text-[10px] tabular-nums">{subCounts.open}</span>
			</button>
			<button
				class="flex flex-1 items-center justify-center gap-1.5 py-1 text-xs cursor-pointer border-b-2 {subFilter === 'archived' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}"
				onclick={() => { subFilter = 'archived'; }}
			>
				Archived
				<span class="text-[10px] tabular-nums">{subCounts.archived}</span>
			</button>
			<button
				class="flex flex-1 items-center justify-center gap-1.5 py-1 text-xs cursor-pointer border-b-2 {subFilter === 'favorites' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}"
				onclick={() => { subFilter = 'favorites'; }}
			>
				Favorites
				<span class="text-[10px] tabular-nums">{subCounts.favorites}</span>
			</button>
		</div>
	{/if}

	<ContextMenu.Root>
			<ContextMenu.Trigger>
				{#snippet child({ props })}
					<div
						{...props}
						class="flex-1 overflow-hidden"
						oncontextmenu={(e) => {
							// VList wraps every row in positioning divs, so "blank area" can
							// no longer be detected via target === currentTarget; anything
							// outside a note row counts as blank and suppresses the menu.
							if (!(e.target instanceof Element) || !e.target.closest('[data-note-row]')) {
								contextTarget = null;
								e.preventDefault();
								return;
							}
							if (typeof props.oncontextmenu === 'function') props.oncontextmenu(e);
						}}
					>
						{#if notes.length === 0}
							<div class="flex items-center justify-center py-8 text-muted-foreground text-sm">
								No notes
							</div>
						{:else}
						<VList data={notes} getKey={(note: TypeSidebarNote) => note.path} class="px-1 py-1">
						{#snippet children(note: TypeSidebarNote, i: number)}
							{@const resolved = resolveNoteIcon(note.path)}
							{@const isActive = note.path === activePath}
							{#if i > 0}
								<div class="h-px bg-border"></div>
							{/if}
							{#if note.path === fsStore.renamingPath}
								<!-- svelte-ignore a11y_no_static_element_interactions -->
								<div
									class="flex w-full items-center gap-2 rounded px-2 py-2"
									oncontextmenu={(e) => { e.stopPropagation(); e.preventDefault(); }}
								>
									{#if resolved?.icon}
										<IconRenderer icon={resolved.icon} class="size-4 shrink-0" color={resolved.color} />
									{:else}
										<FileText class="size-4 shrink-0 text-muted-foreground" />
									{/if}
									<input
										bind:this={renameInput}
										bind:value={renameValue}
										onkeydown={handleRenameKeydown}
										onblur={commitRename}
										class="h-6 flex-1 rounded border border-ring bg-background px-1 text-[13px] outline-none"
									/>
								</div>
							{:else}
							<button
								data-note-row
								class="flex w-full flex-col rounded px-2 py-2 text-left hover:bg-primary/10 cursor-default select-none {isActive ? 'bg-primary/25' : ''}"
								onclick={() => openFileInEditor(note.path)}
								oncontextmenu={() => { contextTarget = note; }}
								onkeydown={(e) => { if (e.key === 'F2') handleStartRename(note); }}
							>
								<div class="flex w-full items-start gap-2">
									{#if resolved?.icon}
										<IconRenderer icon={resolved.icon} class="size-4 shrink-0 mt-0.5" color={resolved.color} />
									{:else}
										<FileText class="size-4 shrink-0 mt-0.5 text-muted-foreground" />
									{/if}
									<div class="min-w-0 flex-1">
										<div class="truncate text-[13px] font-medium {isActive ? 'text-primary' : ''}" style:color={!isActive && resolved?.titleColor ? resolved.titleColor : undefined}>
											{note.title}
										</div>
									</div>
								</div>
								{#if listProperties.length > 0}
									<div class="flex flex-wrap gap-1 mt-1">
										{#each listProperties as prop (prop)}
											{@const pills = splitPropertyIntoPills(note.frontmatter[prop])}
											{#each pills as pill, i (prop + '-' + pill.text + '-' + i)}
												{#if pill.wikilink}
													{@const resolved = resolveWikilink(pill.wikilink, allPaths)}
													<!-- svelte-ignore a11y_no_static_element_interactions -->
													<span
														class="inline-flex items-center rounded bg-primary/10 px-1.5 py-0.5 text-[11px] text-primary/80 truncate max-w-[140px] hover:bg-primary/20 hover:underline cursor-pointer"
														role="link"
														tabindex="-1"
														onclick={(e: MouseEvent) => { e.stopPropagation(); if (resolved) openFileInEditor(resolved); }}
														onkeydown={(e: KeyboardEvent) => { if (e.key === 'Enter') { e.stopPropagation(); if (resolved) openFileInEditor(resolved); } }}
														title={resolved ? pill.wikilink : pill.wikilink + ' (not found)'}
													>
														{pill.text}
													</span>
												{:else}
													<span class="inline-flex items-center rounded bg-primary/10 px-1.5 py-0.5 text-[11px] text-primary/80 truncate max-w-[140px]">
														{pill.text}
													</span>
												{/if}
											{/each}
										{/each}
									</div>
								{/if}
								{#if note.modifiedAt || note.createdAt}
									<div class="flex w-full items-center justify-between text-[11px] text-muted-foreground/60 mt-1">
										<span>{formatRelativeTime(note.modifiedAt)}</span>
										{#if note.createdAt}
											<span>Created {formatNoteDate(note.createdAt)}</span>
										{/if}
									</div>
								{/if}
							</button>
							{/if}
						{/snippet}
						</VList>
						{/if}
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
					<ContextMenu.Separator />

					<ContextMenu.Item onclick={() => handleDuplicate(target)}>
						<Copy class="size-4" />
						<span>Duplicate</span>
					</ContextMenu.Item>
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
					<ContextMenu.Separator />

					<ContextMenu.Item onclick={() => handleChangeIcon(target.path)}>
						<Palette class="size-4" />
						<span>Change icon</span>
					</ContextMenu.Item>
					<ContextMenu.Separator />

					<ContextMenu.Item onclick={() => toggleFavoriteForPath(target.path, !target.favorite)}>
						<Star class="size-4 {target.favorite ? 'fill-current' : ''}" />
						<span>{target.favorite ? 'Unfavorite' : 'Favorite'}</span>
					</ContextMenu.Item>
					<ContextMenu.Separator />

					<ContextMenu.Item onclick={() => revealInSystemExplorer(target.path)}>
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
				{/if}
			</ContextMenu.Content>
		</ContextMenu.Root>
</div>

{#if iconPickerPath}
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
