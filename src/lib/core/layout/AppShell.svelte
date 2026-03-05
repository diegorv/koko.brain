<script lang="ts">
	import type { Snippet } from 'svelte';
	import { vaultStore } from '$lib/core/vault/vault.store.svelte';
	import { searchStore } from '$lib/features/search/search.store.svelte';
	import { settingsStore } from '$lib/core/settings/settings.store.svelte';
	import * as Resizable from '$lib/components/ui/resizable';
	import { ScrollArea } from '$lib/components/ui/scroll-area';
	import FileExplorer from '$lib/core/file-explorer/FileExplorer.svelte';
	import EditorView from '$lib/core/markdown-editor/EditorView.svelte';
	import BacklinksPanel from '$lib/features/backlinks/BacklinksPanel.svelte';
	import OutgoingLinksPanel from '$lib/features/outgoing-links/OutgoingLinksPanel.svelte';
	import TagsPanel from '$lib/features/tags/TagsPanel.svelte';
	import PropertiesView from '$lib/features/properties/PropertiesView.svelte';
	import SearchPanel from '$lib/features/search/SearchPanel.svelte';
	import CalendarPanel from '$lib/plugins/calendar/CalendarPanel.svelte';
	import StatusBar from '$lib/core/status-bar/StatusBar.svelte';
	import WordCount from '$lib/plugins/word-count/WordCount.svelte';
	import EncryptionToggle from '$lib/plugins/encrypted-notes/EncryptionToggle.svelte';
	import TerminalPanel from '$lib/plugins/terminal/TerminalPanel.svelte';
	import SearchStatus from '$lib/features/search/SearchStatus.svelte';
	import SaveStatus from '$lib/core/status-bar/SaveStatus.svelte';
	import { saveSettings } from '$lib/core/settings/settings.service';
	import { debounce } from '$lib/utils/debounce';
	import { error } from '$lib/utils/debug';

	let { children }: { children: Snippet } = $props();

	const debouncedSave = debounce(() => {
		if (vaultStore.path) {
			saveSettings(vaultStore.path).catch((err) =>
				error('LAYOUT', 'Failed to save pane sizes:', err)
			);
		}
	}, 300);

	function handleLeftPaneResize(size: number) {
		settingsStore.updateLayout({ leftPaneSize: size });
		debouncedSave();
	}

	function handleRightSidebarResize(size: number) {
		settingsStore.updateLayout({ rightSidebarSize: size });
		debouncedSave();
	}

	function handleTerminalResize(size: number) {
		settingsStore.updateLayout({ terminalPaneSize: size });
		debouncedSave();
	}
</script>

{#if !vaultStore.isOpen}
	{@render children()}
{:else}
	<div class="flex h-screen flex-col">
		<Resizable.PaneGroup direction="horizontal" class="flex-1 bg-card">
			<Resizable.Pane class="overflow-hidden">
				<Resizable.PaneGroup direction="horizontal" class="h-full">
					<Resizable.Pane
						defaultSize={settingsStore.layout.leftPaneSize}
						minSize={5}
						maxSize={40}
						onResize={handleLeftPaneResize}
					>
						{#if searchStore.isOpen}
							<SearchPanel />
						{:else}
							<FileExplorer />
						{/if}
					</Resizable.Pane>

					<Resizable.Handle />

					<Resizable.Pane>
						<EditorView />
					</Resizable.Pane>

					{#if settingsStore.layout.rightSidebarVisible}
						<Resizable.Handle />

						<Resizable.Pane
							defaultSize={settingsStore.layout.rightSidebarSize}
							minSize={5}
							maxSize={30}
							onResize={handleRightSidebarResize}
						>
							<div class="flex h-full flex-col text-[15px]">
								<div class="h-10 shrink-0 bg-tab-bar" data-tauri-drag-region></div>
								<ScrollArea class="min-h-0 flex-1">
									{#if settingsStore.layout.calendarVisible}
										<CalendarPanel />
									{/if}
									{#if settingsStore.layout.propertiesVisible}
										<PropertiesView />
									{/if}
									{#if settingsStore.layout.backlinksVisible}
										<BacklinksPanel />
									{/if}
									{#if settingsStore.layout.outgoingLinksVisible}
										<OutgoingLinksPanel />
									{/if}
									{#if settingsStore.layout.tagsVisible}
										<TagsPanel />
									{/if}
								</ScrollArea>
							</div>
						</Resizable.Pane>
					{/if}
				</Resizable.PaneGroup>
			</Resizable.Pane>

			{#if settingsStore.layout.terminalVisible}
				<Resizable.Handle />

				<Resizable.Pane
					defaultSize={settingsStore.layout.terminalPaneSize}
					minSize={15}
					maxSize={40}
					onResize={handleTerminalResize}
				>
					<TerminalPanel />
				</Resizable.Pane>
			{/if}
		</Resizable.PaneGroup>

		<StatusBar>
			{#snippet left()}
				<SearchStatus />
			{/snippet}
			{#snippet right()}
				<SaveStatus />
				<EncryptionToggle />
				<WordCount />
			{/snippet}
		</StatusBar>
	</div>
{/if}
