<script lang="ts">
	import { ask } from '@tauri-apps/plugin-dialog';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import FileText from '@lucide/svelte/icons/file-text';
	import ExternalLink from '@lucide/svelte/icons/external-link';
	import Copy from '@lucide/svelte/icons/copy';
	import Pencil from '@lucide/svelte/icons/pencil';
	import FolderSearch from '@lucide/svelte/icons/folder-search';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import Palette from '@lucide/svelte/icons/palette';
	import Plus from '@lucide/svelte/icons/plus';
	import Star from '@lucide/svelte/icons/star';
	import Archive from '@lucide/svelte/icons/archive';
	import Inbox from '@lucide/svelte/icons/inbox';
	import LayoutGrid from '@lucide/svelte/icons/layout-grid';
	import { settingsStore } from '$lib/core/settings/settings.store.svelte';
	import { openFileInEditor } from '$lib/core/editor/editor.service';
	import { editorStore } from '$lib/core/editor/editor.store.svelte';
	import { vaultStore } from '$lib/core/vault/vault.store.svelte';
	import { fsStore } from '$lib/core/filesystem/fs.store.svelte';
	import { deleteItem, duplicateItem, revealInSystemExplorer } from '$lib/core/filesystem/fs.service';
	import { createNoteOfType, createTypeDefinition, toggleFavoriteForPath } from './type-definitions.service';
	import { getRelativePath } from '$lib/core/filesystem/fs.logic';
	import { fileIconsStore } from '$lib/features/file-icons/file-icons.store.svelte';
	import { setIconForPath, removeIconForPath, trackRecentIcon } from '$lib/features/file-icons/file-icons.service';
	import { resolveIconForPath } from '$lib/features/file-icons/icon-resolver';
	import IconRenderer from '$lib/features/file-icons/IconRenderer.svelte';
	import IconPicker from '$lib/features/file-icons/IconPicker.svelte';
	import type { IconPackId } from '$lib/features/file-icons/file-icons.types';
	import { typeDefinitionsStore } from './type-definitions.store.svelte';
	import { buildTypeSections, countInbox, type SidebarFilter, type TypeSection, type TypeSidebarNote } from './type-sidebar.logic';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import * as ContextMenu from '$lib/components/ui/context-menu';
	import SidebarModeToggle from './SidebarModeToggle.svelte';
	import DailyNoteButton from '$lib/plugins/periodic-notes/DailyNoteButton.svelte';

	let filter = $state<SidebarFilter>('all');
	let sections = $state<TypeSection[]>([]);
	let untyped = $state<TypeSidebarNote[]>([]);
	let inboxCount = $state(0);
	let collapsedSections = $state<Set<string>>(new Set());
	let contextTarget = $state<TypeSidebarNote | null>(null);
	let sectionContextPath = $state<string | null>(null);
	let sectionContextName = $state<string | null>(null);
	let iconPickerPath = $state<string | null>(null);
	let iconPickerOpen = $state(false);
	let activePath = $derived(editorStore.activeTabPath);
	let inboxEnabled = $derived(settingsStore.settings.explicitOrganization);
	let iconPickerRef = $derived(
		iconPickerPath ? fileIconsStore.getFrontmatterIcon(iconPickerPath) : undefined
	);
	let filterTabs = $derived([
		{ id: 'all' as SidebarFilter, label: 'All', icon: LayoutGrid },
		...(inboxEnabled ? [{ id: 'inbox' as SidebarFilter, label: 'Inbox', icon: Inbox }] : []),
		{ id: 'archived' as SidebarFilter, label: 'Archived', icon: Archive },
		{ id: 'favorites' as SidebarFilter, label: 'Favorites', icon: Star },
	]);

	let initialized = false;

	$effect(() => {
		const _version = typeDefinitionsStore.entriesVersion;
		const entries = typeDefinitionsStore.entries;
		if (entries.length === 0) return;
		const result = buildTypeSections(entries, typeDefinitionsStore.typeMetadataMap, filter);
		sections = result.sections;
		untyped = result.untyped;
		inboxCount = countInbox(entries);
		if (!initialized) {
			initialized = true;
			const collapsed = new Set<string>();
			for (const s of result.sections) collapsed.add(s.metadata.name);
			if (result.untyped.length > 0) collapsed.add('__untyped');
			collapsedSections = collapsed;
		}
	});

	function rebuildFromCache() {
		const entries = typeDefinitionsStore.entries;
		const result = buildTypeSections(entries, typeDefinitionsStore.typeMetadataMap, filter);
		sections = result.sections;
		untyped = result.untyped;
		inboxCount = countInbox(entries);
	}

	function toggleSection(name: string) {
		const next = new Set(collapsedSections);
		if (next.has(name)) next.delete(name);
		else next.add(name);
		collapsedSections = next;
	}

	async function handleOpenInNewTab(note: TypeSidebarNote) {
		openFileInEditor(note.path);
	}

	async function handleDuplicate(note: TypeSidebarNote) {
		await duplicateItem(note.path, false);
	}

	async function handleCopyAbsolutePath(note: TypeSidebarNote) {
		await navigator.clipboard.writeText(note.path);
	}

	async function handleCopyRelativePath(note: TypeSidebarNote) {
		if (!vaultStore.path) return;
		await navigator.clipboard.writeText(getRelativePath(vaultStore.path, note.path));
	}

	async function handleRevealInFinder(note: TypeSidebarNote) {
		await revealInSystemExplorer(note.path);
	}

	function handleStartRename(note: TypeSidebarNote) {
		fsStore.setRenamingPath(note.path);
		settingsStore.updateLayout({ sidebarMode: 'files' });
	}

	async function handleDelete(note: TypeSidebarNote) {
		const confirmed = await ask(
			`Move "${note.title}" to trash?`,
			{ title: 'Move to Trash', kind: 'warning' }
		);
		if (confirmed) {
			await deleteItem(note.path, false);
		}
	}

	function handleSectionChangeIcon(path: string) {
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

<Tooltip.Provider delayDuration={400}>
<div class="flex flex-col h-full">
	<div class="flex items-center justify-end h-10 px-3 gap-0.5 bg-tab-bar shrink-0" data-tauri-drag-region>
		<div class="flex items-center gap-0.5">
			<DailyNoteButton />
			<div class="mx-0.5 h-4 w-px bg-foreground/30"></div>
			<SidebarModeToggle />
		</div>
	</div>
	<div class="flex items-center gap-1 px-2 py-1.5 border-b border-border shrink-0">
		{#each filterTabs as f (f.id)}
			<button
				class="flex flex-1 items-center justify-center gap-1.5 py-1.5 text-xs transition-colors cursor-pointer border-b-2 {filter === f.id ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}"
				onclick={() => { filter = f.id as SidebarFilter; rebuildFromCache(); }}
			>
				<f.icon class="size-3.5" />
				{f.label}
				{#if f.id === 'inbox' && inboxCount > 0}
					<span class="text-[10px] bg-primary/20 text-primary px-1 rounded-full">{inboxCount}</span>
				{/if}
			</button>
		{/each}
	</div>

	<ContextMenu.Root>
		<ContextMenu.Trigger>
			{#snippet child({ props })}
				<div {...props} class="flex-1 overflow-y-auto px-1 py-1">
					{#each sections as section (section.metadata.name)}
						{@const collapsed = collapsedSections.has(section.metadata.name)}
						{@const defPath = section.definitionPath}
						{@const defResolved = defPath ? resolveIconForPath(defPath) : undefined}
						{@const defResolvedIcon = defResolved?.icon}
						{@const defIconColor = defResolved?.color}
						{@const defTextColor = defResolved?.titleColor}
						<div class="mb-1">
							<button
								class="flex w-full items-center gap-1 rounded px-2 py-[5px] text-[15px] hover:bg-primary/10 hover:text-primary cursor-default select-none"
								onclick={() => toggleSection(section.metadata.name)}
								oncontextmenu={() => { sectionContextPath = defPath; sectionContextName = section.metadata.name; contextTarget = null; }}
							>
								<ChevronRight class="size-3.5 shrink-0 text-muted-foreground transition-transform {collapsed ? '' : 'rotate-90'}" />
								{#if defResolvedIcon}
									<IconRenderer icon={defResolvedIcon} class="size-4 shrink-0" color={defIconColor} />
								{/if}
								<span class="truncate" style:color={defTextColor ?? undefined}>
									{section.metadata.sidebarLabel}
								</span>
								<span class="ml-auto shrink-0 pr-1 text-xs text-[#8a8faa]">{section.notes.length}</span>
							</button>
							{#if !collapsed}
								<div>
									{#each section.notes as note (note.path)}
										{@const noteResolved = resolveIconForPath(note.path)}
										{@const resolvedIcon = noteResolved?.icon}
										{@const iconColor = noteResolved?.color}
										{@const iconTextColor = noteResolved?.titleColor}
										{@const isActive = note.path === activePath}
										<Tooltip.Root>
											<Tooltip.Trigger>
												{#snippet child({ props: tipProps })}
													<button
														{...tipProps}
														class="flex w-full items-center gap-1 rounded px-2 py-[5px] text-[15px] hover:bg-primary/10 hover:text-primary cursor-default select-none {isActive ? 'bg-primary/25' : ''}"
														style="padding-left: 40px;"
														onclick={() => openFileInEditor(note.path)}
														oncontextmenu={() => { contextTarget = note; sectionContextPath = null; sectionContextName = null; }}
													>
														{#if resolvedIcon}
															<IconRenderer icon={resolvedIcon} class="size-4 shrink-0" color={iconColor} />
														{:else if defResolvedIcon}
															<IconRenderer icon={defResolvedIcon} class="size-4 shrink-0" color={defIconColor} />
														{:else}
															<FileText class="size-3.5 shrink-0 text-muted-foreground" />
														{/if}
														<span class="truncate {isActive ? 'text-primary' : ''}" style:color={!isActive && iconTextColor ? iconTextColor : undefined}>{note.title}</span>
													</button>
												{/snippet}
											</Tooltip.Trigger>
											<Tooltip.Content side="right">{note.title}</Tooltip.Content>
										</Tooltip.Root>
									{/each}
								</div>
							{/if}
						</div>
					{/each}

					{#if untyped.length > 0 && settingsStore.showUntypedNotes}
						{@const untypedCollapsed = collapsedSections.has('__untyped')}
						<div class="mb-1 mt-2 border-t border-border pt-1">
							<button
								class="flex w-full items-center gap-1 rounded px-2 py-[5px] text-[15px] hover:bg-primary/10 hover:text-primary cursor-default select-none"
								onclick={() => toggleSection('__untyped')}
							>
								<ChevronRight class="size-3.5 shrink-0 text-muted-foreground transition-transform {untypedCollapsed ? '' : 'rotate-90'}" />
								<span>Untyped</span>
								<span class="ml-auto shrink-0 pr-1 text-xs text-[#8a8faa]">{untyped.length}</span>
							</button>
							{#if !untypedCollapsed}
								<div>
									{#each untyped as note (note.path)}
										{@const noteResolved = resolveIconForPath(note.path)}
										{@const resolvedIcon = noteResolved?.icon}
										{@const iconColor = noteResolved?.color}
										{@const iconTextColor = noteResolved?.titleColor}
										{@const isActive = note.path === activePath}
										<Tooltip.Root>
											<Tooltip.Trigger>
												{#snippet child({ props: tipProps })}
													<button
														{...tipProps}
														class="flex w-full items-center gap-1 rounded px-2 py-[5px] text-[15px] hover:bg-primary/10 hover:text-primary cursor-default select-none {isActive ? 'bg-primary/25' : ''}"
														style="padding-left: 40px;"
														onclick={() => openFileInEditor(note.path)}
														oncontextmenu={() => { contextTarget = note; sectionContextPath = null; sectionContextName = null; }}
													>
														{#if resolvedIcon}
															<IconRenderer icon={resolvedIcon} class="size-4 shrink-0" color={iconColor} />
														{:else}
															<FileText class="size-3.5 shrink-0 text-muted-foreground" />
														{/if}
														<span class="truncate {isActive ? 'text-primary' : ''}" style:color={!isActive && iconTextColor ? iconTextColor : undefined}>{note.title}</span>
													</button>
												{/snippet}
											</Tooltip.Trigger>
											<Tooltip.Content side="right">{note.title}</Tooltip.Content>
										</Tooltip.Root>
									{/each}
								</div>
							{/if}
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
			{:else if contextTarget}
				{@const target = contextTarget}
				<ContextMenu.Item onclick={() => handleOpenInNewTab(target)}>
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
						<ContextMenu.Item onclick={() => handleCopyAbsolutePath(target)}>
							<span>Copy absolute path</span>
						</ContextMenu.Item>
						<ContextMenu.Item onclick={() => handleCopyRelativePath(target)}>
							<span>Copy relative path</span>
						</ContextMenu.Item>
					</ContextMenu.SubContent>
				</ContextMenu.Sub>
				<ContextMenu.Separator />

				<ContextMenu.Item onclick={() => handleSectionChangeIcon(target.path)}>
					<Palette class="size-4" />
					<span>Change icon</span>
				</ContextMenu.Item>
				<ContextMenu.Separator />

				<ContextMenu.Item onclick={() => toggleFavoriteForPath(target.path, !target.favorite)}>
					<Star class="size-4 {target.favorite ? 'fill-current' : ''}" />
					<span>{target.favorite ? 'Unfavorite' : 'Favorite'}</span>
				</ContextMenu.Item>
				<ContextMenu.Separator />

				<ContextMenu.Item onclick={() => handleRevealInFinder(target)}>
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
