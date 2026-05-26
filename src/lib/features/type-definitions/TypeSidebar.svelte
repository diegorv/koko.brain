<script lang="ts">
	import FileText from '@lucide/svelte/icons/file-text';
	import ExternalLink from '@lucide/svelte/icons/external-link';
	import Copy from '@lucide/svelte/icons/copy';
	import Palette from '@lucide/svelte/icons/palette';
	import Plus from '@lucide/svelte/icons/plus';
	import Archive from '@lucide/svelte/icons/archive';
	import Inbox from '@lucide/svelte/icons/inbox';
	import FolderSearch from '@lucide/svelte/icons/folder-search';
	import Table from '@lucide/svelte/icons/table';
	import { settingsStore } from '$lib/core/settings/settings.store.svelte';
	import { openFileInEditor } from '$lib/core/editor/editor.service';
	import { isViewFile } from '$lib/core/filesystem/fs.logic';
	import { vaultStore } from '$lib/core/vault/vault.store.svelte';
	import { fsStore } from '$lib/core/filesystem/fs.store.svelte';
	import { revealInSystemExplorer } from '$lib/core/filesystem/fs.service';
	import { createNoteOfType, createTypeDefinition, updateViewIcon, removeViewIcon } from './type-definitions.service';
	import { getRelativePath } from '$lib/core/filesystem/fs.logic';
	import { resolveIconForPath } from '$lib/features/file-icons/icon-resolver';
	import IconRenderer from '$lib/features/file-icons/IconRenderer.svelte';
	import IconPicker from '$lib/features/file-icons/IconPicker.svelte';
	import { fileIconsStore } from '$lib/features/file-icons/file-icons.store.svelte';
	import { setIconForPath, removeIconForPath, trackRecentIcon } from '$lib/features/file-icons/file-icons.service';
	import type { IconPackId } from '$lib/features/file-icons/file-icons.types';
	import { typeDefinitionsStore } from './type-definitions.store.svelte';
	import { buildTypeSections, countNavItems, collectViewFiles, sortViewFiles, getViewLabel, type TypeSection, type NavItemId, type TypeSidebarSelection, type ViewFileEntry } from './type-sidebar.logic';
	import { executeQuery } from '$lib/features/collection/collection.logic';
	import { collectionStore } from '$lib/features/collection/collection.store.svelte';
	import { debounce } from '$lib/utils/debounce';
	import { refreshViewDefinition, setViewQueryResult } from './view-parse-cache';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import * as ContextMenu from '$lib/components/ui/context-menu';
	import SidebarModeToggle from './SidebarModeToggle.svelte';
	import DailyNoteButton from '$lib/plugins/periodic-notes/DailyNoteButton.svelte';

	let sections = $state<TypeSection[]>([]);
	let untypedCount = $state(0);
	let navCounts = $state({ inbox: 0, all: 0, archive: 0, favorites: 0 });
	let viewFiles = $derived(collectViewFiles(fsStore.fileTree));
	let sortedViewFiles = $derived(sortViewFiles(viewFiles, typeDefinitionsStore.entries));
	let sectionContextPath = $state<string | null>(null);
	let sectionContextName = $state<string | null>(null);
	let iconPickerPath = $state<string | null>(null);
	let iconPickerOpen = $state(false);
	let selection = $derived(typeDefinitionsStore.selectedTypeOrNav);
	let iconPickerRef = $derived(
		iconPickerPath ? fileIconsStore.getFrontmatterIcon(iconPickerPath) : undefined
	);
	let viewCounts = $state<Map<string, number>>(new Map());

	const navItems: { id: NavItemId; label: string; icon: typeof Inbox }[] = [
		{ id: 'inbox', label: 'Inbox', icon: Inbox },
		{ id: 'archive', label: 'Archive', icon: Archive },
	];

	$effect(() => {
		const _version = typeDefinitionsStore.entriesVersion;
		const entries = typeDefinitionsStore.entries;
		if (entries.length === 0) {
			sections = [];
			untypedCount = 0;
			navCounts = { inbox: 0, all: 0, archive: 0, favorites: 0 };
			return;
		}
		const result = buildTypeSections(entries, typeDefinitionsStore.typeMetadataMap, 'all');
		sections = result.sections;
		untypedCount = result.untyped.length;
		navCounts = countNavItems(entries);

		if (!typeDefinitionsStore.selectedTypeOrNav && result.sections.length > 0) {
			typeDefinitionsStore.setSelection({ kind: 'type', name: result.sections[0].metadata.name });
		}
	});

	let viewCountsGeneration = 0;

	const updateViewCounts = debounce(async (views: ViewFileEntry[], generation: number, propertyIndex: typeof collectionStore.propertyIndex) => {
		if (views.length === 0) { viewCounts = new Map(); return; }
		const counts = new Map<string, number>();
		await Promise.all(views.map(async (v) => {
			try {
				const parsed = await refreshViewDefinition(v.path);
				if (!parsed.success) return;
				const view = parsed.definition.views[0];
				const result = executeQuery(parsed.definition, view, propertyIndex);
				const matchingPaths = new Set(result.records.map((r) => r.path));
				setViewQueryResult(v.path, matchingPaths);
				counts.set(v.path, matchingPaths.size);
			} catch { /* skip */ }
		}));
		if (generation === viewCountsGeneration) viewCounts = counts;
	}, 1000);

	$effect(() => {
		const views = sortedViewFiles;
		const _version = typeDefinitionsStore.entriesVersion;
		const propertyIndex = collectionStore.propertyIndex;
		viewCountsGeneration++;
		updateViewCounts(views, viewCountsGeneration, propertyIndex);
	});

	function selectNav(id: NavItemId) {
		typeDefinitionsStore.setSelection({ kind: 'nav', id });
	}

	function selectType(name: string) {
		typeDefinitionsStore.setSelection({ kind: 'type', name });
	}

	function selectUntyped() {
		typeDefinitionsStore.setSelection({ kind: 'untyped' });
	}

	function isNavSelected(id: NavItemId): boolean {
		return selection?.kind === 'nav' && selection.id === id;
	}

	function isTypeSelected(name: string): boolean {
		return selection?.kind === 'type' && selection.name === name;
	}

	function isUntypedSelected(): boolean {
		return selection?.kind === 'untyped';
	}

	function handleSectionChangeIcon(path: string) {
		iconPickerPath = path;
		iconPickerOpen = true;
	}

	async function handleIconSelect(pack: IconPackId, name: string, color?: string, textColor?: string) {
		if (!vaultStore.path || !iconPickerPath) return;
		if (isViewFile(iconPickerPath)) {
			await updateViewIcon(iconPickerPath, `${pack}:${name}`, color, textColor);
		} else {
			await setIconForPath(vaultStore.path, iconPickerPath, pack, name, color, textColor);
		}
		await trackRecentIcon(vaultStore.path, pack, name);
	}

	async function handleIconRemove() {
		if (!vaultStore.path || !iconPickerPath) return;
		if (isViewFile(iconPickerPath)) {
			await removeViewIcon(iconPickerPath);
		} else {
			await removeIconForPath(vaultStore.path, iconPickerPath);
		}
	}

	function handleIconPickerClose() {
		iconPickerOpen = false;
		iconPickerPath = null;
	}
