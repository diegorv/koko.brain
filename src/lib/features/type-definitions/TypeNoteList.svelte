<script lang="ts">
	import { ask } from '@tauri-apps/plugin-dialog';
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
	import { deleteItem, duplicateItem, revealInSystemExplorer } from '$lib/core/filesystem/fs.service';
	import { getRelativePath } from '$lib/core/filesystem/fs.logic';
	import { resolveIconForPath } from '$lib/features/file-icons/icon-resolver';
	import IconRenderer from '$lib/features/file-icons/IconRenderer.svelte';
	import IconPicker from '$lib/features/file-icons/IconPicker.svelte';
	import { fileIconsStore } from '$lib/features/file-icons/file-icons.store.svelte';
	import { setIconForPath, removeIconForPath, trackRecentIcon } from '$lib/features/file-icons/file-icons.service';
	import type { IconPackId } from '$lib/features/file-icons/file-icons.types';
	import { readTextFile } from '@tauri-apps/plugin-fs';
	import { createNoteOfType, toggleFavoriteForPath } from './type-definitions.service';
	import { typeDefinitionsStore } from './type-definitions.store.svelte';
	import { getNotesForSelection, getNotesForViewPaths, getViewLabel, getViewSort, getViewListProperties, shouldShowSubFilter, countSubFilters, formatDatePair, formatPropertyValue, splitPropertyIntoPills, type TypeSidebarNote, type NoteListSubFilter } from './type-sidebar.logic';
	import { resolveWikilink } from '$lib/features/backlinks/backlinks.logic';
	import { flattenFileTree } from '$lib/features/quick-switcher/quick-switcher.logic';
	import { parseCollectionYaml } from '$lib/features/collection/yaml-parser';
	import { executeQuery } from '$lib/features/collection/collection.logic';
	import { collectionStore } from '$lib/features/collection/collection.store.svelte';
	import { getFileName } from '$lib/core/filesystem/fs.logic';
	import * as ContextMenu from '$lib/components/ui/context-menu';

	let notes = $state<TypeSidebarNote[]>([]);
	let subFilter = $state<NoteListSubFilter>('open');
	let subCounts = $state({ open: 0, archived: 0, favorites: 0 });
	let contextTarget = $state<TypeSidebarNote | null>(null);
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
		const entries = typeDefinitionsStore.entries;
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
			loadViewNotes(sel.path, entries);
			return;
		}

		const sf = shouldShowSubFilter(sel) ? subFilter : undefined;
		notes = getNotesForSelection(entries, sel, typeDefinitionsStore.typeMetadataMap, sf);
		if (shouldShowSubFilter(sel)) {
			subCounts = countSubFilters(entries, sel);
		}
	});

	async function loadViewNotes(viewPath: string, entries: typeof typeDefinitionsStore.entries) {
		try {
			const content = await readTextFile(viewPath);
			const sel = typeDefinitionsStore.selectedTypeOrNav;
			if (sel?.kind !== 'view' || sel.path !== viewPath) return;

			const parsed = parseCollectionYaml(content);
			if (!parsed.success) {
				notes = [];
				return;
			}
			const view = parsed.definition.views[0];
			const result = executeQuery(parsed.definition, view, collectionStore.propertyIndex);
			const matchingPaths = new Set(result.records.map((r) => r.path));
			const viewEntry = entries.find((e) => e.path === viewPath);
			notes = getNotesForViewPaths(entries, matchingPaths, getViewSort(viewEntry));
		} catch {
			notes = [];
		}
	}



	function resolveNoteIcon(notePath: string) {
		const noteResolved = resolveIconForPath(notePath);
		if (noteResolved?.icon) return noteResolved;
		if (selection?.kind === 'type') {
			const defPath = typeDefinitionsStore.entries.find(
				(e) => e.isA === 'Type' && e.title === selection.name,
			)?.path;
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
		settingsStore.updateLayout({ sidebarMode: 'files' });
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
		{/if}
	</div>

	{#if showSubFilter}
		<div class="flex items-center gap-1 px-2 py-1.5 border-b border-border shrink-0">
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
					<div {...props} class="flex-1 overflow-y-auto px-1 py-1">
						{#each notes as note (note.path)}
							{@const resolved = resolveNoteIcon(note.path)}
							{@const isActive = note.path === activePath}
							<button
								class="flex w-full items-start gap-2 rounded px-2 py-2 text-left hover:bg-primary/10 cursor-default select-none {isActive ? 'bg-primary/25' : ''}"
								onclick={() => openFileInEditor(note.path)}
								oncontextmenu={() => { contextTarget = note; }}
							>
								{#if resolved?.icon}
									<IconRenderer icon={resolved.icon} class="size-4 shrink-0 mt-0.5" color={resolved.color} />
								{:else}
									<FileText class="size-4 shrink-0 mt-0.5 text-muted-foreground" />
								{/if}
								<div class="min-w-0 flex-1">
									<div class="truncate text-[13px] font-medium {isActive ? 'text-primary' : ''}" style:color={!isActive && resolved?.titleColor ? resolved.titleColor : undefined}>
										{note.title}
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
										<div class="text-[11px] text-muted-foreground/60 mt-1">
											{formatDatePair(note.modifiedAt, note.createdAt)}
										</div>
									{/if}
								</div>
							</button>
						{/each}

						{#if notes.length === 0}
							<div class="flex items-center justify-center py-8 text-muted-foreground text-sm">
								No notes
							</div>
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
