<script lang="ts">
	import { page } from '$app/state';
	import { onMount, onDestroy } from 'svelte';
	import { listen } from '@tauri-apps/api/event';
	import { ScrollArea } from '$lib/components/ui/scroll-area';
	import { saveSettings } from '$lib/core/settings/settings.service';
	import { debounce } from '$lib/utils/debounce';
	import { error } from '$lib/utils/debug';
	import { emitSettingsChanged } from '$lib/core/settings/settings-window.service';
	import { SETTINGS_SECTION_GROUPS } from '$lib/core/settings/settings.logic';
	import AppearanceSection from '$lib/core/settings/sections/AppearanceSection.svelte';
	import GeneralSection from '$lib/core/settings/sections/GeneralSection.svelte';
	import EditorSection from '$lib/core/settings/sections/EditorSection.svelte';
	import PeriodicNotesSection from '$lib/core/settings/sections/PeriodicNotesSection.svelte';
	import QuickNoteSection from '$lib/core/settings/sections/QuickNoteSection.svelte';
	import OneOnOneSection from '$lib/core/settings/sections/OneOnOneSection.svelte';
	import TemplatesSection from '$lib/core/settings/sections/TemplatesSection.svelte';
	import SearchSection from '$lib/core/settings/sections/SearchSection.svelte';
	import FileHistorySection from '$lib/core/settings/sections/FileHistorySection.svelte';
	import AutoMoveSection from '$lib/features/auto-move/AutoMoveSection.svelte';
	import TrashSection from '$lib/core/settings/sections/TrashSection.svelte';
	import TodoistSection from '$lib/core/settings/sections/TodoistSection.svelte';
	import TroubleshootingSection from '$lib/core/settings/sections/TroubleshootingSection.svelte';
	import UpdateSection from '$lib/core/settings/sections/UpdateSection.svelte';
	import QueryjsSection from '$lib/core/settings/sections/QueryjsSection.svelte';
	import TypesSection from '$lib/core/settings/sections/TypesSection.svelte';
	import PaletteIcon from '@lucide/svelte/icons/palette';
	import PanelLeftIcon from '@lucide/svelte/icons/panel-left';
	import PencilLineIcon from '@lucide/svelte/icons/pencil-line';
	import CalendarDaysIcon from '@lucide/svelte/icons/calendar-days';
	import ZapIcon from '@lucide/svelte/icons/zap';
	import UsersIcon from '@lucide/svelte/icons/users';
	import FileTextIcon from '@lucide/svelte/icons/file-text';
	import SearchIcon from '@lucide/svelte/icons/search';
	import HistoryIcon from '@lucide/svelte/icons/history';
	import FolderOutputIcon from '@lucide/svelte/icons/folder-output';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';
	import CircleCheckIcon from '@lucide/svelte/icons/circle-check';
	import BugIcon from '@lucide/svelte/icons/bug';
	import DownloadIcon from '@lucide/svelte/icons/download';
	import Code2Icon from '@lucide/svelte/icons/code-2';
	import LayoutGridIcon from '@lucide/svelte/icons/layout-grid';
	import type { SettingsSection } from '$lib/core/settings/settings.types';
	import type { Component } from 'svelte';

	const sectionIcons: Record<SettingsSection, Component> = {
		appearance: PaletteIcon,
		sidebar: PanelLeftIcon,
		editor: PencilLineIcon,
		'periodic-notes': CalendarDaysIcon,
		'quick-note': ZapIcon,
		'one-on-one': UsersIcon,
		templates: FileTextIcon,
		search: SearchIcon,
		'file-history': HistoryIcon,
		'auto-move': FolderOutputIcon,
		trash: Trash2Icon,
		todoist: CircleCheckIcon,
		troubleshooting: BugIcon,
		update: DownloadIcon,
		queryjs: Code2Icon,
		types: LayoutGridIcon,
	};

	const vaultPath = $derived(page.url.searchParams.get('vault') ?? '');
	const initialSection = page.url.searchParams.get('section') as SettingsSection | null;

	let activeSection = $state<SettingsSection>(initialSection ?? 'appearance');

	const debouncedSave = debounce(() => {
		if (vaultPath) {
			saveSettings(vaultPath)
				.then(() => emitSettingsChanged())
				.catch(err => error('SETTINGS', 'Failed to save settings:', err));
		}
	}, 500);

	let unlistenNavigate: (() => void) | undefined;

	onMount(() => {
		listen<string>('settings-navigate', (event) => {
			activeSection = event.payload as SettingsSection;
		}).then((fn) => { unlistenNavigate = fn; });
	});

	onDestroy(() => {
		debouncedSave.flush();
		unlistenNavigate?.();
	});
</script>

<div class="flex h-screen flex-row overflow-hidden bg-settings-dialog-bg">
	<!-- Sidebar -->
	<nav
		class="flex w-48 shrink-0 flex-col gap-0.5 overflow-y-auto border-r border-border px-3 py-5 bg-settings-sidebar-bg"
		data-tauri-drag-region
	>
		{#each SETTINGS_SECTION_GROUPS as group, i}
			<h3 class="px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground {i === 0 ? 'mb-1' : 'mt-3 mb-1'}">
				{group.group}
			</h3>
			{#each group.sections as section}
				{@const Icon = sectionIcons[section.id]}
				<button
					class="flex items-center gap-2 rounded-md px-3 py-1.5 text-left text-sm transition-colors text-settings-text hover:bg-settings-hover-bg {activeSection === section.id ? '!bg-settings-hover-bg bg-accent' : ''}"
					onclick={() => (activeSection = section.id)}
				>
					<Icon class="size-4" />
					{section.label}
				</button>
			{/each}
		{/each}
	</nav>

	<!-- Content -->
	<ScrollArea class="flex-1">
		<div class="max-w-3xl px-10 py-8">
			{#if activeSection === 'appearance'}
				<AppearanceSection onchange={debouncedSave} />
			{:else if activeSection === 'sidebar'}
				<GeneralSection onchange={debouncedSave} />
			{:else if activeSection === 'editor'}
				<EditorSection onchange={debouncedSave} />
			{:else if activeSection === 'periodic-notes'}
				<PeriodicNotesSection onchange={debouncedSave} />
			{:else if activeSection === 'quick-note'}
				<QuickNoteSection onchange={debouncedSave} />
			{:else if activeSection === 'one-on-one'}
				<OneOnOneSection onchange={debouncedSave} />
			{:else if activeSection === 'templates'}
				<TemplatesSection onchange={debouncedSave} />
			{:else if activeSection === 'search'}
				<SearchSection onchange={debouncedSave} />
			{:else if activeSection === 'file-history'}
				<FileHistorySection onchange={debouncedSave} />
			{:else if activeSection === 'auto-move'}
				<AutoMoveSection onchange={debouncedSave} />
			{:else if activeSection === 'trash'}
				<TrashSection />
			{:else if activeSection === 'todoist'}
				<TodoistSection onchange={debouncedSave} />
			{:else if activeSection === 'types'}
				<TypesSection onchange={debouncedSave} />
			{:else if activeSection === 'troubleshooting'}
				<TroubleshootingSection onchange={debouncedSave} />
			{:else if activeSection === 'update'}
				<UpdateSection onchange={debouncedSave} />
			{:else if activeSection === 'queryjs'}
				<QueryjsSection onchange={debouncedSave} />
			{/if}
		</div>
	</ScrollArea>
</div>
