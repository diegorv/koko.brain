<script lang="ts">
	import X from '@lucide/svelte/icons/x';
	import FileText from '@lucide/svelte/icons/file-text';
	import Pin from '@lucide/svelte/icons/pin';
	import ListChecks from '@lucide/svelte/icons/list-checks';
	import Network from '@lucide/svelte/icons/network';
	import LayoutDashboard from '@lucide/svelte/icons/layout-dashboard';
	import Kanban from '@lucide/svelte/icons/kanban';
	import CalendarRange from '@lucide/svelte/icons/calendar-range';
	import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
	import { switchTab, closeTab, togglePinTab } from '#lib/core/editor/editor.service.js';
	import { isTabDirty, isTabPinned, isVirtualTab } from '#lib/core/editor/editor.logic.js';
	import * as ContextMenu from '#lib/components/ui/context-menu/index.js';
	import type { Snippet } from 'svelte';
	import type { EditorTab } from '#lib/core/editor/editor.types.js';

	let {
		tabIcon,
		tabTitleColor,
	}: {
		/** Renders the icon of a tab with no fixed type icon (a note or file). Without it, a plain file icon. */
		tabIcon?: Snippet<[EditorTab]>;
		/** Color of a tab's title, or undefined for the theme default. */
		tabTitleColor?: (path: string) => string | undefined;
	} = $props();

	/** The scrolling tab strip, set once it renders (it only exists while tabs are open). */
	let strip = $state<HTMLElement>();

	// The strip scrolls horizontally and nothing else moves it, so a tab that
	// becomes active (opened at the end, cycled to, restored) could sit off-strip.
	// The path catches a new tab at the same index (pinned insert, closing the
	// active tab). It goes through a `$derived` because the store getter reads
	// `tabs.length`: tracked directly, closing any other tab would pull a strip
	// the user scrolled away back to the active tab.
	const activePath = $derived(editorStore.activeTabPath);
	$effect(() => {
		const index = editorStore.activeIndex;
		void activePath;
		strip?.querySelectorAll<HTMLElement>('[role="tab"]')[index]?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
	});
</script>

{#if editorStore.tabs.length > 0}
	<div bind:this={strip} class="editor-tabs-bar flex items-end h-10 bg-tab-bar overflow-x-auto pt-1 px-1 gap-0.5" role="tablist" data-tauri-drag-region>
		{#each editorStore.tabs as tab, index}
			{@const pinned = isTabPinned(tab)}
			<ContextMenu.Root>
				<ContextMenu.Trigger>
					{#snippet children()}
						<div
							class="group flex items-center gap-1.5 h-8 border-b-2 rounded-t-lg text-sm cursor-pointer select-none shrink-0 transition-colors
								{pinned ? 'px-2' : 'px-3'}
								{index === editorStore.activeIndex
									? 'bg-editor-bg text-tab-text-active border-b-primary'
									: 'bg-tab-bar text-tab-text-inactive border-b-transparent hover:bg-muted/30'}"
							role="tab"
							tabindex="0"
							aria-selected={index === editorStore.activeIndex}
							onclick={() => switchTab(index)}
							onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') switchTab(index); }}
						>
							{#if isTabDirty(tab) && !isVirtualTab(tab)}
								<span class="size-2 rounded-full bg-foreground shrink-0"></span>
							{/if}
							{#if pinned}
								<Pin class="size-3 shrink-0 text-muted-foreground" />
							{/if}
							{#if tab.fileType === 'tasks'}
								<ListChecks class="size-3.5 shrink-0 text-muted-foreground" />
							{:else if tab.fileType === 'graph'}
								<Network class="size-3.5 shrink-0 text-muted-foreground" />
							{:else if tab.fileType === 'canvas'}
								<LayoutDashboard class="size-3.5 shrink-0 text-muted-foreground" />
							{:else if tab.fileType === 'kanban'}
								<Kanban class="size-3.5 shrink-0 text-muted-foreground" />
							{:else if tab.fileType === 'event-calendar'}
								<CalendarRange class="size-3.5 shrink-0 text-muted-foreground" />
							{:else if tabIcon}
								{@render tabIcon(tab)}
							{:else}
								<FileText class="size-3.5 shrink-0 text-muted-foreground" />
							{/if}
							{#if !pinned}
								<span class="truncate max-w-40" style:color={tabTitleColor?.(tab.path) || undefined}>{tab.name}</span>
								<button
									class="ml-1 rounded-xs p-0.5 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 hover:bg-muted transition-opacity
										{index === editorStore.activeIndex ? 'opacity-100' : ''}"
									onclick={(e) => { e.stopPropagation(); closeTab(index); }}
									aria-label="Close {tab.name}"
								>
									<X class="size-3" />
								</button>
							{/if}
						</div>
					{/snippet}
				</ContextMenu.Trigger>
				<ContextMenu.Content class="w-48">
					<ContextMenu.Item onclick={() => togglePinTab(index)}>
						<Pin class="size-4" />
						{pinned ? 'Unpin tab' : 'Pin tab'}
					</ContextMenu.Item>
					{#if !pinned}
						<ContextMenu.Item onclick={() => closeTab(index)}>
							<X class="size-4" />
							Close tab
						</ContextMenu.Item>
					{/if}
				</ContextMenu.Content>
			</ContextMenu.Root>
		{/each}
	</div>
{/if}

<style>
	.editor-tabs-bar {
		box-shadow: inset 0 -1px 0 var(--divider);
	}
</style>
