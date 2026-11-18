<script lang="ts">
	import X from '@lucide/svelte/icons/x';
	import FileText from '@lucide/svelte/icons/file-text';
	import Pin from '@lucide/svelte/icons/pin';
	import ListChecks from '@lucide/svelte/icons/list-checks';
	import Network from '@lucide/svelte/icons/network';
	import LayoutDashboard from '@lucide/svelte/icons/layout-dashboard';
	import Kanban from '@lucide/svelte/icons/kanban';
	import CalendarRange from '@lucide/svelte/icons/calendar-range';
	import Tag from '@lucide/svelte/icons/tag';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import { untrack, type Snippet } from 'svelte';
	import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
	import { switchTab, closeTab, togglePinTab } from '#lib/core/editor/editor.service.js';
	import {
		clampTabInsertion,
		isMarkdownNoteTab,
		isTabDirty,
		isTabPinned,
		isVirtualTab,
		tabTooltipText,
	} from '#lib/core/editor/editor.logic.js';
	import { hidesRightSidebar } from '#lib/core/layout/layout.logic.js';
	import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
	import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
	import { stem } from '#lib/utils/path.js';
	import * as ContextMenu from '#lib/components/ui/context-menu/index.js';
	import {
		DropdownMenu,
		DropdownMenuContent,
		DropdownMenuItem,
		DropdownMenuTrigger,
	} from '#lib/components/ui/dropdown-menu/index.js';
	import type { EditorTab } from '#lib/core/editor/editor.types.js';
	import { countHiddenTabs, edgeFades } from './editor-tabs.logic';

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

	/** Width of each edge fade; also the scroller's scroll padding, so the reveal above stops clear of it. */
	const FADE_WIDTH = 34;

	/** Which strip edges have tabs scrolled past them. */
	let fades = $state({ left: false, right: false });
	/** How many tabs are off screen, shown on the list button. */
	let hiddenCount = $state(0);

	function measure(): void {
		if (!strip) return;
		fades = edgeFades(strip.scrollLeft, strip.clientWidth, strip.scrollWidth);
		const tabs = [...strip.querySelectorAll('[role="tab"]')].map((tab) => tab.getBoundingClientRect());
		hiddenCount = countHiddenTabs(strip.getBoundingClientRect(), tabs);
	}

	$effect(() => {
		if (!strip) return;
		const observer = new ResizeObserver(() => measure());
		observer.observe(strip);
		return () => observer.disconnect();
	});

	// A new or closed tab changes the strip's content but not its size, so the observer misses it.
	$effect(() => {
		void editorStore.tabs.length;
		void strip;
		untrack(measure);
	});

	/** Turns a mostly vertical wheel over an overflowing strip into sideways scroll. */
	function handleWheel(event: WheelEvent): void {
		const el = event.currentTarget as HTMLElement;
		if (el.scrollWidth <= el.clientWidth || Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
		el.scrollLeft += event.deltaY;
		event.preventDefault();
	}

	// With the right sidebar hidden its toggle floats over the strip's right end (AppShell),
	// so the strip stops short of it. Tabs in hidesRightSidebar show no toggle.
	const reservesToggle = $derived(!hidesRightSidebar(editorStore.activeTabPath) && !settingsStore.layout.rightSidebarVisible);

	// A private drag type: a text/plain payload would move the note on disk when dropped on
	// a Files folder, add a canvas node, or insert text in the editor.
	const TAB_DRAG_TYPE = 'application/x-kokobrain-tab';
	/** Distance from a strip edge within which a tab drag scrolls the strip. */
	const AUTO_SCROLL_EDGE = 40;
	/** Pixels scrolled per dragover event near an edge. */
	const AUTO_SCROLL_STEP = 14;

	/** Index of the tab being dragged, or null outside a tab drag. */
	let dragFrom: number | null = null;
	/** The insertion slot under the pointer and the marker's x inside the strip's content. */
	let drop = $state<{ slot: number; left: number } | null>(null);

	function isTabDrag(event: DragEvent): boolean {
		return event.dataTransfer?.types.includes(TAB_DRAG_TYPE) ?? false;
	}

	function handleDragStart(event: DragEvent, index: number): void {
		if (!event.dataTransfer) return;
		event.dataTransfer.setData(TAB_DRAG_TYPE, String(index));
		event.dataTransfer.effectAllowed = 'move';
		dragFrom = index;
	}

	/** Places the marker at the slot left of the first tab whose midpoint is past the pointer. */
	function handleDragOver(event: DragEvent): void {
		if (!strip || dragFrom === null || !isTabDrag(event)) return;
		event.preventDefault();
		event.dataTransfer!.dropEffect = 'move';
		const rects = [...strip.querySelectorAll('[role="tab"]')].map((tab) => tab.getBoundingClientRect());
		if (rects.length === 0) return;
		const past = rects.findIndex((r) => event.clientX < r.left + r.width / 2);
		const slot = clampTabInsertion(editorStore.tabs, dragFrom, past < 0 ? rects.length : past);
		const stripRect = strip.getBoundingClientRect();
		const edge = slot < rects.length ? rects[slot].left : rects[rects.length - 1].right;
		drop = { slot, left: edge - stripRect.left + strip.scrollLeft };
		if (event.clientX < stripRect.left + AUTO_SCROLL_EDGE) strip.scrollLeft -= AUTO_SCROLL_STEP;
		else if (event.clientX > stripRect.right - AUTO_SCROLL_EDGE) strip.scrollLeft += AUTO_SCROLL_STEP;
	}

	function handleDrop(event: DragEvent): void {
		if (!isTabDrag(event)) return;
		event.preventDefault();
		if (dragFrom !== null && drop) editorStore.moveTab(dragFrom, drop.slot);
		endDrag();
	}

	/** Hides the marker once the pointer leaves the strip, not when it crosses into a tab. */
	function handleDragLeave(event: DragEvent): void {
		const related = event.relatedTarget as Node | null;
		if (related && strip?.contains(related)) return;
		drop = null;
	}

	function endDrag(): void {
		dragFrom = null;
		drop = null;
	}
</script>

{#snippet kindIcon(tab: EditorTab)}
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
	{:else if tab.fileType === 'tags'}
		<Tag class="size-3.5 shrink-0 text-muted-foreground" />
	{:else if tabIcon}
		{@render tabIcon(tab)}
	{:else}
		<FileText class="size-3.5 shrink-0 text-muted-foreground" />
	{/if}
{/snippet}

{#if editorStore.tabs.length > 0}
	<!-- Both this wrapper and the scroller are drag regions, or the empty strip right of the last tab stops dragging the window. -->
	<div class="tab-strip relative flex items-end h-10 bg-tab-bar {reservesToggle ? 'pr-10' : ''}" data-tab-strip data-tauri-drag-region>
		<div class="relative flex-1 min-w-0 h-full">
			<!-- svelte-ignore a11y_interactive_supports_focus (the tabs are the focus stops; the strip only takes tab drops) -->
			<div
				bind:this={strip}
				class="editor-tabs-bar relative flex items-end h-full overflow-x-auto pt-1 px-1 gap-0.5"
				style:scroll-padding-inline="{FADE_WIDTH}px"
				role="tablist"
				data-tauri-drag-region
				onscroll={measure}
				onwheel={handleWheel}
				ondragover={handleDragOver}
				ondrop={handleDrop}
				ondragleave={handleDragLeave}
				ondragend={endDrag}
			>
				{#each editorStore.tabs as tab, index}
					{@const pinned = isTabPinned(tab)}
					<ContextMenu.Root>
						<!-- bits-ui wraps the tab in the trigger's own div, which is the strip's flex item, so the widths go here. -->
						<ContextMenu.Trigger class={pinned ? 'shrink-0' : 'flex-[0_1_220px] min-w-[100px]'}>
							{#snippet children()}
								<div
									class="group flex items-center gap-1.5 w-full min-w-0 h-8 border-b-2 rounded-t-lg text-sm cursor-pointer select-none transition-colors
										{pinned ? 'px-2' : 'px-3'}
										{index === editorStore.activeIndex
											? 'bg-editor-bg text-tab-text-active border-b-primary'
											: 'bg-tab-bar text-tab-text-inactive border-b-transparent hover:bg-muted/30'}"
									role="tab"
									tabindex="0"
									aria-selected={index === editorStore.activeIndex}
									aria-label={tab.name}
									title={tabTooltipText(tab, vaultStore.path)}
									draggable="true"
									onclick={() => switchTab(index)}
									onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') switchTab(index); }}
									ondragstart={(e) => handleDragStart(e, index)}
								>
									{#if isTabDirty(tab) && !isVirtualTab(tab)}
										<span class="size-2 rounded-full bg-foreground shrink-0" title="Unsaved changes"></span>
									{/if}
									{#if pinned}
										<Pin class="size-3 shrink-0 text-muted-foreground" />
									{/if}
									{@render kindIcon(tab)}
									{#if !pinned}
										<span class="flex-1 min-w-0 truncate" style:color={tabTitleColor?.(tab.path) || undefined}>{isMarkdownNoteTab(tab) ? stem(tab.path) : tab.name}</span>
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
				{#if drop}
					<div
						class="pointer-events-none absolute top-1 bottom-0 z-10 w-[3px] -translate-x-1/2 rounded-xs bg-primary"
						style:left="{drop.left}px"
						data-tab-drop-marker
					></div>
				{/if}
			</div>
			{#if fades.left}
				<div class="pointer-events-none absolute inset-y-0 left-0 bg-linear-to-r from-tab-bar from-20% to-transparent" style:width="{FADE_WIDTH}px" data-tab-fade="left"></div>
			{/if}
			{#if fades.right}
				<div class="pointer-events-none absolute inset-y-0 right-0 bg-linear-to-l from-tab-bar from-20% to-transparent" style:width="{FADE_WIDTH}px" data-tab-fade="right"></div>
			{/if}
		</div>
		<DropdownMenu>
			<DropdownMenuTrigger
				class="relative mb-0.5 mx-0.5 inline-flex h-7 w-6.5 shrink-0 items-center justify-center rounded-md text-tab-text-inactive hover:bg-muted/60 hover:text-foreground data-[state=open]:bg-muted/60 data-[state=open]:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 cursor-default"
				aria-label="List all tabs"
				title="List all tabs"
			>
				<ChevronDown class="size-3.5" />
				{#if hiddenCount > 0}
					<span class="absolute -top-0.5 -right-1 min-w-3 rounded-md bg-primary px-[3px] text-center text-[11px] font-bold leading-3 text-primary-foreground" data-hidden-tabs>{hiddenCount}</span>
				{/if}
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" class="w-68 max-h-96 overflow-y-auto">
				{#each editorStore.tabs as tab, index}
					{@const active = index === editorStore.activeIndex}
					<DropdownMenuItem onclick={() => switchTab(index)} aria-current={active ? 'true' : undefined} class={active ? 'font-medium bg-accent/50' : ''}>
						{#if isTabDirty(tab) && !isVirtualTab(tab)}
							<span class="size-2 shrink-0 rounded-full bg-foreground" data-dirty-dot></span>
						{:else}
							<span class="size-2 shrink-0" aria-hidden="true"></span>
						{/if}
						{@render kindIcon(tab)}
						<span class="min-w-0 truncate">{tab.name}</span>
						{#if isTabPinned(tab)}
							<Pin class="ml-auto size-3 text-muted-foreground" data-pin-mark />
						{/if}
					</DropdownMenuItem>
				{/each}
			</DropdownMenuContent>
		</DropdownMenu>
	</div>
{/if}

<style>
	.tab-strip {
		box-shadow: inset 0 -1px 0 var(--divider);
	}
</style>
