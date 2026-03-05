<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { ScrollArea } from '$lib/components/ui/scroll-area';
	import { settingsDialogStore } from './settings-dialog.store.svelte';
	import { saveSettings } from './settings.service';
	import { vaultStore } from '$lib/core/vault/vault.store.svelte';
	import { debounce } from '$lib/utils/debounce';
	import { error } from '$lib/utils/debug';
	import { SETTINGS_SECTION_GROUPS } from './settings.logic';
	import AppearanceSection from './sections/AppearanceSection.svelte';
	import GeneralSection from './sections/GeneralSection.svelte';
	import EditorSection from './sections/EditorSection.svelte';
	import PeriodicNotesSection from './sections/PeriodicNotesSection.svelte';
	import QuickNoteSection from './sections/QuickNoteSection.svelte';
	import OneOnOneSection from './sections/OneOnOneSection.svelte';
	import TemplatesSection from './sections/TemplatesSection.svelte';
	import TerminalSection from './sections/TerminalSection.svelte';
	import SearchSection from './sections/SearchSection.svelte';
	import FileHistorySection from './sections/FileHistorySection.svelte';
	import AutoMoveSection from '$lib/features/auto-move/AutoMoveSection.svelte';
	import TrashSection from './sections/TrashSection.svelte';
	import TodoistSection from './sections/TodoistSection.svelte';
	import SecuritySection from './sections/SecuritySection.svelte';
	import TroubleshootingSection from './sections/TroubleshootingSection.svelte';
	import PaletteIcon from '@lucide/svelte/icons/palette';
	import PanelLeftIcon from '@lucide/svelte/icons/panel-left';
	import PencilLineIcon from '@lucide/svelte/icons/pencil-line';
	import CalendarDaysIcon from '@lucide/svelte/icons/calendar-days';
	import ZapIcon from '@lucide/svelte/icons/zap';
	import UsersIcon from '@lucide/svelte/icons/users';
	import FileTextIcon from '@lucide/svelte/icons/file-text';
	import TerminalIcon from '@lucide/svelte/icons/terminal';
	import SearchIcon from '@lucide/svelte/icons/search';
	import HistoryIcon from '@lucide/svelte/icons/history';
	import FolderOutputIcon from '@lucide/svelte/icons/folder-output';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';
	import CircleCheckIcon from '@lucide/svelte/icons/circle-check';
	import ShieldIcon from '@lucide/svelte/icons/shield';
	import BugIcon from '@lucide/svelte/icons/bug';
	import type { SettingsSection } from './settings.types';
	import type { Component } from 'svelte';

	const sectionIcons: Record<SettingsSection, Component> = {
		appearance: PaletteIcon,
		sidebar: PanelLeftIcon,
		editor: PencilLineIcon,
		'periodic-notes': CalendarDaysIcon,
		'quick-note': ZapIcon,
		'one-on-one': UsersIcon,
		templates: FileTextIcon,
		terminal: TerminalIcon,
		search: SearchIcon,
		'file-history': HistoryIcon,
		'auto-move': FolderOutputIcon,
		trash: Trash2Icon,
		todoist: CircleCheckIcon,
		security: ShieldIcon,
		troubleshooting: BugIcon,
	};

	const debouncedSave = debounce(() => {
		if (vaultStore.path) saveSettings(vaultStore.path).catch(err => error('SETTINGS', 'Failed to save settings:', err));
	}, 500);

	let contentRef: HTMLElement | null = $state(null);
	let hasDragged = $state(false);

	function handleOpenChange(open: boolean) {
		if (!open) {
			debouncedSave.flush();
			settingsDialogStore.close();
			hasDragged = false;
		}
	}

	/** Reset drag position when dialog opens with fresh/reused DOM */
	$effect(() => {
		if (settingsDialogStore.isOpen && contentRef) {
			contentRef.style.translate = '';
			const overlay = contentRef.previousElementSibling as HTMLElement | null;
			if (overlay?.dataset.slot === 'dialog-overlay') {
				overlay.style.opacity = '';
				overlay.style.pointerEvents = '';
				overlay.style.transition = '';
			}
		}
	});

	function handleDragStart(e: MouseEvent) {
		if (!contentRef) return;
		if (e.button !== 0) return;
		if ((e.target as HTMLElement).closest('button')) return;

		// Resolve current position to pure pixel translate (avoids calc() with % on every frame)
		const rect = contentRef.getBoundingClientRect();
		const centerX = window.innerWidth / 2;
		const centerY = window.innerHeight / 2;
		const baseTx = rect.left - centerX;
		const baseTy = rect.top - centerY;
		const startX = e.clientX;
		const startY = e.clientY;
		let rafId = 0;

		// Kill the 200ms transition from dialog-content so translate updates are instant
		contentRef.style.transition = 'none';
		contentRef.style.willChange = 'translate';
		document.body.style.cursor = 'grabbing';
		document.body.style.userSelect = 'none';

		function onMove(ev: MouseEvent) {
			cancelAnimationFrame(rafId);
			rafId = requestAnimationFrame(() => {
				const tx = baseTx + (ev.clientX - startX);
				const ty = baseTy + (ev.clientY - startY);
				contentRef!.style.translate = `${tx}px ${ty}px`;
			});

			if (!hasDragged) {
				hasDragged = true;
				const overlay = contentRef?.previousElementSibling as HTMLElement | null;
				if (overlay?.dataset.slot === 'dialog-overlay') {
					overlay.style.transition = 'opacity 200ms';
					overlay.style.opacity = '0.15';
					overlay.style.pointerEvents = 'none';
				}
			}
		}

		function onUp() {
			cancelAnimationFrame(rafId);
			contentRef!.style.transition = '';
			contentRef!.style.willChange = '';
			document.body.style.cursor = '';
			document.body.style.userSelect = '';
			document.removeEventListener('mousemove', onMove);
			document.removeEventListener('mouseup', onUp);
		}

		document.addEventListener('mousemove', onMove);
		document.addEventListener('mouseup', onUp);
		e.preventDefault();
	}
