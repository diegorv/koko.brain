<script lang="ts">
	import { ask } from '@tauri-apps/plugin-dialog';
	import ChevronRight from 'lucide-svelte/icons/chevron-right';
	import FileText from 'lucide-svelte/icons/file-text';
	import ExternalLink from 'lucide-svelte/icons/external-link';
	import Copy from 'lucide-svelte/icons/copy';
	import Pencil from 'lucide-svelte/icons/pencil';
	import FolderSearch from 'lucide-svelte/icons/folder-search';
	import Trash2 from 'lucide-svelte/icons/trash-2';
	import Palette from 'lucide-svelte/icons/palette';
	import { settingsStore } from '$lib/core/settings/settings.store.svelte';
	import { openFileInEditor } from '$lib/core/editor/editor.service';
	import { editorStore } from '$lib/core/editor/editor.store.svelte';
	import { vaultStore } from '$lib/core/vault/vault.store.svelte';
	import { fsStore } from '$lib/core/filesystem/fs.store.svelte';
	import { createFile, deleteItem, duplicateItem, revealInSystemExplorer } from '$lib/core/filesystem/fs.service';
	import { getRelativePath } from '$lib/core/filesystem/fs.logic';
	import { fileIconsStore } from '$lib/features/file-icons/file-icons.store.svelte';
	import { getIconSync } from '$lib/features/file-icons/file-icons.icon-data';
	import { setIconForPath, removeIconForPath, trackRecentIcon } from '$lib/features/file-icons/file-icons.service';
	import IconRenderer from '$lib/features/file-icons/IconRenderer.svelte';
	import IconPicker from '$lib/features/file-icons/IconPicker.svelte';
	import type { IconPackId } from '$lib/features/file-icons/file-icons.types';
	import { typeDefinitionsStore } from './type-definitions.store.svelte';
	import { updateTypeDefinitionIcon } from './type-definitions.service';
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
	let iconPickerEntry = $derived(
		iconPickerPath ? fileIconsStore.getIcon(iconPickerPath) : undefined
	);
	let filterTabs = $derived([
		{ id: 'all' as SidebarFilter, label: 'All' },
		...(inboxEnabled ? [{ id: 'inbox' as SidebarFilter, label: 'Inbox' }] : []),
		{ id: 'archived' as SidebarFilter, label: 'Archived' },
		{ id: 'favorites' as SidebarFilter, label: 'Favorites' },
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

	async function handleCreateTypeDefinition(typeName: string) {
		if (!vaultStore.path) return;
		const content = `---\ntype: Type\n_visible: true\n---\n\n# ${typeName}\n`;
		const filePath = await createFile(vaultStore.path, `${typeName}.md`);
		if (!filePath) return;
		const { writeTextFile } = await import('@tauri-apps/plugin-fs');
		await writeTextFile(filePath, content);
		openFileInEditor(filePath);
	}

	function handleSectionChangeIcon(path: string) {
		iconPickerPath = path;
		iconPickerOpen = true;
	}

	async function handleIconSelect(pack: IconPackId, name: string, color?: string, textColor?: string) {
		if (!vaultStore.path || !iconPickerPath) return;
		await setIconForPath(vaultStore.path, iconPickerPath, pack, name, color, textColor);
		await trackRecentIcon(vaultStore.path, pack, name);
		if (sectionContextPath === iconPickerPath) {
			await updateTypeDefinitionIcon(iconPickerPath, name, color ?? null).catch((err) => {
				console.error('updateTypeDefinitionIcon failed:', err);
			});
		}
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
			<SidebarModeToggle />
		</div>
	</div>
	<div class="flex items-center border-b border-border shrink-0">
		{#each filterTabs as f (f.id)}
			<button
				class="flex-1 px-2 py-1.5 text-xs font-medium transition-colors cursor-pointer border-b-2 {filter === f.id ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}"
				onclick={() => { filter = f.id as SidebarFilter; rebuildFromCache(); }}
			>
				{f.label}
				{#if f.id === 'inbox' && inboxCount > 0}
					<span class="ml-0.5 text-[10px] bg-primary/20 text-primary px-1 rounded-full">{inboxCount}</span>
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
						{@const defIconEntry = defPath ? fileIconsStore.getIcon(defPath) : undefined}
						{@const defFmRef = defPath ? fileIconsStore.getFrontmatterIcon(defPath) : undefined}
						{@const defCustomIcon = defIconEntry ? getIconSync(defIconEntry.iconPack, defIconEntry.iconName) : undefined}
						{@const defFmIcon = defFmRef ? getIconSync(defFmRef.iconPack, defFmRef.iconName) : undefined}
						{@const defResolvedIcon = defFmIcon ?? defCustomIcon}
						{@const defIconColor = defFmIcon ? undefined : defIconEntry?.color}
						{@const defTextColor = defFmIcon ? undefined : defIconEntry?.textColor}
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
										{@const customEntry = fileIconsStore.getIcon(note.path)}
										{@const fmRef = fileIconsStore.getFrontmatterIcon(note.path)}
										{@const customIcon = customEntry ? getIconSync(customEntry.iconPack, customEntry.iconName) : undefined}
										{@const fmIcon = fmRef ? getIconSync(fmRef.iconPack, fmRef.iconName) : undefined}
										{@const resolvedIcon = fmIcon ?? customIcon}
										{@const iconColor = fmIcon ? undefined : customEntry?.color}
										{@const iconTextColor = fmIcon ? undefined : customEntry?.textColor}
										{@const isActive = note.path === activePath}
										<Tooltip.Root>
											<Tooltip.Trigger>
												{#snippet child({ props: tipProps })}
													<button
														{...tipProps}
														class="flex w-full items-center gap-1 rounded px-2 py-[5px] text-[15px] hover:bg-primary/10 hover:text-primary cursor-default select-none {isActive ? 'bg-primary/25' : ''}"
														style="padding-left: 40px;"
														onclick={() => openFileInEditor(note.path)}
														oncontextmenu={() => { contextTarget = note; sectionContextPath = null; }}
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
										{@const customEntry = fileIconsStore.getIcon(note.path)}
										{@const fmRef = fileIconsStore.getFrontmatterIcon(note.path)}
										{@const customIcon = customEntry ? getIconSync(customEntry.iconPack, customEntry.iconName) : undefined}
										{@const fmIcon = fmRef ? getIconSync(fmRef.iconPack, fmRef.iconName) : undefined}
										{@const resolvedIcon = fmIcon ?? customIcon}
										{@const iconColor = fmIcon ? undefined : customEntry?.color}
										{@const iconTextColor = fmIcon ? undefined : customEntry?.textColor}
										{@const isActive = note.path === activePath}
										<Tooltip.Root>
											<Tooltip.Trigger>
												{#snippet child({ props: tipProps })}
													<button
														{...tipProps}
														class="flex w-full items-center gap-1 rounded px-2 py-[5px] text-[15px] hover:bg-primary/10 hover:text-primary cursor-default select-none {isActive ? 'bg-primary/25' : ''}"
														style="padding-left: 40px;"
														onclick={() => openFileInEditor(note.path)}
														oncontextmenu={() => { contextTarget = note; sectionContextPath = null; }}
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
				<ContextMenu.Item onclick={() => openFileInEditor(path)}>
					<ExternalLink class="size-4" />
					<span>Open type definition</span>
				</ContextMenu.Item>
				<ContextMenu.Separator />
				<ContextMenu.Item onclick={() => handleSectionChangeIcon(path)}>
					<Palette class="size-4" />
					<span>Change icon</span>
				</ContextMenu.Item>
			{:else if sectionContextName && !sectionContextPath}
				{@const name = sectionContextName}
				<ContextMenu.Item onclick={() => handleCreateTypeDefinition(name)}>
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
		currentPack={iconPickerEntry?.iconPack}
		currentName={iconPickerEntry?.iconName}
		currentColor={iconPickerEntry?.color}
		currentTextColor={iconPickerEntry?.textColor}
		onSelect={handleIconSelect}
		onRemove={handleIconRemove}
		onClose={handleIconPickerClose}
	/>
{/if}