</script>

<Tooltip.Provider delayDuration={400}>
<div class="flex flex-col h-full bg-background">
	<div class="flex items-center justify-end h-10 px-3 gap-0.5 bg-tab-bar shrink-0" data-tauri-drag-region>
		<div class="flex items-center gap-0.5">
			<DailyNoteButton />
			<div class="mx-0.5 h-4 w-px bg-file-explorer-fg/30"></div>
			<SidebarModeToggle />
		</div>
	</div>

	<ContextMenu.Root>
		<ContextMenu.Trigger>
			{#snippet child({ props })}
				<div {...props} class="flex-1 overflow-y-auto px-1 py-1">
					<div class="mb-1">
						{#each navItems as item (item.id)}
							<button
								class="flex w-full items-center gap-2 rounded px-2 py-[5px] text-[15px] hover:bg-file-explorer-primary/10 cursor-default select-none {isNavSelected(item.id) ? 'bg-file-explorer-primary/25 text-file-explorer-primary' : ''}"
								onclick={() => selectNav(item.id)}
							>
								<item.icon class="size-4 shrink-0 {isNavSelected(item.id) ? 'text-file-explorer-primary' : 'text-file-explorer-muted-fg'}" />
								<span class="truncate">{item.label}</span>
								<span class="ml-auto shrink-0 pr-1 text-xs text-[#8a8faa]">{navCounts[item.id]}</span>
							</button>
						{/each}
					</div>
					<div class="mx-2 my-2 h-px bg-file-explorer-fg/8"></div>

					{#if sortedViewFiles.length > 0}
						<div class="mx-2 mb-1.5 flex items-center gap-2">
							<span class="text-[11px] font-medium uppercase tracking-wider text-file-explorer-muted-fg">Views</span>
							<div class="flex-1 h-px bg-border"></div>
						</div>

						{#each sortedViewFiles as view (view.path)}
							{@const viewEntry = typeDefinitionsStore.entries.find((e) => e.path === view.path)}
							{@const viewLabel = getViewLabel(viewEntry, view.name)}
							{@const viewResolved = resolveIconForPath(view.path)}
							{@const viewIcon = viewResolved?.icon}
							{@const viewIconColor = viewResolved?.color}
							{@const viewTextColor = viewResolved?.titleColor}
							<button
								class="flex w-full items-center gap-2 rounded px-2 py-[5px] text-[15px] hover:bg-file-explorer-primary/10 cursor-default select-none {selection?.kind === 'view' && selection.path === view.path ? 'bg-file-explorer-primary/25 text-file-explorer-primary' : ''}"
								onclick={() => typeDefinitionsStore.setSelection({ kind: 'view', path: view.path })}
								oncontextmenu={() => { sectionContextPath = view.path; sectionContextName = null; }}
							>
								{#if viewIcon}
									<IconRenderer icon={viewIcon} class="size-4 shrink-0" color={viewIconColor} />
								{:else}
									<Table class="size-4 shrink-0 text-file-explorer-muted-fg" />
								{/if}
								<span class="truncate" style:color={!(selection?.kind === 'view' && selection.path === view.path) && viewTextColor ? viewTextColor : undefined}>
									{viewLabel}
								</span>
								{#if viewCounts.has(view.path)}
									<span class="ml-auto shrink-0 pr-1 text-xs text-[#8a8faa]">{viewCounts.get(view.path)}</span>
								{/if}
							</button>
						{/each}
						<div class="mx-2 my-2 h-px bg-file-explorer-fg/8"></div>
					{/if}

					<div class="mx-2 mb-1.5 flex items-center gap-2">
						<span class="text-[11px] font-medium uppercase tracking-wider text-file-explorer-muted-fg">Types</span>
						<div class="flex-1 h-px bg-border"></div>
					</div>

					{#each sections as section (section.metadata.name)}
						{@const defPath = section.definitionPath}
						{@const defResolved = defPath ? resolveIconForPath(defPath) : undefined}
						{@const defResolvedIcon = defResolved?.icon}
						{@const defIconColor = defResolved?.color}
						{@const defTextColor = defResolved?.titleColor}
						<button
							class="flex w-full items-center gap-2 rounded px-2 py-[5px] text-[15px] hover:bg-file-explorer-primary/10 cursor-default select-none {isTypeSelected(section.metadata.name) ? 'bg-file-explorer-primary/25 text-file-explorer-primary' : ''}"
							onclick={() => selectType(section.metadata.name)}
							oncontextmenu={() => { sectionContextPath = defPath; sectionContextName = section.metadata.name; }}
						>
							{#if defResolvedIcon}
								<IconRenderer icon={defResolvedIcon} class="size-4 shrink-0" color={defIconColor} />
							{:else}
								<FileText class="size-4 shrink-0 text-file-explorer-muted-fg" />
							{/if}
							<span class="truncate" style:color={!isTypeSelected(section.metadata.name) && defTextColor ? defTextColor : undefined}>
								{section.metadata.sidebarLabel}
							</span>
							<span class="ml-auto shrink-0 pr-1 text-xs text-[#8a8faa]">{section.notes.length}</span>
						</button>
					{/each}

					{#if untypedCount > 0 && settingsStore.showUntypedNotes}
						<div class="mt-2 border-t border-border pt-1">
							<button
								class="flex w-full items-center gap-2 rounded px-2 py-[5px] text-[15px] hover:bg-file-explorer-primary/10 cursor-default select-none {isUntypedSelected() ? 'bg-file-explorer-primary/25 text-file-explorer-primary' : ''}"
								onclick={selectUntyped}
							>
								<FileText class="size-4 shrink-0 text-file-explorer-muted-fg" />
								<span class="truncate">Untyped</span>
								<span class="ml-auto shrink-0 pr-1 text-xs text-[#8a8faa]">{untypedCount}</span>
							</button>
						</div>
					{/if}
				</div>
			{/snippet}
		</ContextMenu.Trigger>
		<ContextMenu.Content class="w-56">
			{#if sectionContextName && sectionContextPath}
				{@const path = sectionContextPath}
				{@const typeName = sectionContextName}
				<ContextMenu.Item onclick={() => createNoteOfType(typeName)}>
					<Plus class="size-4" />
					<span>New {typeName}</span>
				</ContextMenu.Item>
				<ContextMenu.Separator />

				<ContextMenu.Item onclick={() => openFileInEditor(path)}>
					<ExternalLink class="size-4" />
					<span>Open type definition</span>
				</ContextMenu.Item>
				<ContextMenu.Separator />

				<ContextMenu.Sub>
					<ContextMenu.SubTrigger>
						<Copy class="size-4" />
						<span>Copy path</span>
					</ContextMenu.SubTrigger>
					<ContextMenu.SubContent>
						<ContextMenu.Item onclick={() => navigator.clipboard.writeText(path)}>
							<span>Copy absolute path</span>
						</ContextMenu.Item>
						<ContextMenu.Item onclick={() => { if (vaultStore.path) navigator.clipboard.writeText(getRelativePath(vaultStore.path, path)); }}>
							<span>Copy relative path</span>
						</ContextMenu.Item>
					</ContextMenu.SubContent>
				</ContextMenu.Sub>
				<ContextMenu.Separator />

				<ContextMenu.Item onclick={() => handleSectionChangeIcon(path)}>
					<Palette class="size-4" />
					<span>Change icon</span>
				</ContextMenu.Item>
				<ContextMenu.Separator />
				<ContextMenu.Item onclick={() => revealInSystemExplorer(path)}>
					<FolderSearch class="size-4" />
					<span>Reveal in Finder</span>
				</ContextMenu.Item>
			{:else if !sectionContextName && sectionContextPath}
				{@const path = sectionContextPath}
				<ContextMenu.Item onclick={() => openFileInEditor(path)}>
					<ExternalLink class="size-4" />
					<span>Open view</span>
				</ContextMenu.Item>
				<ContextMenu.Separator />

				<ContextMenu.Sub>
					<ContextMenu.SubTrigger>
						<Copy class="size-4" />
						<span>Copy path</span>
					</ContextMenu.SubTrigger>
					<ContextMenu.SubContent>
						<ContextMenu.Item onclick={() => navigator.clipboard.writeText(path)}>
							<span>Copy absolute path</span>
						</ContextMenu.Item>
						<ContextMenu.Item onclick={() => { if (vaultStore.path) navigator.clipboard.writeText(getRelativePath(vaultStore.path, path)); }}>
							<span>Copy relative path</span>
						</ContextMenu.Item>
					</ContextMenu.SubContent>
				</ContextMenu.Sub>
				<ContextMenu.Separator />

				<ContextMenu.Item onclick={() => handleSectionChangeIcon(path)}>
					<Palette class="size-4" />
					<span>Change icon</span>
				</ContextMenu.Item>
				<ContextMenu.Separator />
				<ContextMenu.Item onclick={() => revealInSystemExplorer(path)}>
					<FolderSearch class="size-4" />
					<span>Reveal in Finder</span>
				</ContextMenu.Item>
			{:else if sectionContextName && !sectionContextPath}
				{@const name = sectionContextName}
				<ContextMenu.Item onclick={() => createNoteOfType(name)}>
					<Plus class="size-4" />
					<span>New {name}</span>
				</ContextMenu.Item>
				<ContextMenu.Separator />
				<ContextMenu.Item onclick={() => createTypeDefinition(name)}>
					<FileText class="size-4" />
					<span>Create type definition</span>
				</ContextMenu.Item>
			{/if}
		</ContextMenu.Content>
	</ContextMenu.Root>
</div>
</Tooltip.Provider>

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