</script>

<Dialog.Root open={settingsDialogStore.isOpen} onOpenChange={handleOpenChange}>
	<Dialog.Content
		bind:ref={contentRef}
		class="flex h-[70vh] !w-[48vw] !max-w-none flex-row gap-0 overflow-hidden p-0 !bg-settings-dialog-bg"
		showCloseButton={false}
	>
		<Dialog.Title class="sr-only">Settings</Dialog.Title>
		<Dialog.Description class="sr-only">Application settings</Dialog.Description>

		<!-- Sidebar -->
		<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
		<nav
			class="flex w-48 shrink-0 flex-col gap-0.5 overflow-y-auto border-r border-border px-3 py-5 bg-settings-sidebar-bg cursor-grab"
			onmousedown={handleDragStart}
		>
			{#each SETTINGS_SECTION_GROUPS as group, i}
				<h3 class="px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground {i === 0 ? 'mb-1' : 'mt-3 mb-1'}">
					{group.group}
				</h3>
				{#each group.sections as section}
					{@const Icon = sectionIcons[section.id]}
					<button
						class="flex items-center gap-2 rounded-md px-3 py-1.5 text-left text-sm transition-colors text-settings-text hover:bg-settings-hover-bg {settingsDialogStore.activeSection === section.id ? '!bg-settings-hover-bg bg-accent' : ''}"
						onclick={() => settingsDialogStore.setSection(section.id)}
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
				{#if settingsDialogStore.activeSection === 'appearance'}
					<AppearanceSection onchange={debouncedSave} />
				{:else if settingsDialogStore.activeSection === 'sidebar'}
					<GeneralSection onchange={debouncedSave} />
				{:else if settingsDialogStore.activeSection === 'editor'}
					<EditorSection onchange={debouncedSave} />
				{:else if settingsDialogStore.activeSection === 'periodic-notes'}
					<PeriodicNotesSection onchange={debouncedSave} />
				{:else if settingsDialogStore.activeSection === 'quick-note'}
					<QuickNoteSection onchange={debouncedSave} />
				{:else if settingsDialogStore.activeSection === 'one-on-one'}
					<OneOnOneSection onchange={debouncedSave} />
				{:else if settingsDialogStore.activeSection === 'templates'}
					<TemplatesSection onchange={debouncedSave} />
				{:else if settingsDialogStore.activeSection === 'terminal'}
					<TerminalSection onchange={debouncedSave} />
				{:else if settingsDialogStore.activeSection === 'search'}
					<SearchSection onchange={debouncedSave} />
				{:else if settingsDialogStore.activeSection === 'file-history'}
					<FileHistorySection onchange={debouncedSave} />
				{:else if settingsDialogStore.activeSection === 'auto-move'}
					<AutoMoveSection onchange={debouncedSave} />
				{:else if settingsDialogStore.activeSection === 'trash'}
					<TrashSection />
				{:else if settingsDialogStore.activeSection === 'todoist'}
					<TodoistSection onchange={debouncedSave} />
				{:else if settingsDialogStore.activeSection === 'security'}
					<SecuritySection />
				{:else if settingsDialogStore.activeSection === 'troubleshooting'}
					<TroubleshootingSection onchange={debouncedSave} />
				{/if}
			</div>
		</ScrollArea>
	</Dialog.Content>
</Dialog.Root>
